import React from 'react';
import { View, Text, StyleSheet, Image, Dimensions } from 'react-native';

const { width: SW } = Dimensions.get('window');
const scale = (size: number) => (SW / 390) * size;

const AppHeader = () => {
  return (
    <View style={styles.container}>
      {/* LEFT */}
      <View style={styles.leftRow}>
        <View style={styles.logoWrapper}>
          <Image
            source={require('../assets/HT_icon.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        <Text style={styles.title}>Locum</Text>
      </View>

      {/* RIGHT */}
      <Text style={styles.heading}>Doctor Onboarding</Text>
    </View>
  );
};

export default AppHeader;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row', // 🔥 added
    justifyContent: 'space-between', // 🔥 added
    alignItems: 'center',
  },

  leftRow: {
    // 🔥 new
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
  },

  // existing logo styles (unchanged)
  logoWrapper: {
    width: scale(46),
    height: scale(46),
    borderRadius: scale(12),
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e0f5f8',
    shadowColor: '#007b8e',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },

  logo: {
    width: scale(30),
    height: scale(30),
  },

  title: {
    fontSize: scale(20),
    fontWeight: '800',
    color: '#007b8e',
  },

  // 🔥 new right-side text
  heading: {
    fontSize: scale(14),
    fontWeight: '700',
    color: '#333',
  },
});
