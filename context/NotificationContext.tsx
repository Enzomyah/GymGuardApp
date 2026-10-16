import React, { createContext, useContext, useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, Timestamp, doc } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';
import { onAuthStateChanged, User } from '@firebase/auth';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

interface NotificationContextType {
  user: User | null;
  adminProfile: { displayName?: string; avatar?: string } | null;
  pendingCount: number;
  expiringCount: number;
  hasUnread: boolean;
  clearNotifications: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [adminProfile, setAdminProfile] = useState<{ displayName?: string; avatar?: string } | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [expiringCount, setExpiringCount] = useState(0);
  const [hasUnread, setHasUnread] = useState(false);
  const [lastViewed, setLastViewed] = useState<number>(Date.now());

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return unsubAuth;
  }, []);

  // Configure Notifications for foreground (Native Only)
  useEffect(() => {
    if (Platform.OS === 'web') return; // Silence for Web

    if (Constants.appOwnership === 'expo') {
      console.log("Notification system disabled in Expo Go (SDK 53+ compatibility).");
      return;
    }

    const setupNotifications = async () => {
      try {
        const Notifications = require('expo-notifications');
        Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: true,
            shouldShowBanner: true,
            shouldShowList: true,
          }),
        });
      } catch (e) {
        console.warn("Notifications setup failed:", e);
      }
    };
    setupNotifications();
  }, []);

  useEffect(() => {
    // 0. Only start listeners if user is AUTHENTICATED
    const unsubAuth = onAuthStateChanged(auth, (authUser) => {
      setUser(authUser);
      
      if (!authUser) {
        setPendingCount(0);
        setExpiringCount(0);
        return;
      }

      // 1. Listen for Pending Requests
      const startTime = Date.now();
      const qRequests = query(collection(db, "requests"), where("status", "==", "pending"));
      const unsubRequests = onSnapshot(qRequests, (snapshot) => {
        setPendingCount(snapshot.size);
        
        // Trigger PING for NEW additions only (since the app started)
        snapshot.docChanges().forEach((change) => {
          if (change.type === "added") {
            const data = change.doc.data();
            const createdAt = data.createdAt?.toDate ? data.createdAt.toDate().getTime() : Date.now();
            
            // Only notify if it was created AFTER we started the listener
            if (createdAt >= startTime && Constants.appOwnership !== 'expo') {
              // Wrap in try-catch for Expo Go compatibility
              try {
                const Notifications = require('expo-notifications');
                Notifications.scheduleNotificationAsync({
                  content: {
                    title: "New Member Registration! 🏋️‍♂️",
                    body: `${data.name} is waiting for approval.`,
                    data: { requestId: change.doc.id },
                  },
                  trigger: null,
                });
              } catch (e) {
                console.log("Local notify failed:", e);
              }
            }
          }
        });

        if (snapshot.size > 0) {
          setHasUnread(true);
        }
      }, (error) => {
        console.error("Requests listener error:", error);
      });

      // 2. Listen for Expiring / Overdue Members
      const qMembers = collection(db, "members");
      const unsubMembers = onSnapshot(qMembers, (snapshot) => {
        const now = new Date();
        now.setHours(0, 0, 0, 0);

        const expiringOrOverdue = snapshot.docs.filter(doc => {
          const data = doc.data();
          if (data.status === 'deactivated' || data.status === 'suspended') return false;

          let expiryDateObj: Date | null = null;
          if (data.expiryDate?.toDate) {
            expiryDateObj = data.expiryDate.toDate();
          } else if (data.expiryDate?.seconds) {
            expiryDateObj = new Date(data.expiryDate.seconds * 1000);
          } else if (typeof data.expiryDate === 'string' && data.expiryDate !== '---') {
            const d = new Date(data.expiryDate);
            if (!isNaN(d.getTime())) expiryDateObj = d;
          } else if (data.expiryDate instanceof Date) {
            expiryDateObj = data.expiryDate;
          }

          if (!expiryDateObj) return data.status === 'expired';

          const checkDate = new Date(expiryDateObj);
          checkDate.setHours(0, 0, 0, 0);

          if (checkDate < now || data.status === 'expired') {
            return true; // Overdue / Expired
          }

          const diffDays = Math.ceil((checkDate.getTime() - now.getTime()) / (1000 * 3600 * 24));
          return diffDays <= 7; // Expiring soon (within 7 days)
        });

        setExpiringCount(expiringOrOverdue.length);
        if (expiringOrOverdue.length > 0) {
          setHasUnread(true);
        }
      }, (error) => {
        console.error("Members listener error:", error);
      });

      // 3. Listen for Admin Profile
      const unsubProfile = onSnapshot(doc(db, "admins", authUser.uid), (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setAdminProfile({ displayName: data.displayName, avatar: data.avatar });
        }
      }, (error) => {
        // Silently handle permission errors during initial login/auth transition
        if (error.code !== 'permission-denied') {
          console.warn("Profile listener error:", error.message);
        }
      });

      return () => {
        unsubRequests();
        unsubMembers();
        unsubProfile();
      };
    });

    return () => unsubAuth();
  }, []);

  // 3. Clear unread automatically if nothing is pending/expiring
  useEffect(() => {
    if (pendingCount === 0 && expiringCount === 0) {
      setHasUnread(false);
    }
  }, [pendingCount, expiringCount]);

  const clearNotifications = () => {
    setHasUnread(false);
    setLastViewed(Date.now());
  };

  return (
    <NotificationContext.Provider value={{ 
      user,
      adminProfile,
      pendingCount, 
      expiringCount, 
      hasUnread, 
      clearNotifications 
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
