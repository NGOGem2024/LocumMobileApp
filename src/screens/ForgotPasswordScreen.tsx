import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Animated,
  Dimensions,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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
  error: '#e53935',
  success: '#00b894',
};

// ─── AppHeader ───────────────────────────────────────────────────
const AppHeader = ({
  rightLabel = 'Doctor Onboarding',
}: {
  rightLabel?: string;
}) => (
  <View style={headerStyles.container}>
    <View style={headerStyles.leftRow}>
      <View style={headerStyles.logoWrapper}>
        <Image
          source={require('../assets/HT_icon.png')}
          style={headerStyles.logo}
          resizeMode="contain"
        />
      </View>
      <Text style={headerStyles.title}>Locum</Text>
    </View>
    <Text style={headerStyles.heading}>{rightLabel}</Text>
  </View>
);

const headerStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: scale(20),
    paddingTop: scale(16),
    paddingBottom: scale(14),
    backgroundColor: C.primaryDeep,
  },
  leftRow: { flexDirection: 'row', alignItems: 'center', gap: scale(10) },
  logoWrapper: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(11),
    backgroundColor: C.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e0f5f8',
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  logo: { width: scale(26), height: scale(26) },
  title: {
    fontSize: scale(20),
    fontWeight: '800',
    color: C.white,
    letterSpacing: 0.3,
  },
  heading: {
    fontSize: scale(13),
    fontWeight: '700',
    color: 'rgba(255,255,255,0.7)',
  },
});
// ─────────────────────────────────────────────────────────────────

type Step = 'email' | 'otp' | 'success';

interface ForgotPasswordScreenProps {
  navigation?: any;
}

