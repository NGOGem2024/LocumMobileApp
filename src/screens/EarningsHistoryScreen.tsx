import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
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
  ink: '#111827',
  textSub: '#4B5563',
  textMuted: '#9CA3AF',
  white: '#ffffff',
  success: '#10b981',
  urgent: '#ef4444', 
};

const HISTORY_DATA = [
  { id: '1', dateStr: '24 Aug', hospital: 'Apollo Hospital', role: 'General Physician', amount: '₹2,500', status: 'Paid' },
  { id: '2', dateStr: '23 Aug', hospital: 'Ruby Hall Clinic', role: 'Internal Medicine', amount: '₹800', status: 'Paid' },
  { id: '3', dateStr: '20 Aug', hospital: 'Sahyadri Hospital', role: 'Emergency Medicine', amount: '₹1,200', status: 'Pending' },
  { id: '4', dateStr: '18 Aug', hospital: 'City Care Clinic', role: 'General Physician', amount: '₹1,000', status: 'Paid' },
];

const EarningsHistoryScreen = ({ navigation }: any) => {
  const [selectedMonth, setSelectedMonth] = useState('August 2026');

  const renderTransaction = ({ item }: { item: typeof HISTORY_DATA[0] }) => {
    const isPaid = item.status === 'Paid';

    return (
      <View style={styles.txRow}>
        {/* Left Column: Date */}
        <View style={styles.dateCol}>
          <Text style={styles.dateText}>{item.dateStr}</Text>
        </View>

        {/* Middle Column: Details */}
        <View style={styles.detailsCol}>
          <Text style={styles.hospitalText}>{item.hospital}</Text>
          <Text style={styles.roleText}>{item.role}</Text>
        </View>

        {/* Right Column: Amount & Status */}
        <View style={styles.amountCol}>
          <Text style={styles.amountText}>{item.amount}</Text>
          <Text style={[styles.statusText, { color: isPaid ? C.success : C.urgent }]}>
            {item.status}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={C.cardBg} />

      {/* Visually Separated Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation?.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={scale(24)} color={C.ink} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Earnings History</Text>
        <View style={{ width: scale(24) }} /> 
      </View>

      {/* Filter Button */}
      <View style={styles.filterContainer}>
        <TouchableOpacity style={styles.monthFilterBtn} activeOpacity={0.7}>
          <Text style={styles.monthFilterText}>{selectedMonth}</Text>
          <Ionicons name="chevron-down" size={scale(16)} color={C.ink} />
        </TouchableOpacity>
      </View>

      {/* List Container */}
      <View style={styles.listWrapper}>
        <FlatList
          data={HISTORY_DATA}
          keyExtractor={(item) => item.id}
          renderItem={renderTransaction}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.divider} />}
        />
      </View>
    </SafeAreaView>
  );
};

export default EarningsHistoryScreen;

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
  
  filterContainer: { alignItems: 'center', paddingVertical: scale(20), backgroundColor: C.background },
  monthFilterBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.cardBg, paddingHorizontal: scale(16), paddingVertical: scale(8), borderRadius: scale(20), borderWidth: 1, borderColor: C.border, gap: scale(6), shadowColor: C.ink, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 10, elevation: 2 },
  monthFilterText: { fontSize: scale(13), fontWeight: '700', color: C.ink },

  // UPDATED WRAPPER: Removed flex: 1, added flexShrink and full borderRadius
  listWrapper: { 
    flexShrink: 1, 
    backgroundColor: C.cardBg, 
    borderRadius: scale(24), 
    borderWidth: 1, 
    borderColor: C.border, 
    marginHorizontal: scale(20), 
    marginTop: scale(8),
    marginBottom: scale(24),
    overflow: 'hidden' 
  },
  listContent: { paddingVertical: scale(8) },
  divider: { height: 1, backgroundColor: C.border, marginLeft: scale(76) }, 
  
  txRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: scale(16), paddingHorizontal: scale(16) },
  dateCol: { width: scale(60) },
  dateText: { fontSize: scale(13), fontWeight: '600', color: C.textSub },
  detailsCol: { flex: 1, paddingRight: scale(12) },
  hospitalText: { fontSize: scale(14), fontWeight: '800', color: C.ink, marginBottom: scale(4) },
  roleText: { fontSize: scale(12), color: C.textMuted, fontWeight: '500' },
  amountCol: { alignItems: 'flex-end' },
  amountText: { fontSize: scale(15), fontWeight: '900', color: C.primary, marginBottom: scale(4) },
  statusText: { fontSize: scale(12), fontWeight: '800' }
});