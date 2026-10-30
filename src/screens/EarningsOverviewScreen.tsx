import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  Animated,
  Modal,
  TouchableWithoutFeedback,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../context/AuthContext';
import api from '../services/axiosConfig';

const { width: SW, height: SH } = Dimensions.get('window');
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
  successLight: '#dcfce7',
  urgent: '#ef4444',
  warning: '#f59e0b',
  warningLight: '#fef3c7',
};

export type TransactionItem = {
  assignment_id: string;
  requirement_id: string | null;
  hospital_name: string;
  hospital_city: string;
  department: string;
  speciality: string;
  duty_dates: string[];
  date_range_display: string;
  total_shifts: number;
  completed_shifts: number;
  rate_per_shift: number;
  net_amount: number;
  payout_status: string;
  payment_details: {
    utr_number: string;
    payment_mode: string;
    paid_date: string | null;
    paid_date_formatted: string;
    remarks: string;
  };
  duty_status: string;
  created_at: string | null;
  updated_at: string | null;
  is_paid: boolean;
  is_pending: boolean;
};

type SummaryData = {
  total_earnings: number;
  paid_amount: number;
  pending_amount: number;
  currency: string;
  currency_symbol: string;
  total_completed_shifts: number;
  total_duties: number;
};

const formatINR = (amount: number = 0) => {
  return `₹${Number(amount || 0).toLocaleString('en-IN')}`;
};

const formatTxDate = (tx: TransactionItem) => {
  if (tx.payment_details?.paid_date_formatted) {
    return tx.payment_details.paid_date_formatted;
  }
  if (tx.duty_dates && tx.duty_dates.length > 0) {
    const sorted = [...tx.duty_dates].sort();
    const first = new Date(sorted[0]);
    if (!isNaN(first.getTime())) {
      const firstStr = first.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
      if (sorted.length === 1) return firstStr;
      const last = new Date(sorted[sorted.length - 1]);
      const lastStr = last.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
      return `${firstStr} - ${lastStr}`;
    }
  }
  if (tx.date_range_display) return tx.date_range_display;
  if (tx.updated_at) {
    return new Date(tx.updated_at).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }
  return 'Date N/A';
};

const getTxReferenceDate = (tx: TransactionItem): Date | null => {
  if (tx.payment_details?.paid_date) {
    const d = new Date(tx.payment_details.paid_date);
    if (!isNaN(d.getTime())) return d;
  }
  if (tx.duty_dates && tx.duty_dates.length > 0) {
    const sorted = [...tx.duty_dates].sort();
    const d = new Date(sorted[sorted.length - 1]);
    if (!isNaN(d.getTime())) return d;
  }
  if (tx.updated_at) {
    const d = new Date(tx.updated_at);
    if (!isNaN(d.getTime())) return d;
  }
  if (tx.created_at) {
    const d = new Date(tx.created_at);
    if (!isNaN(d.getTime())) return d;
  }
  return null;
};

