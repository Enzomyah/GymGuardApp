import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';

interface MetricCardProps {
  title: string;
  value: string;
  subtitle: string;
  trend?: string;
  icon: keyof typeof Ionicons.glyphMap;
  variant?: 'default' | 'danger';
  onPress?: () => void;
}
export const MetricCard: React.FC<MetricCardProps> = ({ 
  title, 
  value, 
  subtitle, 
  trend, 
  icon, 
  variant = 'default',
  onPress
}) => {
  const { colors, isDark } = useTheme();

  return (
    <TouchableOpacity 
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
      activeOpacity={0.7}
      disabled={!onPress}
      onPress={onPress}
    >
      <View style={styles.header}>
        <View style={[styles.iconWrapper, variant === 'danger' && styles.iconWrapperDanger, { backgroundColor: variant === 'danger' ? 'rgba(230, 57, 70, 0.1)' : 'rgba(76, 175, 80, 0.1)' }]}>
          <Ionicons name={icon} size={20} color={variant === 'danger' ? colors.danger : colors.success} />
        </View>
        {trend && (
          <View style={[styles.trendWrapper, { backgroundColor: 'rgba(76, 175, 80, 0.1)' }]}>
            <Ionicons name="arrow-up" size={12} color={colors.success} />
            <Text style={[styles.trendText, { color: colors.success }]}>{trend}</Text>
          </View>
        )}
      </View>
      <View style={styles.content}>
        <Text style={[styles.value, { color: colors.text }]}>{value}</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.03)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  iconWrapper: {
    padding: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
  },
  iconWrapperDanger: {
    backgroundColor: 'rgba(255, 77, 77, 0.1)',
  },
  trendWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  trendText: {
    color: '#4CAF50',
    fontSize: 10,
    fontWeight: '700',
    marginLeft: 2,
  },
  content: {
    marginTop: 4,
  },
  value: {
    color: '#F5F5F5',
    fontSize: 32,
    fontWeight: '800',
  },
  subtitle: {
    color: '#A8A8A8',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
  },
});
