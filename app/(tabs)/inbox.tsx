import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, DeviceEventEmitter } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { RequestCard } from '@/components/RequestCard';
import { db, auth } from '@/firebaseConfig';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { approveMemberRequest, rejectMemberRequest, GymRequest } from '@/services/firebase';
import { DashboardHeader } from '@/components/DashboardHeader';
import { useTheme } from '@/context/ThemeContext';

export default function InboxScreen() {
  const router = useRouter();
  const [requests, setRequests] = useState<GymRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'all' | 'GCash' | 'Cash'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const { colors, isDark } = useTheme();

  useEffect(() => {
    if (!auth.currentUser) {
      setLoading(false);
      return;
    }

    const q = query(collection(db, "requests"), where("status", "==", "pending"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const reqList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as GymRequest[];
      setRequests(reqList);
      setLoading(false);
    }, (error) => {
      if (error.code !== 'permission-denied') {
        console.warn("Inbox listener error:", error.message);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleApprove = async (request: GymRequest) => {
    Alert.alert(
      "Approve Member",
      `Are you sure you want to approve ${request.name}?`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Approve", 
          onPress: async () => {
            try {
              if (!request.id) return;
              await approveMemberRequest(request.id, request);
              DeviceEventEmitter.emit('member_approved');
              
              Alert.alert("Success", `${request.name} has been approved!`);
            } catch (error) {
              console.error("Approval error:", error);
              Alert.alert("Error", "Failed to approve request.");
            }
          }
        }
      ]
    );
  };

  const handleReject = async (request: GymRequest) => {
    Alert.alert(
      "Reject Request",
      `Delete entry for ${request.name}? This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Reject", 
          style: "destructive",
          onPress: async () => {
            try {
              if (!request.id) return;
              await rejectMemberRequest(request.id);
            } catch (error) {
              Alert.alert("Error", "Failed to reject request.");
            }
          }
        }
      ]
    );
  };

  const getTimeAgo = (createdAt: any) => {
    if (!createdAt?.toDate) return 'Just now';
    const diffMs = Date.now() - createdAt.toDate().getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  const filteredRequests = requests.filter(req => {
    // 1. Filter by Payment Method
    const matchesFilter = activeFilter === 'all' || 
      (activeFilter === 'Cash' ? (req.paymentMethod.includes('Counter') || req.paymentMethod.includes('Cash')) : req.paymentMethod === activeFilter);
    
    if (!matchesFilter) return false;

    // 2. Filter by Name
    if (searchQuery.trim()) {
      return req.name.toLowerCase().includes(searchQuery.toLowerCase());
    }

    return true;
  });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <DashboardHeader />
        {/* Search & Filter */}
        <View style={styles.searchSection}>
          <View style={[styles.searchWrapper, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="search-outline" size={20} color={colors.textSecondary} style={styles.searchIcon} />
            <TextInput 
              placeholder="Search by name..." 
              placeholderTextColor={colors.textSecondary} 
              style={[styles.searchInput, { color: colors.text }]}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
          
          <View style={styles.filterRow}>
            {(['all', 'GCash', 'Cash'] as const).map((filter) => (
              <TouchableOpacity 
                key={filter}
                style={[
                  styles.filterTab, 
                  { backgroundColor: colors.surface, borderColor: colors.border },
                  activeFilter === filter && { backgroundColor: isDark ? 'rgba(230, 57, 70, 0.1)' : 'rgba(230, 57, 70, 0.05)', borderColor: 'rgba(230, 57, 70, 0.3)' }
                ]}
                onPress={() => setActiveFilter(filter)}
              >
                <Text style={[styles.filterTabText, { color: colors.textSecondary }, activeFilter === filter && { color: colors.danger }]}>
                  {filter === 'all' ? 'All' : filter}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* List */}
        {loading ? (
          <ActivityIndicator color="#E63946" style={{ marginTop: 40 }} />
        ) : (
          <View style={styles.list}>
            {filteredRequests.length === 0 ? (
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No pending requests found.</Text>
            ) : (
              filteredRequests.map((req) => (
                <RequestCard 
                  key={req.id}
                  name={req.name} 
                  status={req.status as any} 
                  timeAgo={getTimeAgo(req.createdAt)} 
                  plan={req.plan || "Monthly Plan"} 
                  paymentMethod={req.paymentMethod} 
                  subDetail={req.expiryDate || 'N/A'}
                  subDetailIcon="calendar-outline"
                  avatar={req.avatar}
                  onApprove={() => handleApprove(req)}
                  onReject={() => handleReject(req)}
                />
              ))
            )}
          </View>
        )}

        {/* Extra spacing for tab bar and FAB */}
        <View style={{ height: 100 }} />
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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandInfo: {
    marginLeft: 16,
  },
  headerTitle: {
    color: '#F5F5F5',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    color: '#A8A8A8',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    marginTop: -2,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeDot: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E63946',
    borderWidth: 1.5,
    borderColor: '#101010',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  searchSection: {
    marginTop: 16,
    marginBottom: 24,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    height: 52,
    borderRadius: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
  },
  filterRow: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 8,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  filterTabActive: {
    backgroundColor: 'rgba(230, 57, 70, 0.1)',
    borderColor: 'rgba(230, 57, 70, 0.3)',
  },
  filterTabText: {
    color: '#555',
    fontSize: 13,
    fontWeight: '700',
  },
  filterTabTextActive: {
    color: '#E63946',
  },
  emptyText: {
    color: '#555',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 60,
  },
  list: {
    gap: 16,
  },
});
