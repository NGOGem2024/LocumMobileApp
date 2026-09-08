import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';

const { width: SW } = Dimensions.get('window');
const scale = (size: number) => (SW / 390) * size;

const C = {
  background: '#F9FAFB',
  cardBg: '#FFFFFF',
  border: '#E5E7EB',
  inputBg: '#F3F4F6',
  primary: '#007b8e',
  primaryLight: '#e0f5f8',
  ink: '#111827',
  textSub: '#4B5563',
  textMuted: '#9CA3AF',
  white: '#ffffff',
  success: '#10b981',
  urgent: '#ef4444', 
};

const MOCK_RECENT_TX = [
  { id: '1', hospital: 'Apollo Hospital', date: '24 Aug 2026', amount: '₹2,500', status: 'Paid' },
  { id: '2', hospital: 'Ruby Hall Clinic', date: '23 Aug 2026', amount: '₹800', status: 'Paid' },
];

const EarningsOverviewScreen = ({ navigation }: any) => {
  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={C.cardBg} />

      {/* Visually Separated Header (Matched to Schedule Screens) */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation?.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={scale(24)} color={C.ink} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Earnings Overview</Text>
        <View style={{ width: scale(24) }} /> 
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Total Earnings Card */}
        <View style={styles.totalCard}>
          <Text style={styles.totalAmountText}>₹45,680</Text>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          {/* This Month (Full Width) */}
          <View style={[styles.statCard, { marginBottom: scale(12) }]}>
            <Text style={styles.statLabel}>This month</Text>
            <Text style={styles.statAmount}>₹15,200</Text>
            <Text style={styles.statSubText}>+12% vs last month</Text>
          </View>

          {/* Pending & Paid (Half Width Row) */}
          <View style={styles.statsRow}>
            <View style={[styles.statCard, { flex: 1, marginRight: scale(6) }]}>
              <Text style={styles.statLabel}>Pending</Text>
              <Text style={styles.statAmount}>₹3,500</Text>
              <Text style={styles.statSubTextBase}>2 Payments</Text>
            </View>
            <View style={[styles.statCard, { flex: 1, marginLeft: scale(6) }]}>
              <Text style={styles.statLabel}>Paid</Text>
              <Text style={styles.statAmount}>₹42,180</Text>
              <Text style={styles.statSubTextBase}>12 Payments</Text>
            </View>
          </View>
        </View>

        {/* Recent Transactions Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Transactions</Text>
          <TouchableOpacity onPress={() => navigation.navigate('EarningsHistory')}>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.transactionsContainer}>
          {MOCK_RECENT_TX.map((tx) => (
            <TouchableOpacity key={tx.id} style={styles.txCard} activeOpacity={0.8}>
              <View style={styles.txLeft}>
                <Text style={styles.txHospital}>{tx.hospital}</Text>
                <Text style={styles.txDate}>{tx.date}</Text>
              </View>
              <View style={styles.txRight}>
                <Text style={styles.txAmount}>{tx.amount}</Text>
                <Text style={[
                  styles.txStatus, 
                  { color: tx.status === 'Paid' ? C.success : C.urgent }
                ]}>{tx.status}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default EarningsOverviewScreen;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: scale(16), 
    paddingVertical: scale(14), 
    backgroundColor: C.cardBg,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  backBtn: { padding: scale(4) },
  headerTitle: { fontSize: scale(17), fontWeight: '800', color: C.ink, letterSpacing: -0.3 },
  scrollContent: { paddingHorizontal: scale(20), paddingBottom: scale(100) },
  
  totalCard: { backgroundColor: C.primaryLight, borderRadius: scale(16), alignItems: 'center', justifyContent: 'center', paddingVertical: scale(28), marginTop: scale(20), marginBottom: scale(24) },
  totalAmountText: { fontSize: scale(32), fontWeight: '900', color: C.primary, letterSpacing: -0.5 },
  
  statsGrid: { marginBottom: scale(32) },
  statsRow: { flexDirection: 'row' },
  statCard: { backgroundColor: C.cardBg, borderRadius: scale(16), padding: scale(16), borderWidth: 1, borderColor: C.border, shadowColor: C.ink, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 15, elevation: 2 },
  statLabel: { fontSize: scale(13), color: C.textSub, fontWeight: '600', marginBottom: scale(8) },
  statAmount: { fontSize: scale(20), fontWeight: '900', color: C.primary, marginBottom: scale(4) },
  statSubTextBase: { fontSize: scale(12), color: C.textMuted, fontWeight: '500' },
  statSubText: { fontSize: scale(12), color: '#64748b', fontWeight: '500' }, 
  
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: scale(16) },
  sectionTitle: { fontSize: scale(16), fontWeight: '900', color: C.ink, letterSpacing: -0.3 },
  viewAllText: { fontSize: scale(13), fontWeight: '700', color: C.primary },
  transactionsContainer: { gap: scale(12) },
  txCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: C.cardBg, padding: scale(16), borderRadius: scale(16), borderWidth: 1, borderColor: C.border },
  txLeft: { flex: 1 },
  txHospital: { fontSize: scale(14), fontWeight: '800', color: C.ink, marginBottom: scale(4) },
  txDate: { fontSize: scale(12), color: C.textMuted, fontWeight: '500' },
  txRight: { alignItems: 'flex-end' },
  txAmount: { fontSize: scale(15), fontWeight: '900', color: C.primary, marginBottom: scale(4) },
  txStatus: { fontSize: scale(12), fontWeight: '800' }
});