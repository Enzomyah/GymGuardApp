import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, TextInput, ActivityIndicator, Alert, RefreshControl, DeviceEventEmitter, Platform, ScrollView, Modal } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { MemberCard } from '@/components/MemberCard';
import { db } from '@/firebaseConfig';
import { collection, query, getDocs, limit, orderBy, startAfter, deleteDoc } from 'firebase/firestore';
import { DashboardHeader } from '@/components/DashboardHeader';
import { GymMember, extendMembership, deleteMember, formatFirebaseDate } from '@/services/firebase';
import { syncFromOldDatabase } from '@/services/syncService';
import { useTheme } from '@/context/ThemeContext';
import { RenewModal } from '@/components/RenewModal';
import { ExportModal, ExportPeriod } from '@/components/ExportModal';

export default function MembersScreen() {
  const router = useRouter();
  const [members, setMembers] = useState<GymMember[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<GymMember[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'expiring' | 'expired' | 'deactivated'>('all');
  const [loading, setLoading] = useState(true);
  const { colors, isDark } = useTheme();
  const [lastVisible, setLastVisible] = useState<any>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [showRefreshBanner, setShowRefreshBanner] = useState(false);
  const [memberToRenew, setMemberToRenew] = useState<GymMember | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const fetchMembers = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const q = query(
        collection(db, "members"), 
        orderBy("createdAt", "desc"), 
        limit(20)
      );
      const snapshot = await getDocs(q);
      
      const memberList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as GymMember[];
      
      setMembers(memberList);
      applyFilters(memberList, searchQuery, statusFilter);
      
      if (snapshot.docs.length > 0) {
         setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
         setHasMore(snapshot.docs.length === 20);
      } else {
         setHasMore(false);
      }
      setShowRefreshBanner(false); // Hide banner after fetching
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Could not fetch members.");
    } finally {
      if (isRefresh) setRefreshing(false);
      else setLoading(false);
    }
  };

  const fetchMoreMembers = async () => {
    if (loadingMore || !hasMore || refreshing || loading) return;
    
    setLoadingMore(true);
    try {
      const q = query(
        collection(db, "members"),
        orderBy("createdAt", "desc"),
        startAfter(lastVisible),
        limit(20)
      );
      const snapshot = await getDocs(q);
      
      const newMembers = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as GymMember[];
      
      if (newMembers.length > 0) {
        const updatedList = [...members, ...newMembers];
        setMembers(updatedList);
        applyFilters(updatedList, searchQuery, statusFilter);
        setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
        setHasMore(snapshot.docs.length === 20);
      } else {
        setHasMore(false);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchMembers();
    
    // Listen for new approvals
    const subscription = DeviceEventEmitter.addListener('member_approved', () => {
      setShowRefreshBanner(true);
      // Optional: we can automatically scroll to top here, but the user explicitly wants a sign.
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const getComputedStatus = (m: GymMember): 'active' | 'expiring' | 'expired' | 'deactivated' => {
    if (m.status === 'deactivated' || m.status === 'suspended') return 'deactivated';

    let expiryDateObj: Date | null = null;
    if (m.expiryDate?.toDate) {
      expiryDateObj = m.expiryDate.toDate();
    } else if (m.expiryDate?.seconds) {
      expiryDateObj = new Date(m.expiryDate.seconds * 1000);
    } else if (typeof m.expiryDate === 'string' && m.expiryDate !== '---') {
      const d = new Date(m.expiryDate);
      if (!isNaN(d.getTime())) expiryDateObj = d;
    } else if (m.expiryDate instanceof Date) {
      expiryDateObj = m.expiryDate;
    }

    if (!expiryDateObj) return m.status === 'expired' ? 'expired' : 'active';

    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const checkDate = new Date(expiryDateObj);
    checkDate.setHours(0, 0, 0, 0);

    if (checkDate < now || m.status === 'expired') {
      return 'expired';
    }

    const diffDays = Math.ceil((checkDate.getTime() - now.getTime()) / (1000 * 3600 * 24));
    if (diffDays <= 7) {
      return 'expiring';
    }

    return 'active';
  };

  const applyFilters = (list: GymMember[], search: string, filter: string) => {
    let result = list;

    // Status Filter
    if (filter !== 'all') {
      result = result.filter(m => getComputedStatus(m) === filter);
    }

    // Search Filter
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(m => 
        m.name.toLowerCase().includes(q) || 
        m.memberId.toLowerCase().includes(q) ||
        (m.email && m.email.toLowerCase().includes(q))
      );
    }

    setFilteredMembers(result);
  };

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    applyFilters(members, text, statusFilter);
  };

  const handleFilterChange = (filter: typeof statusFilter) => {
    setStatusFilter(filter);
    applyFilters(members, searchQuery, filter);
  };

  const handleExtend = (member: GymMember) => {
    setMemberToRenew(member);
  };

  const handleConfirmExtend = async (months: number) => {
    if (!memberToRenew || !memberToRenew.id) return;
    try {
      await extendMembership(memberToRenew.id, memberToRenew.expiryDate, months);
      Alert.alert("Success", `Membership extended by ${months} month${months > 1 ? 's' : ''}.`);
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
            } catch (error) {
              Alert.alert("Error", "Failed to remove member.");
            }
          }
        }
      ]
    );
  };

  const handleSyncOldData = () => {
    Alert.alert(
      "Sync from Old App",
      "Kukunin nito ang anumang bagong members at requests mula sa lumang app/database at ipapasok dito sa bagong app. Gusto mo bang ituloy?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sync Now",
          onPress: async () => {
            setIsSyncing(true);
            try {
              const res = await syncFromOldDatabase();
              if (res.syncedMembersCount === 0 && res.syncedRequestsCount === 0) {
                Alert.alert(
                  "Up to Date 👍",
                  "Walang bagong member o request sa lumang database. Updated na ang lahat!"
                );
              } else {
                let msg = `Napasok ang ${res.syncedMembersCount} bagong member(s)`;
                if (res.syncedRequestsCount > 0) {
                  msg += ` at ${res.syncedRequestsCount} bagong request(s)`;
                }
                if (res.newMemberNames.length > 0) {
                  msg += `:\n\n• ` + res.newMemberNames.slice(0, 5).join('\n• ');
                  if (res.newMemberNames.length > 5) {
                    msg += `\n...at ${res.newMemberNames.length - 5} pa`;
                  }
                }
                Alert.alert("Sync Successful 🎉", msg);
                fetchMembers(true);
                DeviceEventEmitter.emit('member_approved');
              }
            } catch (err: any) {
              console.error("Sync error:", err);
              Alert.alert("Sync Error", err?.message || "Hindi makakonekta sa lumang database.");
            } finally {
              setIsSyncing(false);
            }
          }
        }
      ]
    );
  };

  const handleExportClick = () => {
    setShowExportModal(true);
  };

  const handleExport = async (filterType: ExportPeriod) => {
    setShowExportModal(false);
    setLoading(true);
    try {
      // 1. Fetch ALL members from Firestore
      const snap = await getDocs(query(collection(db, "members"), orderBy("name", "asc")));
      let allMembers = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as GymMember[];

      // Filter by Month if not "All Time"
      if (filterType !== 'all') {
        let targetMonth: number;
        let targetYear: number;
        
        if (typeof filterType === 'object' && filterType.month !== undefined) {
          // Custom selection
          targetMonth = filterType.month;
          targetYear = filterType.year;
        } else {
          // 'this_month' or 'last_month'
          const targetDate = new Date();
          if (filterType === 'last_month') {
            targetDate.setMonth(targetDate.getMonth() - 1);
          }
          targetMonth = targetDate.getMonth();
          targetYear = targetDate.getFullYear();
        }

        allMembers = allMembers.filter(m => {
          const mDate = m.startDate?.toDate ? m.startDate.toDate() : (m.createdAt?.toDate ? m.createdAt.toDate() : new Date());
          return mDate.getMonth() === targetMonth && mDate.getFullYear() === targetYear;
        });
      }

      if (allMembers.length === 0) {
        Alert.alert("Empty", "No members found for the selected period.");
        return;
      }

      let periodStr = 'All Time';
      if (filterType === 'this_month') periodStr = 'This Month';
      else if (filterType === 'last_month') periodStr = 'Last Month';
      else if (typeof filterType === 'object') {
        const temp = new Date(filterType.year, filterType.month);
        periodStr = temp.toLocaleString('default', { month: 'long', year: 'numeric' });
      }

      const rowsHtml = allMembers.map(m => {
        const start = formatFirebaseDate(m.startDate, 'N/A');
        const expiry = formatFirebaseDate(m.expiryDate, 'N/A');
        const statusLabel = m.status.charAt(0).toUpperCase() + m.status.slice(1);
        
        return `
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd;">${m.name}</td>
            <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold; color: ${m.status === 'expired' ? '#E63946' : '#333'}">${statusLabel}</td>
            <td style="padding: 10px; border: 1px solid #ddd;">${start}</td>
            <td style="padding: 10px; border: 1px solid #ddd;">${expiry}</td>
          </tr>
        `;
      }).join('');

      const html = `
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
            <style>
              body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 20px; }
              h1 { color: #E63946; text-align: center; margin-bottom: 5px; }
              h3 { color: #555; text-align: center; margin-top: 0; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th { background-color: #f2f2f2; padding: 12px; border: 1px solid #ddd; text-align: left; }
            </style>
          </head>
          <body>
            <h1>GymGuard Logbook</h1>
            <h3>Period: ${periodStr}</h3>
            <p>Generated on: ${new Date().toLocaleDateString()}</p>
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Status</th>
                  <th>Start Date</th>
                  <th>Expiry Date</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
              </tbody>
            </table>
          </body>
        </html>
      `;

      if (Platform.OS === 'web') {
        await Print.printAsync({ html });
      } else {
        const { uri } = await Print.printToFileAsync({ html });
        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable) {
          await Sharing.shareAsync(uri, { dialogTitle: 'Export Gym Logbook (PDF)' });
        }
      }
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Failed to generate report.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <FlatList 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        data={filteredMembers}
        keyExtractor={(item, index) => item.id || `member-${index}`}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={() => fetchMembers(true)} 
            tintColor="#E63946"
            colors={['#E63946']}
          />
        }
        onEndReached={fetchMoreMembers}
        onEndReachedThreshold={0.5}
        ListHeaderComponent={
          <>
            <DashboardHeader />
            
            <View style={{ marginTop: 18, marginBottom: 4 }}>
              <Text style={{ color: colors.text, fontSize: 26, fontWeight: '800', letterSpacing: -0.5 }}>Logbook</Text>
              
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 }}>
                <TouchableOpacity 
                  style={[styles.syncBtn, isSyncing && { opacity: 0.7 }]}
                  onPress={handleSyncOldData}
                  disabled={isSyncing}
                  activeOpacity={0.8}
                >
                  {isSyncing ? (
                    <ActivityIndicator size="small" color="#FFF" style={{ marginRight: 6 }} />
                  ) : (
                    <Ionicons name="cloud-download-outline" size={16} color="#FFF" style={{ marginRight: 6 }} />
                  )}
                  <Text style={styles.actionBtnText}>{isSyncing ? "Syncing..." : "Sync Old App"}</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.exportBtn}
                  onPress={handleExportClick}
                  activeOpacity={0.8}
                >
                  <Ionicons name="download-outline" size={16} color="#FFF" style={{ marginRight: 6 }} />
                  <Text style={styles.actionBtnText}>Export PDF</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Info Sign for Users - Only shows when new members are approved */}
            {showRefreshBanner && (
              <View style={styles.infoBanner}>
                <Ionicons name="information-circle" size={20} color="#E63946" />
                <Text style={styles.infoBannerText}>
                  A new member was approved! Pull down to refresh.
                </Text>
              </View>
            )}

            {/* Search & Filter Section */}
            <View style={styles.searchSection}>
              <View style={[styles.searchWrapper, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Ionicons name="search-outline" size={20} color={colors.textSecondary} style={styles.searchIcon} />
                <TextInput 
                  placeholder="Search downloaded members..." 
                  placeholderTextColor={colors.textSecondary} 
                  style={[styles.searchInput, { color: colors.text }]}
                  value={searchQuery}
                  onChangeText={handleSearch}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => handleSearch('')}>
                    <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Filter Tabs (Pills) */}
            <View style={styles.pillsContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 20 }}>
                {(['all', 'active', 'expiring', 'expired', 'deactivated'] as const).map((filter) => {
                  const isActive = statusFilter === filter;
                  return (
                    <TouchableOpacity 
                      key={filter}
                      style={[
                        styles.pill, 
                        { backgroundColor: colors.surface, borderColor: colors.border },
                        isActive && { backgroundColor: '#E63946', borderColor: '#E63946' }
                      ]}
                      onPress={() => handleFilterChange(filter)}
                    >
                      <Text style={[
                        styles.pillText, 
                        { color: colors.textSecondary }, 
                        isActive && { color: '#FFFFFF', fontWeight: '800' }
                      ]}>
                        {filter === 'expiring' ? 'Expiring Soon' : (filter.charAt(0).toUpperCase() + filter.slice(1))}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {loading && !refreshing && (
              <ActivityIndicator color="#E63946" style={{ marginTop: 40 }} />
            )}
          </>
        }
        renderItem={({ item: member }) => (
          <MemberCard 
            name={member.name} 
            contact={member.memberId} 
            status={member.status as any} 
            expires={formatFirebaseDate(member.expiryDate, "---")} 
            rawExpiry={member.expiryDate}
            lastSeen={formatFirebaseDate(member.lastSeen, "Never")} 
            initials={member.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
            avatar={member.avatar}
            email={member.email}
            onExtend={() => handleExtend(member)}
            onRemove={() => handleRemove(member)}
            onPress={() => router.push({ pathname: "/member-profile", params: { id: member.id } } as any)}
          />
        )}
        ListEmptyComponent={
          !loading ? (
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No members match your criteria.</Text>
          ) : null
        }
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator color="#E63946" style={{ marginVertical: 20 }} />
          ) : (
            <View style={{ height: 100 }} />
          )
        }
      />
      {memberToRenew && (
        <RenewModal 
          visible={!!memberToRenew} 
          onClose={() => setMemberToRenew(null)} 
          onConfirm={handleConfirmExtend} 
          memberName={memberToRenew.name} 
        />
      )}

      <ExportModal 
        visible={showExportModal}
        onClose={() => setShowExportModal(false)}
        onExport={handleExport}
      />

      {/* Sync Progress Modal */}
      <Modal visible={isSyncing} transparent animationType="fade">
        <View style={styles.syncModalOverlay}>
          <View style={[styles.syncModalContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <ActivityIndicator size="large" color="#E63946" />
            <Text style={[styles.syncModalTitle, { color: colors.text }]}>Syncing from Old App</Text>
            <Text style={[styles.syncModalDesc, { color: colors.textSecondary }]}>
              Kumokonekta sa lumang database at ina-import ang mga bagong members...
            </Text>
          </View>
        </View>
      </Modal>
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
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E63946',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#E63946',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  exportBtn: {
    flexDirection: 'row',
    backgroundColor: '#16A34A',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#16A34A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  syncBtn: {
    flexDirection: 'row',
    backgroundColor: '#0284C7',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  actionBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  exportBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(230, 57, 70, 0.1)',
    padding: 12,
    borderRadius: 12,
    marginTop: 16,
    borderWidth: 1,
    borderColor: 'rgba(230, 57, 70, 0.2)',
  },
  infoBannerText: {
    color: '#E63946',
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 8,
  },
  searchSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 20,
  },
  searchWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    height: 52,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    color: '#F5F5F5',
    fontSize: 16,
  },
  pillsContainer: {
    flexDirection: 'row',
    marginBottom: 24,
    gap: 8,
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#1E1E1E',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  pillActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  pillText: {
    color: '#A8A8A8',
    fontSize: 13,
    fontWeight: '700',
  },
  pillTextActive: {
    color: '#FFF',
  },
  list: {
    paddingBottom: 20,
  },
  emptyText: {
    color: '#555',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 60,
  },
  syncModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  syncModalContent: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
  },
  syncModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 16,
    textAlign: 'center',
  },
  syncModalDesc: {
    fontSize: 13,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 18,
  },
});