const EarningsOverviewScreen = ({ navigation }: any) => {
  const { doctor } = useAuth();

  const [summary, setSummary] = useState<SummaryData>({
    total_earnings: 0,
    paid_amount: 0,
    pending_amount: 0,
    currency: 'INR',
    currency_symbol: '₹',
    total_completed_shifts: 0,
    total_duties: 0,
  });
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [selectedTx, setSelectedTx] = useState<TransactionItem | null>(null);

  const toastFadeAnim = useRef(new Animated.Value(0)).current;

  const showToast = useCallback(
    (message: string) => {
      setToastMessage(message);
      Animated.sequence([
        Animated.timing(toastFadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.delay(2000),
        Animated.timing(toastFadeAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
      ]).start();
    },
    [toastFadeAnim],
  );

  const loadEarnings = useCallback(async () => {
    try {
      const res = await api.get('/api/doctors/my-earnings', {
        params: {
          doctor_id: doctor?._id,
          status: 'all',
          limit: 100,
          page: 1,
        },
      });

      if (res.data?.success && res.data?.data) {
        if (res.data.data.summary) {
          setSummary(res.data.data.summary);
        }
        setTransactions(res.data.data.recent_transactions || []);
      }
    } catch (error: any) {
      showToast(error.response?.data?.message || 'Failed to load earnings data');
    }
  }, [doctor?._id, showToast]);

  useEffect(() => {
    setLoading(true);
    loadEarnings().finally(() => setLoading(false));
  }, [loadEarnings]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadEarnings();
    setRefreshing(false);
  }, [loadEarnings]);

  // Compute "This Month", "Last Month", and counts for Paid & Pending
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const prevMonthDate = new Date(currentYear, currentMonth - 1, 1);
  const prevMonth = prevMonthDate.getMonth();
  const prevYear = prevMonthDate.getFullYear();

  let thisMonthAmount = 0;
  let lastMonthAmount = 0;
  let thisMonthShifts = 0;
  let paidCount = 0;
  let pendingCount = 0;

  transactions.forEach(tx => {
    if (tx.is_paid) paidCount += 1;
    else if (tx.is_pending) pendingCount += 1;

    const refDate = getTxReferenceDate(tx);
    if (refDate) {
      if (refDate.getMonth() === currentMonth && refDate.getFullYear() === currentYear) {
        thisMonthAmount += tx.net_amount || 0;
        thisMonthShifts += tx.completed_shifts || 0;
      } else if (refDate.getMonth() === prevMonth && refDate.getFullYear() === prevYear) {
        lastMonthAmount += tx.net_amount || 0;
      }
    }
  });

  const getMonthComparisonText = () => {
    if (lastMonthAmount > 0) {
      const diffPct = Math.round(((thisMonthAmount - lastMonthAmount) / lastMonthAmount) * 100);
      const sign = diffPct >= 0 ? '+' : '';
      return `${sign}${diffPct}% vs last month`;
    }
    if (thisMonthShifts > 0) {
      return `${thisMonthShifts} ${thisMonthShifts === 1 ? 'shift' : 'shifts'} completed this month`;
    }
    return `${summary.total_completed_shifts} total shifts completed`;
  };

  const recentTransactions = transactions.slice(0, 5);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={C.cardBg} />

      <Animated.View pointerEvents="none" style={[styles.toastContainer, { opacity: toastFadeAnim }]}>
        <Ionicons name="alert-circle" size={18} color={C.white} />
        <Text style={styles.toastText}>{toastMessage}</Text>
      </Animated.View>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation?.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={scale(24)} color={C.ink} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Earnings Overview</Text>
        <View style={{ width: scale(24) }} />
      </View>

      {loading && !refreshing ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color={C.primary} />
          <Text style={styles.loaderText}>Loading your earnings...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.primary]} />
          }
        >
          {/* Total Earnings Card */}
          <View style={styles.totalCard}>
            <Text style={styles.totalLabelText}>Total Earnings</Text>
            <Text style={styles.totalAmountText}>{formatINR(summary.total_earnings)}</Text>
            <View style={styles.totalMetaBadge}>
              <Ionicons name="medkit-outline" size={scale(13)} color={C.primary} />
              <Text style={styles.totalMetaText}>
                {summary.total_duties} {summary.total_duties === 1 ? 'Duty' : 'Duties'} •{' '}
                {summary.total_completed_shifts}{' '}
                {summary.total_completed_shifts === 1 ? 'Shift' : 'Shifts'}
              </Text>
            </View>
          </View>

          {/* Stats Grid */}
          <View style={styles.statsGrid}>
            {/* This Month (Full Width) */}
            <View style={[styles.statCard, { marginBottom: scale(12) }]}>
              <Text style={styles.statLabel}>This month</Text>
              <Text style={styles.statAmount}>{formatINR(thisMonthAmount)}</Text>
              <Text style={styles.statSubText}>{getMonthComparisonText()}</Text>
            </View>

            {/* Pending & Paid (Half Width Row) */}
            <View style={styles.statsRow}>
              <View style={[styles.statCard, { flex: 1, marginRight: scale(6) }]}>
                <Text style={styles.statLabel}>Pending</Text>
                <Text style={[styles.statAmount, { color: C.warning }]}>
                  {formatINR(summary.pending_amount)}
                </Text>
                <Text style={styles.statSubTextBase}>
                  {pendingCount} {pendingCount === 1 ? 'Payment' : 'Payments'}
                </Text>
              </View>
              <View style={[styles.statCard, { flex: 1, marginLeft: scale(6) }]}>
                <Text style={styles.statLabel}>Paid</Text>
                <Text style={[styles.statAmount, { color: C.success }]}>
                  {formatINR(summary.paid_amount)}
                </Text>
                <Text style={styles.statSubTextBase}>
                  {paidCount} {paidCount === 1 ? 'Payment' : 'Payments'}
                </Text>
              </View>
            </View>
          </View>

          {/* Recent Transactions Section */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Transactions</Text>
            <TouchableOpacity
              onPress={() =>
                navigation.navigate('EarningsHistory', {
                  initialTransactions: transactions,
                  summary,
                })
              }
            >
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>

          {recentTransactions.length === 0 ? (
            <View style={styles.emptyBox}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="wallet-outline" size={scale(26)} color={C.primary} />
              </View>
              <Text style={styles.emptyTitle}>No transactions yet</Text>
              <Text style={styles.emptySub}>
                Completed duties and processed payouts will appear here.
              </Text>
            </View>
          ) : (
            <View style={styles.transactionsContainer}>
              {recentTransactions.map((tx, idx) => {
                const isPaid = tx.is_paid || tx.payout_status === 'Paid';
                const roleLabel = [tx.speciality, tx.department].filter(Boolean).join(' • ');

                return (
                  <TouchableOpacity
                    key={tx.assignment_id || String(idx)}
                    style={styles.txCard}
                    activeOpacity={0.8}
                    onPress={() => setSelectedTx(tx)}
                  >
                    <View style={styles.txLeft}>
                      <Text style={styles.txHospital} numberOfLines={1}>
                        {tx.hospital_name || 'Assigned Hospital'}
                      </Text>
                      {roleLabel ? (
                        <Text style={styles.txRole} numberOfLines={1}>
                          {roleLabel}
                        </Text>
                      ) : null}
                      <Text style={styles.txDate}>
                        {formatTxDate(tx)} • {tx.completed_shifts}{' '}
                        {tx.completed_shifts === 1 ? 'shift' : 'shifts'}
                      </Text>
                    </View>
                    <View style={styles.txRight}>
                      <Text style={styles.txAmount}>{formatINR(tx.net_amount)}</Text>
                      <View
                        style={[
                          styles.statusBadge,
                          { backgroundColor: isPaid ? C.successLight : C.warningLight },
                        ]}
                      >
                        <Text
                          style={[
                            styles.txStatus,
                            { color: isPaid ? C.success : C.warning },
                          ]}
                        >
                          {isPaid ? 'Paid' : 'Pending'}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </ScrollView>
      )}

      {/* Transaction Details Modal */}
      <Modal
        transparent
        visible={!!selectedTx}
        animationType="fade"
        onRequestClose={() => setSelectedTx(null)}
      >
        <TouchableWithoutFeedback onPress={() => setSelectedTx(null)}>
          <View style={styles.modalBackdrop} />
        </TouchableWithoutFeedback>
        {selectedTx && (
          <View style={styles.modalSheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle} numberOfLines={1}>
                  {selectedTx.hospital_name}
                </Text>
                <Text style={styles.modalSub}>
                  {[selectedTx.speciality, selectedTx.department, selectedTx.hospital_city]
                    .filter(Boolean)
                    .join(' • ')}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedTx(null)} style={styles.closeBtn}>
                <Ionicons name="close" size={scale(18)} color={C.textSub} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalAmountBox}>
              <Text style={styles.modalAmountLabel}>Net Payout</Text>
              <Text style={styles.modalAmountVal}>{formatINR(selectedTx.net_amount)}</Text>
              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor: selectedTx.is_paid ? C.successLight : C.warningLight,
                    marginTop: scale(6),
                  },
                ]}
              >
                <Text
                  style={[
                    styles.txStatus,
                    { color: selectedTx.is_paid ? C.success : C.warning },
                  ]}
                >
                  {selectedTx.is_paid ? 'Paid' : 'Pending Payout'}
                </Text>
              </View>
            </View>

            <View style={styles.detailRows}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Duty Dates</Text>
                <Text style={styles.detailValue}>{formatTxDate(selectedTx)}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Completed Shifts</Text>
                <Text style={styles.detailValue}>
                  {selectedTx.completed_shifts} / {selectedTx.total_shifts}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Rate per Shift</Text>
                <Text style={styles.detailValue}>{formatINR(selectedTx.rate_per_shift)}</Text>
              </View>
              {selectedTx.payment_details?.payment_mode ? (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Payment Mode</Text>
                  <Text style={styles.detailValue}>{selectedTx.payment_details.payment_mode}</Text>
                </View>
              ) : null}
              {selectedTx.payment_details?.utr_number ? (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>UTR Number</Text>
                  <Text style={styles.detailValue}>{selectedTx.payment_details.utr_number}</Text>
                </View>
              ) : null}
              {selectedTx.payment_details?.paid_date_formatted ? (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Paid On</Text>
                  <Text style={styles.detailValue}>
                    {selectedTx.payment_details.paid_date_formatted}
                  </Text>
                </View>
              ) : null}
              {selectedTx.payment_details?.remarks ? (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Remarks</Text>
                  <Text style={styles.detailValue}>{selectedTx.payment_details.remarks}</Text>
                </View>
              ) : null}
            </View>
          </View>
        )}
      </Modal>
    </SafeAreaView>
  );
};

