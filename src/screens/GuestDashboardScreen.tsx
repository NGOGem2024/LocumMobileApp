import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Dimensions,
  StatusBar,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppHeader from '../components/AppHeader';
import { BackHandler } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

const { width: SW } = Dimensions.get('window');
const scale = (size: number) => (SW / 390) * size;

const C = {
  primary: '#007b8e',
  primaryDark: '#005f6e',
  primaryDeep: '#003d4a',
  primaryLight: '#e0f5f8',
  primaryMid: '#b2e4ec',
  accent: '#00c9e0',
  accentWarm: '#00e5b0',
  white: '#ffffff',
  offWhite: '#f7fdfe',
  bg: '#f0fbfc',
  text: '#0d2b30',
  textSub: '#3d6b75',
  textMuted: '#7aa8b0',
  border: '#c2e6ed',
  cardBg: '#ffffff',
  success: '#00b894',
  warning: '#f59e0b',
  tag1: '#e8f5e9',
  tag1Text: '#2e7d32',
  tag2: '#fff3e0',
  tag2Text: '#e65100',
  tag3: '#e3f2fd',
  tag3Text: '#1565c0',
};

// ─── DUMMY DATA ───────────────────────────────────────────────────────────────

const FEATURED_JOBS = [
  {
    id: '1',
    title: 'General Physician',
    hospital: 'Apollo Clinic',
    city: 'Mumbai, MH',
    pay: '₹3,500',
    payLabel: 'per shift',
    type: 'Locum Shift',
    date: '03 May 2026',
    time: '9:00 AM – 5:00 PM',
    icon: '🩺',
    color: '#e0f5f8',
    urgent: true,
    slots: 2,
  },
  {
    id: '2',
    title: 'Pediatrician',
    hospital: 'Cloudnine Hospital',
    city: 'Pune, MH',
    pay: '₹4,000',
    payLabel: 'per shift',
    type: 'Weekend',
    date: '04 May 2026',
    time: '10:00 AM – 4:00 PM',
    icon: '👶',
    color: '#fce4ec',
    urgent: false,
    slots: 1,
  },
  {
    id: '3',
    title: 'Cardiologist',
    hospital: 'Fortis Hospital',
    city: 'Nashik, MH',
    pay: '₹6,000',
    payLabel: 'per shift',
    type: 'Teleconsult',
    date: '05 May 2026',
    time: 'Flexible',
    icon: '❤️',
    color: '#fbe9e7',
    urgent: true,
    slots: 3,
  },
];

const ALL_JOBS = [
  {
    id: '4',
    title: 'Dermatologist',
    hospital: 'Skin & Care Clinic',
    city: 'Nagpur, MH',
    pay: '₹3,000/shift',
    type: 'Locum Shift',
    date: '06 May 2026',
    icon: '🔬',
    urgent: false,
    slots: 2,
    exp: '3–5 yrs',
  },
  {
    id: '5',
    title: 'Gynecologist',
    hospital: 'Motherhood Hospital',
    city: 'Aurangabad, MH',
    pay: '₹5,500/shift',
    type: 'Full-time',
    date: '07 May 2026',
    icon: '🌸',
    urgent: true,
    slots: 1,
    exp: '5–10 yrs',
  },
  {
    id: '6',
    title: 'Orthopedic Surgeon',
    hospital: 'Lilavati Hospital',
    city: 'Mumbai, MH',
    pay: '₹7,000/shift',
    type: 'Locum Shift',
    date: '08 May 2026',
    icon: '🦴',
    urgent: false,
    slots: 1,
    exp: '10+ yrs',
  },
  {
    id: '7',
    title: 'Anesthesiologist',
    hospital: 'KEM Hospital',
    city: 'Mumbai, MH',
    pay: '₹8,500/shift',
    type: 'Locum Shift',
    date: '09 May 2026',
    icon: '💉',
    urgent: true,
    slots: 2,
    exp: '5–10 yrs',
  },
  {
    id: '8',
    title: 'Radiologist',
    hospital: 'Wockhardt Hospital',
    city: 'Navi Mumbai, MH',
    pay: '₹5,000/shift',
    type: 'Teleconsult',
    date: '10 May 2026',
    icon: '📡',
    urgent: false,
    slots: 3,
    exp: '3–5 yrs',
  },
  {
    id: '9',
    title: 'Neurologist',
    hospital: 'Breach Candy Hospital',
    city: 'Mumbai, MH',
    pay: '₹9,000/shift',
    type: 'Locum Shift',
    date: '11 May 2026',
    icon: '🧠',
    urgent: false,
    slots: 1,
    exp: '10+ yrs',
  },
  {
    id: '10',
    title: 'Psychiatrist',
    hospital: 'Nimhans Clinic',
    city: 'Pune, MH',
    pay: '₹4,500/shift',
    type: 'Teleconsult',
    date: '12 May 2026',
    icon: '🧘',
    urgent: false,
    slots: 4,
    exp: '3–5 yrs',
  },
  {
    id: '11',
    title: 'ENT Specialist',
    hospital: 'Ruby Hall Clinic',
    city: 'Pune, MH',
    pay: '₹3,800/shift',
    type: 'Weekend',
    date: '13 May 2026',
    icon: '👂',
    urgent: true,
    slots: 2,
    exp: '1–3 yrs',
  },
];

