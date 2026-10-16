import { Tabs } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import { Ionicons } from '@expo/vector-icons';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabLayout() {
  const [requestCount, setRequestCount] = useState(0);
  const insets = useSafeAreaInsets();
  
  // Calculate dynamic bottom padding for Android navigation bar
  const bottomPadding = Platform.OS === 'android' ? Math.max(insets.bottom, 12) : insets.bottom;
  const tabHeight = Platform.OS === 'android' ? 60 + bottomPadding : 90;

  useEffect(() => {
    const q = query(collection(db, "requests"), where("status", "==", "pending"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setRequestCount(snapshot.size);
    });
    return unsubscribe;
  }, []);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#E63946',
        tabBarInactiveTintColor: '#A8A8A8',
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#101010',
          borderTopWidth: 1,
          borderTopColor: '#222',
          height: tabHeight,
          paddingBottom: bottomPadding,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <Ionicons size={24} name="home" color={color} />,
        }}
      />
      <Tabs.Screen
        name="inbox"
        options={{
          title: 'Inbox',
          tabBarIcon: ({ color }) => (
            <View>
              <Ionicons size={24} name="chatbox-ellipses-outline" color={color} />
              {requestCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{requestCount}</Text>
                </View>
              )}
            </View>
          ),
        }}
      />

      <Tabs.Screen
        name="members"
        options={{
          title: 'Members',
          tabBarIcon: ({ color }) => <Ionicons size={24} name="people-outline" color={color} />,
        }}
      />
      <Tabs.Screen
        name="explore" // Using explore for settings or renaming later
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => <Ionicons size={24} name="settings-outline" color={color} />,
        }}
      />
    </Tabs>
  );
}
const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    right: -6,
    top: -4,
    backgroundColor: '#E63946',
    borderRadius: 8,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#101010',
  },
  badgeText: {
    color: 'white',
    fontSize: 8,
    fontWeight: 'bold',
  },

});
