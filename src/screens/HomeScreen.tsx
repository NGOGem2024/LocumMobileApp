import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../context/AuthContext';
import AvailabilitySection from '../components/AvailabilitySection';

const { width: SW, height: SH } = Dimensions.get('window');
const scale = (size: number) => (SW / 390) * size;

const API_URL =
  'https://locumbackenduat-ewcbfyghbvb2h0ez.centralindia-01.azurewebsites.net';

const C = {
  primary: '#0f766e',
  primaryDeep: '#0b2e35',
  primaryLight: '#e3f4f1',
  accent: '#5eead4',
  accentWarm: '#fbbf24',
  white: '#ffffff',
  bg: '#f4f9f8',
  card: '#ffffff',
  text: '#102a2e',
  textSub: '#5b7a7e',
  textMuted: '#9ab4b7',
  border: '#dcecea',
  urgent: '#e85d4d',
  urgentLight: '#fdece9',
  success: '#16a085',
  successLight: '#e6f7f3',
  warning: '#d99a1f',
  warningLight: '#fbf3e1',
};

const MOCK_REQUIREMENTS = [
  {
    id: '1',
    hospital: 'Apollo Hospital',
    location: 'Baner, Pune',
    date: 'Today, 6 PM – 10 PM',
    specialization: 'General Physician',
    pay: '₹2,500',
    payType: 'Flat',
    urgency: 'urgent',
    distance: '3.2 km',
  },
  {
    id: '2',
    hospital: 'Ruby Hall Clinic',
    location: 'Viman Nagar, Pune',
    date: 'Tomorrow, 8 AM – 2 PM',
    specialization: 'Internal Medicine',
    pay: '₹800',
    payType: '/hr',
    urgency: 'normal',
    distance: '5.8 km',
  },
  {
    id: '3',
    hospital: 'Sahyadri Hospital',
    location: 'Deccan, Pune',
    date: '30 May, 9 AM – 5 PM',
    specialization: 'Emergency Medicine',
    pay: '₹5,000',
    payType: 'Flat',
    urgency: 'high',
    distance: '7.1 km',
  },
];

// ── UPDATED: added payment_terms ──────────────────────────────────────────────
type PaymentTerm = 'Next Day Payout' | 'Weekly Payout' | 'Monthly Payout';

type RateEntry = {
  _id: string;
  duty_type: string;
  rate_type: 'Hourly' | 'Per Shift';
  day_shift_rate?: number;
  night_shift_rate?: number;
  sunday_holiday_rate?: number;
  effective_from?: string;
  payment_terms?: PaymentTerm;
};

// ── Helpers ────────────────────────────────────────────────────────────────────
const formatRate = (val?: number | null) => (val == null ? '—' : `₹${val}`);

const formatDate = (iso?: string) => {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

// payment_terms → icon + colors
const getPaymentConfig = (term?: PaymentTerm) => {
  if (term === 'Next Day Payout')
    return {
      icon: 'flash-outline',
      color: '#b45309',
      bg: '#fffbeb',
      border: '#fde68a',
      label: 'Next Day Payout',
    };
  if (term === 'Weekly Payout')
    return {
      icon: 'calendar-outline',
      color: '#15803d',
      bg: '#f0fdf4',
      border: '#bbf7d0',
      label: 'Weekly Payout',
    };
  if (term === 'Monthly Payout')
    return {
      icon: 'albums-outline',
      color: '#6d28d9',
      bg: '#f5f3ff',
      border: '#ddd6fe',
      label: 'Monthly Payout',
    };
  return {
    icon: 'cash-outline',
    color: C.textMuted,
    bg: '#f8fafc',
    border: C.border,
    label: term ?? '',
  };
};

// ── UrgencyBadge ───────────────────────────────────────────────────────────────
const UrgencyBadge = ({ urgency }: { urgency: string }) => {
  const config =
    urgency === 'urgent'
      ? { bg: C.urgentLight, color: C.urgent, label: 'Urgent', dot: C.urgent }
      : urgency === 'high'
      ? {
          bg: C.warningLight,
          color: C.warning,
          label: 'High Priority',
          dot: C.warning,
        }
      : { bg: C.successLight, color: C.success, label: 'Open', dot: C.success };
  return (
    <View style={[badgeStyles.wrap, { backgroundColor: config.bg }]}>
      <View style={[badgeStyles.dot, { backgroundColor: config.dot }]} />
      <Text style={[badgeStyles.text, { color: config.color }]}>
        {config.label}
      </Text>
    </View>
  );
};
const badgeStyles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(5),
    paddingHorizontal: scale(9),
    paddingVertical: scale(4),
    borderRadius: scale(20),
  },
  dot: { width: scale(6), height: scale(6), borderRadius: scale(3) },
  text: { fontSize: scale(10), fontWeight: '700' },
});

