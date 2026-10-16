import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Image, Dimensions, ActivityIndicator, Alert, Modal, TextInput, Linking, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { db } from '@/firebaseConfig';
import { doc, updateDoc, onSnapshot, Timestamp } from 'firebase/firestore';
import * as ImagePicker from 'expo-image-picker';
import { extendMembership, GymMember, deleteMember, parseFirebaseDate } from '@/services/firebase';
import { useTheme } from '@/context/ThemeContext';
import { RegisterInput } from '@/components/RegisterInput';
import { RenewModal } from '@/components/RenewModal';

const { width } = Dimensions.get('window');

export default function MemberProfileScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [member, setMember] = useState<GymMember | null>(null);
  const [loading, setLoading] = useState(true);

  // Edit States
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editPlan, setEditPlan] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editExpiry, setEditExpiry] = useState(''); // Format: YYYY-MM-DD
  const [isExpiryLocked, setIsExpiryLocked] = useState(true);
  const [editStartDate, setEditStartDate] = useState(''); // Format: YYYY-MM-DD
  const [editAvatar, setEditAvatar] = useState<string | null>(null);
  const [renewModalVisible, setRenewModalVisible] = useState(false);
  const { colors, isDark, theme } = useTheme();

  useEffect(() => {
    if (!id) return;

    // Real-time member sync
    const unsubMember = onSnapshot(doc(db, "members", id as string), (docSnap) => {
      if (docSnap.exists()) {
        const memberData = { id: docSnap.id, ...docSnap.data() } as GymMember;
        setMember(memberData);
        setEditPlan(memberData.plan || '');
        setEditEmail(memberData.email || '');
        setEditAvatar(memberData.avatar || null);
        const expiryDate = parseFirebaseDate(memberData.expiryDate) || new Date();
        setEditExpiry(expiryDate.toISOString().split('T')[0]);
        const startDate = parseFirebaseDate(memberData.startDate) || new Date();
        setEditStartDate(startDate.toISOString().split('T')[0]);
      }
      setLoading(false);
    });

    return () => unsubMember();
  }, [id]);

  // Auto-calculate expiry date (30 days from start date) when start date changes
  useEffect(() => {
    if (editStartDate && isExpiryLocked) {
      const start = new Date(editStartDate);
      if (!isNaN(start.getTime())) {
        const expiry = new Date(start);
        expiry.setDate(expiry.getDate() + 30);
        setEditExpiry(expiry.toISOString().split('T')[0]);
      }
    }
  }, [editStartDate, isExpiryLocked]);

  const handleUpdateMembership = async () => {
    if (!member || !member.id) return;
    
    setLoading(true);
    try {
      const memberRef = doc(db, "members", member.id);
      await updateDoc(memberRef, {
        email: editEmail,
        plan: editPlan,
        startDate: Timestamp.fromDate(new Date(editStartDate)),
        expiryDate: Timestamp.fromDate(new Date(editExpiry)),
        avatar: editAvatar,
      });
      
      setEditModalVisible(false);
      Alert.alert("Success", "Membership updated successfully.");
    } catch (error) {
      Alert.alert("Error", "Failed to update membership.");
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    if (Platform.OS === 'web') {
      const choice = window.confirm("Pick from Library? (OK) or Cancel and use Camera if supported (Cancel)");
      if (choice) {
        handleImageSource('library');
      } else {
        handleImageSource('camera');
      }
      return;
    }

    Alert.alert(
      "Profile Picture",
      "Update profile photo using:",
      [
        { text: "Camera", onPress: () => handleImageSource('camera') },
        { text: "Library", onPress: () => handleImageSource('library') },
        { text: "Cancel", style: "cancel" }
      ]
    );
  };

  const handleImageSource = async (source: 'camera' | 'library') => {
    let result;
    if (source === 'camera') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        alert('Sorry, we need camera permissions to make this work!');
        return;
      }
      result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.1,
        base64: true,
      });
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        alert('Sorry, we need camera roll permissions to make this work!');
        return;
      }
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.1,
        base64: true,
      });
    }

    if (!result.canceled && result.assets[0].uri) {
      setLoading(true);
      try {
        if (Platform.OS === 'web') {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          const img = new window.Image();
          
          await new Promise((resolve) => {
            img.onload = resolve;
            img.src = result.assets[0].uri;
          });

          const MAX_SIZE = 300;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width;
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width *= MAX_SIZE / height;
              height = MAX_SIZE;
            }
          }

          canvas.width = width;
          canvas.height = height;
          ctx?.drawImage(img, 0, 0, width, height);
          
          const compressed = canvas.toDataURL('image/jpeg', 0.6);
          setEditAvatar(compressed);
        } else {
          if (result.assets[0].base64) {
            setEditAvatar(`data:image/jpeg;base64,${result.assets[0].base64}`);
          }
        }
      } catch (err) {
        console.error("Compression error:", err);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleExtend = () => {
    if (!member || !member.id) return;
    setRenewModalVisible(true);
  };

  const handleConfirmExtend = async (months: number) => {
    setRenewModalVisible(false);
    if (!member || !member.id) return;
    try {
      await extendMembership(member.id, member.expiryDate, months);
      Alert.alert("Success", `Membership extended by ${months} month${months > 1 ? 's' : ''}.`);
    } catch (error) {
      Alert.alert("Error", "Failed to extend membership.");
    }
  };

  const handleToggleStatus = async () => {
    if (!member || !member.id) return;
    const newStatus = member.status === 'deactivated' ? 'active' : 'deactivated';
    
    Alert.alert(
      newStatus === 'active' ? "Reactivate Member" : "Suspend Member",
      `Are you sure you want to ${newStatus === 'active' ? 'reactivate' : 'suspend'} this member?`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Confirm", 
          onPress: async () => {
            try {
              await updateDoc(doc(db, "members", member.id!), { status: newStatus });
            } catch (error) {
              Alert.alert("Error", "Failed to update status.");
            }
          }
        }
      ]
    );
  };

  if (loading && !member) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!member) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.textSecondary }}>Member not found.</Text>
      </View>
    );
  }

  const expiryDate = member.expiryDate?.toDate ? member.expiryDate.toDate() : new Date(member.expiryDate);
  const startDate = member.startDate ? (member.startDate?.toDate ? member.startDate.toDate() : new Date(member.startDate)) : (member.createdAt?.toDate ? member.createdAt.toDate() : new Date(member.createdAt || Date.now()));
  const daysLeft = Math.ceil((expiryDate.getTime() - new Date().getTime()) / (1000 * 3600 * 24));

  const formattedExpiryDate = expiryDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const formattedStartDate = startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={[styles.iconBtn, { backgroundColor: colors.surfaceLight }]} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.brandInfo}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Profile</Text>
            <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>JAVENAD FITNESS APP</Text>
          </View>
        </View>
        <TouchableOpacity style={[styles.iconBtn, { backgroundColor: colors.surfaceLight }]} onPress={() => {
          Alert.alert(
            "Member Options",
            "Manage this member record",
            [
              { text: "Cancel", style: "cancel" },
              { text: "Edit Membership", onPress: () => setEditModalVisible(true) },
              { 
                text: "Remove Member", 
                style: "destructive",
                onPress: () => {
                  Alert.alert("Remove Member", `Are you sure you want to delete ${member?.name}?`, [
                    { text: "Cancel", style: "cancel" },
                    { 
                      text: "Delete", 
                      style: "destructive", 
                      onPress: async () => {
                        try {
                          await deleteMember(member!.id!);
                          router.back();
                        } catch (e) { Alert.alert("Error", "Failed to delete."); }
                      }
                    }
                  ]);
                }
              }
            ]
          );
        }}>
          <Ionicons name="ellipsis-vertical" size={20} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.identitySection}>
          <View style={[styles.avatarWrapper]}>
            <Image 
              source={{ uri: member.avatar || `https://ui-avatars.com/api/?name=${member.name}&background=random&color=fff&size=200` }} 
              style={styles.avatar} 
            />
            {member.status === 'active' && (
              <View style={styles.activeLabelDot}>
                <Ionicons name="checkmark" size={14} color="#FFF" />
              </View>
            )}
          </View>
          
          <Text style={[styles.memberName, { color: colors.text }]} numberOfLines={1}>{member.name}</Text>
          
          <View style={styles.statusRow}>
            <View style={[styles.statusBadge, { backgroundColor: member.status === 'active' ? '#1B3B24' : '#3B1B1B' }]}>
              <Text style={[styles.statusBadgeText, { color: member.status === 'active' ? '#4CAF50' : '#E63946' }]}>
                {member.status.charAt(0).toUpperCase() + member.status.slice(1)}
              </Text>
            </View>
            <Text style={[styles.statusDot, { color: colors.border }]}>•</Text>
            <Text style={[styles.memberId, { color: colors.textSecondary }]}>ID: {member.memberId}</Text>
          </View>

          {member.email ? (
            <TouchableOpacity 
              style={[styles.statusRow, { marginTop: 4 }]}
              onPress={() => Linking.openURL(`mailto:${member.email}`)}
            >
              <Ionicons name="mail" size={12} color={colors.primary} style={{ marginRight: 4 }} />
              <Text style={[styles.memberId, { color: colors.primary, fontWeight: '700', textDecorationLine: 'underline' }]}>{member.email}</Text>
            </TouchableOpacity>
          ) : (
             <View style={[styles.statusRow, { marginTop: 4 }]}>
              <Ionicons name="warning-outline" size={12} color={colors.danger} style={{ marginRight: 4 }} />
              <Text style={[styles.memberId, { color: colors.danger, fontWeight: '700' }]}>Missing Email</Text>
            </View>
          )}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>MEMBERSHIP STATUS</Text>
        </View>
        <View style={[styles.membershipCard, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}>
          <View style={styles.membershipHeader}>
            <View>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Current Plan</Text>
              <Text style={[styles.planTitle, { color: colors.text }]}>{member.plan}</Text>
            </View>
            <View style={styles.expiresInfo}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Expires In</Text>
              <Text style={[styles.expiresValue, daysLeft < 7 && { color: colors.danger }]}>
                {daysLeft > 0 ? `${daysLeft} Days` : 'EXPIRED'}
              </Text>
            </View>
          </View>
          
          <View style={styles.progressBarWrapper}>
            <View style={[styles.progressBarBg, { backgroundColor: colors.surfaceLight }]} />
            <View style={[styles.progressBarFill, { 
              width: `${Math.min(100, Math.max(0, (daysLeft/30) * 100))}%`,
              backgroundColor: daysLeft < 7 ? colors.danger : colors.success
            }]} />
          </View>
          
          <View style={styles.dateRow}>
            <Text style={[styles.dateLabel, { color: colors.textSecondary }]}>Started: {formattedStartDate}</Text>
            <Text style={[styles.dateLabel, { color: colors.textSecondary }]}>Ends: {formattedExpiryDate}</Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>ADMIN ACTIONS</Text>
        </View>
        
        <TouchableOpacity style={[styles.adminActionItem, { backgroundColor: 'rgba(76, 175, 80, 0.08)', borderColor: 'rgba(76, 175, 80, 0.15)' }]} onPress={handleExtend}>
          <View style={[styles.adminActionIcon, { backgroundColor: 'rgba(76, 175, 80, 0.15)' }]}>
            <Ionicons name="refresh-outline" size={24} color="#4CAF50" />
          </View>
          <View style={styles.adminActionText}>
            <Text style={[styles.adminActionTitle, { color: '#4CAF50' }]}>Renew Membership</Text>
            <Text style={[styles.adminActionSubtitle, { color: '#4CAF50' }]}>Add 1 or more months of membership.</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#4CAF50" />
        </TouchableOpacity>

        <TouchableOpacity style={[styles.adminActionItem, { backgroundColor: 'rgba(230, 57, 70, 0.08)', borderColor: 'rgba(230, 57, 70, 0.15)' }]} onPress={handleToggleStatus}>
          <View style={[styles.adminActionIcon, { backgroundColor: 'rgba(230, 57, 70, 0.15)' }]}>
            <Ionicons name="flag" size={24} color="#E63946" />
          </View>
          <View style={styles.adminActionText}>
            <Text style={[styles.adminActionTitle, { color: '#E63946' }]}>{member.status === 'deactivated' ? 'Reactivate' : 'Suspend'} Member</Text>
            <Text style={[styles.adminActionSubtitle, { color: '#E63946' }]}>Temporarily block gym entry.</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#E63946" />
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      <Modal
        visible={editModalVisible}
        animationType="fade"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBody, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.modalHeaderTitle, { color: colors.text }]}>Edit Membership Details</Text>
            <Text style={[styles.modalSubHeader, { color: colors.textSecondary }]}>Update plan, start date, and expiry date.</Text>

            <View style={{ alignItems: 'center', marginBottom: 20 }}>
              <TouchableOpacity style={styles.editAvatarContainer} onPress={pickImage}>
                <Image source={{ uri: editAvatar || member.avatar || `https://ui-avatars.com/api/?name=${member.name}&background=random&color=fff&size=200` }} style={styles.editAvatarImage} />
                <View style={styles.editPhotoBadge}>
                  <Ionicons name="camera" size={14} color="#FFF" />
                </View>
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Membership Plan Name</Text>
              <TextInput 
                style={[styles.textInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                value={editPlan}
                onChangeText={setEditPlan}
                placeholder="e.g. Monthly"
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Email Address</Text>
              <TextInput 
                style={[styles.textInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                value={editEmail}
                onChangeText={setEditEmail}
                placeholder="e.g. client@email.com"
                placeholderTextColor={colors.textSecondary}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <RegisterInput 
                label="Start Date" 
                placeholder="YYYY-MM-DD" 
                icon="calendar-outline" 
                value={editStartDate}
                onChangeText={setEditStartDate}
                type="date"
              />
            </View>

            <View style={styles.inputGroup}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: -10 }}>
                <View style={{ flex: 1 }}>
                  <RegisterInput 
                    label="Expiry Date" 
                    placeholder="YYYY-MM-DD" 
                    icon="calendar-outline" 
                    value={editExpiry}
                    onChangeText={setEditExpiry}
                    type="date"
                    editable={!isExpiryLocked}
                  />
                </View>
                <TouchableOpacity 
                  style={{ marginLeft: 12, marginTop: 12, backgroundColor: isExpiryLocked ? 'rgba(76, 175, 80, 0.1)' : 'rgba(230, 57, 70, 0.1)', padding: 10, borderRadius: 12 }} 
                  onPress={() => setIsExpiryLocked(!isExpiryLocked)}
                >
                  <Ionicons 
                    name={isExpiryLocked ? "lock-closed" : "lock-open"} 
                    size={20} 
                    color={isExpiryLocked ? "#4CAF50" : "#E63946"} 
                  />
                </TouchableOpacity>
              </View>
              {isExpiryLocked ? (
                <Text style={{ fontSize: 10, color: colors.textSecondary, marginTop: -15, marginLeft: 4 }}>
                  Auto-calculated (30 days). Tap the lock to edit manually.
                </Text>
              ) : (
                <Text style={{ fontSize: 10, color: '#E63946', marginTop: -15, marginLeft: 4, fontWeight: '700' }}>
                  Manual Override Active
                </Text>
              )}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.cancelModalBtn} 
                onPress={() => setEditModalVisible(false)}
              >
                <Text style={[styles.cancelModalText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.saveModalBtn, { backgroundColor: colors.primary }]}
                onPress={handleUpdateMembership}
              >
                <Text style={styles.saveModalText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {member && (
        <RenewModal 
          visible={renewModalVisible} 
          onClose={() => setRenewModalVisible(false)} 
          onConfirm={handleConfirmExtend} 
          memberName={member.name} 
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandInfo: {
    marginLeft: 16,
  },
  headerSubtitle: {
    color: '#A8A8A8',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    marginTop: -2,
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  identitySection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatarWrapper: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 16,
    position: 'relative',
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 50,
  },
  activeLabelDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#121212',
  },
  memberName: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: '800',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  statusDot: {
    color: '#555',
    marginHorizontal: 8,
    fontSize: 16,
  },
  memberId: {
    color: '#A8A8A8',
    fontSize: 12,
    fontWeight: '600',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 8,
  },
  sectionTitle: {
    color: '#8A8A8A',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  infoLabel: {
    color: '#8A8A8A',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  membershipCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 20,
    marginBottom: 32,
  },
  membershipHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  planTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '800',
    marginTop: 4,
  },
  expiresInfo: {
    alignItems: 'flex-end',
  },
  expiresValue: {
    color: '#FFB300',
    fontSize: 18,
    fontWeight: '800',
    marginTop: 4,
  },
  progressBarWrapper: {
    marginBottom: 16,
    height: 6,
    width: '100%',
    position: 'relative',
    borderRadius: 3,
  },
  progressBarBg: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#333',
    borderRadius: 3,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dateLabel: {
    color: '#8A8A8A',
    fontSize: 11,
    fontWeight: '600',
  },
  adminActionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  adminActionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  adminActionText: {
    flex: 1,
  },
  adminActionTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  adminActionSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalBody: {
    backgroundColor: '#1E1E1E',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  modalHeaderTitle: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 8,
  },
  modalSubHeader: {
    color: '#8A8A8A',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 24,
    lineHeight: 18,
  },
  editAvatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: '#E63946',
    alignSelf: 'center',
  },
  editAvatarImage: {
    width: '100%',
    height: '100%',
  },
  editAvatarPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editPhotoBadge: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    backgroundColor: '#E63946',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    color: '#8A8A8A',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  textInput: {
    backgroundColor: '#111',
    borderRadius: 12,
    height: 56,
    paddingHorizontal: 16,
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
    borderWidth: 1,
    borderColor: '#333',
  },
  modalActions: {
    flexDirection: 'row',
    marginTop: 12,
  },
  cancelModalBtn: {
    flex: 1,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cancelModalText: {
    color: '#8A8A8A',
    fontSize: 15,
    fontWeight: '700',
  },
  saveModalBtn: {
    flex: 2,
    height: 56,
    backgroundColor: '#E63946',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveModalText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '800',
  },
});

