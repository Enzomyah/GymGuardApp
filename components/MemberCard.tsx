import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';

import { useRouter } from 'expo-router';

export type MemberStatus = 'active' | 'expiring' | 'expired' | 'deactivated';

interface MemberCardProps {
  name: string;
  contact: string;
  status: MemberStatus;
  expires: string;
  rawExpiry?: any;
  lastSeen: string;
  avatar?: string;
  initials?: string;
  email?: string;
  onExtend?: () => void;
  onRemove?: () => void;
  onPress?: () => void;
}

const statusConfig = {
  active: { color: '#4CAF50', label: 'Active' },
  expiring: { color: '#FF9800', label: 'Expiring Soon' }, 
  expired: { color: '#E63946', label: 'Expired' },
  deactivated: { color: '#888', label: 'Suspended' },
};

export const MemberCard: React.FC<MemberCardProps> = ({
  name,
  contact,
  status,
  expires,
  rawExpiry,
  lastSeen,
  avatar,
  initials,
  email,
  onExtend,
  onRemove,
  onPress,
}) => {
  const router = useRouter();
  const { colors, isDark } = useTheme();

  // Dynamically compute status based on dates to prevent "Active" showing for expired/expiring members
  let computedStatus: MemberStatus = status;

  if (status !== 'deactivated') {
    let expiryDateObj: Date | null = null;

    if (rawExpiry) {
      if (rawExpiry.toDate && typeof rawExpiry.toDate === 'function') expiryDateObj = rawExpiry.toDate();
      else if (rawExpiry.seconds !== undefined) expiryDateObj = new Date(rawExpiry.seconds * 1000);
      else if (rawExpiry instanceof Date) expiryDateObj = rawExpiry;
    }

    if (!expiryDateObj && expires && expires !== '---') {
      let d = new Date(expires);
      if (isNaN(d.getTime())) {
        const parts = expires.split('/');
        if (parts.length === 3) {
          const day = parseInt(parts[0], 10);
          const month = parseInt(parts[1], 10) - 1;
          const year = parseInt(parts[2], 10);
          d = new Date(year, month, day);
        }
      }
      if (!isNaN(d.getTime())) expiryDateObj = d;
    }

    if (expiryDateObj) {
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const checkDate = new Date(expiryDateObj);
      checkDate.setHours(0, 0, 0, 0);

      if (checkDate < now || status === 'expired') {
        computedStatus = 'expired';
      } else {
        const diffDays = Math.ceil((checkDate.getTime() - now.getTime()) / (1000 * 3600 * 24));
        if (diffDays <= 7) {
          computedStatus = 'expiring';
        } else {
          computedStatus = 'active';
        }
      }
    }
  }

  const config = statusConfig[computedStatus as keyof typeof statusConfig] || statusConfig.active;

  return (
    <TouchableOpacity 
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]} 
      activeOpacity={0.8}
      onPress={onPress}
    >
      <View style={styles.topSection}>
        <View style={styles.leftInfo}>
          {avatar ? (
            <Image source={{ uri: avatar }} style={styles.avatar} />
          ) : (
            <View style={[styles.initialsContainer, { backgroundColor: colors.surfaceLight }]}>
              <Text style={[styles.initialsText, { color: colors.text }]}>{initials}</Text>
            </View>
          )}
          <View style={styles.nameContainer}>
            <Text style={[styles.memberName, { color: colors.text }]}>{name}</Text>
            <Text style={[styles.contactText, { color: colors.textSecondary }]}>{contact}</Text>
          </View>
        </View>
        
        <View style={styles.actionGroup}>
          {onExtend && (computedStatus === 'expired' || computedStatus === 'expiring') && (
            <TouchableOpacity style={styles.renewBtn} onPress={onExtend}>
              <Ionicons name="refresh" size={14} color="#FFF" style={{ marginRight: 4 }} />
              <Text style={styles.renewBtnText}>Renew</Text>
            </TouchableOpacity>
          )}
          
          {onRemove && (computedStatus === 'expired' || computedStatus === 'expiring') && (
            <TouchableOpacity style={styles.removeBtn} onPress={onRemove}>
              <Ionicons name="trash-outline" size={18} color="#E63946" />
            </TouchableOpacity>
          )}

          {!onRemove && !onExtend && (
            <TouchableOpacity style={styles.menuBtn}>
              <Ionicons name="ellipsis-vertical" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.bottomSection}>
        <View style={styles.statusInfo}>
          <View style={[styles.statusDot, { backgroundColor: config.color }]} />
          <Text style={[styles.statusLabel, { color: config.color }]}>{computedStatus === 'expiring' ? 'Expiring Soon' : config.label}</Text>
          
          {!email && (
            <View style={[styles.noEmailBadge, { backgroundColor: isDark ? 'rgba(230, 57, 70, 0.15)' : 'rgba(230, 57, 70, 0.1)' }]}>
              <Ionicons name="warning" size={10} color="#E63946" style={{ marginRight: 4 }} />
              <Text style={styles.noEmailText}>NO EMAIL</Text>
            </View>
          )}
        </View>
        
        <View style={styles.timestampInfo}>
          <Text style={[styles.expiryText, { color: colors.textSecondary }]}>
            Expires: <Text style={[styles.expiryValue, { color: colors.text }, computedStatus === 'expiring' ? { color: '#FF9800' } : null, computedStatus === 'expired' ? { color: '#E63946' } : null]}>{expires}</Text>
          </Text>
          <Text style={[styles.lastSeenText, { color: colors.textSecondary, opacity: 0.7 }]}>Last seen: {lastSeen}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 24,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.02)',
  },
  topSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  leftInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#333',
  },
  initialsContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  initialsText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
  },
  nameContainer: {
    marginLeft: 16,
    flex: 1,
  },
  memberName: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '800',
    flexShrink: 1,
  },
  contactText: {
    color: '#A8A8A8',
    fontSize: 13,
    marginTop: 2,
  },
  menuBtn: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -4,
  },
  actionGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: -4,
  },
  extendBtn: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderRadius: 8,
  },
  renewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 8,
  },
  renewBtnText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 12,
  },
  removeBtn: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(230, 57, 70, 0.1)',
    borderRadius: 8,
    marginLeft: 4,
  },
  bottomSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  statusInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  statusLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  timestampInfo: {
    alignItems: 'flex-end',
  },
  expiryText: {
    color: '#A8A8A8',
    fontSize: 12,
    fontWeight: '500',
  },
  expiryValue: {
    color: '#FFF',
    fontWeight: '800',
  },
  lastSeenText: {
    color: '#555',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },
  noEmailBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 12,
  },
  noEmailText: {
    color: '#E63946',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
