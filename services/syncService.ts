import { db } from "@/firebaseConfig";
import { collection, getDocs, setDoc, doc, Timestamp, query, where } from "firebase/firestore";
import { parseFirebaseDate } from "./firebase";

const OLD_PROJECT_ID = "javenadapp";
const BASE_URL = `https://firestore.googleapis.com/v1/projects/${OLD_PROJECT_ID}/databases/(default)/documents`;

function parseValue(field: any): any {
  if (!field) return null;
  if (field.stringValue !== undefined) return field.stringValue;
  if (field.integerValue !== undefined) return parseInt(field.integerValue, 10);
  if (field.doubleValue !== undefined) return parseFloat(field.doubleValue);
  if (field.booleanValue !== undefined) return field.booleanValue;
  if (field.timestampValue !== undefined) {
    const d = new Date(field.timestampValue);
    return isNaN(d.getTime()) ? null : Timestamp.fromDate(d);
  }
  if (field.nullValue !== undefined) return null;
  if (field.mapValue !== undefined) {
    const res: Record<string, any> = {};
    for (const [k, v] of Object.entries(field.mapValue.fields || {})) {
      const parsed = parseValue(v);
      if (parsed !== undefined) res[k] = parsed;
    }
    return res;
  }
  if (field.arrayValue !== undefined) {
    return (field.arrayValue.values || []).map(parseValue);
  }
  return null;
}

function parseDoc(docObj: any): Record<string, any> {
  const fields = docObj.fields || {};
  const clean: Record<string, any> = {};
  for (const [key, val] of Object.entries(fields)) {
    const parsed = parseValue(val);
    if (parsed !== undefined) {
      clean[key] = parsed;
    }
  }
  return clean;
}

async function getOldCollection(colName: string): Promise<Record<string, any>> {
  let allDocs: Record<string, any> = {};
  let pageToken = "";

  do {
    let url = `${BASE_URL}/${colName}?pageSize=300`;
    if (pageToken) url += `&pageToken=${pageToken}`;

    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Failed to fetch ${colName} from old database (HTTP ${res.status})`);
    }
    const data = await res.json();

    if (data.documents) {
      data.documents.forEach((docItem: any) => {
        const id = docItem.name.split("/").pop();
        if (id) {
          allDocs[id] = parseDoc(docItem);
        }
      });
    }

    pageToken = data.nextPageToken || "";
  } while (pageToken);

  return allDocs;
}

export interface SyncResult {
  success: boolean;
  syncedMembersCount: number;
  syncedRequestsCount: number;
  newMemberNames: string[];
}

export async function syncFromOldDatabase(): Promise<SyncResult> {
  // 1. Fetch existing records in new DB
  const newMembersSnap = await getDocs(collection(db, "members"));
  const existingNewMemberIds = new Set(newMembersSnap.docs.map(d => d.id));
  const existingMemberCodes = new Set(
    newMembersSnap.docs.map(d => d.data().memberId).filter(Boolean)
  );

  // 2. Fetch records from old DB
  const oldMembers = await getOldCollection("members");
  const oldRequests = await getOldCollection("requests");

  let syncedMembersCount = 0;
  let syncedRequestsCount = 0;
  const newMemberNames: string[] = [];

  // 3. Sync Members
  for (const [id, data] of Object.entries(oldMembers)) {
    const memberCode = data.memberId;
    // If not existing by Doc ID AND not existing by Member ID code
    if (!existingNewMemberIds.has(id) && (!memberCode || !existingMemberCodes.has(memberCode))) {
      const memberPayload = {
        ...data,
        avatar: data.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name || 'Member')}&background=random&color=fff`,
        status: data.status || 'active',
        plan: data.plan || 'Monthly subscription',
      };

      await setDoc(doc(db, "members", id), memberPayload, { merge: true });
      syncedMembersCount++;
      if (data.name) newMemberNames.push(data.name);
    }
  }

  // 4. Sync Requests
  const newRequestsSnap = await getDocs(collection(db, "requests"));
  const existingNewRequestIds = new Set(newRequestsSnap.docs.map(d => d.id));

  for (const [id, data] of Object.entries(oldRequests)) {
    if (!existingNewRequestIds.has(id)) {
      await setDoc(doc(db, "requests", id), data, { merge: true });
      syncedRequestsCount++;
    }
  }

  // 5. Update aggregated stats if new items were imported
  if (syncedMembersCount > 0 || syncedRequestsCount > 0) {
    const refreshedMembersSnap = await getDocs(collection(db, "members"));
    const pendingSnap = await getDocs(query(collection(db, "requests"), where("status", "==", "pending")));

    const now = new Date();
    now.setHours(0, 0, 0, 0);
    let activeCount = 0;

    refreshedMembersSnap.docs.forEach(d => {
      const mData = d.data();
      if (mData.status === 'deactivated' || mData.status === 'suspended') return;
      const exp = parseFirebaseDate(mData.expiryDate);
      if (!exp || exp >= now) {
        activeCount++;
      }
    });

    await setDoc(doc(db, "stats", "dashboard"), {
      totalMembers: refreshedMembersSnap.size,
      activeMembers: activeCount,
      pendingRequests: pendingSnap.size
    }, { merge: true });
  }

  return {
    success: true,
    syncedMembersCount,
    syncedRequestsCount,
    newMemberNames
  };
}
