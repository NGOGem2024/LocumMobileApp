import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

const { width: SW } = Dimensions.get('window');
const scale = (size: number) => (SW / 390) * size;

// ─── Palette ──────────────────────────────────────────────────────────────────
const C = {
  white: '#ffffff',
  teal: '#007b8e',
  tealDeep: '#003d4a',
  tealMid: '#005f6e',
  tealLight: '#e0f5f8',
  tealBorder: '#b8e3ea',
  ink: '#0d2b30',
  inkSub: '#3d6b75',
  inkMuted: '#7aa8b0',
  // payment-term chip palettes
  nextDay: { bg: '#fff7ed', text: '#c2410c', border: '#fed7aa' },
  weekly: { bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0' },
  monthly: { bg: '#f5f3ff', text: '#6d28d9', border: '#ddd6fe' },
  fallback: { bg: '#f8fafc', text: '#475569', border: '#e2e8f0' },
};

// ─── Types ────────────────────────────────────────────────────────────────────
type PaymentTerm = 'Next Day Payout' | 'Weekly Payout' | 'Monthly Payout';

type RateEntry = {
  _id: string;
  duty_type: string;
  rate_type: 'Hourly' | 'Per Shift';
  day_shift_rate?: number | string;
  night_shift_rate?: number | string;
  sunday_holiday_rate?: number | string;
  effective_from?: string;
  payment_terms?: PaymentTerm;
};

type Props = {
  doctorId: string;
  apiBaseUrl: string;
  authToken: string;
  initialRateCard?: RateEntry[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatRate = (val?: number | string): string => {
  if (val === undefined || val === null || val === '') return '—';
  return `₹${Number(val).toLocaleString('en-IN')}`;
};

const formatDate = (iso?: string): string | null => {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const getPaymentStyle = (term?: PaymentTerm) => {
  if (!term) return C.fallback;
  if (term === 'Next Day Payout') return C.nextDay;
  if (term === 'Weekly Payout') return C.weekly;
  if (term === 'Monthly Payout') return C.monthly;
  return C.fallback;
};

const getPaymentIcon = (term?: PaymentTerm): string => {
  if (term === 'Next Day Payout') return 'flash-outline';
  if (term === 'Weekly Payout') return 'calendar-outline';
  if (term === 'Monthly Payout') return 'albums-outline';
  return 'cash-outline';
};

// ─── Tiny sub-component: one rate row ────────────────────────────────────────
const RateRow = ({
  icon,
  label,
  value,
  unit,
}: {
  icon: string;
  label: string;
  value: string;
  unit?: string;
}) => (
  <View style={styles.rateRow}>
    <View style={styles.rateRowLeft}>
      <View style={styles.rateIconBox}>
        <Ionicons name={icon} size={scale(13)} color={C.teal} />
      </View>
      <Text style={styles.rateLabel}>{label}</Text>
    </View>
    <View style={styles.rateRowRight}>
      <Text style={styles.rateValue}>{value}</Text>
      {unit ? <Text style={styles.rateUnit}>{unit}</Text> : null}
    </View>
  </View>
);

// ─── Main component ───────────────────────────────────────────────────────────
const RateCardSection: React.FC<Props> = ({
  doctorId,
  apiBaseUrl,
  authToken,
  initialRateCard = [],
}) => {
  const [rates, setRates] = useState<RateEntry[]>(initialRateCard);
  const [loading, setLoading] = useState(initialRateCard.length === 0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialRateCard.length > 0) {
      setRates(initialRateCard);
      setLoading(false);
      return;
    }
    if (!doctorId || !authToken) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    fetch(`${apiBaseUrl}/api/doctors/rate-card/${doctorId}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(json => setRates(json.data ?? []))
      .catch(err => {
        console.log('Rate card fetch error:', err);
        setError('Failed to load rate card.');
      })
      .finally(() => setLoading(false));
  }, [doctorId, authToken]);

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.stateWrap}>
        <ActivityIndicator color={C.teal} size="small" />
        <Text style={styles.stateSubText}>Fetching rate card…</Text>
      </View>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <View style={styles.stateWrap}>
        <View style={styles.stateIconCircle}>
          <Ionicons
            name="alert-circle-outline"
            size={scale(22)}
            color={C.teal}
          />
        </View>
        <Text style={styles.stateTitleText}>Something went wrong</Text>
        <Text style={styles.stateSubText}>{error}</Text>
      </View>
    );
  }

  // ── Empty ──────────────────────────────────────────────────────────────────
  if (rates.length === 0) {
    return (
      <View style={styles.stateWrap}>
        <View style={styles.stateIconCircle}>
          <Ionicons name="pricetag-outline" size={scale(22)} color={C.teal} />
        </View>
        <Text style={styles.stateTitleText}>No rate card set yet</Text>
        <Text style={styles.stateSubText}>
          Your rates will appear here once configured by admin.
        </Text>
      </View>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <View>
      {rates.map((item, idx) => {
        const pStyle = getPaymentStyle(item.payment_terms);
        const unit = item.rate_type === 'Hourly' ? '/hr' : undefined;

        return (
          <View
            key={item._id ?? `${item.duty_type}-${idx}`}
            style={[styles.card, idx !== rates.length - 1 && styles.cardGap]}
          >
            {/* ── Teal accent bar on left ── */}
            <View style={styles.accentBar} />

            <View style={styles.cardBody}>
              {/* ── HEADER: duty type + rate type pill ── */}
              <View style={styles.headerRow}>
                <View>
                  <Text style={styles.eyebrow}>DUTY TYPE</Text>
                  <Text style={styles.dutyName}>{item.duty_type}</Text>
                </View>
                <View style={styles.rateTypePill}>
                  <Text style={styles.rateTypePillText}>{item.rate_type}</Text>
                </View>
              </View>

              {/* ── DIVIDER ── */}
              <View style={styles.divider} />

              {/* ── RATES: icon + label on left, value on right ── */}
              <RateRow
                icon="sunny-outline"
                label="Day Shift"
                value={formatRate(item.day_shift_rate)}
                unit={unit}
              />
              <RateRow
                icon="moon-outline"
                label="Night Shift"
                value={formatRate(item.night_shift_rate)}
                unit={unit}
              />
              <RateRow
                icon="star-outline"
                label="Sun / Holiday"
                value={formatRate(item.sunday_holiday_rate)}
                unit={unit}
              />

              {/* ── DIVIDER ── */}
              <View style={styles.divider} />

              {/* ── FOOTER: payment terms chip + effective date ── */}
              <View style={styles.footerRow}>
                {/* Payment terms chip */}
                {item.payment_terms ? (
                  <View
                    style={[
                      styles.paymentChip,
                      {
                        backgroundColor: pStyle.bg,
                        borderColor: pStyle.border,
                      },
                    ]}
                  >
                    <Ionicons
                      name={getPaymentIcon(item.payment_terms)}
                      size={scale(11)}
                      color={pStyle.text}
                    />
                    <Text
                      style={[styles.paymentChipText, { color: pStyle.text }]}
                    >
                      {item.payment_terms}
                    </Text>
                  </View>
                ) : null}

                {/* Effective date */}
                {item.effective_from ? (
                  <View style={styles.effectiveRow}>
                    <Ionicons
                      name="time-outline"
                      size={scale(11)}
                      color={C.inkMuted}
                    />
                    <Text style={styles.effectiveText}>
                      From {formatDate(item.effective_from)}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
};

export default RateCardSection;

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // ── State screens (loading / error / empty) ──────────────────────────────
  stateWrap: {
    paddingVertical: scale(32),
    alignItems: 'center',
    gap: scale(8),
  },
  stateIconCircle: {
    width: scale(48),
    height: scale(48),
    borderRadius: scale(24),
    backgroundColor: C.tealLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scale(4),
  },
  stateTitleText: {
    fontSize: scale(14),
    fontWeight: '700',
    color: C.ink,
  },
  stateSubText: {
    fontSize: scale(12),
    color: C.inkMuted,
    textAlign: 'center',
    paddingHorizontal: scale(28),
    lineHeight: scale(18),
  },

  // ── Card shell ────────────────────────────────────────────────────────────
  card: {
    flexDirection: 'row',
    backgroundColor: C.white,
    borderRadius: scale(16),
    borderWidth: 1,
    borderColor: C.tealBorder,
    overflow: 'hidden',
    shadowColor: C.tealDeep,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  cardGap: {
    marginBottom: scale(14),
  },

  // Left teal accent stripe
  accentBar: {
    width: scale(5),
    backgroundColor: C.teal,
  },

  // Content area to the right of accent bar
  cardBody: {
    flex: 1,
    paddingHorizontal: scale(14),
    paddingVertical: scale(14),
  },

  // ── Card header ───────────────────────────────────────────────────────────
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: scale(12),
  },
  eyebrow: {
    fontSize: scale(9),
    fontWeight: '700',
    color: C.inkMuted,
    letterSpacing: 1,
    marginBottom: scale(2),
  },
  dutyName: {
    fontSize: scale(16),
    fontWeight: '800',
    color: C.tealDeep,
    letterSpacing: -0.3,
  },
  rateTypePill: {
    backgroundColor: C.tealLight,
    borderRadius: scale(8),
    borderWidth: 1,
    borderColor: C.tealBorder,
    paddingHorizontal: scale(10),
    paddingVertical: scale(4),
  },
  rateTypePillText: {
    fontSize: scale(10),
    fontWeight: '700',
    color: C.tealMid,
    letterSpacing: 0.4,
  },

  // ── Divider ───────────────────────────────────────────────────────────────
  divider: {
    height: 1,
    backgroundColor: C.tealBorder,
    marginVertical: scale(10),
  },

  // ── Rate rows ─────────────────────────────────────────────────────────────
  rateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: scale(6),
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
    backgroundColor: C.tealLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rateLabel: {
    fontSize: scale(12),
    color: C.inkSub,
    fontWeight: '500',
  },
  rateRowRight: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: scale(2),
  },
  rateValue: {
    fontSize: scale(15),
    fontWeight: '800',
    color: C.ink,
    letterSpacing: -0.3,
  },
  rateUnit: {
    fontSize: scale(10),
    fontWeight: '600',
    color: C.inkMuted,
  },

  // ── Footer ────────────────────────────────────────────────────────────────
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: scale(6),
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
  paymentChipText: {
    fontSize: scale(11),
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  effectiveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
  },
  effectiveText: {
    fontSize: scale(11),
    color: C.inkMuted,
    fontWeight: '500',
  },
});
