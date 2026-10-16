import React, { useState } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface LoginFieldProps {
  label: string;
  placeholder: string;
  iconName: keyof typeof Ionicons.glyphMap;
  isPassword?: boolean;
  value: string;
  onChangeText: (text: string) => void;
  style?: ViewStyle;
}

export const LoginField: React.FC<LoginFieldProps> = ({ 
  label, 
  placeholder, 
  iconName, 
  isPassword = false, 
  value, 
  onChangeText,
  style
}) => {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  return (
    <View style={[styles.container, style]}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputWrapper}>
        <Ionicons name={iconName} size={20} color="#A8A8A8" style={styles.leftIcon} />
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor="#444"
          secureTextEntry={isPassword && !isPasswordVisible}
          value={value}
          onChangeText={onChangeText}
          autoCapitalize="none"
        />
        {isPassword && (
          <TouchableOpacity 
            onPress={() => setIsPasswordVisible(!isPasswordVisible)}
            style={styles.rightIcon}
          >
            <Ionicons 
              name={isPasswordVisible ? "eye-off-outline" : "eye-outline"} 
              size={20} 
              color="#A8A8A8" 
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: 20,
  },
  label: {
    color: '#F5F5F5',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#A8A8A8',
    borderRadius: 12,
    height: 56,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  leftIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: '#F5F5F5',
    fontSize: 16,
    height: '100%',
  },
  rightIcon: {
    padding: 8,
  },
});
