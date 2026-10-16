import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

interface AdminActionCardProps {
  title: string;
  subtitle: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  variant: 'success' | 'danger';
  onPress?: () => void;
}

export const AdminActionCard: React.FC<AdminActionCardProps> = ({
  title,
  subtitle,
  icon,
  variant,
  onPress,
}) => {
  const isSuccess = variant === 'success';
  const color = isSuccess ? '#4CAF50' : '#E63946';

  return (
    <TouchableOpacity 
      style={[styles.card, { borderColor: `${color}40` }]} 
      activeOpacity={0.7}
      onPress={onPress}
    >
      <View style={styles.left}>
        <View style={[styles.iconWrapper, { backgroundColor: `${color}15` }]}>
          <MaterialCommunityIcons name={icon} size={24} color={color} />
        </View>
        <View style={styles.textContainer}>
          <Text style={[styles.title, { color }]}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#555" />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 24,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1.5,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
  },
  subtitle: {
    color: '#A8A8A8',
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
  },
});
