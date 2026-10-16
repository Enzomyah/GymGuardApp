import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Image } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';

export type RequestStatus = 'new' | 'pending' | 'approved' | 'rejected';

interface RequestCardProps {
  name: string;
  status: RequestStatus;
  timeAgo: string;
  plan: string;
  paymentMethod: string;
  isSelected?: boolean;
  subDetail?: string;
  subDetailIcon?: keyof typeof Ionicons.glyphMap;
  subDetailColor?: string;
  avatar?: string;
  onApprove?: () => void;
  onReject?: () => void;
}

const statusConfig = {
  new: { color: '#2196F3', label: 'NEW' },
  pending: { color: '#FFB300', label: 'REVIEWED' },
  approved: { color: '#4CAF50', label: 'APPROVED' },
  rejected: { color: '#E63946', label: 'REJECTED' },
};

export const RequestCard: React.FC<RequestCardProps> = ({
  name,
  status,
  timeAgo,
  plan,
  paymentMethod,
  isSelected = false,
  subDetail,
  subDetailIcon,
  subDetailColor,
  avatar,
  onApprove,
  onReject,
}) => {
  const config = statusConfig[status as keyof typeof statusConfig];
  const { colors, isDark } = useTheme();

  return (
    <TouchableOpacity 
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]} 
      activeOpacity={0.8}
    >
      {/* Left indicator border */}
      <View style={[styles.statusIndicator, { backgroundColor: config.color }]} />

      <View style={styles.mainContent}>
        <View style={styles.topRow}>
          <View style={styles.leftGroup}>
            <View style={[styles.avatarContainer, { backgroundColor: colors.surfaceLight, borderColor: colors.border }]}>
              {avatar ? (
                <Image source={{ uri: avatar }} style={styles.avatarImage} />
              ) : (
                <View style={[styles.avatarPlaceholder, { backgroundColor: isDark ? 'rgba(230, 57, 70, 0.1)' : 'rgba(230, 57, 70, 0.05)' }]}>
                  <Text style={styles.avatarInitials}>{name[0].toUpperCase()}</Text>
                </View>
              )}
            </View>
            <View style={styles.identity}>
              <View style={styles.nameRow}>
                <Text style={[styles.name, { color: colors.text }]}>{name}</Text>
                <View style={[styles.badge, { backgroundColor: `${config.color}20` }]}>
                  <Text style={[styles.badgeText, { color: config.color }]}>{config.label}</Text>
                </View>
              </View>
              <Text style={[styles.timeAgo, { color: colors.textSecondary }]}>Submitted {timeAgo}</Text>
            </View>
          </View>
          {onReject && (
            <TouchableOpacity onPress={onReject}>
              <Ionicons name="close-circle-outline" size={24} color="#E63946" />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.bottomRow}>
          <View style={styles.planGroup}>
            <MaterialCommunityIcons name="swap-horizontal" size={16} color={colors.textSecondary} />
            <Text style={[styles.planText, { color: colors.textSecondary }]}>{plan}</Text>
          </View>
          <View style={styles.paymentGroup}>
            {subDetailIcon ? (
              <Ionicons name={subDetailIcon} size={16} color={subDetailColor || colors.textSecondary} />
            ) : (
              <Ionicons name="card-outline" size={16} color={colors.textSecondary} />
            )}
            <Text style={[styles.paymentText, subDetailColor ? { color: subDetailColor } : { color: colors.textSecondary }]}>
              {subDetail || paymentMethod}
            </Text>
          </View>
        </View>

        {status !== 'approved' && onApprove && (
          <TouchableOpacity style={styles.approveBtn} onPress={onApprove}>
            <Ionicons name="checkmark-circle" size={18} color="#FFF" style={{ marginRight: 8 }} />
            <Text style={styles.approveBtnText}>Approve Member</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    marginBottom: 12,
    flexDirection: 'row',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.02)',
  },
  statusIndicator: {
    width: 4,
    height: '100%',
  },
  mainContent: {
    flex: 1,
    padding: 16,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  leftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1E1E1E',
    overflow: 'hidden',
    marginRight: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(230, 57, 70, 0.1)',
  },
  avatarInitials: {
    color: '#E63946',
    fontSize: 16,
    fontWeight: '800',
  },
  identity: {
    justifyContent: 'center',
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  name: {
    color: '#F5F5F5',
    fontSize: 16,
    fontWeight: '800',
    marginRight: 8,
    flexShrink: 1,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 2,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  timeAgo: {
    color: '#A8A8A8',
    fontSize: 12,
    marginTop: 2,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  planGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  planText: {
    color: '#A8A8A8',
    fontSize: 12,
    marginLeft: 6,
    fontWeight: '600',
  },
  paymentGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginLeft: 16,
  },
  paymentText: {
    color: '#A8A8A8',
    fontSize: 12,
    marginLeft: 6,
    fontWeight: '600',
  },
  approveBtn: {
    backgroundColor: '#43A047',
    flexDirection: 'row',
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    shadowColor: '#43A047',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  approveBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '800',
  },
});
