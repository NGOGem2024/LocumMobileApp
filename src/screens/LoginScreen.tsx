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
import AppHeader from '../components/AppHeader';
import { useAuth } from '../context/AuthContext';
import Ionicons from 'react-native-vector-icons/Ionicons';

// ─── Constants ───────────────────────────────────────────────────────────────

const { width: SW } = Dimensions.get('window');
const scale = (size: number) => (SW / 390) * size;

const BASE_URL =
  'https://locumbackenduat-ewcbfyghbvb2h0ez.centralindia-01.azurewebsites.net';

const C = {
  primary: '#007b8e',
  primaryDeep: '#003d4a',
  primaryLight: '#e0f5f8',
  accent: '#00c9e0',
  accentWarm: '#00e5b0',
  white: '#ffffff',
  offWhite: '#f7fdfe',
  bg: '#f0fbfc',
  text: '#0d2b30',
  textSub: '#3d6b75',
  textMuted: '#7aa8b0',
  border: '#c2e6ed',
  error: '#e53935',
};

// ─── Component ───────────────────────────────────────────────────────────────

interface LoginScreenProps {
  navigation?: any;
}

const LoginScreen = ({ navigation }: LoginScreenProps) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const cardAnim = useRef(new Animated.Value(0.95)).current;

  // ✅ Only setAuth needed — no AsyncStorage
  const { setAuth } = useAuth();

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
      Animated.spring(cardAnim, {
        toValue: 1,
        tension: 70,
        friction: 9,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // ─── Validation ─────────────────────────────────────────────────────────────

  const validate = (): boolean => {
    let valid = true;
    setEmailError('');
    setPasswordError('');

    if (!email.trim()) {
      setEmailError('Email is required');
      valid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setEmailError('Enter a valid email address');
      valid = false;
    }

    if (!password) {
      setPasswordError('Password is required');
      valid = false;
    } else if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      valid = false;
    }

    return valid;
  };

  // ─── Login Handler ───────────────────────────────────────────────────────────

  const handleLogin = async () => {
    if (!validate()) return;
    setLoading(true);

    try {
      const response = await fetch(`${BASE_URL}/api/doctors/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data?.message || 'Login failed. Please check your credentials.',
        );
      }

      const { token, doctor } = data;

      // ADD THIS
      console.log('=== LOGIN RESPONSE ===');
      console.log('doctor._id:', doctor?._id);
      console.log('doctor.doctor_unique_id:', doctor?.doctor_unique_id);
      console.log('token present:', !!token);

      if (!token || !doctor?._id) {
        throw new Error('Unexpected server response. Please try again.');
      }

      // ✅ Store doctor + token in React context (no AsyncStorage, no native modules)
      setAuth(doctor, token);

      // Navigate and clear back stack so user can't go back to login
      navigation?.reset({
        index: 0,
        routes: [{ name: 'HomeScreen' }],
      });
    } catch (error: any) {
      console.error('LOGIN ERROR:', error);
      Alert.alert(
        'Login Failed',
        error.message || 'Something went wrong. Please try again.',
        [{ text: 'OK' }],
      );
    } finally {
      setLoading(false);
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor={C.primaryDeep} />

      <AppHeader
        onBack={navigation?.canGoBack() ? () => navigation.goBack() : undefined}
      />

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
            <Text style={styles.heroLabel}>WELCOME BACK</Text>
            <Text style={styles.heroTitle}>
              Sign in to your{'\n'}Clinical Account
            </Text>
          </View>

          {/* ── FORM CARD ── */}
          <Animated.View
            style={[
              styles.card,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }, { scale: cardAnim }],
              },
            ]}
          >
            {/* Email Field */}
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
                  returnKeyType="next"
                />
              </View>
              {!!emailError && (
                <Text style={styles.errorText}>{emailError}</Text>
              )}
            </View>

            {/* Password Field */}
            <View style={styles.fieldWrap}>
              <View style={styles.labelRow}>
                <Text style={styles.fieldLabel}>Password</Text>
                <TouchableOpacity
                  onPress={() => navigation?.navigate('ForgotPasswordScreen')}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  {/* <Text style={styles.forgotLink}>Forgot Password?</Text> */}
                </TouchableOpacity>
              </View>
              <View
                style={[
                  styles.inputBox,
                  passwordError ? styles.inputBoxError : null,
                ]}
              >
                <Text style={styles.inputIcon}>🔒</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your password"
                  placeholderTextColor={C.textMuted}
                  value={password}
                  onChangeText={t => {
                    setPassword(t);
                    setPasswordError('');
                  }}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(p => !p)}
                  style={styles.eyeBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons
                    name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                    size={20}
                    color="#666"
                  />
                </TouchableOpacity>
              </View>
              {!!passwordError && (
                <Text style={styles.errorText}>{passwordError}</Text>
              )}
            </View>

            {/* Login Button */}
            <TouchableOpacity
              style={[styles.loginBtn, loading && styles.loginBtnLoading]}
              activeOpacity={0.85}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={C.primaryDeep} size="small" />
              ) : (
                <>
                  <Text style={styles.loginBtnText}>Sign In</Text>
                  <Text style={styles.loginBtnArrow}>→</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Register */}
            <View style={styles.registerRow}>
              <Text style={styles.registerText}>New to Healtrack Locum? </Text>
              <TouchableOpacity
                onPress={() => navigation?.navigate('Register')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.registerLink}>Create Account →</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* <Text style={styles.secureNote}>
            🔐 Secured with end-to-end encryption
          </Text> */}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  scroll: { paddingBottom: scale(48) },

  heroBand: {
    backgroundColor: C.primaryDeep,
    paddingHorizontal: scale(24),
    paddingTop: scale(20),
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

  fieldWrap: { marginBottom: scale(18) },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scale(8),
  },
  fieldLabel: {
    fontSize: scale(13),
    fontWeight: '700',
    color: C.text,
    marginBottom: scale(8),
  },
  forgotLink: { fontSize: scale(12), fontWeight: '700', color: C.primary },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.offWhite,
    borderRadius: scale(14),
    borderWidth: 1.5,
    borderColor: C.border,
    paddingHorizontal: scale(14),
    paddingVertical: scale(10),
    gap: scale(10),
  },
  inputBoxError: { borderColor: C.error, backgroundColor: '#fff5f5' },
  inputIcon: { fontSize: scale(16) },
  input: {
    flex: 1,
    fontSize: scale(13),
    color: C.text,
    fontWeight: '500',
    padding: 0,
  },
  eyeBtn: { padding: scale(4) },
  eyeIcon: { fontSize: scale(16) },
  errorText: {
    fontSize: scale(11),
    color: C.error,
    fontWeight: '600',
    marginTop: scale(5),
    marginLeft: scale(4),
  },

  loginBtn: {
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
  loginBtnLoading: { opacity: 0.8 },
  loginBtnText: {
    color: C.primaryDeep,
    fontWeight: '800',
    fontSize: scale(16),
  },
  loginBtnArrow: {
    color: C.primaryDeep,
    fontWeight: '900',
    fontSize: scale(18),
  },

  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(12),
    marginVertical: scale(22),
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: C.border },
  dividerText: { color: C.textMuted, fontSize: scale(12), fontWeight: '600' },

  registerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  registerText: { fontSize: scale(13), color: C.textSub },
  registerLink: { fontSize: scale(13), fontWeight: '800', color: C.primary },

  secureNote: {
    textAlign: 'center',
    fontSize: scale(11),
    color: C.textMuted,
    marginTop: scale(24),
    fontWeight: '500',
  },
});

export default LoginScreen;
