import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  serverTimestamp, 
  query, 
  where, 
  onSnapshot,
  getDocs,
  limit,
  Timestamp,
  increment,
  setDoc,
  deleteDoc,
  getDoc
} from "firebase/firestore";
import { db } from "../firebaseConfig";

// --- Types ---
export interface GymRequest {
  id?: string;
  name: string;
  email?: string; // Optional for new flow
  phone?: string; // Optional for new flow
  plan: string;
  paymentMethod: string;
  status: 'pending' | 'approved' | 'rejected';
  type?: 'new' | 'renewal';
  avatar?: string; // Base64 string
  startDate?: any; // Added for the new registration flow
  expiryDate?: any; // Added for the new registration flow
  createdAt: any;
}

export interface GymMember {
  id?: string;
  memberId: string;
  name: string;
  email?: string;
  phone?: string;
  status: 'active' | 'expiring' | 'expired' | 'deactivated' | 'suspended';
  plan: string;
  expiryDate: any;
  avatar?: string; // Base64 string
  startDate?: any; // Added for the new registration flow
  lastSeen?: any;
  createdAt: any;
}

// --- Collections ---
const REQUESTS_COLL = "requests";
const MEMBERS_COLL = "members";
const ATTENDANCE_COLL = "attendance";

// --- Service Functions ---

/**
 * Step 1: Registration
 * Saves a new prospective member to the pending queue.
 */
export const registerNewMember = async (data: Omit<GymRequest, 'status' | 'createdAt'>) => {
  try {
    // Filter out undefined values (which Firestore Web SDK doesn't like)
    const cleanData = Object.fromEntries(
      Object.entries(data).filter(([_, v]) => v !== undefined)
    );

    const docRef = await addDoc(collection(db, REQUESTS_COLL), {
      ...cleanData,
      status: 'pending',
      createdAt: serverTimestamp(),
    });

    // Update Global Stats (Atomic Increments)
    await setDoc(doc(db, "stats", "dashboard"), {
      pendingRequests: increment(1)
    }, { merge: true });

    return docRef.id;
  } catch (error) {
    console.error("Error adding request: ", error);
    throw error;
  }
};

/**
 * Rejects a registration request.
 */
export const rejectMemberRequest = async (requestId: string) => {
  try {
    const requestRef = doc(db, REQUESTS_COLL, requestId);
    await updateDoc(requestRef, { status: 'rejected' });

    // Update Global Stats (Atomic Adjustments)
    await setDoc(doc(db, "stats", "dashboard"), {
      pendingRequests: increment(-1)
    }, { merge: true });
  } catch (error) {
    console.error("Error rejecting request: ", error);
    throw error;
  }
};

// --- Universal Date Parsing Helpers ---
export const parseFirebaseDate = (val: any): Date | null => {
  if (!val) return null;
  if (val.toDate && typeof val.toDate === 'function') return val.toDate();
  if (val.seconds !== undefined) return new Date(val.seconds * 1000);
  if (val instanceof Date) return val;
  if (typeof val === 'number') return new Date(val);
  if (typeof val === 'string' && val !== '---') {
    const d = new Date(val);
    if (!isNaN(d.getTime())) return d;
  }
  return null;
};

export const formatFirebaseDate = (val: any, fallback: string = "---"): string => {
  const parsed = parseFirebaseDate(val);
  if (!parsed) return fallback;
  return parsed.toLocaleDateString();
};

/**
 * Step 2: Approval
 * Moves a request to the active members collection.
 */
export const approveMemberRequest = async (requestId: string, requestData: GymRequest) => {
  try {
    // 1. Generate Member ID (GG-8492-X style)
    const randomId = Math.floor(1000 + Math.random() * 9000);
    const memberId = `GG-${randomId}-X`;

    // 2. Set Dates (Use request data or default values)
    let expiryDate: Date;
    let startDate: Date;

    if (requestData.expiryDate) {
      expiryDate = parseFirebaseDate(requestData.expiryDate) || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    } else {
      expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 30);
    }

    if (requestData.startDate) {
      startDate = parseFirebaseDate(requestData.startDate) || new Date();
    } else {
      startDate = new Date();
    }

    // 3. Create Member Record
    await addDoc(collection(db, MEMBERS_COLL), {
      memberId,
      name: requestData.name,
      email: requestData.email || '',
      phone: requestData.phone || '',
      avatar: requestData.avatar || `https://ui-avatars.com/api/?name=${requestData.name}&background=random&color=fff`,
      status: 'active',
      plan: requestData.plan || 'Monthly subscription',
      startDate: Timestamp.fromDate(startDate),
      expiryDate: Timestamp.fromDate(expiryDate),
      lastSeen: serverTimestamp(),
      createdAt: serverTimestamp(),
    });

    // 4. Mark Request as Approved and store the Member ID
    const requestRef = doc(db, REQUESTS_COLL, requestId);
    await updateDoc(requestRef, { 
      status: 'approved',
      memberId: memberId // Store back so client can see it
    });

    // 5. Update Global Stats (Atomic Adjustments)
    await setDoc(doc(db, "stats", "dashboard"), {
      totalMembers: increment(1),
      activeMembers: increment(1),
      pendingRequests: increment(-1)
    }, { merge: true });

    return memberId;
  } catch (error) {
    console.error("Error approving request: ", error);
    throw error;
  }
};