export default EarningsOverviewScreen;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background },
  toastContainer: {
    position: 'absolute',
    top: scale(54),
    alignSelf: 'center',
    backgroundColor: C.ink,
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
    paddingHorizontal: scale(16),
    paddingVertical: scale(10),
    borderRadius: scale(20),
    zIndex: 9999,
  },
  toastText: { color: C.white, fontSize: scale(13), fontWeight: '700' },
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
  loaderWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: scale(10) },
  loaderText: { fontSize: scale(13), color: C.textSub, fontWeight: '600' },
  scrollContent: { paddingHorizontal: scale(20), paddingBottom: scale(100) },

  totalCard: {
    backgroundColor: C.primaryLight,
    borderRadius: scale(16),
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scale(24),
    marginTop: scale(20),
    marginBottom: scale(24),
  },
  totalLabelText: {
    fontSize: scale(12),
    fontWeight: '700',
    color: C.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: scale(4),
  },
  totalAmountText: {
    fontSize: scale(32),
    fontWeight: '900',
    color: C.primary,
    letterSpacing: -0.5,
  },
  totalMetaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(5),
    backgroundColor: C.cardBg,
    paddingHorizontal: scale(12),
    paddingVertical: scale(5),
    borderRadius: scale(20),
    marginTop: scale(10),
  },
  totalMetaText: { fontSize: scale(12), fontWeight: '700', color: C.primary },

  statsGrid: { marginBottom: scale(28) },
  statsRow: { flexDirection: 'row' },
  statCard: {
    backgroundColor: C.cardBg,
    borderRadius: scale(16),
    padding: scale(16),
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: C.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 15,
    elevation: 2,
  },
  statLabel: { fontSize: scale(13), color: C.textSub, fontWeight: '600', marginBottom: scale(8) },
  statAmount: { fontSize: scale(20), fontWeight: '900', color: C.primary, marginBottom: scale(4) },
  statSubTextBase: { fontSize: scale(12), color: C.textMuted, fontWeight: '600' },
  statSubText: { fontSize: scale(12), color: '#64748b', fontWeight: '600' },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scale(14),
  },
  sectionTitle: { fontSize: scale(16), fontWeight: '900', color: C.ink, letterSpacing: -0.3 },
  viewAllText: { fontSize: scale(13), fontWeight: '700', color: C.primary },

  emptyBox: {
    backgroundColor: C.cardBg,
    borderRadius: scale(16),
    borderWidth: 1,
    borderColor: C.border,
    paddingVertical: scale(32),
    paddingHorizontal: scale(20),
    alignItems: 'center',
  },
  emptyIconCircle: {
    width: scale(52),
    height: scale(52),
    borderRadius: scale(26),
    backgroundColor: C.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scale(10),
  },
  emptyTitle: { fontSize: scale(15), fontWeight: '800', color: C.ink, marginBottom: scale(4) },
  emptySub: { fontSize: scale(12), color: C.textSub, textAlign: 'center', lineHeight: scale(18) },

  transactionsContainer: { gap: scale(12) },
  txCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: C.cardBg,
    padding: scale(16),
    borderRadius: scale(16),
    borderWidth: 1,
    borderColor: C.border,
  },
  txLeft: { flex: 1, paddingRight: scale(12) },
  txHospital: { fontSize: scale(14), fontWeight: '800', color: C.ink, marginBottom: scale(2) },
  txRole: { fontSize: scale(12), fontWeight: '600', color: C.textSub, marginBottom: scale(4) },
  txDate: { fontSize: scale(12), color: C.textMuted, fontWeight: '500' },
  txRight: { alignItems: 'flex-end', gap: scale(4) },
  txAmount: { fontSize: scale(15), fontWeight: '900', color: C.primary },
  statusBadge: {
    paddingHorizontal: scale(8),
    paddingVertical: scale(3),
    borderRadius: scale(6),
  },
  txStatus: { fontSize: scale(11), fontWeight: '800' },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(17, 24, 39, 0.4)' },
  modalSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: C.cardBg,
    borderTopLeftRadius: scale(24),
    borderTopRightRadius: scale(24),
    paddingHorizontal: scale(20),
    paddingBottom: scale(32),
    maxHeight: SH * 0.8,
  },
  sheetHandle: {
    width: scale(40),
    height: scale(5),
    borderRadius: scale(2.5),
    backgroundColor: C.border,
    alignSelf: 'center',
    marginTop: scale(12),
    marginBottom: scale(8),
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: scale(12),
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  modalTitle: { fontSize: scale(16), fontWeight: '800', color: C.ink },
  modalSub: { fontSize: scale(12), color: C.textSub, marginTop: scale(2), fontWeight: '500' },
  closeBtn: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(16),
    backgroundColor: C.inputBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalAmountBox: {
    alignItems: 'center',
    backgroundColor: C.background,
    borderRadius: scale(14),
    paddingVertical: scale(16),
    marginVertical: scale(14),
    borderWidth: 1,
    borderColor: C.border,
  },
  modalAmountLabel: { fontSize: scale(12), color: C.textSub, fontWeight: '600' },
  modalAmountVal: { fontSize: scale(26), fontWeight: '900', color: C.primary, marginTop: scale(2) },
  detailRows: { gap: scale(10) },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: scale(4),
  },
  detailLabel: { fontSize: scale(13), color: C.textSub, fontWeight: '600' },
  detailValue: { fontSize: scale(13), color: C.ink, fontWeight: '700' },
});