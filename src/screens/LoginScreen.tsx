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

import CustomCountryPicker, { Country } from '../components/CustomCountryPicker';

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
};

const pickerTheme = {
  card: C.background,
  inputBg: C.inputBg,
  inputBorder: C.border,
  text: C.ink,
  placeholderText: C.textMuted,
  primary: C.primary,
};

interface LoginScreenProps {
  navigation?: any;
}

const LoginScreen = ({ navigation }: LoginScreenProps) => {
  const [loginMethod, setLoginMethod] = useState<'email' | 'mobile'>('mobile');
  const [authType, setAuthType] = useState<'password' | 'otp'>('otp');

  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');

  // Error States
  const [emailError, setEmailError] = useState('');
  const [mobileError, setMobileError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [otpError, setOtpError] = useState('');

  const [isPickerVisible, setPickerVisible] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<Country>({
    name: 'India',
    code: 'IN',
    flag: '🇮🇳',
    callingCode: '91',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  
  // ─── Separate Loading States ───
  const [mainLoading, setMainLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  const { setAuth } = useAuth();

  useEffect(() => {
    setOtpSent(false);
    setOtp('');
    clearErrors();
  }, [loginMethod, authType, selectedCountry]);

  const clearErrors = () => {
    setEmailError('');
    setMobileError('');
    setPasswordError('');
    setOtpError('');
  };

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
    ]).start();

    GoogleSignin.configure({
      webClientId:
        '1038698506388-4v27d2oh0c5b8c1a1bjnh0iepeo9l5fs.apps.googleusercontent.com',
      offlineAccess: true,
      forceCodeForRefreshToken: true,
    });
  }, []);

  const handleMobileChange = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    if (selectedCountry.callingCode === '91') {
      if (cleaned.length > 10) {
        setMobileError('Mobile number cannot exceed 10 digits');
        setMobile(cleaned.slice(0, 10));
        return;
      } else {
        setMobileError('');
      }
    } else {
      if (cleaned.length > 15) {
        setMobileError('Mobile number cannot exceed 15 digits');
        setMobile(cleaned.slice(0, 15));
        return;
      } else {
        setMobileError('');
      }
    }
    setMobile(cleaned);
  };

  const validate = (): boolean => {
    let valid = true;
    clearErrors();

    if (loginMethod === 'email') {
      const emailTrimmed = email.trim();
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

      if (!emailTrimmed) {
        setEmailError('Email address is required');
        valid = false;
      } else if (!emailRegex.test(emailTrimmed)) {
        setEmailError('Please enter a valid email address');
        valid = false;
      }
    }

    if (loginMethod === 'mobile') {
      const mobileClean = mobile.replace(/[^0-9]/g, '');

      if (!mobileClean) {
        setMobileError('Mobile number is required');
        valid = false;
      } else if (selectedCountry.callingCode === '91' && mobileClean.length !== 10) {
        setMobileError('Mobile number must be exactly 10 digits');
        valid = false;
      } else if (mobileClean.length < 7 || mobileClean.length > 15) {
        setMobileError('Mobile number must be between 7 and 15 digits');
        valid = false;
      }
    }

    if (authType === 'password') {
      if (!password) {
        setPasswordError('Password is required');
        valid = false;
      } else if (password.length < 6) {
        setPasswordError('Password must be at least 6 characters long');
        valid = false;
      }
    } else if (otpSent) {
      const otpClean = otp.trim();
      if (!otpClean) {
        setOtpError('OTP is required');
        valid = false;
      } else if (!/^[0-9]+$/.test(otpClean)) {
        setOtpError('OTP must contain digits only');
        valid = false;
      } else if (otpClean.length < 4 || otpClean.length > 6) {
        setOtpError('Please enter a valid 4 or 6-digit OTP');
        valid = false;
      }
    }

    return valid;
  };

  const handlePasswordLogin = async () => {
    if (!validate()) return;
    setMainLoading(true);

    try {
      const cleanMobile = mobile.replace(/[^0-9]/g, '');
      const endpoint = loginMethod === 'email' 
        ? '/api/doctors/login' 
        : '/api/doctors/mobile-login';
        
      const payload =
        loginMethod === 'email'
          ? { email: email.trim().toLowerCase(), password }
          : {
              mobile: `+${selectedCountry.callingCode}${cleanMobile}`,
              password,
            };

      const response = await api.post(endpoint, payload);
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
      setMainLoading(false);
    }
  };

  const handleSendOTP = async () => {
    if (!validate()) return;
    setMainLoading(true);

    try {
      const cleanMobile = mobile.replace(/[^0-9]/g, '');
      const payload =
        loginMethod === 'email'
          ? { email: email.trim().toLowerCase() }
          : { mobile: `+${selectedCountry.callingCode}${cleanMobile}` };

      const res = await api.post('/api/doctors/send-login-otp', payload);
      if (res.data && res.data.success === false) {
        throw new Error(res.data.message || 'Failed to send OTP');
      }

      setOtpSent(true);
      Alert.alert('Success', 'OTP has been sent successfully.');
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        'Failed to send OTP. Please try again.';
      Alert.alert('Error', errorMessage, [{ text: 'OK' }]);
    } finally {
      setMainLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!validate()) return;
    setMainLoading(true);

    try {
      const cleanMobile = mobile.replace(/[^0-9]/g, '');
      const payload =
        loginMethod === 'email'
          ? { email: email.trim().toLowerCase(), otp: otp.trim() }
          : {
              mobile: `+${selectedCountry.callingCode}${cleanMobile}`,
              otp: otp.trim(),
            };

      const response = await api.post('/api/doctors/verify-otp-login', payload);
      const { token, doctor, success, message } = response.data;

      if (!success) {
        throw new Error(message || 'OTP verification failed.');
      }

      if (!token || !doctor?._id) {
        throw new Error('Unexpected server response. Please try again.');
      }

      setAuth(doctor, token);
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        'Invalid OTP. Please try again.';
      Alert.alert('Verification Failed', errorMessage, [{ text: 'OK' }]);
    } finally {
      setMainLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setGoogleLoading(true);
      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();

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
      setGoogleLoading(false);
    }
  };

  const handleMainAction = () => {
    if (authType === 'password') {
      handlePasswordLogin();
    } else {
      if (otpSent) {
        handleVerifyOTP();
      } else {
        handleSendOTP();
      }
    }
  };

  // Prevent interactions if any loading state is active
  const isAnyLoading = mainLoading || googleLoading;

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor={C.background} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.topNav}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => navigation?.canGoBack() && navigation.goBack()}
            disabled={isAnyLoading}
          >
            <Ionicons name="arrow-back" size={22} color={C.ink} />
          </TouchableOpacity>
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
            <View style={styles.headerWrap}>
              <Text style={styles.heroTitle}>Welcome Back.</Text>
              <Text style={styles.heroSub}>
                Sign in to access your clinical dashboard.
              </Text>
            </View>

            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>
                {loginMethod === 'email' ? 'Email Address' : 'Mobile Number'}
              </Text>

              {loginMethod === 'email' ? (
                <View style={[styles.inputBox, emailError ? styles.inputBoxError : null]}>
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
                      if (emailError) setEmailError('');
                    }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!otpSent && !isAnyLoading}
                  />
                  {otpSent && !isAnyLoading && (
                    <TouchableOpacity onPress={() => setOtpSent(false)}>
                      <Text style={styles.editText}>Edit</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                <View style={[styles.inputBox, { paddingHorizontal: 0, overflow: 'hidden' }, mobileError ? styles.inputBoxError : null]}>
                  <TouchableOpacity
                    style={styles.countrySelectorBtn}
                    onPress={() => setPickerVisible(true)}
                    disabled={otpSent || isAnyLoading}
                  >
                    <Text style={styles.flagText}>{selectedCountry.flag}</Text>
                    <Text style={styles.countryCodeText}>+{selectedCountry.callingCode}</Text>
                    <Ionicons name="chevron-down" size={14} color={C.textMuted} style={{ marginLeft: 4 }} />
                  </TouchableOpacity>

                  <View style={styles.verticalDivider} />

                  <TextInput
                    style={[styles.input, { paddingHorizontal: 12 }]}
                    placeholder={selectedCountry.callingCode === '91' ? '98765 43210' : 'Enter mobile number'}
                    placeholderTextColor={C.textMuted}
                    value={mobile}
                    onChangeText={handleMobileChange}
                    keyboardType="number-pad"
                    editable={!otpSent && !isAnyLoading}
                  />
                  {otpSent && !isAnyLoading && (
                    <TouchableOpacity
                      onPress={() => setOtpSent(false)}
                      style={{ paddingRight: 14 }}
                    >
                      <Text style={styles.editText}>Edit</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
              {!!emailError && <Text style={styles.errorText}>{emailError}</Text>}
              {!!mobileError && <Text style={styles.errorText}>{mobileError}</Text>}
            </View>

            {authType === 'password' ? (
              <View style={styles.fieldWrap}>
                <View style={styles.labelRow}>
                  <Text style={styles.fieldLabel}>Password</Text>
                  <TouchableOpacity
                    onPress={() => navigation?.navigate('ForgotPasswordScreen')}
                    disabled={isAnyLoading}
                  >
                    <Text style={styles.forgotLink}>Forgot?</Text>
                  </TouchableOpacity>
                </View>
                <View style={[styles.inputBox, passwordError ? styles.inputBoxError : null]}>
                  <Ionicons
                    name="lock-closed-outline"
                    size={18}
                    color={passwordError ? C.error : C.textMuted}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your password"
                    placeholderTextColor={C.textMuted}
                    value={password}
                    onChangeText={t => {
                      setPassword(t);
                      if (passwordError) setPasswordError('');
                    }}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    onSubmitEditing={handleMainAction}
                    editable={!isAnyLoading}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    style={{ padding: 4 }}
                    disabled={isAnyLoading}
                  >
                    <Ionicons
                      name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                      size={18}
                      color={C.textMuted}
                    />
                  </TouchableOpacity>
                </View>
                {!!passwordError && <Text style={styles.errorText}>{passwordError}</Text>}
              </View>
            ) : (
              otpSent && (
                <View style={styles.fieldWrap}>
                  <Text style={styles.fieldLabel}>Enter OTP</Text>
                  <View style={[styles.inputBox, otpError ? styles.inputBoxError : null]}>
                    <Ionicons
                      name="keypad-outline"
                      size={18}
                      color={otpError ? C.error : C.textMuted}
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={styles.input}
                      placeholder="Enter 4-6 digit OTP"
                      placeholderTextColor={C.textMuted}
                      keyboardType="number-pad"
                      value={otp}
                      onChangeText={t => {
                        const cleaned = t.replace(/[^0-9]/g, '');
                        setOtp(cleaned);
                        if (otpError) setOtpError('');
                      }}
                      maxLength={6}
                      onSubmitEditing={handleMainAction}
                      editable={!isAnyLoading}
                    />
                  </View>
                  {!!otpError && <Text style={styles.errorText}>{otpError}</Text>}
                </View>
              )
            )}

            <View style={styles.authToggleRow}>
              <TouchableOpacity
                onPress={() => setAuthType(authType === 'password' ? 'otp' : 'password')}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                disabled={isAnyLoading}
              >
                <Text style={styles.authToggleText}>
                  {authType === 'password'
                    ? 'Login with OTP instead'
                    : 'Login with Password instead'}
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleMainAction}
              disabled={isAnyLoading}
            >
              <LinearGradient
                colors={['#00a8c2', '#007b8e']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.loginBtn}
              >
                {mainLoading ? (
                  <ActivityIndicator color={C.white} size="small" />
                ) : (
                  <Text style={styles.loginBtnText}>
                    {authType === 'password'
                      ? 'Sign In'
                      : otpSent
                      ? 'Verify & Login'
                      : 'Get OTP'}
                  </Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.divider}>
              <View style={styles.line} />
              <Text style={styles.orText}>or</Text>
              <View style={styles.line} />
            </View>

            <TouchableOpacity
              style={styles.switchMethodBtn}
              onPress={() => setLoginMethod(prev => (prev === 'email' ? 'mobile' : 'email'))}
              disabled={isAnyLoading}
            >
              <Image
                source={
                  loginMethod === 'email'
                    ? require('../assets/call.png')
                    : require('../assets/gmail.png')
                }
                style={{ width: 18, height: 18, marginRight: 10 }}
                resizeMode="contain"
              />
              <Text style={styles.switchMethodText}>
                Continue with {loginMethod === 'email' ? 'Mobile Number' : 'Email'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.googleBtn}
              onPress={handleGoogleLogin}
              disabled={isAnyLoading}
            >
              {googleLoading ? (
                <ActivityIndicator color={C.primary} size="small" />
              ) : (
                <>
                  <Image
                    source={require('../assets/google-logo.png')}
                    style={{ width: 18, height: 18, marginRight: 10 }}
                    resizeMode="contain"
                  />
                  <Text style={styles.googleBtnText}>Continue with Google</Text>
                </>
              )}
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>

        <SafeAreaView edges={['bottom']} style={styles.registerWrap}>
          <Text style={styles.registerText}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => navigation?.navigate('Register')} disabled={isAnyLoading}>
            <Text style={styles.registerLink}>Register</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </KeyboardAvoidingView>

      <CustomCountryPicker
        visible={isPickerVisible}
        onClose={() => setPickerVisible(false)}
        selectedCountry={selectedCountry}
        onSelect={setSelectedCountry}
        theme={pickerTheme}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background },
  scroll: { flexGrow: 1, justifyContent: 'center' },
  topNav: { paddingHorizontal: scale(20), paddingTop: scale(12) },
  iconBtn: { padding: scale(8), marginLeft: scale(-8) },
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
  heroSub: { fontSize: scale(13), color: C.textSub, lineHeight: scale(20) },
  fieldWrap: { marginBottom: scale(16) },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scale(6),
  },
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
    borderColor: '#F3F4F6',
  },
  inputBoxError: {
    borderColor: C.error,
    backgroundColor: '#FEF2F2',
  },
  inputIcon: { marginRight: scale(10) },
  input: { flex: 1, fontSize: scale(13), color: C.ink, fontWeight: '500' },
  editText: {
    color: C.primary,
    fontWeight: '700',
    fontSize: scale(12),
    padding: scale(4),
  },
  forgotLink: { fontSize: scale(12), fontWeight: '600', color: C.primary },
  errorText: {
    fontSize: scale(11),
    color: C.error,
    fontWeight: '600',
    marginTop: scale(5),
    marginLeft: scale(2),
  },
  countrySelectorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(14),
    height: '100%',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
  },
  flagText: { fontSize: scale(16), marginRight: scale(6) },
  countryCodeText: { fontSize: scale(13), fontWeight: '600', color: C.ink },
  verticalDivider: { width: 1, height: '50%', backgroundColor: C.border },
  authToggleRow: {
    alignItems: 'flex-end',
    marginTop: scale(-4),
    marginBottom: scale(20),
  },
  authToggleText: { fontSize: scale(12), fontWeight: '700', color: C.primary },
  loginBtn: {
    borderRadius: scale(12),
    paddingVertical: scale(14),
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginBtnText: {
    color: C.white,
    fontWeight: '700',
    fontSize: scale(14),
    letterSpacing: 0.3,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: scale(24),
  },
  line: { flex: 1, height: 1, backgroundColor: C.border },
  orText: {
    marginHorizontal: scale(12),
    color: C.textMuted,
    fontSize: scale(12),
    fontWeight: '500',
  },
  switchMethodBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scale(12),
    paddingVertical: scale(12),
    backgroundColor: C.white,
    borderRadius: scale(12),
    borderWidth: 1,
    borderColor: C.border,
  },
  switchMethodText: { fontSize: scale(13), fontWeight: '700', color: C.ink },
  googleBtn: {
    flexDirection: 'row',
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: scale(12),
    paddingVertical: scale(12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleBtnText: { color: C.ink, fontWeight: '700', fontSize: scale(13) },
  registerWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scale(16),
    backgroundColor: C.background,
  },
  registerText: { fontSize: scale(13), color: C.textSub },
  registerLink: { fontSize: scale(13), fontWeight: '800', color: C.primary },
});

export default LoginScreen;