import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Image,
  Dimensions,
  ImageBackground,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';

const { width, height } = Dimensions.get('window');
const scale = (size: number) => (width / 390) * size;

// ─── Theme Colors ────────────────────────────────────────────────────────────
const C = {
  primary: '#007b8e',
  primaryDark: '#04424c',
  accentCyan: '#67e8f9',
  white: '#ffffff',
  bgOverlay: 'rgba(4, 56, 64, 0.86)', // Deep teal tint
};

const LandingScreen = () => {
  const navigation = useNavigation<any>();

  // ─── Animation Values ───
  const fadeLogo = useRef(new Animated.Value(0)).current;
  const slideLogo = useRef(new Animated.Value(30)).current;

  const fadeText = useRef(new Animated.Value(0)).current;
  const slideText = useRef(new Animated.Value(30)).current;

  const fadeBtns = useRef(new Animated.Value(0)).current;
  const slideBtns = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    // Staggered animation sequence for a premium, cascading effect
    Animated.stagger(150, [
      Animated.parallel([
        Animated.timing(fadeLogo, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(slideLogo, { toValue: 0, duration: 800, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(fadeText, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(slideText, { toValue: 0, duration: 800, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(fadeBtns, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(slideBtns, { toValue: 0, duration: 800, useNativeDriver: true }),
      ]),
    ]).start();
  }, [fadeLogo, slideLogo, fadeText, slideText, fadeBtns, slideBtns]);

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        translucent
        backgroundColor="transparent"
      />

      <ImageBackground
        source={require('../assets/welcome.png')}
        style={styles.background}
        resizeMode="cover"
      >
        {/* ── Rich Deep Teal Overlay ── */}
        <View style={styles.tealOverlay} />

        <SafeAreaView style={styles.safeArea}>
          <View style={styles.centerWrapper}>
            
            {/* 1. Logo Section (Animated) */}
            <Animated.View 
              style={[
                styles.logoContainer, 
                { opacity: fadeLogo, transform: [{ translateY: slideLogo }] }
              ]}
            >
              <Image
                source={require('../assets/Logo.png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </Animated.View>

            {/* 2. Text Content (Animated) */}
            <Animated.View 
              style={[
                styles.heroContent,
                { opacity: fadeText, transform: [{ translateY: slideText }] }
              ]}
            >
              <View style={styles.badge}>
                <Text style={styles.badgeText}>✦ WELCOME TO HT LOCUM</Text>
              </View>

              <Text style={styles.title}>
                Precision Healthcare{'\n'}
                <Text style={styles.titleHighlight}>Staffing on Demand</Text>
              </Text>

              <Text style={styles.subtitle}>
                Secure your next clinical shift with verified hospitals and top medical networks.
              </Text>
            </Animated.View>

            {/* 3. Action Buttons (Animated) */}
            <Animated.View 
              style={[
                styles.buttonContainer,
                { opacity: fadeBtns, transform: [{ translateY: slideBtns }] }
              ]}
            >
              {/* Premium Gradient Guest Button */}
              <TouchableOpacity
                style={styles.btnShadowWrapper}
                onPress={() => navigation.navigate('GuestDashboardScreen')}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={['#00a8c2', '#007b8e']} // Light Cyan to Deep Teal
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.guestGradient}
                >
                  <Text style={styles.guestText}>Explore as Guest →</Text>
                </LinearGradient>
              </TouchableOpacity>

              {/* Subtle Gradient Register Button */}
              <TouchableOpacity
                style={styles.btnShadowWrapper}
                onPress={() => navigation.navigate('DashboardScreen')}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={['#ffffff', '#eef2f3']} // Pure White to Soft Silver
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.registerGradient}
                >
                  <Text style={styles.registerText}>Get Started</Text>
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>

          </View>
        </SafeAreaView>
      </ImageBackground>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    flex: 1,
    width: width,
    height: height,
  },
  tealOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: C.bgOverlay,
  },
  safeArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: scale(24),
  },
  centerWrapper: {
    width: '100%',
    alignItems: 'center',
  },

  /* Logo */
  logoContainer: {
    alignItems: 'center',
    marginBottom: scale(20),
  },
  logo: {
    width: scale(140),
    height: scale(65),
  },

  /* Hero Content */
  heroContent: {
    width: '100%',
    alignItems: 'center',
    marginBottom: scale(32),
  },
  badge: {
    alignSelf: 'center',
    backgroundColor: 'rgba(103, 232, 249, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(103, 232, 249, 0.3)',
    borderRadius: scale(20),
    paddingHorizontal: scale(12),
    paddingVertical: scale(5),
    marginBottom: scale(14),
  },
  badgeText: {
    color: C.accentCyan,
    fontSize: scale(10.5),
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  title: {
    fontSize: scale(28),
    fontWeight: '900',
    color: C.white,
    lineHeight: scale(36),
    marginBottom: scale(10),
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  titleHighlight: {
    color: C.accentCyan,
  },
  subtitle: {
    fontSize: scale(13.5),
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: scale(20),
    textAlign: 'center',
    paddingHorizontal: scale(10),
  },

  /* Buttons */
  buttonContainer: {
    width: '100%',
    gap: scale(12),
  },
  btnShadowWrapper: {
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
    borderRadius: scale(14),
  },
  guestGradient: {
    paddingVertical: scale(15),
    borderRadius: scale(14),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  guestText: {
    color: C.white,
    fontSize: scale(15),
    fontWeight: '800',
  },
  registerGradient: {
    paddingVertical: scale(15),
    borderRadius: scale(14),
    alignItems: 'center',
  },
  registerText: {
    color: C.primaryDark,
    fontSize: scale(15),
    fontWeight: '800',
  },
});

export default LandingScreen;