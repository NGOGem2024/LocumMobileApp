import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Animated,
  Dimensions,
  StatusBar,
} from 'react-native';

const { width: SW } = Dimensions.get('window');
const scale = (size: number) => (SW / 390) * size;

const C = {
  primary: '#007b8e',
  primaryDark: '#005f6e',
  white: '#ffffff',
  accent: '#00b4cc',
};

interface SplashScreenProps {
  onFinish: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const logoScale = useRef(new Animated.Value(0.6)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const exitOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Entrance animations
    Animated.sequence([
      // Logo pops in
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          tension: 60,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
      // App name fades in
      Animated.timing(textOpacity, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }),
      // Tagline fades in
      Animated.timing(taglineOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    // Exit after 3 seconds
    const timer = setTimeout(() => {
      Animated.timing(exitOpacity, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }).start(() => onFinish());
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <Animated.View style={[styles.root, { opacity: exitOpacity }]}>
      <StatusBar barStyle="light-content" backgroundColor={C.primaryDark} />

      {/* Decorative circles */}
      <View style={styles.circleTopRight} />
      <View style={styles.circleBottomLeft} />

      {/* Logo block */}
      <Animated.View
        style={[
          styles.logoBlock,
          {
            opacity: logoOpacity,
            transform: [{ scale: logoScale }],
          },
        ]}
      >
        <View style={styles.logoRing}>
          <Image
            source={require('../assets/HT_icon.png')}
            style={styles.htIcon}
            resizeMode="contain"
          />
        </View>
      </Animated.View>

      {/* App name */}
      <Animated.View style={{ opacity: textOpacity, alignItems: 'center' }}>
        <Text style={styles.appName}>HT Locum</Text>
      </Animated.View>

      {/* Tagline */}
      <Animated.View style={{ opacity: taglineOpacity, alignItems: 'center' }}>
        <Text style={styles.tagline}>CONNECTING DOCTORS. ENABLING CARE.</Text>
        <View style={styles.divider} />
      </Animated.View>

      {/* Bottom branding */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>Powered by HealthTech</Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Decorative blobs
  circleTopRight: {
    position: 'absolute',
    width: scale(220),
    height: scale(220),
    borderRadius: scale(110),
    backgroundColor: 'rgba(255,255,255,0.07)',
    top: -scale(60),
    right: -scale(60),
  },
  circleBottomLeft: {
    position: 'absolute',
    width: scale(180),
    height: scale(180),
    borderRadius: scale(90),
    backgroundColor: 'rgba(0,0,0,0.08)',
    bottom: -scale(40),
    left: -scale(40),
  },
  logoBlock: {
    marginBottom: scale(28),
  },
  logoRing: {
    width: scale(120),
    height: scale(120),
    borderRadius: scale(60),
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  htIcon: {
    width: scale(72),
    height: scale(72),
  },
  stethBadge: {
    position: 'absolute',
    bottom: scale(4),
    right: scale(4),
    width: scale(32),
    height: scale(32),
    borderRadius: scale(16),
    backgroundColor: C.primaryDark,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stethIcon: {
    width: scale(18),
    height: scale(18),
  },
  appName: {
    fontSize: scale(36),
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 1,
    marginBottom: scale(8),
  },
  tagline: {
    fontSize: scale(10),
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 2,
    fontWeight: '600',
    textAlign: 'center',
    paddingHorizontal: scale(30),
  },
  divider: {
    width: scale(40),
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 1,
    marginTop: scale(16),
  },
  footer: {
    position: 'absolute',
    bottom: scale(40),
  },
  footerText: {
    fontSize: scale(11),
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 0.8,
  },
});

export default SplashScreen;
