import React from 'react';
import { StyleSheet, View, Text, TextInput, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface RegisterInputProps {
  label: string;
  placeholder: string;
  icon: keyof typeof Ionicons.glyphMap;
  value?: string;
  onChangeText?: (text: string) => void;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
  editable?: boolean;
  type?: string;
}

export const RegisterInput: React.FC<RegisterInputProps> = ({
  label,
  placeholder,
  icon,
  value,
  onChangeText,
  keyboardType = 'default',
  editable = true,
  type,
}) => {
  // Enhanced handling for web date picker to ensure browser calendar popup
  if (Platform.OS === 'web' && type === 'date') {
    return (
      <View style={styles.container}>
        <Text style={styles.label}>{label}</Text>
        <View style={styles.inputWrapper}>
          <Ionicons name={icon} size={18} color="#555" style={styles.icon} />
          <input
            type="date"
            value={value}
            onChange={(e) => onChangeText?.(e.target.value)}
            onClick={(e) => {
              // Modern browser support for opening the picker programmatically
              if (editable && typeof e.currentTarget.showPicker === 'function') {
                try {
                  e.currentTarget.showPicker();
                } catch (err) {
                  console.error("Error opening picker:", err);
                }
              }
            }}
            disabled={!editable}
            placeholder={placeholder}
            style={{
              flex: 1,
              backgroundColor: 'transparent',
              border: 'none',
              color: '#FFF',
              fontSize: '15px',
              fontWeight: '500',
              outline: 'none',
              width: '100%',
              height: '100%',
              padding: 0,
              colorScheme: 'dark', // Native dark picker UI
              cursor: editable ? 'pointer' : 'default',
            }}
          />
        </View>
      </View>
    );
  }

  // react-native-web supports a 'type' prop for TextInput, but it's not in the standard RN types.
  // We can pass it via extraProps on web.
  const extraProps = Platform.OS === 'web' && type ? { type } as any : {};

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputWrapper}>
        <Ionicons name={icon} size={18} color="#555" style={styles.icon} />
        <TextInput 
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor="#444"
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          editable={editable}
          {...extraProps}
        />
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
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    height: 52,
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  icon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: '#FFF',
    fontSize: 15,
    fontWeight: '500',
  },
});
