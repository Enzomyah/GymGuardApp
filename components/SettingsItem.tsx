import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';

interface SettingsItemProps {
  title: string;
  subtitle?: string;
  icon: keyof typeof Ionicons.glyphMap;
  type: 'toggle' | 'chevron' | 'text';
  value?: boolean;
  onValueChange?: (val: boolean) => void;
  onPress?: () => void;
  rightText?: string;
  isLast?: boolean;
}

export const SettingsItem: React.FC<SettingsItemProps> = ({
  title,
  subtitle,
  icon,
  type,
  value,
  onValueChange,
  onPress,
  rightText,
  isLast,
}) => {
  const { colors } = useTheme();

  return (
    <TouchableOpacity 
      style={[styles.container, isLast && { borderBottomWidth: 0 }, { borderBottomColor: colors.border }]} 
      onPress={onPress}
      activeOpacity={type !== 'toggle' ? 0.7 : 1}
      disabled={type === 'toggle'}
    >
      <View style={styles.left}>
        <View style={[styles.iconWrapper, { backgroundColor: colors.surfaceLight }]}>
          <Ionicons name={icon} size={20} color={colors.text} />
        </View>
        <View style={styles.textContainer}>
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          {subtitle && <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text>}
        </View>
      </View>
      
      <View style={styles.right}>
        {type === 'toggle' && (
          <Switch 
            value={value} 
            onValueChange={onValueChange}
            trackColor={{ false: '#333', true: colors.success }}
            thumbColor="#FFF"
            ios_backgroundColor="#333"
          />
        )}
        {type === 'chevron' && (
          <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
        )}
        {type === 'text' && (
          <View style={styles.textRightWrapper}>
            <Text style={[styles.rightText, { color: colors.textSecondary }]}>{rightText}</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  subtitle: {
    color: '#A8A8A8',
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
  },
  right: {
    marginLeft: 16,
  },
  textRightWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rightText: {
    color: '#555',
    fontSize: 14,
    fontWeight: '700',
    marginRight: 8,
  },
});
