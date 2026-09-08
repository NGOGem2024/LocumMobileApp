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
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import api from '../services/axiosConfig';
import {
  GoogleSignin,
  statusCodes,
} from '@react-native-google-signin/google-signin';

// ─── Constants ───────────────────────────────────────────────────────────────

const { width: SW } = Dimensions.get('window');
const scale = (size: number) => (SW / 390) * size;

// Clean Light Theme Colors
const C = {
  background: '#F9FAFB', // Off-white app background
  cardBg: '#FFFFFF', // Crisp white card
  border: '#E5E7EB',
  inputBg: '#F3F4F6', // Very light gray for inputs
  primary: '#007b8e',
  accentCyan: '#00a8c2',
  ink: '#111827', // Deep dark text
  textSub: '#4B5563', // Gray text
  textMuted: '#9CA3AF', // Lighter gray for placeholders and icons
  white: '#ffffff',
  error: '#ef4444',
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
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(cardAnim, {
        toValue: 1,
        tension: 60,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();

    // Initialize Google SDK
    GoogleSignin.configure({
      webClientId:
        '1038698506388-4v27d2oh0c5b8c1a1bjnh0iepeo9l5fs.apps.googleusercontent.com',
      offlineAccess: true,
      forceCodeForRefreshToken: true,
    });
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

  // ─── Login Handlers ─────────────────────────────────────────────────────────

  const handleLogin = async () => {
    if (!validate()) return;
    setLoading(true);

    try {
      const response = await api.post('/api/doctors/login', {
        email: email.trim().toLowerCase(),
        password,
      });

      const data = response.data;

      if (!data.success) {
        throw new Error(
          data?.message || 'Login failed. Please check your credentials.',
        );
      }

      const { token, doctor } = data;

      if (!token || !doctor?._id) {
        throw new Error('Unexpected server response. Please try again.');
      }

      setAuth(doctor, token);
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        'Something went wrong. Please try again.';
      Alert.alert('Login Failed', errorMessage, [{ text: 'OK' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();

      // Verify the type is 'success' before accessing the nested data (v11+ API)
      if (response.type === 'success') {
        const idToken = response.data.idToken;

        if (!idToken) throw new Error('Failed to get Google Token');

        const res = await api.post('/api/doctors/google-login-android', {
          token: idToken,
        });

        if (!res.data.success) {
          throw new Error(res.data.message || 'Google Login failed.');
        }

        setAuth(res.data.doctor, res.data.token);
      } else {
        // Handles 'cancelled' or other response types
        console.log('Google Sign-In was not successful:', response.type);
      }
    } catch (error: any) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        console.log('User cancelled login');
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        Alert.alert('Error', 'Google Play Services not available.');
      } else {
        const msg =
          error.response?.data?.message ||
          error.message ||
          'Something went wrong';
        Alert.alert('Google Login Failed', msg, [{ text: 'OK' }]);
      }
    } finally {
      setLoading(false);
    }
  };
  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor={C.background} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <View style={styles.topNav}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => navigation?.canGoBack() && navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={24} color={C.ink} />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View
            style={[
              styles.card,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }, { scale: cardAnim }],
              },
            ]}
          >
            <View style={styles.headerWrap}>
              <Text style={styles.heroLabel}>WELCOME BACK</Text>
              <Text style={styles.heroTitle}>Sign in to your account</Text>
              <Text style={styles.heroSub}>
                Access your personalized clinical dashboard.
              </Text>
            </View>

            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>Work Email</Text>
              <View
                style={[
                  styles.inputBox,
                  emailError ? styles.inputBoxError : null,
                ]}
              >
                <Ionicons
                  name="mail-outline"
                  size={20}
                  color={C.textMuted}
                  style={styles.inputIcon}
                />
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

            <View style={styles.fieldWrap}>
              <View style={styles.labelRow}>
                <Text style={styles.fieldLabel}>Password</Text>
                <TouchableOpacity
                  onPress={() => navigation?.navigate('ForgotPasswordScreen')}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.forgotLink}>Forgot password?</Text>
                </TouchableOpacity>
              </View>
              <View
                style={[
                  styles.inputBox,
                  passwordError ? styles.inputBoxError : null,
                ]}
              >
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color={C.textMuted}
                  style={styles.inputIcon}
                />
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
                    color={C.textMuted}
                  />
                </TouchableOpacity>
              </View>
              {!!passwordError && (
                <Text style={styles.errorText}>{passwordError}</Text>
              )}
            </View>

            {/* Standard Email Login Button */}
            <TouchableOpacity
              style={styles.btnShadowWrapper}
              activeOpacity={0.85}
              onPress={handleLogin}
              disabled={loading}
            >
              <LinearGradient
                colors={['#00a8c2', '#007b8e']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.loginBtn, loading && styles.loginBtnLoading]}
              >
                {loading ? (
                  <ActivityIndicator color={C.white} size="small" />
                ) : (
                  <Text style={styles.loginBtnText}>Sign In</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Divider */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginVertical: scale(20),
              }}
            >
              <View style={{ flex: 1, height: 1, backgroundColor: C.border }} />
              <Text
                style={{
                  marginHorizontal: scale(10),
                  color: C.textMuted,
                  fontSize: scale(12),
                }}
              >
                OR
              </Text>
              <View style={{ flex: 1, height: 1, backgroundColor: C.border }} />
            </View>

            {/* Google Login Button */}
            <TouchableOpacity
              style={[styles.btnShadowWrapper, { marginTop: 0 }]}
              activeOpacity={0.85}
              onPress={handleGoogleLogin}
              disabled={loading}
            >
              <View
                style={[
                  styles.loginBtn,
                  {
                    backgroundColor: C.white,
                    borderWidth: 1,
                    borderColor: C.border,
                    flexDirection: 'row',
                  },
                ]}
              >
                {loading ? (
                  <ActivityIndicator color={C.primary} size="small" />
                ) : (
                  <>
                    <Image
                      source={require('../assets/google-logo.png')} // Update this path to match your folder structure
                      style={{ width: 22, height: 22, marginRight: 12 }}
                      resizeMode="contain"
                    />
                    <Text style={[styles.loginBtnText, { color: C.ink }]}>
                      Continue with Google
                    </Text>
                  </>
                )}
              </View>
            </TouchableOpacity>

            <View style={styles.registerRow}>
              <Text style={styles.registerText}>No professional profile? </Text>
              <TouchableOpacity
                onPress={() => navigation?.navigate('Register')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.registerLink}>Create Account</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingBottom: scale(40),
  },

  topNav: {
    paddingHorizontal: scale(24),
    paddingTop: scale(16),
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 10,
  },
  iconBtn: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },

  card: {
    backgroundColor: C.cardBg,
    borderRadius: scale(28),
    marginHorizontal: scale(20),
    padding: scale(28),
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: C.ink,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 20,
    elevation: 4,
  },

  headerWrap: {
    marginBottom: scale(32),
  },
  heroLabel: {
    color: C.primary,
    fontSize: scale(11),
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: scale(8),
  },
  heroTitle: {
    fontSize: scale(28),
    fontWeight: '900',
    color: C.ink,
    lineHeight: scale(34),
    letterSpacing: -0.5,
    marginBottom: scale(6),
  },
  heroSub: {
    fontSize: scale(14),
    color: C.textSub,
  },

  fieldWrap: { marginBottom: scale(20) },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scale(8),
  },
  fieldLabel: {
    fontSize: scale(13),
    fontWeight: '700',
    color: C.ink,
    marginBottom: scale(8),
  },
  forgotLink: {
    fontSize: scale(12),
    fontWeight: '700',
    color: C.primary,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.inputBg,
    borderRadius: scale(14),
    borderWidth: 1.5,
    borderColor: C.inputBg, // Blends in unless active or error
    paddingHorizontal: scale(14),
    paddingVertical: Platform.OS === 'ios' ? scale(14) : scale(4),
  },
  inputBoxError: { borderColor: C.error, backgroundColor: '#FEF2F2' },
  inputIcon: { marginRight: scale(10) },
  input: {
    flex: 1,
    fontSize: scale(14),
    color: C.ink,
    fontWeight: '600',
    padding: 0,
    minHeight: scale(40),
  },
  eyeBtn: { padding: scale(4) },
  errorText: {
    fontSize: scale(11),
    color: C.error,
    fontWeight: '600',
    marginTop: scale(6),
    marginLeft: scale(4),
  },

  btnShadowWrapper: {
    width: '100%',
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
    borderRadius: scale(16),
    marginTop: scale(10),
  },
  loginBtn: {
    borderRadius: scale(14),
    paddingVertical: scale(16),
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginBtnLoading: { opacity: 0.8 },
  loginBtnText: {
    color: C.white,
    fontWeight: '800',
    fontSize: scale(15),
  },

  registerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: scale(32),
  },
  registerText: { fontSize: scale(13), color: C.textSub, fontWeight: '500' },
  registerLink: { fontSize: scale(13), fontWeight: '800', color: C.primary },
});

export default LoginScreen;