const ForgotPasswordScreen = ({ navigation }: ForgotPasswordScreenProps) => {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [otpError, setOtpError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);

  const otpRefs = useRef<(TextInput | null)[]>([]);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;
  const cardScale = useRef(new Animated.Value(0.96)).current;
  const successScale = useRef(new Animated.Value(0)).current;

  const animateIn = () => {
    fadeAnim.setValue(0);
    slideAnim.setValue(24);
    cardScale.setValue(0.96);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 450,
        useNativeDriver: true,
      }),
      Animated.spring(cardScale, {
        toValue: 1,
        tension: 70,
        friction: 9,
        useNativeDriver: true,
      }),
    ]).start();
  };

  useEffect(() => {
    animateIn();
  }, [step]);

  // Resend countdown
  useEffect(() => {
    if (step !== 'otp') return;
    setResendTimer(30);
    setCanResend(false);
    const interval = setInterval(() => {
      setResendTimer(t => {
        if (t <= 1) {
          clearInterval(interval);
          setCanResend(true);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [step]);

  const handleSendOTP = () => {
    setEmailError('');
    if (!email.trim()) {
      setEmailError('Email is required');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError('Enter a valid email address');
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setStep('otp');
    }, 1200);
  };

  const handleOtpChange = (val: string, idx: number) => {
    if (!/^[0-9]?$/.test(val)) return;
    const next = [...otp];
    next[idx] = val;
    setOtp(next);
    setOtpError('');
    if (val && idx < 5) otpRefs.current[idx + 1]?.focus();
    if (!val && idx > 0) otpRefs.current[idx - 1]?.focus();
  };

  const handleVerifyOTP = () => {
    setOtpError('');
    if (otp.some(d => !d)) {
      setOtpError('Please enter all 6 digits');
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      // Animate success icon
      Animated.spring(successScale, {
        toValue: 1,
        tension: 60,
        friction: 7,
        useNativeDriver: true,
      }).start();
      setStep('success');
    }, 1200);
  };

  const handleResend = () => {
    if (!canResend) return;
    setOtp(['', '', '', '', '', '']);
    setOtpError('');
    setCanResend(false);
    setResendTimer(30);
    // Restart countdown
    const interval = setInterval(() => {
      setResendTimer(t => {
        if (t <= 1) {
          clearInterval(interval);
          setCanResend(true);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  };

  const maskedEmail = email
    ? email.replace(/(.{2})[^@]+(@.+)/, '$1****$2')
    : '';

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor={C.primaryDeep} />

      {/* ── HEADER ── */}
      <AppHeader rightLabel="Account Recovery" />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── HERO BAND ── */}
          <View style={styles.heroBand}>
            <View style={styles.blobA} />
            <View style={styles.blobB} />
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => {
                if (step === 'email') navigation?.goBack();
                else if (step === 'otp') setStep('email');
              }}
            >
              <Text style={styles.backArrow}>←</Text>
              <Text style={styles.backLabel}>
                {step === 'email' ? 'Back to Login' : 'Change Email'}
              </Text>
            </TouchableOpacity>

            <Text style={styles.heroLabel}>
              {step === 'email'
                ? 'FORGOT PASSWORD'
                : step === 'otp'
                ? 'VERIFY OTP'
                : 'ALL DONE'}
            </Text>
            <Text style={styles.heroTitle}>
              {step === 'email'
                ? 'Reset Your\nPassword'
                : step === 'otp'
                ? 'Enter the 6-Digit\nSecurity Code'
                : 'Password Reset\nSuccessful!'}
            </Text>
          </View>

          {/* ── STEP: EMAIL ── */}
          {step === 'email' && (
            <Animated.View
              style={[
                styles.card,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }, { scale: cardScale }],
                },
              ]}
            >
              {/* Icon */}
              <View style={styles.iconCircle}>
                <Text style={styles.iconEmoji}>🔑</Text>
              </View>

              <Text style={styles.cardTitle}>Forgot your password?</Text>
              <Text style={styles.cardDesc}>
                Enter the email address associated with your clinical account
                and we'll send you a{' '}
                <Text style={styles.cardDescBold}>6-digit security OTP.</Text>
              </Text>

              <View style={styles.fieldWrap}>
                <Text style={styles.fieldLabel}>Email Address</Text>
                <View
                  style={[
                    styles.inputBox,
                    emailError ? styles.inputBoxError : null,
                  ]}
                >
                  <Text style={styles.inputIcon}>✉️</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="doctor@hospital.com"
                    placeholderTextColor={C.textMuted}
                    value={email}
                    onChangeText={t => {
                      setEmail(t);
                      setEmailError('');
                    }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
                {!!emailError && (
                  <Text style={styles.errorText}>{emailError}</Text>
                )}
              </View>

              <TouchableOpacity
                style={[styles.primaryBtn, loading && styles.primaryBtnLoading]}
                activeOpacity={0.85}
                onPress={handleSendOTP}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={C.primaryDeep} size="small" />
                ) : (
                  <>
                    <Text style={styles.primaryBtnText}>Send OTP</Text>
                    <Text style={styles.primaryBtnArrow}>→</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.backToLogin}
                onPress={() => navigation?.navigate('LoginScreen')}
              >
                <Text style={styles.backToLoginText}>
                  Remembered your password?{' '}
                  <Text style={styles.backToLoginBold}>Sign In</Text>
                </Text>
              </TouchableOpacity>
            </Animated.View>
          )}

          {/* ── STEP: OTP ── */}
          {step === 'otp' && (
            <Animated.View
              style={[
                styles.card,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }, { scale: cardScale }],
                },
              ]}
            >
              <View style={styles.iconCircle}>
                <Text style={styles.iconEmoji}>📲</Text>
              </View>

              <Text style={styles.cardTitle}>Check your inbox</Text>
              <Text style={styles.cardDesc}>
                We've sent a 6-digit OTP to{'\n'}
                <Text style={styles.emailHighlight}>{maskedEmail}</Text>
              </Text>

              {/* OTP Boxes */}
              <View style={styles.otpRow}>
                {otp.map((digit, idx) => (
                  <TextInput
                    key={idx}
                    ref={r => {
                      otpRefs.current[idx] = r;
                    }}
                    style={[
                      styles.otpBox,
                      digit ? styles.otpBoxFilled : null,
                      otpError ? styles.otpBoxError : null,
                    ]}
                    value={digit}
                    onChangeText={v => handleOtpChange(v, idx)}
                    keyboardType="number-pad"
                    maxLength={1}
                    selectTextOnFocus
                    textAlign="center"
                  />
                ))}
              </View>
              {!!otpError && (
                <Text
                  style={[
                    styles.errorText,
                    { textAlign: 'center', marginBottom: scale(8) },
                  ]}
                >
                  {otpError}
                </Text>
              )}

              {/* Resend */}
              <View style={styles.resendRow}>
                <Text style={styles.resendText}>Didn't receive it? </Text>
                <TouchableOpacity onPress={handleResend} disabled={!canResend}>
                  <Text
                    style={[
                      styles.resendLink,
                      !canResend && styles.resendLinkDisabled,
                    ]}
                  >
                    {canResend ? 'Resend OTP' : `Resend in ${resendTimer}s`}
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.primaryBtn, loading && styles.primaryBtnLoading]}
                activeOpacity={0.85}
                onPress={handleVerifyOTP}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={C.primaryDeep} size="small" />
                ) : (
                  <>
                    <Text style={styles.primaryBtnText}>Verify OTP</Text>
                    <Text style={styles.primaryBtnArrow}>✓</Text>
                  </>
                )}
              </TouchableOpacity>

              <View style={styles.securityNote}>
                <Text style={styles.securityNoteText}>
                  🛡️ This code expires in 10 minutes
                </Text>
              </View>
            </Animated.View>
          )}

          {/* ── STEP: SUCCESS ── */}
          {step === 'success' && (
            <Animated.View
              style={[
                styles.card,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }, { scale: cardScale }],
                },
              ]}
            >
              <Animated.View
                style={[
                  styles.successCircle,
                  { transform: [{ scale: successScale }] },
                ]}
              >
                <Text style={styles.successEmoji}>✅</Text>
              </Animated.View>

              <Text style={styles.cardTitle}>Identity Verified!</Text>
              <Text style={styles.cardDesc}>
                Your OTP was verified successfully. You can now set a new
                password for your clinical account.
              </Text>

              {/* New Password hint */}
              <View style={styles.infoBox}>
                <Text style={styles.infoBoxText}>
                  📧 A password reset link has been sent to{' '}
                  <Text style={styles.emailHighlight}>{maskedEmail}</Text>.
                  Follow the link to create your new password.
                </Text>
              </View>

              <TouchableOpacity
                style={styles.primaryBtn}
                activeOpacity={0.85}
                onPress={() => navigation?.navigate('LoginScreen')}
              >
                <Text style={styles.primaryBtnText}>Back to Login</Text>
                <Text style={styles.primaryBtnArrow}>→</Text>
              </TouchableOpacity>
            </Animated.View>
          )}

          {/* Step indicators */}
          <View style={styles.stepDots}>
            {(['email', 'otp', 'success'] as Step[]).map((s, i) => (
              <View
                key={i}
                style={[
                  styles.stepDot,
                  step === s && styles.stepDotActive,
                  (step === 'otp' && i === 0) || (step === 'success' && i < 2)
                    ? styles.stepDotDone
                    : null,
                ]}
              />
            ))}
          </View>

          {/* <Text style={styles.secureNote}>
            🔐 Secured with end-to-end encryption
          </Text> */}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  scroll: { paddingBottom: scale(40) },

  heroBand: {
    backgroundColor: C.primaryDeep,
    paddingHorizontal: scale(24),
    paddingTop: scale(14),
    paddingBottom: scale(50),
    overflow: 'hidden',
  },
  blobA: {
    position: 'absolute',
    width: scale(200),
    height: scale(200),
    borderRadius: scale(100),
    backgroundColor: 'rgba(0,201,224,0.1)',
    top: scale(-60),
    right: scale(-50),
  },
  blobB: {
    position: 'absolute',
    width: scale(120),
    height: scale(120),
    borderRadius: scale(60),
    backgroundColor: 'rgba(0,229,176,0.07)',
    bottom: scale(-20),
    left: scale(-30),
  },

  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
    marginBottom: scale(16),
    alignSelf: 'flex-start',
  },
  backArrow: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: scale(16),
    fontWeight: '700',
  },
  backLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: scale(12),
    fontWeight: '600',
  },

  heroLabel: {
    color: C.accentWarm,
    fontSize: scale(10),
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: scale(8),
  },
  heroTitle: {
    fontSize: scale(26),
    fontWeight: '900',
    color: C.white,
    lineHeight: scale(34),
    letterSpacing: -0.4,
  },

  card: {
    backgroundColor: C.white,
    borderRadius: scale(28),
    marginHorizontal: scale(18),
    marginTop: scale(-28),
    padding: scale(24),
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },

  iconCircle: {
    width: scale(64),
    height: scale(64),
    borderRadius: scale(20),
    backgroundColor: C.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: scale(18),
  },
  iconEmoji: { fontSize: scale(30) },

  cardTitle: {
    fontSize: scale(20),
    fontWeight: '900',
    color: C.text,
    textAlign: 'center',
    marginBottom: scale(10),
    letterSpacing: -0.3,
  },
  cardDesc: {
    fontSize: scale(13),
    color: C.textSub,
    textAlign: 'center',
    lineHeight: scale(20),
    marginBottom: scale(22),
  },
  cardDescBold: { fontWeight: '700', color: C.primary },
  emailHighlight: { fontWeight: '800', color: C.primary },

  fieldWrap: { marginBottom: scale(18) },
  fieldLabel: {
    fontSize: scale(13),
    fontWeight: '700',
    color: C.text,
    marginBottom: scale(8),
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.offWhite,
    borderRadius: scale(14),
    borderWidth: 1.5,
    borderColor: C.border,
    paddingHorizontal: scale(14),
    paddingVertical: scale(13),
    gap: scale(10),
  },
  inputBoxError: { borderColor: C.error, backgroundColor: '#fff5f5' },
  inputIcon: { fontSize: scale(16) },
  input: {
    flex: 1,
    fontSize: scale(14),
    color: C.text,
    fontWeight: '500',
    padding: 0,
  },
  errorText: {
    fontSize: scale(11),
    color: C.error,
    fontWeight: '600',
    marginTop: scale(5),
    marginLeft: scale(4),
  },

  primaryBtn: {
    backgroundColor: C.accent,
    borderRadius: scale(16),
    paddingVertical: scale(16),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(10),
    shadowColor: C.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 6,
    marginTop: scale(4),
  },
  primaryBtnLoading: { opacity: 0.8 },
  primaryBtnText: {
    color: C.primaryDeep,
    fontWeight: '800',
    fontSize: scale(16),
  },
  primaryBtnArrow: {
    color: C.primaryDeep,
    fontWeight: '900',
    fontSize: scale(18),
  },

  backToLogin: { alignItems: 'center', marginTop: scale(18) },
  backToLoginText: { fontSize: scale(13), color: C.textSub },
  backToLoginBold: { fontWeight: '800', color: C.primary },

  // OTP Boxes
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: scale(8),
    marginBottom: scale(10),
  },
  otpBox: {
    flex: 1,
    aspectRatio: 0.85,
    borderRadius: scale(14),
    borderWidth: 2,
    borderColor: C.border,
    backgroundColor: C.offWhite,
    fontSize: scale(22),
    fontWeight: '800',
    color: C.text,
    textAlign: 'center',
  },
  otpBoxFilled: {
    borderColor: C.primary,
    backgroundColor: C.primaryLight,
    color: C.primary,
  },
  otpBoxError: { borderColor: C.error, backgroundColor: '#fff5f5' },

  resendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scale(20),
  },
  resendText: { fontSize: scale(13), color: C.textSub },
  resendLink: { fontSize: scale(13), fontWeight: '800', color: C.primary },
  resendLinkDisabled: { color: C.textMuted },

  securityNote: {
    backgroundColor: C.primaryLight,
    borderRadius: scale(12),
    paddingVertical: scale(10),
    paddingHorizontal: scale(14),
    alignItems: 'center',
    marginTop: scale(18),
  },
  securityNoteText: {
    fontSize: scale(12),
    color: C.primaryDark,
    fontWeight: '600',
  },

  // Success
  successCircle: {
    width: scale(80),
    height: scale(80),
    borderRadius: scale(24),
    backgroundColor: '#e6f9f4',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: scale(18),
  },
  successEmoji: { fontSize: scale(38) },

  infoBox: {
    backgroundColor: C.primaryLight,
    borderRadius: scale(14),
    padding: scale(14),
    marginBottom: scale(22),
    borderLeftWidth: 3,
    borderLeftColor: C.primary,
  },
  infoBoxText: { fontSize: scale(13), color: C.textSub, lineHeight: scale(20) },

  // Step dots
  stepDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: scale(8),
    marginTop: scale(24),
  },
  stepDot: {
    width: scale(8),
    height: scale(8),
    borderRadius: scale(4),
    backgroundColor: C.border,
  },
  stepDotActive: { width: scale(22), backgroundColor: C.primary },
  stepDotDone: { backgroundColor: C.success },

  secureNote: {
    textAlign: 'center',
    fontSize: scale(11),
    color: C.textMuted,
    marginTop: scale(16),
    fontWeight: '500',
  },
});

export default ForgotPasswordScreen;
