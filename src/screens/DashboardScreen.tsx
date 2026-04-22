import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Dimensions,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width: SW } = Dimensions.get('window');
const scale = (size: number) => (SW / 390) * size;

const C = {
  primary: '#007b8e',
  primaryDark: '#005f6e',
  primaryLight: '#e0f5f8',
  primaryMid: '#b2e4ec',
  accent: '#00b4cc',
  white: '#ffffff',
  bg: '#f4fbfc',
  text: '#0d2b30',
  textSub: '#4a7a82',
  textMuted: '#9ab8bc',
  border: '#c8e8ed',
  error: '#e53935',
  success: '#00b894',
  warning: '#f59e0b',
  cardBg: '#ffffff',
};

const DashboardScreen = ({ route }: any) => {
  const doctorName = route?.params?.name || 'Doctor';
  const isVerified = false;

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const features = [
    {
      title: 'Available Shifts',
      icon: '📅',
      locked: !isVerified,
      desc: 'Browse open locum shifts',
    },
    {
      title: 'Apply for Jobs',
      icon: '💼',
      locked: !isVerified,
      desc: 'Apply to nearby opportunities',
    },
    {
      title: 'Earnings',
      icon: '💰',
      locked: !isVerified,
      desc: 'Track your income & payments',
    },
    {
      title: 'Profile',
      icon: '👤',
      locked: !isVerified,
      desc: 'View & edit your profile',
    },
  ];

  const stats = [
    { label: 'Applications', value: '0', icon: '📋' },
    { label: 'Shifts Done', value: '0', icon: '✅' },
    { label: 'Earnings', value: '₹0', icon: '💳' },
  ];

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor={C.primaryDark} />

      {/* ── HEADER ── */}
      <View style={styles.header}>
        <View style={styles.headerInner}>
          <View>
            <Text style={styles.headerGreeting}>HT Locum</Text>
            <Text style={styles.headerName}>Dr. {doctorName}</Text>
          </View>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>
              {doctorName.charAt(0).toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Verification Banner */}
        <View
          style={[
            styles.verifyBanner,
            isVerified ? styles.verifyBannerOk : styles.verifyBannerPending,
          ]}
        >
          <Text style={styles.verifyIcon}>{isVerified ? '✅' : '⏳'}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.verifyTitle}>
              {isVerified ? 'Account Verified' : 'Verification Pending'}
            </Text>
            <Text style={styles.verifySub}>
              {isVerified
                ? 'Your profile is active and visible to hospitals'
                : "We'll verify your credentials within 24–48 hours"}
            </Text>
          </View>
          <View
            style={[
              styles.verifyDot,
              { backgroundColor: isVerified ? C.success : C.warning },
            ]}
          />
        </View>
      </View>

      <Animated.ScrollView
        style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── STATS ROW ── */}
        <View style={styles.statsRow}>
          {stats.map((s, i) => (
            <View key={i} style={styles.statCard}>
              <Text style={styles.statIcon}>{s.icon}</Text>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* ── FEATURES ── */}
        <Text style={styles.sectionTitle}>Quick Access</Text>
        <View style={styles.featuresGrid}>
          {features.map((f, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.featureCard, f.locked && styles.featureCardLocked]}
              activeOpacity={f.locked ? 1 : 0.75}
              disabled={f.locked}
            >
              <View
                style={[
                  styles.featureIconBox,
                  f.locked && styles.featureIconBoxLocked,
                ]}
              >
                <Text style={styles.featureIcon}>
                  {f.locked ? '🔒' : f.icon}
                </Text>
              </View>
              <Text
                style={[
                  styles.featureTitle,
                  f.locked && styles.featureTitleLocked,
                ]}
              >
                {f.title}
              </Text>
              <Text
                style={[
                  styles.featureDesc,
                  f.locked && styles.featureDescLocked,
                ]}
              >
                {f.locked ? 'Unlocks after verification' : f.desc}
              </Text>
              {!f.locked && (
                <View style={styles.featureArrow}>
                  <Text
                    style={{
                      color: C.primary,
                      fontWeight: '800',
                      fontSize: scale(14),
                    }}
                  >
                    →
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* ── TIPS CARD ── */}
        <View style={styles.tipsCard}>
          <Text style={styles.tipsTitle}>💡 While you wait…</Text>
          <View style={styles.tipRow}>
            <Text style={styles.tipBullet}>•</Text>
            <Text style={styles.tipText}>
              Ensure your registration certificate is ready for verification
            </Text>
          </View>
          <View style={styles.tipRow}>
            <Text style={styles.tipBullet}>•</Text>
            <Text style={styles.tipText}>
              Check your email for any follow-up from our team
            </Text>
          </View>
          <View style={styles.tipRow}>
            <Text style={styles.tipBullet}>•</Text>
            <Text style={styles.tipText}>
              Complete your profile to rank higher in job matches
            </Text>
          </View>
        </View>

        {/* ── UPCOMING SHIFT (verified only) ── */}
        {isVerified && (
          <View style={styles.shiftCard}>
            <View style={styles.shiftHeader}>
              <Text style={styles.shiftHeaderTitle}>📅 Upcoming Shift</Text>
              <View style={styles.shiftBadge}>
                <Text style={styles.shiftBadgeText}>CONFIRMED</Text>
              </View>
            </View>
            <Text style={styles.shiftHospital}>City Care Hospital</Text>
            <View style={styles.shiftRow}>
              <Text style={styles.shiftMeta}>📆 25 April 2026</Text>
              <Text style={styles.shiftMeta}>🕙 10:00 AM – 6:00 PM</Text>
            </View>
          </View>
        )}

        <View style={{ height: scale(20) }} />
      </Animated.ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },

  // ── Header
  header: {
    backgroundColor: C.primary,
    paddingHorizontal: scale(20),
    paddingTop: scale(16),
    paddingBottom: scale(20),
    borderBottomLeftRadius: scale(28),
    borderBottomRightRadius: scale(28),
  },
  headerInner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scale(16),
  },
  headerGreeting: {
    fontSize: scale(13),
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '500',
    marginBottom: 2,
  },
  headerName: {
    fontSize: scale(22),
    fontWeight: '800',
    color: C.white,
    letterSpacing: 0.2,
  },
  avatarCircle: {
    width: scale(46),
    height: scale(46),
    borderRadius: scale(23),
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  avatarText: {
    fontSize: scale(20),
    fontWeight: '800',
    color: C.white,
  },

  // ── Verify Banner
  verifyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: scale(14),
    padding: scale(12),
    gap: scale(10),
  },
  verifyBannerPending: { backgroundColor: 'rgba(255,255,255,0.18)' },
  verifyBannerOk: { backgroundColor: 'rgba(0,184,148,0.25)' },
  verifyIcon: { fontSize: scale(20) },
  verifyTitle: {
    fontSize: scale(13),
    fontWeight: '700',
    color: C.white,
    marginBottom: 1,
  },
  verifySub: {
    fontSize: scale(11),
    color: 'rgba(255,255,255,0.78)',
    lineHeight: scale(15),
  },
  verifyDot: {
    width: scale(10),
    height: scale(10),
    borderRadius: scale(5),
    alignSelf: 'flex-start',
    marginTop: scale(4),
  },

  scroll: { padding: scale(16), paddingTop: scale(20) },

  // ── Stats
  statsRow: {
    flexDirection: 'row',
    gap: scale(10),
    marginBottom: scale(24),
  },
  statCard: {
    flex: 1,
    backgroundColor: C.white,
    borderRadius: scale(16),
    padding: scale(14),
    alignItems: 'center',
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  statIcon: { fontSize: scale(20), marginBottom: scale(6) },
  statValue: {
    fontSize: scale(18),
    fontWeight: '800',
    color: C.text,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: scale(10),
    color: C.textMuted,
    fontWeight: '600',
    textAlign: 'center',
  },

  // ── Features
  sectionTitle: {
    fontSize: scale(15),
    fontWeight: '700',
    color: C.text,
    marginBottom: scale(12),
    letterSpacing: 0.2,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scale(12),
    marginBottom: scale(24),
  },
  featureCard: {
    width: (SW - scale(32) - scale(12)) / 2,
    backgroundColor: C.white,
    borderRadius: scale(18),
    padding: scale(16),
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.09,
    shadowRadius: 12,
    elevation: 3,
    minHeight: scale(130),
  },
  featureCardLocked: {
    opacity: 0.6,
    backgroundColor: '#f8fefe',
  },
  featureIconBox: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(12),
    backgroundColor: C.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scale(10),
  },
  featureIconBoxLocked: { backgroundColor: '#f0f4f4' },
  featureIcon: { fontSize: scale(20) },
  featureTitle: {
    fontSize: scale(13),
    fontWeight: '700',
    color: C.text,
    marginBottom: 4,
  },
  featureTitleLocked: { color: C.textMuted },
  featureDesc: {
    fontSize: scale(11),
    color: C.textSub,
    lineHeight: scale(16),
  },
  featureDescLocked: { color: C.textMuted },
  featureArrow: {
    position: 'absolute',
    bottom: scale(14),
    right: scale(14),
  },

  // ── Tips
  tipsCard: {
    backgroundColor: C.primaryLight,
    borderRadius: scale(18),
    padding: scale(16),
    marginBottom: scale(20),
    borderLeftWidth: 4,
    borderLeftColor: C.primary,
  },
  tipsTitle: {
    fontSize: scale(13),
    fontWeight: '700',
    color: C.primaryDark,
    marginBottom: scale(10),
  },
  tipRow: {
    flexDirection: 'row',
    gap: scale(8),
    marginBottom: scale(6),
    alignItems: 'flex-start',
  },
  tipBullet: {
    color: C.primary,
    fontWeight: '700',
    fontSize: scale(14),
    lineHeight: scale(18),
  },
  tipText: {
    flex: 1,
    fontSize: scale(12),
    color: C.primaryDark,
    lineHeight: scale(18),
  },

  // ── Shift Card
  shiftCard: {
    backgroundColor: C.white,
    borderRadius: scale(18),
    padding: scale(16),
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.09,
    shadowRadius: 12,
    elevation: 3,
    marginBottom: scale(12),
  },
  shiftHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scale(10),
  },
  shiftHeaderTitle: { fontSize: scale(14), fontWeight: '700', color: C.text },
  shiftBadge: {
    backgroundColor: C.success,
    borderRadius: scale(8),
    paddingHorizontal: scale(8),
    paddingVertical: scale(3),
  },
  shiftBadgeText: {
    fontSize: scale(9),
    color: C.white,
    fontWeight: '800',
    letterSpacing: 1,
  },
  shiftHospital: {
    fontSize: scale(16),
    fontWeight: '700',
    color: C.primary,
    marginBottom: scale(8),
  },
  shiftRow: { flexDirection: 'row', gap: scale(16) },
  shiftMeta: { fontSize: scale(12), color: C.textSub, fontWeight: '500' },
});

export default DashboardScreen;
