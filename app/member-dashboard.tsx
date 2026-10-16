import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { findMemberById, GymMember, formatFirebaseDate } from '@/services/firebase';

export default function MemberDashboardScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('approved');
  const [member, setMember] = useState<GymMember | null>(null);
  const [loading, setLoading] = useState(true);



  useEffect(() => {
    const fetchMember = async () => {
      try {
        // Mocking 'GG-8492-X' as the current user's ID
        const data = await findMemberById('GG-8492-X');
        setMember(data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchMember();
  }, []);

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color="#E63946" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoWrapper}>
          <View style={styles.logoSquare}>
            <Text style={styles.logoText}>G</Text>
          </View>
          <Text style={styles.brandName}>GymGuard</Text>
        </View>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.closeText}>Close</Text>
        </TouchableOpacity>
      </View>

      {/* Tab Switcher */}
      <View style={styles.tabContainer}>
        <View style={styles.tabSwitcher}>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'approved' && styles.tabActive]} 
            onPress={() => setActiveTab('approved')}
          >
            <Text style={[styles.tabText, activeTab === 'approved' && styles.tabTextActive]}>Approved</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'renewal' && styles.tabActive]} 
            onPress={() => setActiveTab('renewal')}
          >
            <Text style={[styles.tabText, activeTab === 'renewal' && styles.tabTextActive]}>Renewal</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Membership Status Card */}
        <View style={[styles.statusCard, member?.status !== 'active' && { borderColor: '#E63946' }]}>
          <View style={[styles.checkmarkWrapper, member?.status !== 'active' && { backgroundColor: 'rgba(230, 57, 70, 0.1)', borderColor: '#E63946' }]}>
            <Ionicons name={member?.status === 'active' ? "checkmark" : "alert"} size={24} color="#FFF" />
          </View>
          
          <Text style={styles.greeting}>Welcome, {member?.name || "Member"}!</Text>
          <Text style={styles.statusSub}>
            {member?.status === 'active' ? "Your membership is now active." : "Your membership has expired."}
          </Text>

          <View style={styles.infoBox}>
            <View style={styles.infoRow}>
              <View>
                <Text style={styles.infoLabel}>MEMBER ID</Text>
                <Text style={styles.infoValue}>{member?.memberId || "---"}</Text>
              </View>
              <View style={[styles.statusBadge, member?.status !== 'active' && { backgroundColor: 'rgba(230, 57, 70, 0.1)', borderColor: 'rgba(230, 57, 70, 0.2)' }]}>
                <Text style={[styles.statusBadgeText, member?.status !== 'active' && { color: '#E63946' }]}>
                  {member?.status?.toUpperCase() || "PENDING"}
                </Text>
              </View>
            </View>
            
            <View style={styles.divider} />
            
            <View style={styles.infoRow}>
              <View>
                <Text style={styles.infoLabel}>EXPIRES</Text>
                <Text style={styles.infoValue}>
                  {formatFirebaseDate(member?.expiryDate, "---")}
                </Text>
              </View>
              <View style={styles.miniIconWrapper}>
                <MaterialCommunityIcons name="dumbbell" size={18} color="#A8A8A8" />
              </View>
            </View>
          </View>
        </View>

        {/* Membership Details Card */}
        <View style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={20} color="#A8A8A8" />
            <View style={styles.detailText}>
              <Text style={styles.detailLabel}>Member Since</Text>
              <Text style={styles.detailValue}>
                {formatFirebaseDate(member?.createdAt, "Apr 1, 2026")}
              </Text>
            </View>
          </View>
          
          <View style={styles.detailRow}>
            <Ionicons name="card-outline" size={20} color="#A8A8A8" />
            <View style={styles.detailText}>
              <Text style={styles.detailLabel}>Membership Type</Text>
              <Text style={styles.detailValue}>{member?.plan || "Monthly Plan"}</Text>
            </View>
          </View>

          <View style={[styles.detailRow, { borderBottomWidth: 0 }]}>
            <Ionicons name="shield-checkmark-outline" size={20} color="#A8A8A8" />
            <View style={styles.detailText}>
              <Text style={styles.detailLabel}>Verification Status</Text>
              <Text style={styles.detailValue}>Verified Permanent Member</Text>
            </View>
          </View>
        </View>

        {/* Support Card */}
        <View style={styles.supportCard}>
          <Ionicons name="help-circle-outline" size={20} color="#E63946" />
          <View style={styles.supportContent}>
            <Text style={styles.supportTitle}>Membership Support</Text>
            <Text style={styles.supportDesc}>
              Visit the gym counter if you need to update your details or renewal plan.
            </Text>
          </View>
        </View>

        {/* Footer Support */}
        <View style={styles.footer}>
          <Text style={styles.supportText}>Need help? Contact support</Text>
          <TouchableOpacity>
            <Text style={styles.supportEmail}>support@gymguard.app</Text>
          </TouchableOpacity>
        </View>

        {/* Spacing */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#101010',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  logoWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoSquare: {
    width: 32,
    height: 32,
    backgroundColor: '#E63946',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  logoText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '900',
  },
  brandName: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  closeText: {
    color: '#555',
    fontSize: 14,
    fontWeight: '700',
  },
  tabContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
  },
  tabSwitcher: {
    flexDirection: 'row',
    backgroundColor: '#1E1E1E',
    borderRadius: 14,
    padding: 6,
  },
  tab: {
    flex: 1,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
  },
  tabActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  tabText: {
    color: '#555',
    fontSize: 14,
    fontWeight: '700',
  },
  tabTextActive: {
    color: '#FFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  statusCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 32,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.02)',
  },
  checkmarkWrapper: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(67, 160, 71, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#43A047',
    marginBottom: 20,
  },
  greeting: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
  },
  statusSub: {
    color: '#555',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 6,
    marginBottom: 32,
  },
  infoBox: {
    width: '100%',
    backgroundColor: '#1E1E1E',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    color: '#555',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 4,
  },
  infoValue: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '800',
  },
  statusBadge: {
    backgroundColor: 'rgba(67, 160, 71, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(67, 160, 71, 0.2)',
  },
  statusBadgeText: {
    color: '#43A047',
    fontSize: 10,
    fontWeight: '900',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginVertical: 16,
  },
  miniIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footer: {
    marginTop: 40,
    alignItems: 'center',
  },
  supportText: {
    color: '#555',
    fontSize: 13,
    fontWeight: '600',
  },
  supportEmail: {
    color: '#E63946',
    fontSize: 14,
    fontWeight: '800',
    marginTop: 4,
  },
  detailsCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 24,
    padding: 8,
    marginTop: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  detailText: {
    marginLeft: 16,
  },
  detailLabel: {
    color: '#555',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailValue: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
    marginTop: 2,
  },
  supportCard: {
    backgroundColor: 'rgba(230, 57, 70, 0.05)',
    borderRadius: 20,
    padding: 20,
    marginTop: 24,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(230, 57, 70, 0.1)',
  },
  supportContent: {
    flex: 1,
    marginLeft: 16,
  },
  supportTitle: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 4,
  },
  supportDesc: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
});
