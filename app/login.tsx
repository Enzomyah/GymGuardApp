import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, Alert, ActivityIndicator } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { HexagonLogo } from '@/components/HexagonLogo';
import { LoginField } from '@/components/LoginField';
import { SecureButton } from '@/components/SecureButton';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from '@firebase/auth';
import { auth } from '@/firebaseConfig';
import { useTheme } from '@/context/ThemeContext';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [logoTaps, setLogoTaps] = useState(0);
  const { colors, isDark } = useTheme();

  const handleForgotPassword = async () => {
    if (!email) {
      Alert.alert("Error", "Please enter your email address first.");
      return;
    }
    if (!email.includes('@')) {
      Alert.alert("Error", "Please enter a valid email address.");
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      Alert.alert("Success", "Password reset email sent! Please check your inbox.");
    } catch (error: any) {
      console.error(error);
      let message = error?.message || "Failed to send password reset email.";
      if (error.code === 'auth/user-not-found') {
        message = "No user found with this email.";
      }
      Alert.alert("Error", message);
    }
  };

  const handleSignIn = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please fill in all fields.");
      return;
    }
    
    if (!email.includes('@')) {
      Alert.alert("Error", "Please enter a valid email address.");
      return;
    }

    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // Auth Guard in _layout.tsx will handle redirection
    } catch (error: any) {
      console.error(error);
      let message = error?.message || "An error occurred during sign in.";
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        message = "Invalid email or password.";
      }
      Alert.alert("Login Failed", message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Top Logo Section */}
          <TouchableOpacity 
            activeOpacity={0.8} 
            onPress={() => setLogoTaps(prev => prev + 1)}
            style={styles.header}
          >
            <HexagonLogo size={60} />
          </TouchableOpacity>

          {/* Typography Section */}
          <View style={styles.titleSection}>
            <Text style={[styles.title, { color: colors.text }]}>GymGuard</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Admin Portal Access</Text>
          </View>

          {/* Form Section */}
          <View style={styles.form}>
            <LoginField
              label="Email"
              placeholder="admin@gymguard.io"
              iconName="mail-outline"
              value={email}
              onChangeText={setEmail}
            />
            <LoginField
              label="Password"
              placeholder="••••••••"
              iconName="lock-closed-outline"
              isPassword={true}
              value={password}
              onChangeText={setPassword}
            />

            <TouchableOpacity style={styles.forgotPassword} onPress={handleForgotPassword}>
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>

            <SecureButton 
              title={loading ? "Authenticating..." : "Sign In Securely →"} 
              onPress={handleSignIn}
              style={styles.signInButton}
              disabled={loading}
            />
            
            {loading && (
              <ActivityIndicator color="#E63946" style={{ marginTop: 16 }} />
            )}

            {/* Test Link to open Client Interface (Secretly accessible) */}
            {logoTaps >= 10 && (
              <TouchableOpacity 
                style={{ marginTop: 40, alignItems: 'center' }} 
                onPress={() => {
                  setLogoTaps(0);
                  router.push('/register' as any);
                }}
              >
                <Text style={{ color: '#E63946', fontSize: 12, fontWeight: '900', letterSpacing: 1 }}>
                  DEVELOPER MODE: OPEN REGISTRATION
                </Text>
              </TouchableOpacity>
            )}
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#101010',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
    alignItems: 'center',
  },
  header: {
    marginBottom: 40,
  },
  titleSection: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    color: '#F5F5F5',
    fontSize: 32,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    color: '#A8A8A8',
    fontSize: 16,
    fontWeight: '500',
  },
  form: {
    width: '100%',
    paddingBottom: 40,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 24,
    marginTop: -8,
  },
  forgotPasswordText: {
    color: '#A8A8A8',
    fontSize: 14,
    fontWeight: '600',
  },
  signInButton: {
    marginVertical: 10,
  },
});
