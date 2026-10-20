import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Image, ActivityIndicator, Dimensions, Platform, Alert } from 'react-native';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { registerNewMember, approveMemberRequest, rejectMemberRequest, GymRequest, addMonths, formatDateToYMD, parseYMD } from '@/services/firebase';
import { RegisterInput } from '@/components/RegisterInput';
import { PaymentOption } from '@/components/PaymentOption';

export default function RegisterScreen() {
  const router = useRouter();
  const [selectedPayment, setSelectedPayment] = useState('counter');
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [registrationStatus, setRegistrationStatus] = useState<'form' | 'pending' | 'approved' | 'rejected'>('form');
  const [requestId, setRequestId] = useState<string | null>(null);
  const [approvedData, setApprovedData] = useState<{ memberId: string; expiryDate: string } | null>(null);
  const [isResuming, setIsResuming] = useState(true);

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  
  // Default start date to today
  const today = new Date();
  const [startDate, setStartDate] = useState(formatDateToYMD(today));

    // Default expiry date to 1 month from today
  const defaultExpiry = addMonths(today, 1);
  const [expiryDate, setExpiryDate] = useState(formatDateToYMD(defaultExpiry)); 
  
  const [avatar, setAvatar] = useState<string | null>(null);
  
  // Auto-calculate expiry date (1 month from start date)
  useEffect(() => {
    if (startDate) {
      const start = parseYMD(startDate);
      if (!isNaN(start.getTime())) {
        const expiry = addMonths(start, 1);
        setExpiryDate(formatDateToYMD(expiry));
      }
    }
  }, [startDate]);

  // Resume registration on mount
  useEffect(() => {
    const checkPending = async () => {
      try {
        const savedId = await AsyncStorage.getItem('pending_registration_id');
        if (savedId) {
          setRequestId(savedId);
          setRegistrationStatus('pending');
        }
      } catch (e) {
        console.error("Scale storage error", e);
      } finally {
        setIsResuming(false);
      }
    };
    checkPending();
  }, []);

  const pickImage = async () => {
    if (Platform.OS === 'web') {
      // Browsers don't support native camera well vialaunchCameraAsync in some contexts
      // We'll default to library on web or ask via simpler confirm
      const choice = window.confirm("Pick from Library? (OK) or Cancel and use Camera if supported (Cancel)");
      if (choice) {
        handleImageSource('library');
      } else {
        // Only try camera if user specifically wants it
        handleImageSource('camera');
      }
      return;
    }

    Alert.alert(
      "Profile Picture",
      "Would you like to take a photo or choose from library?",
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
        let finalBase64 = result.assets[0].base64;

        if (Platform.OS === 'web') {
          // Web: Use Canvas to force 300x300 for maximum efficiency
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
          setAvatar(compressed);
        } else {
          // Native: Safely try react-native-compressor (only works in Dev Build/APK)
          try {
            const { Image: NativeCompressor } = require('react-native-compressor');
            const compressedUri = await NativeCompressor.compress(result.assets[0].uri, {
              maxWidth: 300,
              quality: 0.6,
              returnableOutputType: 'base64'
            });
            setAvatar(`data:image/jpeg;base64,${compressedUri}`);
          } catch (e) {
            console.log("Compressor not available (Expo Go?), skipping...");
            if (result.assets[0].base64) {
              setAvatar(`data:image/jpeg;base64,${result.assets[0].base64}`);
            }
          }
        }
      } catch (err) {
        console.error("Compression error:", err);
        // Fallback to original if compression fails
        if (result.assets[0].base64) {
          setAvatar(`data:image/jpeg;base64,${result.assets[0].base64}`);
        }
      } finally {
        setLoading(false);
      }
    }
  };

  const handleRegister = async () => {
    if (!avatar) {
      alert('Please provide a profile picture. It is mandatory for identification.');
      return;
    }
    
    if (!name || !email || !expiryDate) {
      alert('Please fill in all fields (Name and Email are required).');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      alert('Please enter a valid email address.');
      return;
    }

    if (!agreed) {
      alert('Please agree to the terms and digital signature.');
      return;
    }

    setLoading(true);
    try {
      const id = await registerNewMember({
        name,
        email,
        avatar: avatar || null, // Firebase likes null better than undefined
        plan: 'Monthly Plan',
        status: 'pending',
        paymentMethod: selectedPayment === 'counter' ? 'Pay at Counter (Cash)' : 'GCash',
        startDate: startDate,
        expiryDate: expiryDate,
      } as any);
      
      setRequestId(id);
      setRegistrationStatus('pending');
      await AsyncStorage.setItem('pending_registration_id', id);
    } catch (error: any) {
      console.error(error);
      const errorMessage = error?.message || 'Error during registration. Please check your connection.';
      alert(`Registration Error: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  // Listener for approval
  useEffect(() => {
    if (registrationStatus === 'pending' && requestId) {
      const unsub = onSnapshot(doc(db, "requests", requestId), (snapshot) => {
        const data = snapshot.data();
        if (data && data.status === 'approved' && data.memberId) {
          setApprovedData({
            memberId: data.memberId,
            expiryDate: data.expiryDate
          });
          setRegistrationStatus('approved');
        } else if (data && data.status === 'rejected') {
          setRegistrationStatus('rejected');
        }
      });
      return unsub;
    }
  }, [registrationStatus, requestId]);

  if (isResuming) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#E63946" />
      </View>
    );
  }

  if (registrationStatus === 'pending') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.statusContent}>
          <View style={styles.statusIconWrapper}>
            <ActivityIndicator size="large" color="#E63946" />
          </View>
          <Text style={styles.statusTitle}>Registration Received!</Text>
          <Text style={styles.statusSubtitle}>
            Please proceed to the counter for payment and manual verification. 
            Keep this screen open for your membership confirmation.
          </Text>
          <View style={[styles.infoTag, { backgroundColor: 'rgba(230, 57, 70, 0.1)' }]}>
            <Text style={[styles.infoTagText, { color: '#E63946' }]}>AWAITING ADMIN APPROVAL</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (registrationStatus === 'rejected') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.statusContent}>
          <View style={[styles.statusIconWrapper, { backgroundColor: 'rgba(230, 57, 70, 0.1)' }]}>
            <Ionicons name="close-circle" size={80} color="#E63946" />
          </View>
          <Text style={styles.statusTitle}>Registration Declined</Text>
          <Text style={styles.statusSubtitle}>
            Sorry, your registration request was not approved at this time. 
            This could be due to invalid information or payment issues.
          </Text>
          
          <TouchableOpacity 
            style={[styles.doneBtn, { backgroundColor: '#333' }]} 
            onPress={async () => {
              await AsyncStorage.removeItem('pending_registration_id');
              setRegistrationStatus('form');
              setRequestId(null);
            }}
          >
            <Text style={styles.doneBtnText}>Return to Form</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (registrationStatus === 'approved') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.statusContent}>
          <View style={[styles.statusIconWrapper, { backgroundColor: 'rgba(76, 175, 80, 0.1)' }]}>
            <Ionicons name="checkmark-circle" size={80} color="#4CAF50" />
          </View>
          <Text style={styles.statusTitle}>Congratulations!</Text>
          <Text style={styles.statusSubtitle}>
            Your registration has been approved. Welcome to the Javenad Fitness Gym community!
          </Text>
          
          <View style={styles.successCard}>
            <View style={styles.successRow}>
              <Text style={styles.successLabel}>Member Name:</Text>
              <Text style={styles.successValue}>{name}</Text>
            </View>
            <View style={styles.successRow}>
              <Text style={styles.successLabel}>Membership ID:</Text>
              <Text style={[styles.successValue, { color: '#E63946', fontWeight: '900' }]}>{approvedData?.memberId}</Text>
            </View>
            <View style={styles.successRow}>
              <Text style={styles.successLabel}>Expiry Date:</Text>
              <Text style={styles.successValue}>{approvedData?.expiryDate}</Text>
            </View>
          </View>

          <TouchableOpacity 
            style={styles.doneBtn} 
            onPress={async () => {
              await AsyncStorage.removeItem('pending_registration_id');
              // On web, layout.tsx already redirects '/' to '/register', 
              // but we use /register here to explicitly reset the form state.
              router.replace('/register');
            }}
          >
            <Text style={styles.doneBtnText}>Go to Home</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoWrapper}>
          <View style={styles.logoSquare}>
            <Text style={styles.logoText}>G</Text>
          </View>
          <Text style={styles.brandName}>GymGuard</Text>
        </View>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section */}
        <View style={styles.hero}>
          <Text style={styles.title}>Join Javenad Fitness Gym</Text>
          <Text style={styles.subtitle}>
            Complete your registration to activate your official gym membership pass.
          </Text>
        </View>

        {/* Personal Details Section */}
        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>PERSONAL DETAILS</Text>
          
          {/* Avatar Picker */}
          <View style={styles.avatarPickerSection}>
            <TouchableOpacity style={styles.avatarContainer} onPress={pickImage}>
              {avatar ? (
                <Image source={{ uri: avatar }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Ionicons name="camera-outline" size={32} color="#555" />
                  <Text style={styles.avatarLabel}>Add Photo</Text>
                </View>
              )}
            </TouchableOpacity>
            <View style={styles.avatarTextContent}>
              <Text style={styles.avatarTitle}>Profile Picture</Text>
              <Text style={styles.avatarSubtitle}>Tap to upload a clear photo of yourself</Text>
            </View>
          </View>

          <RegisterInput 
            label="Start Date" 
            placeholder="YYYY-MM-DD" 
            icon="calendar-outline" 
            value={startDate}
            onChangeText={setStartDate}
            type="date"
          />
          <RegisterInput 
            label="Full Name" 
            placeholder="e.g. John Doe" 
            icon="person-outline" 
            value={name}
            onChangeText={setName}
          />
          <RegisterInput 
            label="Email Address" 
            placeholder="e.g. john@example.com" 
            icon="mail-outline" 
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
          />
          <RegisterInput 
            label="Membership End Date" 
            placeholder="YYYY-MM-DD" 
            icon="calendar-outline" 
            value={expiryDate}
            onChangeText={setExpiryDate}
            editable={false}
          />
          <Text style={{ fontSize: 10, color: '#E63946', marginTop: -15, marginLeft: 4, fontWeight: '700', marginBottom: 15 }}>
            Auto-calculated: 1 month from your Start Date
          </Text>
        </View>

        {/* Payment Method Section */}
        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>PAYMENT METHOD</Text>
          <PaymentOption 
            id="counter"
            title="Pay at Counter"
            subtitle="Cash only"
            icon="cash-multiple"
            selected={selectedPayment === 'counter'}
            onSelect={setSelectedPayment}
          />
          <PaymentOption 
            id="gcash"
            title="GCash"
            subtitle="E-wallet transfer"
            icon="wallet-outline"
            iconColor="#2196F3"
            selected={selectedPayment === 'gcash'}
            onSelect={setSelectedPayment}
          />
        </View>

        {/* Consent & Digital Signature Section */}
        <TouchableOpacity 
          style={styles.consentRow} 
          activeOpacity={0.8}
          onPress={() => setAgreed(!agreed)}
        >
          <View style={[styles.checkbox, agreed && styles.checkboxActive]}>
            {agreed && <Ionicons name="checkmark" size={14} color="#FFF" />}
          </View>
          <View style={styles.consentTextContainer}>
            <Text style={styles.consentText}>
              I agree to the <Text style={styles.link}>Terms of Service</Text> and <Text style={styles.link}>Privacy Policy</Text>.
            </Text>
            <Text style={[styles.consentText, { marginTop: 4, color: '#E63946', fontWeight: '700' }]}>
              I confirm that this digital registration serves as my official signature and agreement to the gym&apos;s terms.
            </Text>
          </View>
        </TouchableOpacity>

        {/* Submit Button */}
        <TouchableOpacity 
          style={[styles.submitBtn, (!agreed || loading) && styles.submitBtnDisabled]} 
          activeOpacity={0.8}
          disabled={!agreed || loading}
          onPress={handleRegister}
        >
          {loading ? (
             <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.submitBtnText}>Complete Registration →</Text>
          )}
        </TouchableOpacity>
        
        {/* Footer Spacing */}
        <View style={{ height: 40 }} />
      </ScrollView>
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
  logoWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoSquare: {
    width: 32,
    height: 32,
    backgroundColor: '#E63946',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  logoText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '900',
  },
  brandName: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  cancelText: {
    color: '#555',
    fontSize: 14,
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 32,
    maxWidth: 600, // For tablet/web responsiveness
    alignSelf: 'center',
    width: '100%',
  },
  hero: {
    marginBottom: 32,
  },
  title: {
    color: '#F5F5F5',
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -1,
  },
  subtitle: {
    color: '#555',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
    lineHeight: 20,
  },
  formCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.02)',
  },
  sectionTitle: {
    color: '#555',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 20,
  },
  consentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 12,
    marginBottom: 32,
    paddingHorizontal: 4,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    marginTop: 2,
  },
  checkboxActive: {
    backgroundColor: '#E63946',
    borderColor: '#E63946',
  },
  consentTextContainer: {
    flex: 1,
  },
  consentText: {
    color: '#A8A8A8',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  link: {
    color: '#E63946',
    fontWeight: '700',
  },
  submitBtn: {
    backgroundColor: '#E63946',
    height: 60,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#E63946',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  submitBtnDisabled: {
    backgroundColor: '#1E1E1E',
    shadowOpacity: 0,
    elevation: 0,
  },
  submitBtnText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '800',
  },
  avatarPickerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#1E1E1E',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  avatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLabel: {
    color: '#555',
    fontSize: 10,
    fontWeight: '800',
    marginTop: 4,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarTextContent: {
    flex: 1,
    marginLeft: 20,
  },
  avatarTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
  },
  avatarSubtitle: {
    color: '#555',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
    lineHeight: 16,
  },
  // Status Views
  statusContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  statusIconWrapper: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  statusTitle: {
    color: '#FFF',
    fontSize: 28,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 16,
  },
  statusSubtitle: {
    color: '#A8A8A8',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  infoTag: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  infoTagText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
  successCard: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 24,
    padding: 24,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  successRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  successLabel: {
    color: '#555',
    fontSize: 13,
    fontWeight: '700',
  },
  successValue: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  doneBtn: {
    backgroundColor: '#E63946',
    width: '100%',
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  doneBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
  },
});