const SPECIALTIES = [
  { label: 'All', icon: '🔍' },
  { label: 'General', icon: '🩺' },
  { label: 'Cardio', icon: '❤️' },
  { label: 'Peds', icon: '👶' },
  { label: 'Ortho', icon: '🦴' },
  { label: 'Neuro', icon: '🧠' },
  { label: 'Derm', icon: '🔬' },
];

const STATS = [
  { val: '500+', label: 'Verified Doctors' },
  { val: '200+', label: 'Partner Hospitals' },
  { val: '₹0', label: 'Platform Fee' },
];

// ─── GUEST BANNER ────────────────────────────────────────────────────────────

const GuestBanner = ({ onRegister }: { onRegister: () => void }) => (
  <View style={bannerSt.wrap}>
    <View style={bannerSt.blob} />
    <View style={bannerSt.content}>
      <View>
        <Text style={bannerSt.eyebrow}>👋 BROWSING AS GUEST</Text>
        <Text style={bannerSt.title}>Register to Apply</Text>
        <Text style={bannerSt.desc}>
          See full shift details, apply instantly & get matched to top
          hospitals.
        </Text>
      </View>
      <TouchableOpacity
        style={bannerSt.btn}
        onPress={onRegister}
        activeOpacity={0.85}
      >
        <Text style={bannerSt.btnTxt}>Register Free →</Text>
      </TouchableOpacity>
    </View>
  </View>
);

const bannerSt = StyleSheet.create({
  wrap: {
    backgroundColor: C.primaryDark,
    marginHorizontal: scale(16),
    marginTop: scale(16),
    borderRadius: scale(18),
    overflow: 'hidden',
  },
  blob: {
    position: 'absolute',
    width: scale(160),
    height: scale(160),
    borderRadius: scale(80),
    backgroundColor: 'rgba(0,201,224,0.12)',
    top: scale(-40),
    right: scale(-40),
  },
  content: { padding: scale(18), gap: scale(14) },
  eyebrow: {
    color: C.accentWarm,
    fontSize: scale(10),
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: scale(4),
  },
  title: {
    fontSize: scale(18),
    fontWeight: '900',
    color: C.white,
    marginBottom: scale(4),
  },
  desc: {
    fontSize: scale(12),
    color: 'rgba(255,255,255,0.65)',
    lineHeight: scale(18),
  },
  btn: {
    backgroundColor: C.accent,
    borderRadius: scale(12),
    paddingVertical: scale(12),
    alignItems: 'center',
  },
  btnTxt: { color: C.primaryDeep, fontWeight: '800', fontSize: scale(14) },
});