// ── RateCardBottomSheet ────────────────────────────────────────────────────────
const RateCardBottomSheet = ({
  visible,
  rates,
  onClose,
}: {
  visible: boolean;
  rates: RateEntry[];
  onClose: () => void;
}) => {
  const slideAnim = useRef(new Animated.Value(SH)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          damping: 20,
          stiffness: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: SH,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={[sheetStyles.backdrop, { opacity: fadeAnim }]} />
      </TouchableWithoutFeedback>

      <Animated.View
        style={[sheetStyles.sheet, { transform: [{ translateY: slideAnim }] }]}
      >
        {/* Drag handle */}
        <View style={sheetStyles.handle} />

        {/* Header */}
        <View style={sheetStyles.sheetHeader}>
          <View style={sheetStyles.sheetIconBubble}>
            <Ionicons name="pricetags" size={scale(18)} color={C.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={sheetStyles.sheetTitle}>Rate Card</Text>
            <Text style={sheetStyles.sheetSub}>
              {rates.length} duty {rates.length === 1 ? 'type' : 'types'}{' '}
              configured
            </Text>
          </View>
          <TouchableOpacity
            onPress={onClose}
            style={sheetStyles.closeBtn}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={scale(16)} color={C.textSub} />
          </TouchableOpacity>
        </View>

        {/* Cards */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={sheetStyles.scrollContent}
        >
          {rates.length === 0 ? (
            <View style={sheetStyles.emptyWrap}>
              <View style={sheetStyles.emptyIconCircle}>
                <Ionicons
                  name="pricetag-outline"
                  size={scale(28)}
                  color={C.primary}
                />
              </View>
              <Text style={sheetStyles.emptyTitle}>No rate card yet</Text>
              <Text style={sheetStyles.emptySub}>
                Your admin will configure your rates
              </Text>
            </View>
          ) : (
            rates.map((item, idx) => {
              const unit = item.rate_type === 'Hourly' ? '/hr' : '/shift';
              const pc = getPaymentConfig(item.payment_terms);

              return (
                <View
                  key={item._id ?? `${item.duty_type}-${idx}`}
                  style={[
                    sheetStyles.rateCard,
                    idx !== rates.length - 1 && { marginBottom: scale(14) },
                  ]}
                >
                  {/* ── Card header: duty type + rate type ── */}
                  <View style={sheetStyles.cardHeader}>
                    <View style={sheetStyles.dutyIconWrap}>
                      <Ionicons
                        name="medkit-outline"
                        size={scale(15)}
                        color={C.primary}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={sheetStyles.dutyName}>{item.duty_type}</Text>
                      <Text style={sheetStyles.dutySubLabel}>Duty Type</Text>
                    </View>
                    <View style={sheetStyles.rateTypeBadge}>
                      <Text style={sheetStyles.rateTypeBadgeText}>
                        {item.rate_type}
                      </Text>
                    </View>
                  </View>

                  {/* ── Divider ── */}
                  <View style={sheetStyles.divider} />

                  {/* ── Rate rows: label left, amount right ── */}
                  <View style={sheetStyles.rateRows}>
                    {/* Day Shift */}
                    <View style={sheetStyles.rateRow}>
                      <View style={sheetStyles.rateRowLeft}>
                        <View
                          style={[
                            sheetStyles.rateIconBox,
                            { backgroundColor: '#fffbeb' },
                          ]}
                        >
                          <Ionicons
                            name="sunny-outline"
                            size={scale(13)}
                            color="#d97706"
                          />
                        </View>
                        <Text style={sheetStyles.rateRowLabel}>Day Shift</Text>
                      </View>
                      <View style={sheetStyles.rateRowRight}>
                        <Text style={sheetStyles.rateAmt}>
                          {formatRate(item.day_shift_rate)}
                        </Text>
                        {item.day_shift_rate != null ? (
                          <Text style={sheetStyles.rateUnit}>{unit}</Text>
                        ) : null}
                      </View>
                    </View>

                    {/* Night Shift */}
                    <View style={sheetStyles.rateRow}>
                      <View style={sheetStyles.rateRowLeft}>
                        <View
                          style={[
                            sheetStyles.rateIconBox,
                            { backgroundColor: '#eef2ff' },
                          ]}
                        >
                          <Ionicons
                            name="moon-outline"
                            size={scale(13)}
                            color="#6366f1"
                          />
                        </View>
                        <Text style={sheetStyles.rateRowLabel}>
                          Night Shift
                        </Text>
                      </View>
                      <View style={sheetStyles.rateRowRight}>
                        <Text style={sheetStyles.rateAmt}>
                          {formatRate(item.night_shift_rate)}
                        </Text>
                        {item.night_shift_rate != null ? (
                          <Text style={sheetStyles.rateUnit}>{unit}</Text>
                        ) : null}
                      </View>
                    </View>

                    {/* Sunday / Holiday */}
                    <View
                      style={[sheetStyles.rateRow, { borderBottomWidth: 0 }]}
                    >
                      <View style={sheetStyles.rateRowLeft}>
                        <View
                          style={[
                            sheetStyles.rateIconBox,
                            { backgroundColor: '#fff1f0' },
                          ]}
                        >
                          <Ionicons
                            name="star-outline"
                            size={scale(13)}
                            color="#e85d4d"
                          />
                        </View>
                        <Text style={sheetStyles.rateRowLabel}>
                          Sun / Holiday
                        </Text>
                      </View>
                      <View style={sheetStyles.rateRowRight}>
                        <Text style={sheetStyles.rateAmt}>
                          {formatRate(item.sunday_holiday_rate)}
                        </Text>
                        {item.sunday_holiday_rate != null ? (
                          <Text style={sheetStyles.rateUnit}>{unit}</Text>
                        ) : null}
                      </View>
                    </View>
                  </View>

                  {/* ── Divider ── */}
                  <View style={sheetStyles.divider} />

                  {/* ── Footer: payment terms chip + effective date ── */}
                  <View style={sheetStyles.cardFooter}>
                    {/* Payment terms */}
                    {item.payment_terms ? (
                      <View
                        style={[
                          sheetStyles.paymentChip,
                          { backgroundColor: pc.bg, borderColor: pc.border },
                        ]}
                      >
                        <Ionicons
                          name={pc.icon}
                          size={scale(11)}
                          color={pc.color}
                        />
                        <Text
                          style={[
                            sheetStyles.paymentChipText,
                            { color: pc.color },
                          ]}
                        >
                          {pc.label}
                        </Text>
                      </View>
                    ) : null}

                    {/* Effective date */}
                    {item.effective_from ? (
                      <View style={sheetStyles.effectiveWrap}>
                        <Ionicons
                          name="time-outline"
                          size={scale(11)}
                          color={C.textMuted}
                        />
                        <Text style={sheetStyles.effectiveText}>
                          From {formatDate(item.effective_from)}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      </Animated.View>
    </Modal>
  );
};

const sheetStyles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#f8fafb',
    borderTopLeftRadius: scale(28),
    borderTopRightRadius: scale(28),
    maxHeight: SH * 0.85,
    paddingBottom: scale(34),
  },
  handle: {
    width: scale(36),
    height: scale(4),
    borderRadius: scale(2),
    backgroundColor: '#d1d9db',
    alignSelf: 'center',
    marginTop: scale(12),
    marginBottom: scale(4),
  },

  // Header
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(12),
    paddingHorizontal: scale(20),
    paddingVertical: scale(14),
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    backgroundColor: C.white,
  },
  sheetIconBubble: {
    width: scale(38),
    height: scale(38),
    borderRadius: scale(12),
    backgroundColor: C.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetTitle: { fontSize: scale(15), fontWeight: '800', color: C.text },
  sheetSub: { fontSize: scale(11), color: C.textMuted, marginTop: scale(1) },
  closeBtn: {
    width: scale(30),
    height: scale(30),
    borderRadius: scale(9),
    backgroundColor: '#edf2f3',
    alignItems: 'center',
    justifyContent: 'center',
  },

  scrollContent: { paddingHorizontal: scale(16), paddingTop: scale(16) },

  // Empty state
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: scale(48),
    gap: scale(10),
  },
  emptyIconCircle: {
    width: scale(60),
    height: scale(60),
    borderRadius: scale(30),
    backgroundColor: C.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scale(4),
  },
  emptyTitle: { fontSize: scale(14), fontWeight: '700', color: C.text },
  emptySub: { fontSize: scale(12), color: C.textMuted },

  // Rate card
  rateCard: {
    backgroundColor: C.white,
    borderRadius: scale(18),
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
    shadowColor: C.primaryDeep,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },

  // Card header
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
    paddingHorizontal: scale(14),
    paddingVertical: scale(14),
  },
  dutyIconWrap: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(11),
    backgroundColor: C.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dutyName: { fontSize: scale(14), fontWeight: '800', color: C.text },
  dutySubLabel: {
    fontSize: scale(10),
    color: C.textMuted,
    marginTop: scale(1),
  },
  rateTypeBadge: {
    backgroundColor: C.primaryLight,
    borderRadius: scale(8),
    paddingHorizontal: scale(10),
    paddingVertical: scale(4),
    borderWidth: 1,
    borderColor: C.border,
  },
  rateTypeBadgeText: {
    fontSize: scale(10),
    fontWeight: '700',
    color: C.primary,
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: C.border,
    marginHorizontal: scale(14),
  },

  // Rate rows
  rateRows: {
    paddingHorizontal: scale(14),
    paddingVertical: scale(6),
  },
  rateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: scale(9),
    borderBottomWidth: 1,
    borderBottomColor: '#f0f5f6',
  },
  rateRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
  },
  rateIconBox: {
    width: scale(26),
    height: scale(26),
    borderRadius: scale(7),
    alignItems: 'center',
    justifyContent: 'center',
  },
  rateRowLabel: { fontSize: scale(12), color: C.textSub, fontWeight: '500' },
  rateRowRight: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: scale(2),
  },
  rateAmt: {
    fontSize: scale(15),
    fontWeight: '800',
    color: C.text,
    letterSpacing: -0.3,
  },
  rateUnit: { fontSize: scale(10), fontWeight: '600', color: C.textMuted },

  // Footer
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: scale(6),
    paddingHorizontal: scale(14),
    paddingVertical: scale(12),
  },
  paymentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(5),
    borderRadius: scale(20),
    borderWidth: 1,
    paddingHorizontal: scale(10),
    paddingVertical: scale(5),
  },
  paymentChipText: { fontSize: scale(11), fontWeight: '700' },
  effectiveWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
  },
  effectiveText: { fontSize: scale(11), color: C.textMuted, fontWeight: '500' },
});

