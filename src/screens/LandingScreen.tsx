import { useNavigation } from '@react-navigation/native';
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Image,
  Dimensions,
  ImageBackground,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');
const scale = (size: number) => (width / 390) * size;

const C = {
  primary: '#007b8e',
  white: '#ffffff',
  overlay: 'rgba(0, 0, 0, 0.4)', // Dark tint for the text bar
};

const LandingScreen = () => {
  const navigation = useNavigation<any>();
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
        <SafeAreaView style={styles.safeArea}>
          {/* 1. Top Logo Section */}
          <View style={styles.logoContainer}>
            <Image
              source={require('../assets/Logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          {/* 2. Middle Text Bar Section */}
          <View style={styles.textBar}>
            <Text style={styles.title}>Welcome to HT Locum</Text>
            <Text style={styles.subtitle}>
              Find opportunities or explore as guest
            </Text>
          </View>

          {/* 3. Bottom Button Section */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.guestBtn}
              onPress={() => navigation.navigate('GuestDashboard')}
              activeOpacity={0.85}
            >
              <Text style={styles.guestText}>Explore</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.registerBtn}
              onPress={() => navigation.navigate('DashboardScreen')}
              activeOpacity={0.85}
            >
              <Text style={styles.registerText}>Get Started</Text>
            </TouchableOpacity>
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
  safeArea: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: scale(40),
  },
  logoContainer: {
    marginTop: scale(0),
  },
  // logoBox: {
  //   backgroundColor: 'white',
  //   paddingHorizontal: scale(20),
  //   paddingVertical: scale(10),
  //   borderRadius: scale(10),
  //   borderColor: 'C.primary',
  //   // Shadow/Elevation for the logo box
  //   // elevation: 5,
  //   // shadowColor: '#000',
  //   // shadowOffset: { width: 0, height: 2 },
  //   // shadowOpacity: 0.25,
  //   // shadowRadius: 3.84,
  // },
  logo: {
    width: scale(140),
    height: scale(90),
    borderRadius: scale(150),
  },
  textBar: {
    width: '100%',
    backgroundColor: C.overlay, // Semi-transparent bar
    paddingVertical: scale(10),
    alignItems: 'center',
    marginBottom: 400,
  },
  title: {
    fontSize: scale(20),
    fontWeight: '700',
    color: C.white,
    marginBottom: scale(4),
  },
  subtitle: {
    fontSize: scale(14),
    color: C.white,
    opacity: 0.9,
  },
  buttonContainer: {
    width: '100%',
    paddingHorizontal: scale(24),
    // marginBottom: scale(0),
  },
  guestBtn: {
    backgroundColor: C.primary,
    paddingVertical: scale(16),
    borderRadius: scale(10),
    alignItems: 'center',
    marginBottom: scale(12),
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  guestText: {
    color: C.white,
    fontSize: scale(16),
    fontWeight: '700',
  },
  registerBtn: {
    backgroundColor: C.white,
    paddingVertical: scale(16),
    borderRadius: scale(10),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.primary,
  },
  registerText: {
    color: C.primary,
    fontSize: scale(16),
    fontWeight: '700',
  },
});

export default LandingScreen;