// ─── STATS STRIP ─────────────────────────────────────────────────────────────

const StatsStrip = () => (
  <View style={statSt.strip}>
    {STATS.map((s, i) => (
      <React.Fragment key={i}>
        <View style={statSt.item}>
          <Text style={statSt.val}>{s.val}</Text>
          <Text style={statSt.lbl}>{s.label}</Text>
        </View>
        {i < STATS.length - 1 && <View style={statSt.div} />}
      </React.Fragment>
    ))}
  </View>
);

const statSt = StyleSheet.create({
  strip: {
    flexDirection: 'row',
    marginHorizontal: scale(16),
    marginTop: scale(14),
    backgroundColor: C.white,
    borderRadius: scale(14),
    paddingVertical: scale(14),
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  item: { flex: 1, alignItems: 'center' },
  val: {
    fontSize: scale(20),
    fontWeight: '900',
    color: C.primary,
    marginBottom: scale(2),
  },
  lbl: {
    fontSize: scale(10),
    color: C.textMuted,
    fontWeight: '600',
    textAlign: 'center',
  },
  div: { width: 1, backgroundColor: C.border, marginVertical: scale(4) },
});

// ─── FEATURED CARD ────────────────────────────────────────────────────────────

const FeaturedCard = ({
  job,
  onPress,
}: {
  job: (typeof FEATURED_JOBS)[0];
  onPress: () => void;
}) => (
  <TouchableOpacity style={fcSt.card} onPress={onPress} activeOpacity={0.88}>
    {job.urgent && (
      <View style={fcSt.urgentBadge}>
        <Text style={fcSt.urgentTxt}>🔴 Urgent</Text>
      </View>
    )}
    <View style={[fcSt.iconWrap, { backgroundColor: job.color }]}>
      <Text style={{ fontSize: scale(28) }}>{job.icon}</Text>
    </View>
    <Text style={fcSt.title}>{job.title}</Text>
    <Text style={fcSt.hospital}>{job.hospital}</Text>
    <Text style={fcSt.city}>📍 {job.city}</Text>
    <View style={fcSt.divider} />
    <View style={fcSt.bottom}>
      <View>
        <Text style={fcSt.pay}>{job.pay}</Text>
        <Text style={fcSt.payLbl}>{job.payLabel}</Text>
      </View>
      <View style={fcSt.typePill}>
        <Text style={fcSt.typeText}>{job.type}</Text>
      </View>
    </View>
    <Text style={fcSt.date}>📅 {job.date}</Text>
    <TouchableOpacity
      style={fcSt.applyBtn}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <Text style={fcSt.applyTxt}>View & Apply</Text>
    </TouchableOpacity>
  </TouchableOpacity>
);

const fcSt = StyleSheet.create({
  card: {
    width: scale(200),
    backgroundColor: C.white,
    borderRadius: scale(20),
    padding: scale(16),
    marginRight: scale(14),
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.09,
    shadowRadius: 14,
    elevation: 4,
  },
  urgentBadge: {
    position: 'absolute',
    top: scale(12),
    right: scale(12),
    backgroundColor: '#fff0f0',
    borderRadius: scale(8),
    paddingHorizontal: scale(6),
    paddingVertical: scale(3),
  },
  urgentTxt: { fontSize: scale(9), fontWeight: '700', color: '#c62828' },
  iconWrap: {
    width: scale(54),
    height: scale(54),
    borderRadius: scale(16),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scale(12),
  },
  title: {
    fontSize: scale(14),
    fontWeight: '800',
    color: C.text,
    marginBottom: scale(3),
  },
  hospital: {
    fontSize: scale(12),
    color: C.textSub,
    fontWeight: '600',
    marginBottom: scale(2),
  },
  city: { fontSize: scale(11), color: C.textMuted, marginBottom: scale(10) },
  divider: { height: 1, backgroundColor: C.border, marginBottom: scale(10) },
  bottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scale(8),
  },
  pay: { fontSize: scale(16), fontWeight: '900', color: C.primary },
  payLbl: { fontSize: scale(10), color: C.textMuted, fontWeight: '500' },
  typePill: {
    backgroundColor: C.primaryLight,
    borderRadius: scale(10),
    paddingHorizontal: scale(8),
    paddingVertical: scale(4),
  },
  typeText: { fontSize: scale(10), color: C.primaryDark, fontWeight: '700' },
  date: { fontSize: scale(11), color: C.textMuted, marginBottom: scale(12) },
  applyBtn: {
    backgroundColor: C.primary,
    borderRadius: scale(10),
    paddingVertical: scale(10),
    alignItems: 'center',
  },
  applyTxt: { color: C.white, fontWeight: '800', fontSize: scale(13) },
});

