import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, RefreshControl, Linking, DeviceEventEmitter } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { collection, query, where, doc, getDoc, getDocs, Timestamp, orderBy, limit as firestoreLimit } from 'firebase/firestore';
import { db, auth } from '@/firebaseConfig';
import { DashboardHeader } from '@/components/DashboardHeader';
import { MetricCard } from '@/components/MetricCard';
import { MemberCard } from '@/components/MemberCard';
import { GymMember, extendMembership, deleteMember } from '@/services/firebase';
import { useTheme } from '@/context/ThemeContext';
import { useNotifications } from '@/context/NotificationContext';
import { RenewModal } from '@/components/RenewModal';

export default function DashboardScreen() {
  const router = useRouter();
  const [metrics, setMetrics] = useState({
    active: 0,
    expiredSoon: 0,
    pending: 0,
    total: 0
  });
  const [expiringMembers, setExpiringMembers] = useState<GymMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [memberToRenew, setMemberToRenew] = useState<GymMember | null>(null);
  const { colors, isDark } = useTheme();
  const { pendingCount } = useNotifications();

  // (Stats and Expiring Fetch functions defined once for reuse)
  const fetchAllData = async () => {
    if (!auth.currentUser) return;
    setRefreshing(true);
    
    try {
      // 1. Fetch Global Stats from the aggregated 'stats' document to save reads
      const statsDoc = await getDoc(doc(db, "stats", "dashboard"));
      let activeCount = 0;
      let totalCount = 0;
      if (statsDoc.exists()) {
        const statsData = statsDoc.data();
        activeCount = statsData.activeMembers || 0;
        totalCount = statsData.totalMembers || 0;
      }
      
      setMetrics(prev => ({ 
        ...prev, 
        active: activeCount, 
        total: totalCount,
        pending: pendingCount
      }));

      // 2. Fetch Expiring & Overdue members accurately
      const qMembers = collection(db, "members");
      const memSnap = await getDocs(qMembers);
      
      const now = new Date();
      now.setHours(0, 0, 0, 0);

      const attentionList: GymMember[] = [];
      let activeTotal = 0;
      let expiredSoonTotal = 0;

      memSnap.docs.forEach(d => {
        const data = d.data();
        const memberData = { id: d.id, ...data } as GymMember;
        if (memberData.status === 'deactivated' || memberData.status === 'suspended') return;

        let expiryDateObj: Date | null = null;
        if (memberData.expiryDate?.toDate) {
          expiryDateObj = memberData.expiryDate.toDate();
        } else if (memberData.expiryDate?.seconds) {
          expiryDateObj = new Date(memberData.expiryDate.seconds * 1000);
        } else if (typeof memberData.expiryDate === 'string' && (memberData.expiryDate as string) !== '---') {
          const dt = new Date(memberData.expiryDate as string);
          if (!isNaN(dt.getTime())) expiryDateObj = dt;
        } else if (memberData.expiryDate instanceof Date) {
          expiryDateObj = memberData.expiryDate;
        }

        let isOverdue = false;
        let isExpiringSoon = false;

        if (!expiryDateObj) {
          if (memberData.status === 'expired') isOverdue = true;
          else activeTotal++;
        } else {
          const checkDate = new Date(expiryDateObj);
          checkDate.setHours(0, 0, 0, 0);

          if (checkDate < now || memberData.status === 'expired') {
            isOverdue = true;
          } else {
            const diffDays = Math.ceil((checkDate.getTime() - now.getTime()) / (1000 * 3600 * 24));
            if (diffDays <= 7) {
              isExpiringSoon = true;
            }
            activeTotal++;
          }
        }

        if (isOverdue || isExpiringSoon) {
          expiredSoonTotal++;
          attentionList.push(memberData);
        }
      });

      setExpiringMembers(attentionList.slice(0, 10));
      setMetrics(prev => ({ 
        ...prev, 
        active: activeTotal > 0 ? activeTotal : prev.active,
        expiredSoon: expiredSoonTotal 
      }));
    } catch (e) {
      console.error("Manual refresh error:", e);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
    const sub1 = DeviceEventEmitter.addListener('member_approved', fetchAllData);
    const sub2 = DeviceEventEmitter.addListener('member_updated', fetchAllData);
    return () => {
      sub1.remove();
      sub2.remove();
    };
  }, []);

  useEffect(() => {
    setMetrics(prev => ({ ...prev, pending: pendingCount }));
  }, [pendingCount]);

  const onRefresh = React.useCallback(() => {
    fetchAllData();
  }, [pendingCount]);

  const handleExtend = (member: GymMember) => {
    setMemberToRenew(member);
  };

  const handleConfirmExtend = async (months: number) => {
    if (!memberToRenew || !memberToRenew.id) return;
    try {
      await extendMembership(memberToRenew.id, memberToRenew.expiryDate, months);
      Alert.alert("Success", `Membership renewed and extended by ${months} month${months > 1 ? 's' : ''}.`);
      await fetchAllData();
      DeviceEventEmitter.emit('member_updated');
    } catch (error) {
      Alert.alert("Error", "Failed to extend membership.");
    } finally {
      setMemberToRenew(null);
    }
  };

  const handleRemove = async (member: GymMember) => {
    Alert.alert(
      "Remove Member",
      `Are you sure you want to delete ${member.name}? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Remove", 
          style: "destructive",
          onPress: async () => {
            try {
              if (!member.id) return;
              await deleteMember(member.id);
              Alert.alert("Success", "Member removed successfully.");
              await fetchAllData();
              DeviceEventEmitter.emit('member_updated');
            } catch (error) {
              Alert.alert("Error", "Failed to remove member.");
            }
          }
        }
      ]
    );
  };
  const handleSendAllReminders = async () => {
    const membersWithEmail = expiringMembers.filter(m => m.email && m.status !== 'deactivated');
    
    if (membersWithEmail.length === 0) {
      Alert.alert("No emails", "None of these members have an email address recorded.");
      return;
    }

    Alert.alert(
      "Send Reminders",
      `This will open your phone's Email App (Gmail/Yahoo) to send reminders to ${membersWithEmail.length} members. It's 100% free.`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Open Email App", 
          onPress: async () => {
            const bccList = membersWithEmail.map(m => m.email).join(',');
            const subject = encodeURIComponent("Javenad Fitness Gym: Membership Notice");
            const body = encodeURIComponent("Hi Ka-Javenad!\n\nThis is a friendly reminder from Javenad Fitness Gym that your membership is either expiring in 2 days or has already expired. Please visit the gym counter to renew.\n\nRemember: \"Don't stop hangga't hindi ka pa masarap!\" 💪🔥\n\nThank you and see you at the gym!");
            
            const mailtoUrl = "mailto:?bcc=" + bccList + "&subject=" + subject + "&body=" + body;
            
            try {
              const supported = await Linking.canOpenURL(mailtoUrl);
              if (supported) {
                await Linking.openURL(mailtoUrl);
              } else {
                Alert.alert("Error", "No email app found on your phone.");
              }
            } catch (error) {
              Alert.alert("Error", "Could not open email app.");
            }
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh} 
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* Header */}
        <DashboardHeader />

        {/* Overview Header */}
        <View style={styles.overviewHeader}>
          <View>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Overview</Text>
            <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>Registration & Analytics</Text>
          </View>
        </View>

        {/* Metrics Grid */}
        <View style={styles.metricsGrid}>
          <MetricCard 
            title="Active Members" 
            value={loading ? "..." : metrics.active.toString()} 
            subtitle="Active Month" 
            icon="people" 
            onPress={() => router.push('/(tabs)/members' as any)}
          />
          <MetricCard 
            title="Action Needed" 
            value={loading ? "..." : metrics.expiredSoon.toString()} 
            subtitle="Expired Soon / Overdue" 
            icon="alert-circle" 
            variant="danger"
            onPress={() => router.push('/(tabs)/members' as any)}
          />
        </View>

        {/* New Requests Banner */}
        <TouchableOpacity 
          style={[styles.requestsCard, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.07)' : colors.surface, borderColor: colors.border }]} 
          activeOpacity={0.8}
          onPress={() => router.push('/(tabs)/inbox' as any)}
        >
          <View style={styles.requestsLeft}>
            <View style={[styles.requestsIcon, { backgroundColor: isDark ? 'rgba(33, 150, 243, 0.1)' : 'rgba(33, 150, 243, 0.05)' }]}>
              <Ionicons name="mail-unread" size={24} color={isDark ? '#FFF' : '#2196F3'} />
              {metrics.pending > 0 && <View style={[styles.miniBadge, { borderColor: colors.background }]} />}
            </View>
            <View style={styles.requestsText}>
              <Text style={[styles.requestsTitle, { color: colors.text }]}>{metrics.pending} New Pending Applications</Text>
              <Text style={[styles.requestsSubtitle, { color: colors.textSecondary }]}>Members waiting for monthly approval</Text>
            </View>
          </View>
          <View style={[styles.requestsArrow, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)' }]}>
            <Ionicons name="arrow-forward" size={18} color={isDark ? '#FFF' : '#333'} />
          </View>
        </TouchableOpacity>

        {/* Expiring Soon / Expired section */}
        <View style={styles.expiringSection}>
          <View style={styles.activityHeader}>
            <Text style={[styles.sectionTitleSmall, { color: colors.text }]}>Attention Required</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/members' as any)}>
              <Text style={styles.seeAll}>See All Members</Text>
            </TouchableOpacity>
          </View>
          
          <Text style={[styles.subtext, { color: colors.textSecondary }]}>
            These members are either expiring within 2 days or have already expired.
          </Text>

          {!loading && expiringMembers.length > 0 && (
            <TouchableOpacity 
              style={styles.sendAllBtn}
              onPress={handleSendAllReminders}
            >
              <Ionicons name="mail-outline" size={18} color="#FFF" style={{ marginRight: 8 }} />
              <Text style={styles.sendAllBtnText}>Send All Reminders Now</Text>
            </TouchableOpacity>
          )}

          {loading ? (
            <ActivityIndicator color="#E63946" style={{ marginTop: 20 }} />
          ) : expiringMembers.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="checkmark-circle-outline" size={48} color="#4CAF50" />
              <Text style={styles.emptyText}>All members are up to date!</Text>
            </View>
          ) : (
            <View style={styles.list}>
              {expiringMembers.map((member) => {
                return (
                  <MemberCard 
                    key={member.id}
                    name={member.name} 
                    contact={member.memberId} 
                    status={member.status as any} 
                    expires={member.expiryDate?.toDate ? member.expiryDate.toDate().toLocaleDateString() : "---"} 
                    lastSeen={member.startDate?.toDate ? member.startDate.toDate().toLocaleDateString() : (member.createdAt?.toDate ? member.createdAt.toDate().toLocaleDateString() : (member.lastSeen?.toDate ? member.lastSeen.toDate().toLocaleDateString() : "---"))} 
                    initials={member.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                    avatar={member.avatar}
                    email={member.email}
                    onExtend={() => handleExtend(member)}
                    onRemove={() => handleRemove(member)}
                    onPress={() => router.push({ pathname: "/member-profile", params: { id: member.id } } as any)}
                  />
                );
              })}
            </View>
          )}
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {memberToRenew && (
        <RenewModal 
          visible={!!memberToRenew} 
          onClose={() => setMemberToRenew(null)} 
          onConfirm={handleConfirmExtend} 
          memberName={memberToRenew.name} 
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#101010',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  overviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 24,
    marginBottom: 20,
  },
  sectionTitle: {
    color: '#F5F5F5',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  sectionTitleSmall: {
    color: '#F5F5F5',
    fontSize: 20,
    fontWeight: '800',
  },
  sectionSubtitle: {
    color: '#A8A8A8',
    fontSize: 14,
    fontWeight: '500',
    marginTop: 4,
  },
  metricsGrid: {
    flexDirection: 'row',
    marginHorizontal: -8,
  },
  requestsCard: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    borderRadius: 24,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  requestsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  requestsIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(33, 150, 243, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  requestsText: {
    flex: 1,
  },
  requestsTitle: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '800',
  },
  requestsSubtitle: {
    color: '#A8A8A8',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  requestsArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  miniBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#E63946',
    borderWidth: 2,
    borderColor: '#101010',
  },
  expiringSection: {
    marginTop: 32,
    width: '100%',
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  seeAll: {
    color: '#555',
    fontSize: 13,
    fontWeight: '700',
  },
  subtext: {
    color: '#888',
    fontSize: 13,
    marginBottom: 16,
  },
  list: {
    marginTop: 8,
  },
  emptyContainer: {
    marginTop: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#4CAF50',
    marginTop: 12,
    fontSize: 16,
    fontWeight: '600',
  },
  sendAllBtn: {
    backgroundColor: '#E63946',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    marginBottom: 20,
    shadowColor: '#E63946',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  sendAllBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '800',
  }
});
