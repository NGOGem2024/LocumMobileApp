import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';

const { width: SW } = Dimensions.get('window');
const scale = (size: number) => (SW / 390) * size;

// ─── Light Theme Colors ───
const C = {
  background: '#F9FAFB',
  cardBg: '#FFFFFF', 
  border: '#E5E7EB',
  primary: '#007b8e', // Deep Teal
  primaryLight: '#E0F5F8',
  ink: '#111827', // Dark text
  textSub: '#4B5563',
  white: '#ffffff',
};

interface DashboardScreenProps {
  navigation?: any;
}

const DashboardScreen = ({ navigation }: DashboardScreenProps) => {
  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor={C.background} />

      <View style={styles.container}>
        {/* ── Premium Back Button ── */}
        {/* ── Premium Back Button ── */}
        <View style={styles.topNav}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => {
              if (navigation?.canGoBack()) {
                navigation.goBack();
              } else {
                // Navigate explicitly to your landing screen when there is no history
                navigation.navigate('LandingScreen'); 
              }
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={24} color={C.ink} />
          </TouchableOpacity>
        </View>

        {/* ── Centered Content Card ── */}
        <View style={styles.centerCard}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>✨ PREMIER LOCUM NETWORK</Text>
          </View>

          <Text style={styles.heroTitle}>
            Trusted Doctors{'\n'}
            <Text style={styles.heroTitleHighlight}>On Demand</Text>
          </Text>

          <Text style={styles.heroSub}>
            Connecting medical professionals and hospitals seamlessly. Fast,
            verified, and uninterrupted healthcare staffing.
          </Text>

          <View style={styles.ctaGroup}>
            {/* Primary Gradient Button */}
            <TouchableOpacity
              style={styles.btnShadowWrapper}
              activeOpacity={0.85}
              onPress={() => navigation?.navigate('Register', { role: 'doctor' })}
            >
              <LinearGradient
                colors={['#00a8c2', '#007b8e']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.btnGradient}
              >
                <Text style={styles.btnPrimaryText}>Register as Doctor</Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Secondary Gradient Button */}
            <TouchableOpacity
              style={styles.btnShadowWrapper}
              activeOpacity={0.85}
              onPress={() => navigation?.navigate('Register', { role: 'hospital' })}
            >
              <LinearGradient
                colors={['#ffffff', '#f1f5f9']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.btnGradient, styles.secondaryBorder]}
              >
                <Text style={styles.btnSecondaryText}>For Hospitals</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.loginWrapper}
            activeOpacity={0.7}
            onPress={() => navigation?.navigate('LoginScreen')}
          >
            <Text style={styles.loginText}>
              Already have an account? <Text style={styles.loginBold}>Login</Text>
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.guestLink}
          onPress={() => navigation?.navigate('GuestDashboardScreen')}
          activeOpacity={0.7}
        >
          <Text style={styles.guestLinkText}>Want to explore first? <Text style={styles.loginBold}>Browse as Guest</Text> </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background },
  container: {
    flex: 1,
    paddingHorizontal: scale(24),
    justifyContent: 'space-between',
    paddingVertical: scale(16),
  },
  topNav: { paddingBottom: scale(16) },
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
  centerCard: {
    backgroundColor: C.cardBg,
    borderRadius: scale(24),
    paddingHorizontal: scale(22),
    paddingVertical: scale(32),
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: C.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 3,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: C.primaryLight,
    paddingHorizontal: scale(12),
    paddingVertical: scale(6),
    borderRadius: scale(20),
    marginBottom: scale(16),
  },
  badgeText: { color: C.primary, fontSize: scale(10.5), fontWeight: '800', letterSpacing: 0.6 },
  heroTitle: { fontSize: scale(30), fontWeight: '900', color: C.ink, lineHeight: scale(36), marginBottom: scale(12), letterSpacing: -0.5 },
  heroTitleHighlight: { color: C.primary },
  heroSub: { fontSize: scale(14), color: C.textSub, lineHeight: scale(21), marginBottom: scale(28) },
  
  ctaGroup: { gap: scale(12), marginBottom: scale(20) },
  btnShadowWrapper: {
    width: '100%',
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
    borderRadius: scale(14),
  },
  btnGradient: {
    paddingVertical: scale(15),
    borderRadius: scale(14),
    alignItems: 'center',
  },
  secondaryBorder: {
    borderWidth: 1,
    borderColor: C.border,
  },
  btnPrimaryText: { color: C.white, fontWeight: '800', fontSize: scale(15) },
  btnSecondaryText: { color: C.ink, fontWeight: '800', fontSize: scale(15) },
  
  loginWrapper: { alignItems: 'center', paddingVertical: scale(8) },
  loginText: { color: C.textSub, fontSize: scale(14) },
  loginBold: { color: C.primary, fontWeight: '800' },
  guestLink: { alignItems: 'center', paddingVertical: scale(12) },
  guestLinkText: { color: C.textSub, fontSize: scale(13), fontWeight: '600' },
});

export default DashboardScreen;