// ─── JOB LIST ITEM ────────────────────────────────────────────────────────────

const JobListItem = ({
  job,
  onPress,
}: {
  job: (typeof ALL_JOBS)[0];
  onPress: () => void;
}) => (
  <TouchableOpacity style={jlSt.card} onPress={onPress} activeOpacity={0.86}>
    <View style={jlSt.left}>
      <View style={jlSt.iconWrap}>
        <Text style={{ fontSize: scale(20) }}>{job.icon}</Text>
      </View>
    </View>
    <View style={jlSt.mid}>
      <View style={jlSt.titleRow}>
        <Text style={jlSt.title}>{job.title}</Text>
        {job.urgent && (
          <View style={jlSt.urgentDot}>
            <Text style={jlSt.urgentTxt}>Urgent</Text>
          </View>
        )}
      </View>
      <Text style={jlSt.hospital}>
        {job.hospital} · {job.city}
      </Text>
      <View style={jlSt.tagsRow}>
        <View style={jlSt.tag}>
          <Text style={jlSt.tagTxt}>{job.type}</Text>
        </View>
        <View style={jlSt.tag}>
          <Text style={jlSt.tagTxt}>📅 {job.date}</Text>
        </View>
        <View style={jlSt.tag}>
          <Text style={jlSt.tagTxt}>Exp: {job.exp}</Text>
        </View>
      </View>
    </View>
    <View style={jlSt.right}>
      <Text style={jlSt.pay}>{job.pay}</Text>
      <Text style={jlSt.slots}>
        {job.slots} slot{job.slots !== 1 ? 's' : ''}
      </Text>
      <View style={jlSt.applyBtn}>
        <Text style={jlSt.applyTxt}>Apply</Text>
      </View>
    </View>
  </TouchableOpacity>
);

const jlSt = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: C.white,
    borderRadius: scale(16),
    padding: scale(14),
    marginBottom: scale(12),
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    gap: scale(12),
    alignItems: 'flex-start',
  },
  left: {},
  iconWrap: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(13),
    backgroundColor: C.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mid: { flex: 1 },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
    marginBottom: scale(3),
    flexWrap: 'wrap',
  },
  title: { fontSize: scale(14), fontWeight: '800', color: C.text },
  urgentDot: {
    backgroundColor: '#fff0f0',
    borderRadius: scale(6),
    paddingHorizontal: scale(6),
    paddingVertical: scale(2),
  },
  urgentTxt: { fontSize: scale(9), fontWeight: '700', color: '#c62828' },
  hospital: { fontSize: scale(11), color: C.textSub, marginBottom: scale(8) },
  tagsRow: { flexDirection: 'row', gap: scale(6), flexWrap: 'wrap' },
  tag: {
    backgroundColor: C.primaryLight,
    borderRadius: scale(8),
    paddingHorizontal: scale(8),
    paddingVertical: scale(3),
  },
  tagTxt: { fontSize: scale(10), color: C.primaryDark, fontWeight: '600' },
  right: { alignItems: 'flex-end', gap: scale(4) },
  pay: { fontSize: scale(13), fontWeight: '900', color: C.primary },
  slots: { fontSize: scale(10), color: C.textMuted, fontWeight: '500' },
  applyBtn: {
    backgroundColor: C.primaryLight,
    borderRadius: scale(8),
    paddingHorizontal: scale(10),
    paddingVertical: scale(6),
    marginTop: scale(4),
  },
  applyTxt: { color: C.primaryDark, fontWeight: '800', fontSize: scale(11) },
});

