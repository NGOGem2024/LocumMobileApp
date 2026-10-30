import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Dimensions,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../context/AuthContext';
import api from '../services/axiosConfig';
import { TransactionItem } from './EarningsOverviewScreen';

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
  warning: '#f59e0b',
  urgent: '#ef4444',
};

const formatINR = (amount: number = 0) => `₹${Number(amount || 0).toLocaleString('en-IN')}`;

const getShortDateDisplay = (tx: TransactionItem) => {
  const dateSource =
    tx.payment_details?.paid_date ||
    (tx.duty_dates && tx.duty_dates.length > 0 ? tx.duty_dates[tx.duty_dates.length - 1] : null) ||
    tx.updated_at ||
    tx.created_at;

  if (!dateSource) return '—';
  const d = new Date(dateSource);
  if (isNaN(d.getTime())) return tx.date_range_display || '—';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
};

const EarningsHistoryScreen = ({ navigation, route }: any) => {
  const { doctor } = useAuth();
  const initialTx: TransactionItem[] = route?.params?.initialTransactions || [];

  const [transactions, setTransactions] = useState<TransactionItem[]>(initialTx);
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'pending'>('all');
  const [loading, setLoading] = useState(initialTx.length === 0);
  const [refreshing, setRefreshing] = useState(false);

  const fetchTransactions = useCallback(
    async (filter: 'all' | 'paid' | 'pending') => {
      try {
        const res = await api.get('/api/doctors/my-earnings', {
          params: {
            doctor_id: doctor?._id,
            status: filter,
            limit: 100,
            page: 1,
          },
        });
        if (res.data?.success && res.data?.data) {
          setTransactions(res.data.data.recent_transactions || []);
        }
      } catch (err) {
        // Fallback silently on refresh error
      }
    },
    [doctor?._id],
  );

  useEffect(() => {
    setLoading(true);
    fetchTransactions(statusFilter).finally(() => setLoading(false));
  }, [statusFilter, fetchTransactions]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchTransactions(statusFilter);
    setRefreshing(false);
  }, [fetchTransactions, statusFilter]);

  const statusTabs: { key: 'all' | 'paid' | 'pending'; label: string }[] = useMemo(
    () => [
      { key: 'all', label: 'All' },
      { key: 'paid', label: 'Paid' },
      { key: 'pending', label: 'Pending' },
    ],
    [],
  );

  const renderTransaction = ({ item }: { item: TransactionItem }) => {
    const isPaid = item.is_paid || item.payout_status === 'Paid';
    const roleText =
      [item.speciality, item.department].filter(Boolean).join(' • ') ||
      `${item.completed_shifts} ${item.completed_shifts === 1 ? 'Shift' : 'Shifts'}`;

    return (
      <View style={styles.txRow}>
        {/* Left Column: Date */}
        <View style={styles.dateCol}>
          <Text style={styles.dateText}>{getShortDateDisplay(item)}</Text>
        </View>

        {/* Middle Column: Details */}
        <View style={styles.detailsCol}>
          <Text style={styles.hospitalText} numberOfLines={1}>
            {item.hospital_name || 'Assigned Hospital'}
          </Text>
          <Text style={styles.roleText} numberOfLines={1}>
            {roleText}
          </Text>
        </View>

        {/* Right Column: Amount & Status */}
        <View style={styles.amountCol}>
          <Text style={styles.amountText}>{formatINR(item.net_amount)}</Text>
          <Text style={[styles.statusText, { color: isPaid ? C.success : C.warning }]}>
            {isPaid ? 'Paid' : 'Pending'}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={C.cardBg} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation?.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={scale(24)} color={C.ink} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Earnings History</Text>
        <View style={{ width: scale(24) }} />
      </View>

      {/* Filter Tabs (Matches backend ?status=all|paid|pending) */}
      <View style={styles.filterContainer}>
        {statusTabs.map(tab => {
          const active = statusFilter === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.filterPill, active && styles.filterPillActive]}
              onPress={() => setStatusFilter(tab.key)}
              activeOpacity={0.8}
            >
              <Text style={[styles.filterPillText, active && styles.filterPillTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {loading && !refreshing ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color={C.primary} />
        </View>
      ) : transactions.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Ionicons name="receipt-outline" size={scale(32)} color={C.textMuted} />
          <Text style={styles.emptyTitle}>No transactions found</Text>
          <Text style={styles.emptySub}>
            There are no {statusFilter !== 'all' ? statusFilter : ''} earnings records yet.
          </Text>
        </View>
      ) : (
        <View style={styles.listWrapper}>
          <FlatList
            data={transactions}
            keyExtractor={(item, idx) => item.assignment_id || String(idx)}
            renderItem={renderTransaction}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={() => <View style={styles.divider} />}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.primary]} />
            }
          />
        </View>
      )}
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

  filterContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: scale(10),
    paddingVertical: scale(16),
    backgroundColor: C.background,
  },
  filterPill: {
    backgroundColor: C.cardBg,
    paddingHorizontal: scale(18),
    paddingVertical: scale(8),
    borderRadius: scale(20),
    borderWidth: 1,
    borderColor: C.border,
  },
  filterPillActive: {
    backgroundColor: C.primary,
    borderColor: C.primary,
  },
  filterPillText: { fontSize: scale(13), fontWeight: '700', color: C.textSub },
  filterPillTextActive: { color: C.white },

  loaderWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: scale(32),
    gap: scale(8),
  },
  emptyTitle: { fontSize: scale(15), fontWeight: '800', color: C.ink },
  emptySub: { fontSize: scale(12), color: C.textSub, textAlign: 'center' },

  listWrapper: {
    flexShrink: 1,
    backgroundColor: C.cardBg,
    borderRadius: scale(24),
    borderWidth: 1,
    borderColor: C.border,
    marginHorizontal: scale(20),
    marginTop: scale(4),
    marginBottom: scale(24),
    overflow: 'hidden',
  },
  listContent: { paddingVertical: scale(8) },
  divider: { height: 1, backgroundColor: C.border, marginLeft: scale(76) },

  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: scale(16),
    paddingHorizontal: scale(16),
  },
  dateCol: { width: scale(60) },
  dateText: { fontSize: scale(13), fontWeight: '600', color: C.textSub },
  detailsCol: { flex: 1, paddingRight: scale(12) },
  hospitalText: { fontSize: scale(14), fontWeight: '800', color: C.ink, marginBottom: scale(4) },
  roleText: { fontSize: scale(12), color: C.textMuted, fontWeight: '500' },
  amountCol: { alignItems: 'flex-end' },
  amountText: { fontSize: scale(15), fontWeight: '900', color: C.primary, marginBottom: scale(4) },
  statusText: { fontSize: scale(12), fontWeight: '800' },
});