// ── HomeScreen ─────────────────────────────────────────────────────────────────
const HomeScreen = ({ navigation }: any) => {
  const { doctor, logout, token } = useAuth();

  const initials = doctor
    ? `${doctor.first_name?.[0] ?? ''}${
        doctor.last_name?.[0] ?? ''
      }`.toUpperCase()
    : 'DR';

  const [fetchedAvailability, setFetchedAvailability] = useState<any[]>([]);
  const [rateCard, setRateCard] = useState<RateEntry[]>([]);
  const [showRateSheet, setShowRateSheet] = useState(false);

  // Fetch availability
  useEffect(() => {
    if (!doctor?._id || !token) return;
    fetch(`${API_URL}/${doctor._id}/availability`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => setFetchedAvailability(data.availability ?? []))
      .catch(err => console.log('Failed to load availability:', err));
  }, [doctor?._id, token]);

  // Fetch rate card
  useEffect(() => {
    if (!doctor?._id || !token) return;
    fetch(`${API_URL}/api/doctors/rate-card/${doctor._id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(json => setRateCard(json.data ?? []))
      .catch(err => console.log('Failed to load rate card:', err));
  }, [doctor?._id, token]);

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor={C.primaryDeep} />

      {/* ── TOP BAND ── */}
      <View style={styles.topBand}>
        <View style={styles.blobA} />
        <View style={styles.blobB} />

        <View style={styles.profileRow}>
          <TouchableOpacity
            style={styles.avatarWrap}
            onPress={() => navigation.navigate('ProfileScreen')}
            activeOpacity={0.85}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <View style={styles.onlineDot} />
          </TouchableOpacity>

          <View style={styles.greetingCol}>
            <Text style={styles.greetingLabel}>WELCOME BACK</Text>
            <Text style={styles.greetingName} numberOfLines={1}>
              Dr. {doctor?.first_name} {doctor?.last_name}
            </Text>
            <Text style={styles.greetingRole}>
              {doctor?.specialization ?? 'Specialist'}
            </Text>
          </View>

          <TouchableOpacity style={styles.bellBtn} activeOpacity={0.7}>
            <Ionicons
              name="notifications-outline"
              size={scale(20)}
              color={C.white}
            />
            <View style={styles.bellDot} />
          </TouchableOpacity>
        </View>

        {/* ── QUICK ACTIONS ── */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.qaChip}
            activeOpacity={0.75}
            onPress={() => navigation.navigate('ProfileScreen')}
          >
            <View style={styles.qaIconWrap}>
              <Ionicons
                name="person-outline"
                size={scale(17)}
                color={C.primary}
              />
            </View>
            <Text style={styles.qaLabel}>Profile</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.qaChip} activeOpacity={0.75}>
            <View style={styles.qaIconWrap}>
              <Ionicons
                name="calendar-outline"
                size={scale(17)}
                color={C.primary}
              />
            </View>
            <Text style={styles.qaLabel}>Shifts</Text>
          </TouchableOpacity>

          {/* Rate Card chip */}
          <TouchableOpacity
            style={[styles.qaChip, styles.qaChipHighlight]}
            activeOpacity={0.75}
            onPress={() => setShowRateSheet(true)}
          >
            <View style={[styles.qaIconWrap, styles.qaIconWrapHighlight]}>
              <Ionicons
                name="pricetags-outline"
                size={scale(17)}
                color={C.white}
              />
            </View>
            <Text style={styles.qaLabel}>Rate Card</Text>
            {rateCard.length > 0 && (
              <View style={styles.qaBadge}>
                <Text style={styles.qaBadgeText}>{rateCard.length}</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.qaChip} activeOpacity={0.75}>
            <View style={styles.qaIconWrap}>
              <Ionicons
                name="wallet-outline"
                size={scale(17)}
                color={C.primary}
              />
            </View>
            <Text style={styles.qaLabel}>Earnings</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── AVAILABILITY ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <View style={styles.sectionIconWrap}>
                <Ionicons
                  name="calendar-clear-outline"
                  size={scale(15)}
                  color={C.primary}
                />
              </View>
              <View>
                <Text style={styles.sectionTitle}>My Availability</Text>
                <Text style={styles.sectionSub}>
                  Tap a date to set or edit your shift
                </Text>
              </View>
            </View>
          </View>
          <AvailabilitySection
            doctorId={doctor?._id || ''}
            apiBaseUrl={`${API_URL}`}
            authToken={token ?? ''}
            initialAvailability={fetchedAvailability}
          />
        </View>

        {/* ── ACTIVE REQUIREMENTS ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <View style={styles.sectionIconWrap}>
                <Ionicons
                  name="briefcase-outline"
                  size={scale(15)}
                  color={C.primary}
                />
              </View>
              <View>
                <Text style={styles.sectionTitle}>Active Requirements</Text>
                <Text style={styles.sectionSub}>
                  {MOCK_REQUIREMENTS.length} open shifts near you
                </Text>
              </View>
            </View>
            <TouchableOpacity activeOpacity={0.7}>
              <Text style={styles.seeAll}>See All</Text>
            </TouchableOpacity>
          </View>

          {MOCK_REQUIREMENTS.map(req => (
            <View key={req.id} style={styles.reqCard}>
              {req.urgency === 'urgent' && <View style={styles.reqAccentBar} />}
              <View style={styles.reqTopRow}>
                <View style={styles.reqHospitalIcon}>
                  <Ionicons name="medical" size={scale(17)} color={C.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.reqHospital}>{req.hospital}</Text>
                  <View style={styles.reqLocationRow}>
                    <Ionicons
                      name="location-outline"
                      size={scale(11)}
                      color={C.textMuted}
                    />
                    <Text style={styles.reqLocation}>
                      {req.location} · {req.distance}
                    </Text>
                  </View>
                </View>
                <UrgencyBadge urgency={req.urgency} />
              </View>
              <View style={styles.reqDetails}>
                <View style={styles.reqDetailChip}>
                  <Ionicons
                    name="time-outline"
                    size={scale(12)}
                    color={C.primary}
                  />
                  <Text style={styles.reqDetailText}>{req.date}</Text>
                </View>
                <View style={styles.reqDetailChip}>
                  <Ionicons
                    name="medkit-outline"
                    size={scale(12)}
                    color={C.primary}
                  />
                  <Text style={styles.reqDetailText}>{req.specialization}</Text>
                </View>
              </View>
              <View style={styles.reqFooter}>
                <View>
                  <Text style={styles.reqPayLabel}>Compensation</Text>
                  <Text style={styles.reqPay}>
                    {req.pay}
                    <Text style={styles.reqPayType}> {req.payType}</Text>
                  </Text>
                </View>
                <TouchableOpacity style={styles.applyBtn} activeOpacity={0.85}>
                  <Text style={styles.applyBtnText}>Apply Now</Text>
                  <Ionicons
                    name="arrow-forward"
                    size={scale(13)}
                    color={C.white}
                  />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* ── RATE CARD BOTTOM SHEET ── */}
      <RateCardBottomSheet
        visible={showRateSheet}
        rates={rateCard}
        onClose={() => setShowRateSheet(false)}
      />
    </SafeAreaView>
  );
};

export default HomeScreen;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  scroll: { paddingBottom: scale(48), paddingTop: scale(14) },

  topBand: {
    backgroundColor: C.primaryDeep,
    paddingHorizontal: scale(20),
    paddingTop: scale(14),
    paddingBottom: scale(20),
    overflow: 'hidden',
    borderBottomLeftRadius: scale(28),
    borderBottomRightRadius: scale(28),
  },
  blobA: {
    position: 'absolute',
    width: scale(190),
    height: scale(190),
    borderRadius: scale(95),
    backgroundColor: 'rgba(94,234,212,0.10)',
    top: scale(-60),
    right: scale(-50),
  },
  blobB: {
    position: 'absolute',
    width: scale(110),
    height: scale(110),
    borderRadius: scale(55),
    backgroundColor: 'rgba(251,191,36,0.06)',
    bottom: scale(-30),
    left: scale(-30),
  },

  profileRow: { flexDirection: 'row', alignItems: 'center', gap: scale(12) },
  avatarWrap: { position: 'relative' },
  avatar: {
    width: scale(50),
    height: scale(50),
    borderRadius: scale(16),
    backgroundColor: C.accent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  avatarText: { color: C.primaryDeep, fontSize: scale(18), fontWeight: '900' },
  onlineDot: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: scale(12),
    height: scale(12),
    borderRadius: scale(6),
    backgroundColor: C.success,
    borderWidth: 2,
    borderColor: C.primaryDeep,
  },
  greetingCol: { flex: 1 },
  greetingLabel: {
    color: C.accentWarm,
    fontSize: scale(9),
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: scale(3),
  },
  greetingName: { color: C.white, fontSize: scale(17), fontWeight: '900' },
  greetingRole: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: scale(11),
    marginTop: scale(2),
    fontWeight: '600',
  },
  bellBtn: {
    width: scale(38),
    height: scale(38),
    borderRadius: scale(13),
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellDot: {
    position: 'absolute',
    top: scale(8),
    right: scale(8),
    width: scale(7),
    height: scale(7),
    borderRadius: scale(4),
    backgroundColor: C.urgent,
    borderWidth: 1.5,
    borderColor: C.primaryDeep,
  },

  quickActions: { flexDirection: 'row', gap: scale(8), marginTop: scale(18) },
  qaChip: {
    flex: 1,
    alignItems: 'center',
    gap: scale(5),
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: scale(14),
    paddingVertical: scale(10),
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    position: 'relative',
  },
  qaChipHighlight: {
    backgroundColor: 'rgba(94,234,212,0.15)',
    borderColor: 'rgba(94,234,212,0.35)',
  },
  qaIconWrap: {
    width: scale(34),
    height: scale(34),
    borderRadius: scale(11),
    backgroundColor: C.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qaIconWrapHighlight: { backgroundColor: C.primary },
  qaLabel: { fontSize: scale(9.5), fontWeight: '700', color: C.white },
  qaBadge: {
    position: 'absolute',
    top: scale(6),
    right: scale(6),
    width: scale(16),
    height: scale(16),
    borderRadius: scale(8),
    backgroundColor: C.accentWarm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qaBadgeText: { fontSize: scale(9), fontWeight: '900', color: C.primaryDeep },

  section: { marginHorizontal: scale(16), marginTop: scale(20) },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: scale(12),
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
  },
  sectionIconWrap: {
    width: scale(30),
    height: scale(30),
    borderRadius: scale(10),
    backgroundColor: C.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: { fontSize: scale(15), fontWeight: '800', color: C.text },
  sectionSub: { fontSize: scale(11), color: C.textMuted, marginTop: scale(2) },
  seeAll: {
    fontSize: scale(12),
    fontWeight: '700',
    color: C.primary,
    marginTop: scale(6),
  },

  reqCard: {
    backgroundColor: C.card,
    borderRadius: scale(18),
    padding: scale(16),
    marginBottom: scale(12),
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: C.primaryDeep,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
    overflow: 'hidden',
  },
  reqAccentBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: scale(4),
    backgroundColor: C.urgent,
  },
  reqTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: scale(10),
    marginBottom: scale(10),
  },
  reqHospitalIcon: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(12),
    backgroundColor: C.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reqHospital: {
    fontSize: scale(13.5),
    fontWeight: '800',
    color: C.text,
    marginBottom: scale(3),
  },
  reqLocationRow: { flexDirection: 'row', alignItems: 'center', gap: scale(3) },
  reqLocation: { fontSize: scale(11), color: C.textMuted, fontWeight: '500' },
  reqDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scale(6),
    marginBottom: scale(14),
  },
  reqDetailChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
    backgroundColor: C.primaryLight,
    borderRadius: scale(20),
    paddingHorizontal: scale(10),
    paddingVertical: scale(4),
  },
  reqDetailText: { fontSize: scale(11), fontWeight: '600', color: C.primary },
  reqFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: scale(12),
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  reqPayLabel: {
    fontSize: scale(10),
    color: C.textMuted,
    fontWeight: '500',
    marginBottom: scale(2),
  },
  reqPay: { fontSize: scale(18), fontWeight: '900', color: C.text },
  reqPayType: { fontSize: scale(11), fontWeight: '600', color: C.textSub },
  applyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
    backgroundColor: C.primary,
    borderRadius: scale(12),
    paddingHorizontal: scale(16),
    paddingVertical: scale(10),
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  applyBtnText: { color: C.white, fontSize: scale(13), fontWeight: '800' },
});