// ─── REGISTER GATE MODAL ─────────────────────────────────────────────────────

const RegisterGateModal = ({
  visible,
  onClose,
  onRegister,
  onLogin,
}: {
  visible: boolean;
  onClose: () => void;
  onRegister: () => void;
  onLogin: () => void;
}) => (
  <Modal
    visible={visible}
    transparent
    animationType="slide"
    onRequestClose={onClose}
  >
    <TouchableOpacity style={modSt.overlay} activeOpacity={1} onPress={onClose}>
      <View style={modSt.sheet}>
        <View style={modSt.handle} />
        <Text style={modSt.emoji}>🔐</Text>
        <Text style={modSt.title}>Create a Free Account</Text>
        <Text style={modSt.desc}>
          Register as a verified doctor to apply for shifts, view full job
          details, and get matched with top hospitals — completely free.
        </Text>
        <View style={modSt.perks}>
          {[
            '✅ Apply to 200+ open shifts',
            '✅ Get matched by specialty & location',
            '✅ Instant shift confirmation',
            '✅ Prompt, transparent payments',
          ].map((p, i) => (
            <Text key={i} style={modSt.perk}>
              {p}
            </Text>
          ))}
        </View>
        <TouchableOpacity
          style={modSt.primaryBtn}
          onPress={onRegister}
          activeOpacity={0.85}
        >
          <Text style={modSt.primaryTxt}>Register as Doctor →</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={modSt.secondaryBtn}
          onPress={onLogin}
          activeOpacity={0.85}
        >
          <Text style={modSt.secondaryTxt}>Already have an account? Login</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onClose} style={{ marginTop: scale(10) }}>
          <Text style={modSt.skip}>Continue browsing as guest</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  </Modal>
);

const modSt = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,25,28,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: C.white,
    borderTopLeftRadius: scale(28),
    borderTopRightRadius: scale(28),
    padding: scale(28),
    paddingBottom: scale(40),
    alignItems: 'center',
  },
  handle: {
    width: scale(40),
    height: 4,
    borderRadius: 2,
    backgroundColor: C.border,
    marginBottom: scale(20),
  },
  emoji: { fontSize: scale(40), marginBottom: scale(12) },
  title: {
    fontSize: scale(22),
    fontWeight: '900',
    color: C.text,
    marginBottom: scale(8),
    textAlign: 'center',
  },
  desc: {
    fontSize: scale(13),
    color: C.textSub,
    lineHeight: scale(20),
    textAlign: 'center',
    marginBottom: scale(18),
  },
  perks: { width: '100%', gap: scale(8), marginBottom: scale(24) },
  perk: { fontSize: scale(13), color: C.text, fontWeight: '600' },
  primaryBtn: {
    width: '100%',
    backgroundColor: C.primary,
    borderRadius: scale(14),
    paddingVertical: scale(16),
    alignItems: 'center',
    marginBottom: scale(12),
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 6,
  },
  primaryTxt: { color: C.white, fontWeight: '800', fontSize: scale(15) },
  secondaryBtn: {
    width: '100%',
    borderWidth: 1.5,
    borderColor: C.primary,
    borderRadius: scale(14),
    paddingVertical: scale(14),
    alignItems: 'center',
  },
  secondaryTxt: { color: C.primary, fontWeight: '700', fontSize: scale(14) },
  skip: { color: C.textMuted, fontSize: scale(12), fontWeight: '500' },
});

// ─── MAIN SCREEN ─────────────────────────────────────────────────────────────

interface GuestDashboardScreenProps {
  navigation?: any;
}

