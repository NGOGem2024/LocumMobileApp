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
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppHeader from '../components/AppHeader';

const { width: SW, height: SH } = Dimensions.get('window');
const scale = (size: number) => (SW / 390) * size;

/* ─── Design Tokens ──────────────────────────────────── */
const C = {
  ink: '#0a1628', // deep navy — primary text / bg
  inkSoft: '#1a2d48',
  inkMid: '#2c4a6e',
  teal: '#00c9d4', // signature teal
  tealSoft: '#b2eef2',
  tealDeep: '#00808a',
  mint: '#00e8b5', // accent mint
  white: '#ffffff',
  offWhite: '#f4fbfc',
  slate: '#8fa8bc',
  card: '#ffffff',
  cardAlt: '#eef8fa',
  border: '#d0eaf0',
};

/* ─── Component ──────────────────────────────────────── */
interface DashboardScreenProps {
  navigation?: any;
}

const DashboardScreen = ({ navigation }: DashboardScreenProps) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  const cardAnims = [0, 1, 2, 3].map(
    () => useRef(new Animated.Value(0)).current,
  );

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 650,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 60,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 550,
          useNativeDriver: true,
        }),
      ]),
      Animated.stagger(
        100,
        cardAnims.map(a =>
          Animated.spring(a, {
            toValue: 1,
            tension: 80,
            friction: 9,
            useNativeDriver: true,
          }),
        ),
      ),
    ]).start();
  }, []);

  const services = [
    {
      icon: '👨‍⚕️',
      title: 'Duty Doctor Deployment',
      desc: 'On-demand doctors for daily operations.',
    },
    {
      icon: '🔄',
      title: 'Locum Coverage',
      desc: 'Seamless short-term shift fill-ins.',
    },
    {
      icon: '📋',
      title: 'Permanent Placement',
      desc: 'Long-term hiring across institutions.',
    },
    {
      icon: '💼',
      title: 'Payroll & Compliance',
      desc: 'End-to-end payroll management.',
    },
  ];

  const aiFeatures = [
    {
      icon: '🧠',
      title: 'Smart Matching',
      desc: 'AI pairs doctors by skill, location & availability.',
    },
    {
      icon: '📡',
      title: 'Live Tracking',
      desc: 'Real-time deployment visibility.',
    },
    {
      icon: '📊',
      title: 'Analytics Dashboard',
      desc: 'Reduce downtime with data-backed staffing.',
    },
  ];

  const values = [
    { title: 'Reliability', desc: 'Consistent qualified access' },
    { title: 'Speed', desc: 'Urgent needs filled fast' },
    { title: 'Transparency', desc: 'Ethical, clear practices' },
    { title: 'Quality', desc: 'Verified professionals only' },
  ];

  return (
    <SafeAreaView style={s.root} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor={C.ink} />

      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── HEADER ── */}
        <AppHeader
          onBack={
            navigation?.canGoBack() ? () => navigation.goBack() : undefined
          }
        />

        {/* ══════════════════════════════════════════════
            HERO
        ══════════════════════════════════════════════ */}
        <Animated.View
          style={[
            s.hero,
            { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
          ]}
        >
          {/* Decorative rings */}
          <View style={s.ring1} />
          <View style={s.ring2} />
          <View style={s.glow} />

          {/* Tagline strip */}
          <View style={s.taglineStrip}>
            <View style={s.pulseDot} />
            <Text style={s.taglineText}>India's Premier Locum Network</Text>
          </View>

          {/* Main headline */}
          <Animated.View style={{ transform: [{ translateY: slideAnim }] }}>
            <Text style={s.heroHeadline}>
              Verified &amp; Trusted{'\n'}
              <Text style={s.heroAccent}>Doctors On Demand</Text>
            </Text>

            <Text style={s.heroPitch}>
              HealTrack AI ensures uninterrupted healthcare delivery — filling
              critical staffing gaps fast so your facility never skips a beat.
            </Text>
          </Animated.View>

          {/* CTAs */}
          <View style={s.ctaRow}>
            <TouchableOpacity
              style={s.ctaPrimary}
              activeOpacity={0.85}
              onPress={() =>
                navigation?.navigate('Register', { role: 'doctor' })
              }
            >
              <Text style={s.ctaPrimaryText}>Register as Doctor</Text>
              <Text style={s.ctaIcon}>→</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={s.ctaOutline}
              activeOpacity={0.85}
              // onPress={() =>
              //   navigation?.navigate('Register', { role: 'hospital' })
              // }
            >
              <Text style={s.ctaOutlineText}>For Hospitals</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={s.loginBtn}
            onPress={() => navigation?.navigate('LoginScreen')}
          >
            <Text style={s.loginText}>
              Already have an account?{'  '}
              <Text style={s.loginBold}>Login →</Text>
            </Text>
          </TouchableOpacity>

          {/* Stats bar */}
          {/* <View style={s.statsBar}>
            {[
              { val: '500+', lbl: 'Verified Doctors' },
              { val: '200+', lbl: 'Partner Hospitals' },
              { val: '24h', lbl: 'Avg Verification' },
            ].map((item, i) => (
              <React.Fragment key={i}>
                <View style={s.statCell}>
                  <Text style={s.statVal}>{item.val}</Text>
                  <Text style={s.statLbl}>{item.lbl}</Text>
                </View>
                {i < 2 && <View style={s.statDivider} />}
              </React.Fragment>
            ))}
          </View> */}
        </Animated.View>

        {/* ══════════════════════════════════════════════
            PICK-UP LINE BANNER
        ══════════════════════════════════════════════ */}
        <View style={s.pickupBanner}>
          <Text style={s.pickupQuote}>"</Text>
          <Text style={s.pickupLine}>
            For critical, last-minute staffing needs — HealTrack delivers the
            right doctor to the right place, every time.
          </Text>
        </View>

        {/* ══════════════════════════════════════════════
            ABOUT SECTION
        ══════════════════════════════════════════════ */}
        <View style={s.aboutSection}>
          <View style={s.chip}>
            <Text style={s.chipText}>WHO WE ARE</Text>
          </View>
          <Text style={s.aboutTitle}>Doctor Deployment,{'\n'}Reimagined.</Text>
          <Text style={s.aboutBody}>
            HealTrack connects hospitals, clinics & diagnostic centres with
            verified, qualified medical professionals — exactly when and where
            needed. Zero admin. Zero gaps. Full care continuity.
          </Text>

          <Image
            source={require('../assets/LandingImage.png')}
            style={s.aboutImage}
          />

          {/* Values grid */}
          <View style={s.valuesGrid}>
            {values.map((v, i) => (
              <View key={i} style={s.valueCard}>
                <View style={s.valueDot} />
                <Text style={s.valueTitle}>{v.title}</Text>
                <Text style={s.valueDesc}>{v.desc}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ══════════════════════════════════════════════
            OUR SERVICES
        ══════════════════════════════════════════════ */}
        <View style={s.servicesSection}>
          <View style={s.chip}>
            <Text style={s.chipText}>OUR SERVICES</Text>
          </View>
          <Text style={s.sectionTitle}>What We Offer</Text>

          <View style={s.servicesGrid}>
            {services.map((svc, i) => (
              <Animated.View
                key={i}
                style={[
                  s.serviceCard,
                  {
                    opacity: cardAnims[i],
                    transform: [{ scale: cardAnims[i] }],
                  },
                ]}
              >
                <View style={s.svcIconBox}>
                  <Text style={s.svcIcon}>{svc.icon}</Text>
                </View>
                <Text style={s.svcTitle}>{svc.title}</Text>
                <Text style={s.svcDesc}>{svc.desc}</Text>
              </Animated.View>
            ))}
          </View>
        </View>

        {/* ══════════════════════════════════════════════
            AI PLATFORM
        ══════════════════════════════════════════════ */}
        <View style={s.aiSection}>
          <View style={s.aiGlow} />

          <View style={[s.chip, s.chipDark]}>
            <Text style={s.chipTextDark}>AI PLATFORM</Text>
          </View>
          <Text style={s.aiSectionTitle}>HealTrack{'\n'}Intelligence</Text>
          <Text style={s.aiSectionSub}>
            Powered by AI to match, manage and monitor your medical workforce in
            real time.
          </Text>

          {aiFeatures.map((f, i) => (
            <View key={i} style={s.aiCard}>
              <View style={s.aiIconBox}>
                <Text style={s.aiIcon}>{f.icon}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.aiTitle}>{f.title}</Text>
                <Text style={s.aiDesc}>{f.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* ══════════════════════════════════════════════
            FINAL CTA
        ══════════════════════════════════════════════ */}
        <View style={s.finalCta}>
          <View style={s.finalGlow} />
          <Text style={s.finalEyebrow}>START TODAY — IT'S FREE</Text>
          <Text style={s.finalTitle}>Your patients{'\n'}can't wait.</Text>
          <Text style={s.finalSub}>
            Register now and get matched with a verified doctor within hours.
          </Text>

          <TouchableOpacity
            style={s.finalBtn}
            activeOpacity={0.85}
            onPress={() =>
              navigation?.navigate('Register', { role: 'hospital' })
            }
          >
            <Text style={s.finalBtnText}>Get Started →</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

/* ─── Styles ─────────────────────────────────────────── */
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.offWhite },
  scroll: { paddingBottom: scale(40) },

  /* ── Hero ── */
  hero: {
    backgroundColor: C.ink,
    paddingHorizontal: scale(22),
    paddingTop: scale(28),
    paddingBottom: 0,
    overflow: 'hidden',
  },
  ring1: {
    position: 'absolute',
    width: scale(320),
    height: scale(320),
    borderRadius: scale(160),
    borderWidth: 1,
    borderColor: 'rgba(0,201,212,0.1)',
    top: scale(-100),
    right: scale(-100),
  },
  ring2: {
    position: 'absolute',
    width: scale(200),
    height: scale(200),
    borderRadius: scale(100),
    borderWidth: 1,
    borderColor: 'rgba(0,232,181,0.1)',
    bottom: scale(40),
    left: scale(-60),
  },
  glow: {
    position: 'absolute',
    width: scale(180),
    height: scale(180),
    borderRadius: scale(90),
    backgroundColor: 'rgba(0,201,212,0.06)',
    top: scale(-40),
    right: scale(-20),
  },

  taglineStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
    marginBottom: scale(20),
  },
  pulseDot: {
    width: scale(8),
    height: scale(8),
    borderRadius: scale(4),
    backgroundColor: C.mint,
  },
  taglineText: {
    color: C.mint,
    fontSize: scale(11),
    fontWeight: '700',
    letterSpacing: 1.4,
  },

  heroHeadline: {
    fontSize: scale(32),
    fontWeight: '900',
    color: C.white,
    lineHeight: scale(40),
    marginBottom: scale(14),
    letterSpacing: -0.6,
  },
  heroAccent: { color: C.teal },

  heroPitch: {
    fontSize: scale(13.5),
    color: 'rgba(255,255,255,0.62)',
    lineHeight: scale(22),
    marginBottom: scale(26),
  },

  ctaRow: { flexDirection: 'row', gap: scale(10), marginBottom: scale(16) },
  ctaPrimary: {
    flex: 1,
    backgroundColor: C.teal,
    borderRadius: scale(14),
    paddingVertical: scale(15),
    paddingHorizontal: scale(14),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: C.teal,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 7,
  },
  ctaPrimaryText: { color: C.ink, fontWeight: '800', fontSize: scale(15) },
  ctaIcon: { color: C.ink, fontWeight: '900', fontSize: scale(16) },

  ctaOutline: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.25)',
    borderRadius: scale(14),
    paddingVertical: scale(15),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  ctaOutlineText: {
    color: 'rgba(255,255,255,0.88)',
    fontWeight: '700',
    fontSize: scale(15),
  },

  loginBtn: { alignItems: 'center', marginBottom: scale(22) },
  loginText: { color: 'rgba(255,255,255,0.45)', fontSize: scale(13.5) },
  loginBold: { color: C.teal, fontWeight: '700' },

  statsBar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    paddingVertical: scale(18),
    paddingHorizontal: scale(10),
  },
  statCell: { flex: 1, alignItems: 'center' },
  statVal: {
    fontSize: scale(22),
    fontWeight: '900',
    color: C.teal,
    marginBottom: scale(2),
  },
  statLbl: {
    fontSize: scale(10),
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '600',
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginVertical: scale(4),
  },

  /* ── Pickup Banner ── */
  pickupBanner: {
    backgroundColor: C.tealDeep,
    paddingHorizontal: scale(22),
    paddingVertical: scale(20),
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: scale(10),
  },
  pickupQuote: {
    fontSize: scale(48),
    lineHeight: scale(36),
    color: C.mint,
    fontWeight: '900',
    marginTop: scale(-4),
    opacity: 0.7,
  },
  pickupLine: {
    flex: 1,
    fontSize: scale(14),
    color: C.white,
    lineHeight: scale(22),
    fontWeight: '600',
    fontStyle: 'italic',
  },

  /* ── About ── */
  aboutSection: {
    backgroundColor: C.white,
    padding: scale(22),
    paddingTop: scale(30),
  },
  chip: {
    alignSelf: 'flex-start',
    backgroundColor: C.tealSoft,
    borderRadius: scale(20),
    paddingHorizontal: scale(12),
    paddingVertical: scale(5),
    marginBottom: scale(12),
  },
  chipText: {
    color: C.tealDeep,
    fontSize: scale(10),
    fontWeight: '800',
    letterSpacing: 1.5,
  },

  aboutTitle: {
    fontSize: scale(26),
    fontWeight: '900',
    color: C.ink,
    lineHeight: scale(34),
    marginBottom: scale(12),
    letterSpacing: -0.4,
  },
  aboutBody: {
    fontSize: scale(13.5),
    color: '#4a6375',
    lineHeight: scale(22),
    marginBottom: scale(20),
  },
  aboutImage: {
    width: '100%',
    height: scale(180),
    borderRadius: scale(16),
    marginBottom: scale(20),
  },

  valuesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: scale(10) },
  valueCard: {
    width: '47.5%',
    backgroundColor: C.offWhite,
    borderRadius: scale(14),
    padding: scale(14),
    borderWidth: 1,
    borderColor: C.border,
  },
  valueDot: {
    width: scale(8),
    height: scale(8),
    borderRadius: scale(4),
    backgroundColor: C.teal,
    marginBottom: scale(8),
  },
  valueTitle: {
    fontWeight: '800',
    fontSize: scale(13),
    color: C.ink,
    marginBottom: scale(3),
  },
  valueDesc: { fontSize: scale(11), color: '#6b8799', lineHeight: scale(16) },

  /* ── Services ── */
  servicesSection: {
    backgroundColor: C.offWhite,
    padding: scale(22),
    paddingTop: scale(30),
  },
  sectionTitle: {
    fontSize: scale(24),
    fontWeight: '900',
    color: C.ink,
    marginBottom: scale(20),
    letterSpacing: -0.3,
  },
  servicesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: scale(12) },
  serviceCard: {
    width: '47%',
    backgroundColor: C.card,
    borderRadius: scale(18),
    padding: scale(16),
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: C.tealDeep,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  svcIconBox: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(13),
    backgroundColor: C.tealSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scale(10),
  },
  svcIcon: { fontSize: scale(20) },
  svcTitle: {
    fontWeight: '800',
    fontSize: scale(13),
    color: C.ink,
    marginBottom: scale(4),
  },
  svcDesc: { fontSize: scale(11), color: '#6b8799', lineHeight: scale(16) },

  /* ── AI Section ── */
  aiSection: {
    backgroundColor: C.ink,
    padding: scale(22),
    paddingTop: scale(30),
    overflow: 'hidden',
  },
  aiGlow: {
    position: 'absolute',
    width: scale(250),
    height: scale(250),
    borderRadius: scale(125),
    backgroundColor: 'rgba(0,201,212,0.07)',
    top: scale(-80),
    right: scale(-80),
  },
  chipDark: {
    backgroundColor: 'rgba(0,201,212,0.15)',
    borderColor: 'rgba(0,201,212,0.2)',
    borderWidth: 1,
  },
  chipTextDark: {
    color: C.teal,
    fontSize: scale(10),
    fontWeight: '800',
    letterSpacing: 1.5,
  },

  aiSectionTitle: {
    fontSize: scale(28),
    fontWeight: '900',
    color: C.white,
    lineHeight: scale(36),
    marginBottom: scale(10),
    letterSpacing: -0.5,
  },
  aiSectionSub: {
    fontSize: scale(13),
    color: 'rgba(255,255,255,0.55)',
    lineHeight: scale(21),
    marginBottom: scale(24),
  },
  aiCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(14),
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: scale(16),
    padding: scale(14),
    marginBottom: scale(10),
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  aiIconBox: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(13),
    backgroundColor: 'rgba(0,201,212,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  aiIcon: { fontSize: scale(20) },
  aiTitle: {
    color: C.white,
    fontWeight: '800',
    fontSize: scale(13.5),
    marginBottom: scale(3),
  },
  aiDesc: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: scale(12),
    lineHeight: scale(18),
  },

  /* ── Final CTA ── */
  finalCta: {
    backgroundColor: C.tealDeep,
    padding: scale(28),
    paddingBottom: scale(40),
    alignItems: 'center',
    overflow: 'hidden',
  },
  finalGlow: {
    position: 'absolute',
    width: scale(300),
    height: scale(300),
    borderRadius: scale(150),
    backgroundColor: 'rgba(0,232,181,0.1)',
    top: scale(-100),
    right: scale(-80),
  },
  finalEyebrow: {
    color: C.mint,
    fontSize: scale(10),
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: scale(10),
  },
  finalTitle: {
    fontSize: scale(34),
    fontWeight: '900',
    color: C.white,
    textAlign: 'center',
    lineHeight: scale(42),
    marginBottom: scale(12),
    letterSpacing: -0.6,
  },
  finalSub: {
    fontSize: scale(13.5),
    color: 'rgba(255,255,255,0.65)',
    textAlign: 'center',
    lineHeight: scale(22),
    marginBottom: scale(28),
  },
  finalBtn: {
    backgroundColor: C.white,
    borderRadius: scale(16),
    paddingVertical: scale(16),
    paddingHorizontal: scale(36),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 18,
    elevation: 8,
  },
  finalBtnText: { color: C.tealDeep, fontWeight: '800', fontSize: scale(15) },
});

export default DashboardScreen;
