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
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import api from '../services/axiosConfig';

const { width: SW } = Dimensions.get('window');
const scale = (size: number) => (SW / 390) * size;

const C = {
  background: '#FFFFFF',
  inputBg: '#F9FAFB',
  primary: '#007b8e',
  ink: '#111827',
  textSub: '#6B7280',
  textMuted: '#9CA3AF',
  white: '#ffffff',
  error: '#ef4444',
  border: '#E5E7EB',
  success: '#10B981',
};

type Step = 'email' | 'otp' | 'reset' | 'success';

interface ForgotPasswordScreenProps {
  navigation?: any;
}

const ForgotPasswordScreen = ({ navigation }: ForgotPasswordScreenProps) => {
  const [step, setStep] = useState<Step>('email');
  
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [otpError, setOtpError] = useState('');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);

  const otpRefs = useRef<(TextInput | null)[]>([]);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const successScale = useRef(new Animated.Value(0)).current;

  const animateIn = () => {
    fadeAnim.setValue(0);
    slideAnim.setValue(20);
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
    ]).start();
  };

  useEffect(() => {
    animateIn();
  }, [step]);

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

  // ─── API Integration ──────────────────────────────────────────────

  const handleSendOTP = async () => {
    setEmailError('');
    const cleanEmail = email.trim();
    
    if (!cleanEmail) {
      setEmailError('Email is required');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setEmailError('Enter a valid email address');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/api/doctors/forgot-password', {
        email: cleanEmail.toLowerCase(),
      });

      if (response.data.success) {
        setStep('otp');
      } else {
        throw new Error(response.data.message || 'Failed to send OTP');
      }
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        'Something went wrong. Please try again.';
      Alert.alert('Error', errorMessage, [{ text: 'OK' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    setOtpError('');
    if (otp.some(d => !d)) {
      setOtpError('Please enter all 6 digits');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/api/doctors/verify-otp', {
        email: email.trim().toLowerCase(),
        otp: otp.join(''),
      });

      if (response.data.success) {
        setStep('reset');
      } else {
        throw new Error(response.data.message || 'Invalid OTP');
      }
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        'Invalid or expired OTP. Please try again.';
      setOtpError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    setPasswordError('');
    
    if (!newPassword || newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters long');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/api/doctors/reset-password', {
        email: email.trim().toLowerCase(),
        otp: otp.join(''), 
        newPassword: newPassword,
      });

      if (response.data.success) {
        Animated.spring(successScale, {
          toValue: 1,
          tension: 60,
          friction: 7,
          useNativeDriver: true,
        }).start();
        setStep('success');
      } else {
        throw new Error(response.data.message || 'Password reset failed');
      }
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        'Something went wrong. Please try again.';
      Alert.alert('Reset Failed', errorMessage, [{ text: 'OK' }]);
    } finally {
      setLoading(false);
    }
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

  const handleResend = () => {
    if (!canResend) return;
    setOtp(['', '', '', '', '', '']);
    setOtpError('');
    setCanResend(false);
    handleSendOTP();
  };

  const handleBack = () => {
    if (step === 'email') {
      navigation?.canGoBack() && navigation.goBack();
    } else if (step === 'otp') {
      setStep('email');
    } else if (step === 'reset') {
      setStep('otp');
    }
  };

  const maskedEmail = email
    ? email.replace(/(.{2})[^@]+(@.+)/, '$1****$2')
    : '';

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor={C.background} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.topNav}>
          {step !== 'success' && (
            <TouchableOpacity style={styles.iconBtn} onPress={handleBack}>
              <Ionicons name="arrow-back" size={22} color={C.ink} />
            </TouchableOpacity>
          )}
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View
            style={[
              styles.mainContainer,
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
            ]}
          >
            {/* ── STEP 1: EMAIL ── */}
            {step === 'email' && (
              <>
                <View style={styles.headerWrap}>
                  <Text style={styles.heroTitle}>Forgot Password?</Text>
                  <Text style={styles.heroSub}>
                    Enter the email address associated with your account and we'll
                    send you a 6-digit security OTP.
                  </Text>
                </View>

                <View style={styles.fieldWrap}>
                  <Text style={styles.fieldLabel}>Email Address</Text>
                  <View
                    style={[
                      styles.inputBox,
                      emailError ? styles.inputBoxError : null,
                    ]}
                  >
                    <Ionicons
                      name="mail-outline"
                      size={18}
                      color={emailError ? C.error : C.textMuted}
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. doctor@hospital.com"
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
                  activeOpacity={0.85}
                  onPress={handleSendOTP}
                  disabled={loading}
                >
                  <LinearGradient
                    colors={['#00a8c2', '#007b8e']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.primaryBtn}
                  >
                    {loading ? (
                      <ActivityIndicator color={C.white} size="small" />
                    ) : (
                      <Text style={styles.primaryBtnText}>Send OTP</Text>
                    )}
                  </LinearGradient>
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
              </>
            )}

            {/* ── STEP 2: OTP ── */}
            {step === 'otp' && (
              <>
                <View style={styles.headerWrap}>
                  <Text style={styles.heroTitle}>Check your inbox</Text>
                  <Text style={styles.heroSub}>
                    We've sent a 6-digit OTP to{'\n'}
                    <Text style={styles.emailHighlight}>{maskedEmail}</Text>
                  </Text>
                </View>

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
                  <Text style={[styles.errorText, { textAlign: 'center', marginBottom: 12 }]}>
                    {otpError}
                  </Text>
                )}

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
                  activeOpacity={0.85}
                  onPress={handleVerifyOTP}
                  disabled={loading}
                >
                  <LinearGradient
                    colors={['#00a8c2', '#007b8e']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.primaryBtn}
                  >
                    {loading ? (
                      <ActivityIndicator color={C.white} size="small" />
                    ) : (
                      <Text style={styles.primaryBtnText}>Verify OTP</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </>
            )}

            {/* ── STEP 3: RESET PASSWORD ── */}
            {step === 'reset' && (
              <>
                <View style={styles.headerWrap}>
                  <Text style={styles.heroTitle}>Set New Password</Text>
                  <Text style={styles.heroSub}>
                    Create a new, secure password for your account.
                  </Text>
                </View>

                <View style={styles.fieldWrap}>
                  <Text style={styles.fieldLabel}>New Password</Text>
                  <View style={[styles.inputBox, passwordError ? styles.inputBoxError : null]}>
                    <Ionicons
                      name="lock-closed-outline"
                      size={18}
                      color={passwordError ? C.error : C.textMuted}
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={styles.input}
                      placeholder="Enter new password"
                      placeholderTextColor={C.textMuted}
                      value={newPassword}
                      onChangeText={t => {
                        setNewPassword(t);
                        setPasswordError('');
                      }}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                    />
                    <TouchableOpacity
                      onPress={() => setShowPassword(!showPassword)}
                      style={{ padding: 4 }}
                    >
                      <Ionicons
                        name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                        size={18}
                        color={C.textMuted}
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.fieldWrap}>
                  <Text style={styles.fieldLabel}>Confirm Password</Text>
                  <View style={[styles.inputBox, passwordError ? styles.inputBoxError : null]}>
                    <Ionicons
                      name="lock-closed-outline"
                      size={18}
                      color={passwordError ? C.error : C.textMuted}
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={styles.input}
                      placeholder="Confirm new password"
                      placeholderTextColor={C.textMuted}
                      value={confirmPassword}
                      onChangeText={t => {
                        setConfirmPassword(t);
                        setPasswordError('');
                      }}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                    />
                  </View>
                  {!!passwordError && (
                    <Text style={styles.errorText}>{passwordError}</Text>
                  )}
                </View>

                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={handleResetPassword}
                  disabled={loading}
                  style={{ marginTop: scale(8) }}
                >
                  <LinearGradient
                    colors={['#00a8c2', '#007b8e']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.primaryBtn}
                  >
                    {loading ? (
                      <ActivityIndicator color={C.white} size="small" />
                    ) : (
                      <Text style={styles.primaryBtnText}>Update Password</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </>
            )}

            {/* ── STEP 4: SUCCESS ── */}
            {step === 'success' && (
              <View style={styles.successContainer}>
                <Animated.View
                  style={[
                    styles.successIconWrap,
                    { transform: [{ scale: successScale }] },
                  ]}
                >
                  <Ionicons name="checkmark-circle" size={80} color={C.success} />
                </Animated.View>

                <Text style={[styles.heroTitle, { textAlign: 'center' }]}>
                  Password Updated!
                </Text>
                <Text style={[styles.heroSub, { textAlign: 'center', marginBottom: scale(32) }]}>
                  Your password has been changed successfully.{'\n'}
                  You can now sign in with your new credentials.
                </Text>

                <TouchableOpacity
                  style={styles.secondaryBtn}
                  activeOpacity={0.85}
                  onPress={() => navigation?.navigate('LoginScreen')}
                >
                  <Text style={styles.secondaryBtnText}>Back to Login</Text>
                </TouchableOpacity>
              </View>
            )}
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background },
  scroll: { flexGrow: 1, justifyContent: 'center' }, // <--- Added justifyContent: 'center' here
  topNav: { paddingHorizontal: scale(20), paddingTop: scale(12), minHeight: scale(44) },
  iconBtn: { padding: scale(8), marginLeft: scale(-8), alignSelf: 'flex-start' },
  mainContainer: {
    paddingHorizontal: scale(24),
    paddingTop: scale(16),
    paddingBottom: scale(40),
  },
  headerWrap: { marginBottom: scale(28) },
  heroTitle: {
    fontSize: scale(24),
    fontWeight: '800',
    color: C.ink,
    marginBottom: scale(6),
    letterSpacing: -0.5,
  },
  heroSub: {
    fontSize: scale(13),
    color: C.textSub,
    lineHeight: scale(20),
  },
  emailHighlight: { fontWeight: '700', color: C.ink },
  
  fieldWrap: { marginBottom: scale(18) },
  fieldLabel: {
    fontSize: scale(12),
    fontWeight: '700',
    color: C.ink,
    marginBottom: scale(6),
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.inputBg,
    borderRadius: scale(12),
    paddingHorizontal: scale(14),
    minHeight: scale(46),
    borderWidth: 1.5,
    borderColor: C.border,
  },
  inputBoxError: {
    borderColor: C.error,
    backgroundColor: '#FEF2F2',
  },
  inputIcon: { marginRight: scale(10) },
  input: { flex: 1, fontSize: scale(13), color: C.ink, fontWeight: '500' },
  errorText: {
    fontSize: scale(11),
    color: C.error,
    fontWeight: '600',
    marginTop: scale(5),
    marginLeft: scale(2),
  },

  primaryBtn: {
    borderRadius: scale(12),
    paddingVertical: scale(14),
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    color: C.white,
    fontWeight: '700',
    fontSize: scale(14),
    letterSpacing: 0.3,
  },

  secondaryBtn: {
    backgroundColor: C.inputBg,
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: scale(12),
    paddingVertical: scale(14),
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  secondaryBtnText: {
    color: C.ink,
    fontWeight: '700',
    fontSize: scale(14),
  },

  backToLogin: { alignItems: 'center', marginTop: scale(24) },
  backToLoginText: { fontSize: scale(13), color: C.textSub },
  backToLoginBold: { fontWeight: '800', color: C.primary },

  // OTP Boxes
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: scale(8),
    marginBottom: scale(24),
  },
  otpBox: {
    flex: 1,
    aspectRatio: 0.85,
    borderRadius: scale(12),
    borderWidth: 1.5,
    borderColor: C.border,
    backgroundColor: C.inputBg,
    fontSize: scale(20),
    fontWeight: '700',
    color: C.ink,
    textAlign: 'center',
  },
  otpBoxFilled: {
    borderColor: C.primary,
  },
  otpBoxError: { borderColor: C.error, backgroundColor: '#FEF2F2' },

  resendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scale(24),
    marginTop: scale(-8),
  },
  resendText: { fontSize: scale(13), color: C.textSub },
  resendLink: { fontSize: scale(13), fontWeight: '700', color: C.primary },
  resendLinkDisabled: { color: C.textMuted },

  // Success
  successContainer: {
    alignItems: 'center',
    paddingTop: scale(20),
  },
  successIconWrap: {
    marginBottom: scale(20),
  },
});

export default ForgotPasswordScreen;