const GuestDashboardScreen = ({ navigation }: GuestDashboardScreenProps) => {
  const [selectedSpecialty, setSelectedSpecialty] = useState('All');
  const [gateVisible, setGateVisible] = useState(false);
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

  const handleJobPress = () => setGateVisible(true);
  const handleRegister = () => {
    setGateVisible(false);
    navigation?.navigate('RegisterDoctor');
  };
  const handleLogin = () => {
    setGateVisible(false);
    navigation?.navigate('LoginScreen');
  };

  const filteredJobs =
    selectedSpecialty === 'All'
      ? ALL_JOBS
      : ALL_JOBS.filter(j =>
          j.title.toLowerCase().includes(selectedSpecialty.toLowerCase()),
        );

  useFocusEffect(
    React.useCallback(() => {
      const subscription = BackHandler.addEventListener(
        'hardwareBackPress',
        () => {
          navigation.goBack();
          return true;
        },
      );
      return () => subscription.remove();
    }, [navigation]),
  );

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor={C.primaryDeep} />

      <AppHeader onBack={() => navigation?.goBack()} />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
        >
          {/* ── GUEST BANNER ── */}
          <GuestBanner onRegister={handleRegister} />

          {/* ── STATS ── */}
          <StatsStrip />

          {/* ── FEATURED SHIFTS ── */}
          <View style={styles.sectionHeader}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>⚡ FEATURED SHIFTS</Text>
            </View>
            <Text style={styles.sectionTitle}>Urgent Openings Near You</Text>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.hScroll}
          >
            {FEATURED_JOBS.map(job => (
              <FeaturedCard key={job.id} job={job} onPress={handleJobPress} />
            ))}
          </ScrollView>

          {/* ── SPECIALTY FILTER ── */}
          <View style={styles.sectionHeader}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>ALL OPPORTUNITIES</Text>
            </View>
            <Text style={styles.sectionTitle}>Browse by Specialty</Text>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScroll}
          >
            {SPECIALTIES.map(s => (
              <TouchableOpacity
                key={s.label}
                style={[
                  styles.filterPill,
                  selectedSpecialty === s.label && styles.filterPillActive,
                ]}
                onPress={() => setSelectedSpecialty(s.label)}
                activeOpacity={0.8}
              >
                <Text style={{ fontSize: scale(14) }}>{s.icon}</Text>
                <Text
                  style={[
                    styles.filterTxt,
                    selectedSpecialty === s.label && styles.filterTxtActive,
                  ]}
                >
                  {s.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* ── JOB LIST ── */}
          <View style={styles.jobList}>
            {filteredJobs.length === 0 ? (
              <Text style={styles.noJobs}>
                No shifts found for this specialty.
              </Text>
            ) : (
              filteredJobs.map(job => (
                <JobListItem key={job.id} job={job} onPress={handleJobPress} />
              ))
            )}
          </View>

          {/* ── HOW IT WORKS ── */}
          <View style={styles.howSection}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>HOW IT WORKS</Text>
            </View>
            <Text style={styles.sectionTitle}>Start in 3 Simple Steps</Text>
            {[
              {
                num: '01',
                title: 'Register Free',
                desc: 'Sign up in under 5 minutes with your medical credentials.',
                icon: '✍️',
              },
              {
                num: '02',
                title: 'Get Matched',
                desc: 'We pair you with verified hospitals in your preferred area.',
                icon: '🎯',
              },
              {
                num: '03',
                title: 'Work & Earn',
                desc: 'Accept shifts and receive transparent, prompt payouts.',
                icon: '💰',
              },
            ].map((step, i) => (
              <View key={i} style={styles.stepCard}>
                <View style={styles.stepNum}>
                  <Text style={styles.stepNumTxt}>{step.num}</Text>
                </View>
                <View style={styles.stepIcon}>
                  <Text style={{ fontSize: scale(22) }}>{step.icon}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.stepTitle}>{step.title}</Text>
                  <Text style={styles.stepDesc}>{step.desc}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* ── BOTTOM CTA ── */}
          <View style={styles.bottomCTA}>
            <Text style={styles.ctaTitle}>Ready to Get Started?</Text>
            <Text style={styles.ctaSub}>
              Join 500+ verified doctors on India's top locum platform.
            </Text>
            <TouchableOpacity
              style={styles.ctaBtn}
              onPress={handleRegister}
              activeOpacity={0.85}
            >
              <Text style={styles.ctaBtnTxt}>
                Register as Doctor — It's Free →
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ScrollView>

      {/* ── REGISTER GATE MODAL ── */}
      <RegisterGateModal
        visible={gateVisible}
        onClose={() => setGateVisible(false)}
        onRegister={handleRegister}
        onLogin={handleLogin}
      />
    </SafeAreaView>
  );
};

// ─── STYLES ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  scroll: { paddingBottom: scale(40) },

  sectionHeader: {
    paddingHorizontal: scale(18),
    paddingTop: scale(28),
    paddingBottom: scale(4),
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: C.primaryLight,
    borderRadius: scale(20),
    paddingHorizontal: scale(12),
    paddingVertical: scale(4),
    marginBottom: scale(8),
  },
  badgeText: {
    fontSize: scale(10),
    fontWeight: '800',
    color: C.primary,
    letterSpacing: 1.4,
  },
  sectionTitle: {
    fontSize: scale(20),
    fontWeight: '900',
    color: C.text,
    letterSpacing: -0.3,
  },

  hScroll: {
    paddingHorizontal: scale(18),
    paddingTop: scale(14),
    paddingBottom: scale(6),
  },

  filterScroll: {
    paddingHorizontal: scale(18),
    paddingVertical: scale(14),
    gap: scale(8),
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
    paddingHorizontal: scale(14),
    paddingVertical: scale(8),
    borderRadius: scale(20),
    borderWidth: 1.5,
    borderColor: C.border,
    backgroundColor: C.white,
  },
  filterPillActive: {
    borderColor: C.primary,
    backgroundColor: C.primaryLight,
  },
  filterTxt: { fontSize: scale(13), color: C.textSub, fontWeight: '600' },
  filterTxtActive: { color: C.primary, fontWeight: '800' },

  jobList: { paddingHorizontal: scale(16), paddingTop: scale(4) },
  noJobs: {
    textAlign: 'center',
    color: C.textMuted,
    fontSize: scale(14),
    marginTop: scale(20),
  },

  howSection: {
    backgroundColor: C.primaryDeep,
    marginTop: scale(28),
    padding: scale(22),
  },
  stepCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(14),
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: scale(14),
    padding: scale(14),
    marginBottom: scale(12),
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  stepNum: {
    width: scale(38),
    height: scale(38),
    borderRadius: scale(19),
    backgroundColor: C.accent,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  stepNumTxt: { color: C.primaryDeep, fontWeight: '900', fontSize: scale(12) },
  stepIcon: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(12),
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  stepTitle: {
    fontSize: scale(14),
    fontWeight: '800',
    color: C.white,
    marginBottom: scale(2),
  },
  stepDesc: {
    fontSize: scale(12),
    color: 'rgba(255,255,255,0.6)',
    lineHeight: scale(18),
  },

  bottomCTA: {
    margin: scale(16),
    backgroundColor: C.primary,
    borderRadius: scale(20),
    padding: scale(24),
    alignItems: 'center',
  },
  ctaTitle: {
    fontSize: scale(20),
    fontWeight: '900',
    color: C.white,
    marginBottom: scale(6),
    textAlign: 'center',
  },
  ctaSub: {
    fontSize: scale(13),
    color: 'rgba(255,255,255,0.7)',
    marginBottom: scale(20),
    textAlign: 'center',
    lineHeight: scale(20),
  },
  ctaBtn: {
    backgroundColor: C.white,
    borderRadius: scale(14),
    paddingVertical: scale(14),
    paddingHorizontal: scale(20),
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 14,
    elevation: 6,
  },
  ctaBtnTxt: { color: C.primary, fontWeight: '800', fontSize: scale(14) },
});

export default GuestDashboardScreen;