/**
 * Step 3 & 4: Daily Check-in Verify
 * Queries the member by their ID from the QR code.
 */
export const findMemberById = async (memberId: string): Promise<GymMember | null> => {
  try {
    const q = query(collection(db, MEMBERS_COLL), where("memberId", "==", memberId), limit(1));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) return null;
    
    const docData = querySnapshot.docs[0].data();
    return { id: querySnapshot.docs[0].id, ...docData } as GymMember;
  } catch (error) {
    console.error("Error finding member: ", error);
    throw error;
  }
};

/**
 * Attendance Logging
 */
export const logEntry = async (memberId: string, name: string, avatar?: string, location: string = 'Main Entrance') => {
  try {
    // 1. Log Attendance
    await addDoc(collection(db, ATTENDANCE_COLL), {
      memberId,
      name,
      avatar: avatar || `https://ui-avatars.com/api/?name=${name}&background=random&color=fff`,
      timestamp: serverTimestamp(),
      location,
      action: 'Checked in via Scanner',
      statusIcon: 'checkmark-circle',
      statusColor: '#4CAF50'
    });

    // 2. Update Member Last Seen
    const q = query(collection(db, MEMBERS_COLL), where("memberId", "==", memberId), limit(1));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const memberDoc = querySnapshot.docs[0].ref;
      await updateDoc(memberDoc, { lastSeen: serverTimestamp() });
    }
  } catch (error) {
    console.error("Error logging entry: ", error);
    throw error;
  }
};

/**
 * Step 5: Renewal
 * Extends the membership by 30 days per month.
 */
export const extendMembership = async (docId: string, currentExpiry: any, monthsToAdd: number = 1) => {
  try {
    const memberRef = doc(db, MEMBERS_COLL, docId);
    
    // Fetch latest member data to prevent race conditions and ensure stacking is accurate
    const memberSnap = await getDoc(memberRef);
    if (!memberSnap.exists()) {
      throw new Error("Member not found");
    }
    
    const dbExpiry = memberSnap.data().expiryDate;
    const now = new Date();
    const currentExpiryDate = parseFirebaseDate(dbExpiry) || now;
    
    let nextExpiry: Date;
    
    if (currentExpiryDate > now) {
      // Still active: Stack the days onto their current expiration
      nextExpiry = new Date(currentExpiryDate);
      nextExpiry.setDate(nextExpiry.getDate() + (30 * monthsToAdd));
    } else {
      // Already expired: Start a fresh 30 days from Today
      nextExpiry = new Date(now);
      nextExpiry.setDate(nextExpiry.getDate() + (30 * monthsToAdd));
    }

    await updateDoc(memberRef, { 
      expiryDate: Timestamp.fromDate(nextExpiry),
      status: 'active' 
    });
  } catch (error) {
    console.error("Error extending membership: ", error);
    throw error;
  }
};
/**
 * Deletes a member from the database.
 */
export const deleteMember = async (docId: string) => {
  try {
    await deleteDoc(doc(db, MEMBERS_COLL, docId));
    
    // Update Global Stats (Atomic Decrements)
    await setDoc(doc(db, "stats", "dashboard"), {
      totalMembers: increment(-1),
      activeMembers: increment(-1)
    }, { merge: true });
  } catch (error) {
    console.error("Error deleting member: ", error);
    throw error;
  }
};

/**
 * Deletes a registration request.
 */
export const deleteRequest = async (docId: string) => {
  try {
    // Already imported above: const { deleteDoc } = await import("firebase/firestore");
    await deleteDoc(doc(db, REQUESTS_COLL, docId));

    // Update Global Stats (Atomic Decrements)
    await setDoc(doc(db, "stats", "dashboard"), {
      pendingRequests: increment(-1)
    }, { merge: true });
  } catch (error) {
    console.error("Error deleting request: ", error);
    throw error;
  }
};
