import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Alert, Dimensions, Modal, TextInput, ActivityIndicator, Image, Platform, DeviceEventEmitter } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SettingsItem } from '@/components/SettingsItem';
import { QRCodeCard } from '@/components/QRCodeCard';
import { signOut, onAuthStateChanged, User, EmailAuthProvider, reauthenticateWithCredential, updatePassword } from '@firebase/auth';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '@/firebaseConfig';
import { DashboardHeader } from '@/components/DashboardHeader';
import { HexagonLogo } from '@/components/HexagonLogo';
import * as Linking from 'expo-linking';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { useTheme } from '@/context/ThemeContext';
import * as ImagePicker from 'expo-image-picker';
import { syncFromOldDatabase } from '@/services/syncService';
import Constants from 'expo-constants';

const { width, height } = Dimensions.get('window');

export default function SettingsScreen() {
  const router = useRouter();
  const [pushEnabled, setPushEnabled] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showCounterQR, setShowCounterQR] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [showNameModal, setShowNameModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newAvatar, setNewAvatar] = useState<string | null>(null);
  const [isUpdatingName, setIsUpdatingName] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [adminProfile, setAdminProfile] = useState<{ displayName?: string; avatar?: string } | null>(null);
  const { theme, colors, toggleTheme, isDark } = useTheme();
  
  const viewShotRef = React.useRef<any>(null);

  // Subscribe to auth state so profile updates immediately after login
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return unsub;
  }, []);

  useEffect(() => {
    if (user?.uid) {
      const unsub = onSnapshot(doc(db, "admins", user.uid), (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setAdminProfile({ displayName: data.displayName, avatar: data.avatar });
        }
      });
      return unsub;
    }
  }, [user?.uid]);

  const getInitials = () => {
    if (adminProfile?.displayName) {
      return adminProfile.displayName.split(' ').map((n: string) => n[0].toUpperCase()).join('').substring(0, 2);
    }
    if (!user?.email) return 'A';
    const parts = user.email.split('@')[0].split(/[._-]/);
    return parts.map((p: string) => p[0].toUpperCase()).join('').substring(0, 2);
  };

  const handleLogOut = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Log Out', style: 'destructive', onPress: () => signOut(auth) }
      ]
    );
  };

  const handleTogglePush = async (value: boolean) => {
    if (value) {
      if (Constants.appOwnership === 'expo') {
        Alert.alert(
          'Expo Go Notice',
          'Push notifications are enabled in standalone/APK builds. In Expo Go (SDK 53+), remote notifications are disabled.'
        );
        setPushEnabled(true);
        return;
      }
      try {
        const Notifications = require('expo-notifications');
        const { status } = await Notifications.requestPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Denied', 'Please enable notifications in your phone settings to receive alerts.');
          setPushEnabled(false);
          return;
        }
        setPushEnabled(true);
        Alert.alert('Success', 'You will now receive alerts for new registrations.');
      } catch (e) {
        setPushEnabled(true);
      }
    } else {
      setPushEnabled(false);
    }
  };

  const handleShowNotifications = () => {
    Alert.alert(
      "Admin Notifications",
      "• Monthly renewal for Juan Dela Cruz was successful.\n• New registration request from Maria Clara.\n• System backup completed.",
      [{ text: "Done" }]
    );
  };

  const handleChangePassword = async () => {
    if (!user?.email || !currentPassword || !newPassword) {
      return Alert.alert("Error", "Please fill in all fields.");
    }
    if (newPassword.length < 6) {
      return Alert.alert("Error", "New password must be at least 6 characters.");
    }

    setIsUpdating(true);
    try {
      const credential = EmailAuthProvider.credential(user.email!, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
      
      setShowPasswordModal(false);
      setCurrentPassword('');
      setNewPassword('');
      Alert.alert("Success", "Password updated successfully!");
    } catch (err: any) {
      console.error(err);
      Alert.alert("Error", "Verification failed. Please check your current password.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdateName = async () => {
    if (!user) return;
    if (!newName.trim()) return Alert.alert("Error", "Please enter a valid name.");
    
    setIsUpdatingName(true);
    try {
      const adminRef = doc(db, "admins", user.uid);
      await setDoc(adminRef, {
        displayName: newName.trim(),
        avatar: newAvatar,
        email: user.email,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      setShowNameModal(false);
      Alert.alert("Success", "Profile updated.");
    } catch (e: any) {
      Alert.alert("Error", e.message || "Could not update profile.");
    } finally {
      setIsUpdatingName(false);
    }
  };

  const handleSyncOldDatabase = () => {
    Alert.alert(
      "Sync from Old App",
      "Kukunin nito ang anumang bagong members at requests mula sa lumang app/database at ipapasok dito sa bagong app. Gusto mo bang ituloy?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sync Now",
          onPress: async () => {
            setIsSyncing(true);
            try {
              const res = await syncFromOldDatabase();
              if (res.syncedMembersCount === 0 && res.syncedRequestsCount === 0) {
                Alert.alert(
                  "Up to Date 👍",
                  "Walang bagong member o request sa lumang database. Updated na ang lahat!"
                );
              } else {
                let msg = `Napasok ang ${res.syncedMembersCount} bagong member(s)`;
                if (res.syncedRequestsCount > 0) {
                  msg += ` at ${res.syncedRequestsCount} bagong request(s)`;
                }
                if (res.newMemberNames.length > 0) {
                  msg += `:\n\n• ` + res.newMemberNames.slice(0, 5).join('\n• ');
                  if (res.newMemberNames.length > 5) {
                    msg += `\n...at ${res.newMemberNames.length - 5} pa`;
                  }
                }
                Alert.alert("Sync Successful 🎉", msg);
                DeviceEventEmitter.emit('member_approved');
              }
            } catch (err: any) {
              console.error("Sync error:", err);
              Alert.alert("Sync Error", err?.message || "Hindi makakonekta sa lumang database.");
            } finally {
              setIsSyncing(false);
            }
          }
        }
      ]
    );
  };

  const pickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      return Alert.alert('Permission Denied', 'Sorry, we need camera roll permissions to upload an avatar.');
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.1, 
      base64: true,
    });

    if (!result.canceled && result.assets[0].uri) {
      setIsUpdatingName(true); // Reuse loading state
      try {
        if (Platform.OS === 'web') {
          // Web Resizing
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
          setNewAvatar(canvas.toDataURL('image/jpeg', 0.6));
        } else {
          // Native: Safely try react-native-compressor (only works in Dev Build/APK)
          try {
            const { Image: NativeCompressor } = require('react-native-compressor');
            const compressedUri = await NativeCompressor.compress(result.assets[0].uri, {
              maxWidth: 300,
              quality: 0.6,
              returnableOutputType: 'base64'
            });
            setNewAvatar(`data:image/jpeg;base64,${compressedUri}`);
          } catch (e) {
            console.log("Compressor not available (Expo Go?), skipping...");
            if (result.assets[0].base64) {
              setNewAvatar(`data:image/jpeg;base64,${result.assets[0].base64}`);
            }
          }
        }
      } catch (err) {
        console.error("Admin image optimization error:", err);
        setNewAvatar(`data:image/jpeg;base64,${result.assets[0].base64}`);
      } finally {
        setIsUpdatingName(false);
      }
    }
  };

  const handleSaveToGallery = async () => {
    try {
      if (viewShotRef.current && typeof viewShotRef.current.capture === 'function') {
        const uri = await viewShotRef.current.capture();
        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable) {
          await Sharing.shareAsync(uri, { dialogTitle: 'Save Storefront Poster' });
        } else {
          alert('Sharing is not available on this device');
        }
      }
    } catch (err) {
      console.error(err);
      alert('Failed to save QR poster.');
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <DashboardHeader />
        
        {/* User Profile Card */}
        
        {/* Registration QR Modal */}
        <Modal
          visible={showCounterQR}
          animationType="slide"
          transparent={true}
        >
          <View style={styles.qrModalOverlay}>
            <SafeAreaView style={styles.qrModalContent}>
              <View style={styles.qrModalHeader}>
                <TouchableOpacity 
                  onPress={() => setShowCounterQR(false)}
                  style={styles.modalCloseBtn}
                >
                  <Ionicons name="close" size={28} color="#FFF" />
                </TouchableOpacity>
              </View>

              <ViewShot 
                ref={viewShotRef} 
                options={{ format: 'jpg', quality: 1.0 }} 
                style={styles.qrPoster}
              >
                <View style={styles.posterQRContainer}>
                  <QRCodeCard 
                    memberId="https://gymguard-e2810.web.app/register" 
                    instruction="Scan to Register"
                  />
                  <Text style={styles.qrTipText}>Official GymGuard Registration Portal</Text>
                </View>
              </ViewShot>

              <TouchableOpacity 
                style={styles.printBtn}
                onPress={handleSaveToGallery}
              >
                <Ionicons name="download-outline" size={20} color="#FFF" style={{ marginRight: 8 }} />
                <Text style={styles.printBtnText}>Save Storefront Poster to Gallery</Text>
              </TouchableOpacity>
            </SafeAreaView>
          </View>
        </Modal>
        {/* User Profile Card */}
        <View style={[styles.profileCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.profileInfo}>
            <TouchableOpacity 
              activeOpacity={0.8}
              onPress={() => { setNewName(adminProfile?.displayName || user?.email?.split('@')[0] || ''); setNewAvatar(adminProfile?.avatar || null); setShowNameModal(true); }} 
            >
              <View style={[styles.avatarCircle, { backgroundColor: isDark ? 'rgba(230, 57, 70, 0.15)' : 'rgba(230, 57, 70, 0.1)', borderColor: isDark ? 'rgba(230, 57, 70, 0.3)' : 'rgba(230, 57, 70, 0.2)' }]}>
                {adminProfile?.avatar ? (
                  <Image source={{ uri: adminProfile.avatar }} style={{ width: '100%', height: '100%', borderRadius: 36 }} />
                ) : (
                  <Text style={styles.avatarInitials}>{getInitials()}</Text>
                )}
                <View style={[styles.editBadge, { borderColor: colors.surface }]}>
                  <Ionicons name="pencil" size={12} color="#FFF" />
                </View>
              </View>
            </TouchableOpacity>

            <View style={[styles.identity, { flex: 1 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={[styles.adminName, { color: colors.text }]} numberOfLines={1} ellipsizeMode="tail">
                  {adminProfile?.displayName || user?.email?.split('@')[0] || 'Admin'}
                </Text>
              </View>
              <View style={styles.badgeRow}>
                <Ionicons name="shield-checkmark" size={14} color="#E63946" style={{ marginRight: 4 }} />
                <Text style={styles.adminTitle}>Head Administrator</Text>
              </View>
              <Text style={[styles.adminEmail, { color: colors.textSecondary }]} numberOfLines={1} ellipsizeMode="tail">{user?.email ?? ''}</Text>
            </View>
          </View>
        </View>

        {/* Security & Authentication */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>SECURITY & AUTHENTICATION</Text>
        </View>
        <View style={[styles.settingsGroup, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <SettingsItem 
            title="Change Password" 
            subtitle="Update your admin password" 
            icon="lock-closed-outline" 
            type="chevron"
            onPress={() => setShowPasswordModal(true)}
            isLast
          />
        </View>

        {/* Preferences */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>PREFERENCES</Text>
        </View>
        <View style={[styles.settingsGroup, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <SettingsItem 
            title="Push Notifications" 
            subtitle="Alerts, Check-ins, Requests" 
            icon="notifications-outline" 
            type="toggle" 
            value={pushEnabled}
            onValueChange={handleTogglePush}
          />
          <SettingsItem 
            title="App Theme" 
            subtitle={`Currently ${theme.charAt(0).toUpperCase() + theme.slice(1)} Mode`} 
            icon={isDark ? "moon-outline" : "sunny-outline"} 
            type="toggle" 
            value={isDark}
            onValueChange={toggleTheme}
            isLast
          />
        </View>

        {/* Business & Storefront */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>BUSINESS & STOREFRONT</Text>
        </View>
        <View style={[styles.settingsGroup, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <SettingsItem 
            title="Counter Registration QR" 
            subtitle="Display for new member signups" 
            icon="qr-code-outline" 
            type="chevron" 
            onPress={() => setShowCounterQR(true)}
            isLast
          />
        </View>

        {/* Database & Migration */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>DATABASE & MIGRATION</Text>
        </View>
        <View style={[styles.settingsGroup, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <SettingsItem 
            title="Sync from Old App" 
            subtitle="Import new members & requests from previous database" 
            icon="cloud-download-outline" 
            type="chevron" 
            onPress={handleSyncOldDatabase}
            isLast
          />
        </View>

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>SUPPORT & INFORMATION</Text>
        </View>
        <View style={[styles.settingsGroup, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <SettingsItem 
            title="Account Information" 
            subtitle="View your profile details" 
            icon="person-outline" 
            type="chevron"
            onPress={() => Alert.alert("Admin Profile", `Admin Email: ${user?.email}\nAccess Level: Head Administrator\nSystem: GymGuard v1.0.4`)}
          />
          <SettingsItem 
            icon="help-circle-outline" 
            title="Technical Support" 
            subtitle="Get assistance with the portal" 
            type="chevron"
            onPress={() => Alert.alert("GymGuard Support", "Contact our technical team:\n\nEmail: earllawrencecipres37@gmail.com\nPhone No.: 09127219788\nAvailability: 24/7", [{ text: "Close", style: "cancel" }])}
          />
          <SettingsItem 
            icon="information-circle-outline" 
            title="About GymGuard" 
            subtitle="Software version and legal" 
            type="chevron"
            onPress={() => Alert.alert("About GymGuard", "GymGuard Administrative Portal\nVersion: 1.0.4 (Stable Build)\nPowered by JAVENAD FITNESS APP\n\n© 2024 Javenad Fitness Tech. All rights reserved.")}
            isLast
          />
        </View>

        {/* Account Actions */}
        <TouchableOpacity 
          style={[styles.logoutBtn, { backgroundColor: isDark ? 'rgba(230, 57, 70, 0.08)' : 'rgba(230, 57, 70, 0.05)' }]} 
          activeOpacity={0.8} 
          onPress={handleLogOut}
        >
          <Ionicons name="log-out-outline" size={22} color="#E63946" style={{ marginRight: 12 }} />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>

        {/* Tab Bar Spacing */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Change Password Modal */}
      <Modal
        visible={showPasswordModal}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBody, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Change Password</Text>
              <TouchableOpacity onPress={() => setShowPasswordModal(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Current Password</Text>
              <TextInput 
                style={[styles.textInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholder="Required to verify identity"
                placeholderTextColor="#555"
                secureTextEntry
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>New Password</Text>
              <TextInput 
                style={[styles.textInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Minimum 6 characters"
                placeholderTextColor="#555"
                secureTextEntry
              />
            </View>

            <TouchableOpacity 
              style={[styles.saveBtn, { backgroundColor: colors.primary, opacity: isUpdating ? 0.7 : 1 }]}
              onPress={handleChangePassword}
              disabled={isUpdating}
            >
              {isUpdating ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.saveBtnText}>Update Password</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Edit Profile Modal */}
      <Modal
        visible={showNameModal}
        animationType="fade"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBody, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Edit Profile</Text>
              <TouchableOpacity onPress={() => setShowNameModal(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={{ alignItems: 'center', marginBottom: 24 }}>
              <TouchableOpacity onPress={pickAvatar} activeOpacity={0.8}>
                <View style={[styles.avatarCircle, { width: 80, height: 80, borderRadius: 40, backgroundColor: isDark ? 'rgba(230, 57, 70, 0.15)' : 'rgba(230, 57, 70, 0.1)', borderColor: isDark ? 'rgba(230, 57, 70, 0.3)' : 'rgba(230, 57, 70, 0.2)' }]}>
                  {newAvatar ? (
                    <Image source={{ uri: newAvatar }} style={{ width: '100%', height: '100%', borderRadius: 40 }} />
                  ) : (
                    <Ionicons name="camera" size={32} color="#E63946" />
                  )}
                  <View style={[styles.editBadge, { borderColor: colors.surface }]}>
                    <Ionicons name="pencil" size={12} color="#FFF" />
                  </View>
                </View>
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Email Address</Text>
              <TextInput 
                style={[styles.textInput, { backgroundColor: colors.background, color: colors.textSecondary, borderColor: colors.border, opacity: 0.7 }]}
                value={user?.email || ''}
                editable={false}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Display Name</Text>
              <TextInput 
                style={[styles.textInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                value={newName}
                onChangeText={setNewName}
                placeholder="e.g. Coach Earl"
                placeholderTextColor="#555"
              />
            </View>

            <TouchableOpacity 
              style={[styles.saveBtn, { backgroundColor: colors.primary, opacity: isUpdatingName ? 0.7 : 1 }]}
              onPress={handleUpdateName}
              disabled={isUpdatingName}
            >
              {isUpdatingName ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.saveBtnText}>Save Profile</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Sync Progress Modal */}
      <Modal visible={isSyncing} transparent animationType="fade">
        <View style={styles.syncModalOverlay}>
          <View style={[styles.syncModalContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <ActivityIndicator size="large" color="#E63946" />
            <Text style={[styles.syncModalTitle, { color: colors.text }]}>Syncing from Old App</Text>
            <Text style={[styles.syncModalDesc, { color: colors.textSecondary }]}>
              Kumokonekta sa lumang database at ina-import ang mga bagong members...
            </Text>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#101010',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandInfo: {
    marginLeft: 16,
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    color: '#A8A8A8',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    marginTop: -2,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  profileCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 24,
    padding: 24,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#333',
  },
  identity: {
    marginLeft: 20,
  },
  adminName: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  adminTitle: {
    color: '#E63946',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  adminEmail: {
    color: '#A8A8A8',
    fontSize: 13,
    marginTop: 4,
  },
  editBtn: {
    backgroundColor: '#1E1E1E',
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  editBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '800',
  },
  sectionHeader: {
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    color: '#555',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  settingsGroup: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 24,
    paddingHorizontal: 20,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.02)',
  },
  sessionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  sessionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sessionIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  sessionText: {
    justifyContent: 'center',
  },
  deviceName: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
  activeStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#43A047',
    marginRight: 6,
  },
  activeLabel: {
    color: '#43A047',
    fontSize: 12,
    fontWeight: '700',
  },
  sessionMeta: {
    color: '#555',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '600',
  },
  revokeText: {
    color: '#E63946',
    fontSize: 12,
    fontWeight: '700',
  },
  revokeAllBtn: {
    backgroundColor: 'rgba(230, 57, 70, 0.05)',
    height: 56,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
    borderWidth: 1.5,
    borderColor: 'rgba(230, 57, 70, 0.2)',
  },
  revokeIcon: {
    marginRight: 10,
  },
  revokeAllText: {
    color: '#E63946',
    fontSize: 15,
    fontWeight: '800',
  },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(230, 57, 70, 0.15)',
    borderWidth: 2,
    borderColor: 'rgba(230, 57, 70, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitials: {
    color: '#E63946',
    fontSize: 24,
    fontWeight: '900',
  },
  editBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: '#E63946',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(230, 57, 70, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(230, 57, 70, 0.2)',
    borderRadius: 18,
    height: 60,
    marginBottom: 12,
  },
  logoutText: {
    color: '#E63946',
    fontSize: 16,
    fontWeight: '800',
  },
  // QR Modal Base Styles
  qrModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
  },
  qrModalContent: {
    flex: 1,
    paddingHorizontal: 24,
  },
  qrModalHeader: {
    height: 60,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  modalCloseBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // QR Poster Styles
  qrPoster: {
    backgroundColor: '#0A0A0A',
    borderRadius: 40,
    paddingVertical: 60,
    paddingHorizontal: 24,
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  posterQRContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrTipText: {
    color: '#333',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 8,
    textAlign: 'center',
  },
  qrGlowEffect: {
    position: 'absolute',
    top: -50,
    left: -50,
    width: 200,
    height: 200,
    backgroundColor: 'rgba(230, 57, 70, 0.05)',
    borderRadius: 100,
    filter: 'blur(40px)',
  },
  posterFooter: {
    marginTop: 48,
  },
  footerNote: {
    color: '#444',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.5,
  },

  printBtn: {
    backgroundColor: '#E63946',
    height: 60,
    borderRadius: 22,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 24,
    shadowColor: '#E63946',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 25,
    elevation: 8,
  },
  printBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: 24,
  },
  modalBody: {
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  textInput: {
    height: 52,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    borderWidth: 1,
  },
  saveBtn: {
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  saveBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
  },
  syncModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  syncModalContent: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
  },
  syncModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 16,
    textAlign: 'center',
  },
  syncModalDesc: {
    fontSize: 13,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 18,
  },
});
