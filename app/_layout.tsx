import React, { useState, useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { onAuthStateChanged, User } from '@firebase/auth';
import { auth } from '@/firebaseConfig';
import { Platform, View } from 'react-native';

import { useFonts } from 'expo-font';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { AuthSplashScreen } from '@/components/AuthSplashScreen';
import { ThemeContextProvider } from '@/context/ThemeContext';
import { NotificationProvider } from '@/context/NotificationContext';

export default function RootLayout() {
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const iconFontStyles = `
        @font-face {
          font-family: 'Ionicons';
          src: url('/fonts/Ionicons.ttf') format('truetype');
        }
        @font-face {
          font-family: 'MaterialCommunityIcons';
          src: url('/fonts/MaterialCommunityIcons.ttf') format('truetype');
        }
      `;
      const style = document.createElement('style');
      style.type = 'text/css';
      if ((style as any).styleSheet) {
        (style as any).styleSheet.cssText = iconFontStyles;
      } else {
        style.appendChild(document.createTextNode(iconFontStyles));
      }
      document.head.appendChild(style);
    }
  }, []);

  const [fontsLoaded, fontError] = useFonts({
    ...Ionicons.font,
    ...MaterialCommunityIcons.font,
  });

  const router = useRouter();
  const segments = useSegments();
  const [isBooting, setIsBooting] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    if (fontError) {
      console.warn("Font loading error:", fontError);
    }
  }, [fontError]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setInitializing(false);
    });
    // Safety fallback: ensure splash screen unmounts even if Firebase is slow/offline
    const timer = setTimeout(() => {
      setInitializing(false);
    }, 3000);

    return () => {
      unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (initializing || isBooting) return;

    if (Platform.OS === 'web' && segments[0] !== 'register') {
      // Strictly enforce that the web version is ONLY for registration
      router.replace('/register');
      return;
    }

    const inAuthGroup = segments[0] === 'login' || segments[0] === 'register';

    if (!user && !inAuthGroup) {
      // Redirect to login if not authenticated and trying to access protected screens
      router.replace('/login');
    } else if (user && inAuthGroup) {
      // Redirect to tabs if authenticated and at root/login/register
      router.replace('/(tabs)');
    }
  }, [user, initializing, isBooting, segments]);

  if (isBooting || initializing) {
    return (
      <View style={{ flex: 1, backgroundColor: '#101010' }}>
         <AuthSplashScreen onFinish={() => setIsBooting(false)} />
         <StatusBar style="light" />
      </View>
    );
  }

  return (
    <ThemeContextProvider>
      <NotificationProvider>
        <Stack>
          <Stack.Screen name="login" options={{ headerShown: false, animation: 'fade' }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false, animation: 'fade' }} />
          <Stack.Screen name="register" options={{ headerShown: false, animation: 'slide_from_bottom' }} />
          <Stack.Screen name="member-dashboard" options={{ headerShown: false, presentation: 'modal' }} />
          <Stack.Screen name="member-profile" options={{ headerShown: false }} />
        </Stack>
      </NotificationProvider>
      <StatusBar style="auto" />
    </ThemeContextProvider>
  );
}
