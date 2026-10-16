import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Image, Pressable, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { HexagonLogo } from './HexagonLogo';
import { auth, db } from '@/firebaseConfig';
import { User, onAuthStateChanged } from '@firebase/auth';
import { useTheme } from '@/context/ThemeContext';
import { useNotifications } from '@/context/NotificationContext';
import { doc, onSnapshot } from 'firebase/firestore';

export const DashboardHeader: React.FC = () => {
  const { colors, isDark } = useTheme();
  const { 
    user, 
    adminProfile, 
    pendingCount, 
    expiringCount, 
    hasUnread, 
    clearNotifications 
  } = useNotifications();
  const [showModal, setShowModal] = useState(false);

  // Note: All profile/auth listeners are now centralized in NotificationContext
  // to save Firestore reads and memory overhead.
  
  // Generate initials from display name or email
  const getInitials = () => {
    if (adminProfile?.displayName) {
      return adminProfile.displayName.split(' ').map((n: string) => n[0].toUpperCase()).join('').substring(0, 2);
    }
    if (!user?.email) return 'A';
    const parts = user.email.split('@')[0].split(/[._-]/);
    return parts.map(p => p[0].toUpperCase()).join('').substring(0, 2);
  };

  const handleShowNotifications = () => {
    setShowModal(true);
    if (pendingCount === 0 && expiringCount === 0) {
      clearNotifications(); // Autosolve stuck dots
    }
  };

  const handleClearAll = () => {
    clearNotifications();
    setShowModal(false);
  };

  const getDisplayName = () => {
    if (adminProfile?.displayName) return adminProfile.displayName;
    if (!user?.email) return 'Admin';
    return user.email.split('@')[0];
  };

  return (
    <View style={styles.container}>
      <View style={styles.left}>
        <HexagonLogo size={32} />
        <View style={styles.brandInfo}>
          <Text style={[styles.brandName, { color: colors.text }]}>GymGuard</Text>
          <Text style={[styles.brandSubtitle, { color: colors.textSecondary }]}>JAVENAD FITNESS APP</Text>
        </View>
      </View>
      <View style={styles.right}>
        <TouchableOpacity style={[styles.notificationBtn, { backgroundColor: colors.surfaceLight }]} onPress={handleShowNotifications}>
          <Ionicons name="notifications-outline" size={24} color={colors.text} />
          {hasUnread && <View style={[styles.dot, { borderColor: colors.background }]} />}
        </TouchableOpacity>
        {/* Dynamic Admin Avatar based on logged-in account */}
        <TouchableOpacity style={styles.avatarBtn}>
          <View style={[styles.initialsCircle, { backgroundColor: isDark ? 'rgba(230, 57, 70, 0.15)' : 'rgba(230, 57, 70, 0.1)' }]}>
            {adminProfile?.avatar ? (
              <Image source={{ uri: adminProfile.avatar }} style={{ width: '100%', height: '100%' }} />
            ) : (
              <Text style={styles.initialsText}>{getInitials()}</Text>
            )}
          </View>
        </TouchableOpacity>
      </View>

      {/* Premium Notification Modal */}
      <Modal
        visible={showModal}
        transparent={true}
        animationType="fade"
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowModal(false)}>
          <Pressable style={[styles.modalContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <View style={styles.headerTitleRow}>
                <Ionicons name="sparkles" size={20} color={colors.primary} />
                <Text style={[styles.modalTitle, { color: colors.text }]}>GymGuard Assistant</Text>
              </View>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.notificationList}>
              {pendingCount > 0 ? (
                <View style={[styles.notifItem, { backgroundColor: 'rgba(230, 57, 70, 0.05)' }]}>
                  <View style={[styles.notifIcon, { backgroundColor: 'rgba(230, 57, 70, 0.1)' }]}>
                    <Ionicons name="person-add" size={20} color="#E63946" />
                  </View>
                  <View style={styles.notifText}>
                    <Text style={[styles.notifTitle, { color: colors.text }]}>New Registration</Text>
                    <Text style={[styles.notifDesc, { color: colors.textSecondary }]}>You have {pendingCount} pending application(s) awaiting approval.</Text>
                  </View>
                </View>
              ) : null}

              {expiringCount > 0 ? (
                <View style={[styles.notifItem, { backgroundColor: 'rgba(255, 193, 7, 0.05)' }]}>
                  <View style={[styles.notifIcon, { backgroundColor: 'rgba(255, 193, 7, 0.1)' }]}>
                    <Ionicons name="time" size={20} color="#FFC107" />
                  </View>
                  <View style={styles.notifText}>
                    <Text style={[styles.notifTitle, { color: colors.text }]}>Membership Expiry</Text>
                    <Text style={[styles.notifDesc, { color: colors.textSecondary }]}>{expiringCount} member(s) are expiring soon or overdue.</Text>
                  </View>
                </View>
              ) : null}

              {pendingCount === 0 && expiringCount === 0 && (
                <View style={styles.emptyState}>
                  <View style={styles.emptyIcon}>
                    <Ionicons name="checkmark-done-circle" size={48} color="#4CAF50" />
                  </View>
                  <Text style={[styles.emptyTitle, { color: colors.text }]}>All Caught Up!</Text>
                  <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>There are no urgent items requiring your attention right now.</Text>
                </View>
              )}
            </View>

            <View style={styles.modalFooter}>
              {(pendingCount > 0 || expiringCount > 0) && (
                <TouchableOpacity style={[styles.clearBtn, { backgroundColor: colors.surfaceLight }]} onPress={handleClearAll}>
                  <Text style={[styles.clearBtnText, { color: colors.text }]}>Clear Badge</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={[styles.closeBtn, { backgroundColor: colors.primary }]} onPress={() => setShowModal(false)}>
                <Text style={styles.closeBtnText}>Dismiss</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    width: '100%',
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandInfo: {
    marginLeft: 12,
  },
  brandName: {
    color: '#F5F5F5',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  brandSubtitle: {
    color: '#A8A8A8',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    marginTop: -2,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  notificationBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  dot: {
    position: 'absolute',
    top: 10,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E63946',
    borderWidth: 1.5,
    borderColor: '#101010',
  },
  avatarBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(230, 57, 70, 0.5)',
  },
  initialsCircle: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(230, 57, 70, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  initialsText: {
    color: '#E63946',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginLeft: 10,
  },
  notificationList: {
    marginBottom: 24,
  },
  notifItem: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
  },
  notifIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  notifText: {
    flex: 1,
  },
  notifTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  notifDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  emptyIcon: {
    marginBottom: 12,
    opacity: 0.1,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  emptyDesc: {
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 18,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
  },
  clearBtn: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  closeBtn: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '800',
  },
});
