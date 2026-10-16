import React, { useState } from 'react';
import { StyleSheet, View, Text, Switch, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export const BiometricCard: React.FC = () => {
  const [isEnabled, setIsEnabled] = useState(true);

  return (
    <View style={styles.container}>
      {/* Or Divider */}
      <View style={styles.dividerContainer}>
        <View style={styles.divider} />
        <Text style={styles.dividerText}>Or</Text>
        <View style={styles.divider} />
      </View>

      {/* Biometric Card */}
      <TouchableOpacity 
        style={styles.card}
        activeOpacity={0.7}
      >
        <View style={styles.left}>
          <View style={styles.iconContainer}>
            <Ionicons name="finger-print" size={24} color="#A8A8A8" />
          </View>
          <View>
            <Text style={styles.title}>Biometric Login</Text>
            <Text style={styles.subtitle}>Use FaceID or TouchID</Text>
          </View>
        </View>
        <Switch
          trackColor={{ false: "#333", true: "#E63946" }}
          thumbColor={isEnabled ? "#FFFFFF" : "#A1A1A1"}
          ios_backgroundColor="#333"
          onValueChange={setIsEnabled}
          value={isEnabled}
        />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginTop: 10,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
    marginTop: 10,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: '#333',
  },
  dividerText: {
    color: '#A8A8A8',
    paddingHorizontal: 16,
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  title: {
    color: '#F5F5F5',
    fontSize: 15,
    fontWeight: '700',
  },
  subtitle: {
    color: '#A8A8A8',
    fontSize: 12,
    marginTop: 2,
  },
});
