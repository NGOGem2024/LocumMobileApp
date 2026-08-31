import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';

const { width: SW, height: SH } = Dimensions.get('window');
const scale = (size: number) => (SW / 390) * size;

// ─── Light Theme Colors ───
const C = {
  background: '#F9FAFB',
  primary: '#007b8e',
  primaryLight: '#E0F5F8',
  ink: '#111827',
  textSub: '#4B5563',
  white: '#ffffff',
  border: '#E5E7EB',
  dotInactive: '#D1D5DB',
};

// ─── Carousel Data ───
const ONBOARDING_SLIDES = [
  {
    id: '1',
    icon: '🏥',
    title: 'Explore\nHealTrack',
    desc: 'The smartest way to connect premium healthcare facilities with verified medical professionals.',
  },
  {
    id: '2',
    icon: '🧠',
    title: 'Smart AI\nMatching',
    desc: 'Our intelligence engine pairs doctors by skill and location instantly. Say goodbye to manual scheduling.',
  },
  {
    id: '3',
    icon: '💼',
    title: 'Work on\nYour Terms',
    desc: 'From daily duty deployment to seamless locum coverage, find the shifts that fit your life.',
  },
];

interface GuestDashboardScreenProps {
  navigation?: any;
}

const GuestDashboardScreen = ({ navigation }: GuestDashboardScreenProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef<any>(null);

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems && viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

  const viewConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const handleNext = () => {
    if (currentIndex < ONBOARDING_SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({
        index: currentIndex + 1,
        animated: true,
      });
    } else {
      navigation?.navigate('DashboardScreen');
    }
  };

  const handleSkip = () => {
    navigation?.navigate('DashboardScreen');
  };

  const renderSlide = ({ item, index }: { item: any; index: number }) => {
    const inputRange = [(index - 1) * SW, index * SW, (index + 1) * SW];

    const imageScale = scrollX.interpolate({
      inputRange,
      outputRange: [0.6, 1, 0.6],
      extrapolate: 'clamp',
    });
    const imageOpacity = scrollX.interpolate({
      inputRange,
      outputRange: [0.2, 1, 0.2],
      extrapolate: 'clamp',
    });
    const imageTranslateY = scrollX.interpolate({
      inputRange,
      outputRange: [40, 0, 40],
      extrapolate: 'clamp',
    });

    const textTranslateY = scrollX.interpolate({
      inputRange,
      outputRange: [20, 0, 20],
      extrapolate: 'clamp',
    });
    const textOpacity = scrollX.interpolate({
      inputRange,
      outputRange: [0, 1, 0],
      extrapolate: 'clamp',
    });

    return (
      <View style={styles.slide}>
        {/* Animated Icon Section */}
        <Animated.View
          style={[
            styles.imageContainer,
            {
              opacity: imageOpacity,
              transform: [
                { scale: imageScale },
                { translateY: imageTranslateY },
              ],
            },
          ]}
        >
          <View style={styles.outerRing}>
            <View style={styles.innerRing}>
              <View style={styles.iconCard}>
                <Text style={styles.slideIcon}>{item.icon}</Text>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Animated Text Section */}
        <Animated.View
          style={[
            styles.textContainer,
            {
              opacity: textOpacity,
              transform: [{ translateY: textTranslateY }],
            },
          ]}
        >
          <Text style={styles.slideTitle}>{item.title}</Text>
          <Text style={styles.slideDesc}>{item.desc}</Text>
        </Animated.View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor={C.background} />

      {/* ── Top Header ── */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation?.canGoBack() && navigation.goBack()}
          style={styles.iconBtn}
          activeOpacity={0.7}
        >
           <Ionicons name="chevron-back" size={24} color={C.ink} />
        </TouchableOpacity>

        <TouchableOpacity onPress={handleSkip} style={styles.headerBtn}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>

      {/* ── Animated Swipable Carousel ── */}
      <Animated.FlatList
        ref={flatListRef}
        data={ONBOARDING_SLIDES}
        renderItem={renderSlide}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false } // Kept false to support dot width/color animation
        )}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewConfig}
        scrollEventThrottle={16}
      />

      {/* ── Bottom Section ── */}
      <View style={styles.bottomContainer}>
        {/* Pagination Dots */}
        <View style={styles.pagination}>
          {ONBOARDING_SLIDES.map((_, index) => {
            const inputRange = [(index - 1) * SW, index * SW, (index + 1) * SW];

            const dotWidth = scrollX.interpolate({
              inputRange,
              outputRange: [scale(8), scale(24), scale(8)],
              extrapolate: 'clamp',
            });

            const dotColor = scrollX.interpolate({
              inputRange,
              outputRange: [C.dotInactive, C.primary, C.dotInactive],
              extrapolate: 'clamp',
            });

            return (
              <Animated.View
                key={index}
                style={[
                  styles.dot,
                  { width: dotWidth, backgroundColor: dotColor },
                ]}
              />
            );
          })}
        </View>

        {/* Gradient CTA Button */}
        <TouchableOpacity
          style={styles.btnShadowWrapper}
          activeOpacity={0.85}
          onPress={handleNext}
        >
          <LinearGradient
            colors={['#00a8c2', '#007b8e']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.btnPrimary}
          >
            <Text style={styles.btnText}>
              {currentIndex === ONBOARDING_SLIDES.length - 1
                ? 'Create a Free Account'
                : 'Next'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

// ─── Styles ───
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: scale(24),
    paddingTop: scale(12),
    paddingBottom: scale(10),
    zIndex: 10,
    alignItems: 'center',
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
  headerBtn: {
    paddingVertical: scale(8),
    paddingHorizontal: scale(4),
  },
  skipText: {
    color: C.ink,
    fontSize: scale(15),
    fontWeight: '700',
  },

  // Slide Layout
  slide: {
    width: SW,
    alignItems: 'center',
    paddingHorizontal: scale(28),
  },
  
  // Icon Aesthetics
  imageContainer: {
    height: SH * 0.45,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    marginTop: scale(20),
  },
  outerRing: {
    width: scale(240),
    height: scale(240),
    borderRadius: scale(120),
    backgroundColor: C.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  innerRing: {
    width: scale(170),
    height: scale(170),
    borderRadius: scale(85),
    backgroundColor: 'rgba(0, 123, 142, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconCard: {
    width: scale(110),
    height: scale(110),
    backgroundColor: C.white,
    borderRadius: scale(32),
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  slideIcon: {
    fontSize: scale(48),
  },

  // Text Aesthetics
  textContainer: {
    alignItems: 'flex-start',
    width: '100%',
    marginTop: scale(20),
  },
  slideTitle: {
    fontSize: scale(34),
    fontWeight: '900',
    color: C.ink,
    lineHeight: scale(40),
    marginBottom: scale(16),
    letterSpacing: -0.5,
  },
  slideDesc: {
    fontSize: scale(15),
    color: C.textSub,
    lineHeight: scale(24),
  },

  // Bottom Controls
  bottomContainer: {
    paddingHorizontal: scale(24),
    paddingBottom: scale(32),
    paddingTop: scale(20),
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginBottom: scale(32),
    paddingLeft: scale(4),
  },
  dot: {
    height: scale(8),
    borderRadius: scale(4),
    marginRight: scale(8),
  },
  btnShadowWrapper: {
    width: '100%',
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
    borderRadius: scale(16),
  },
  btnPrimary: {
    width: '100%',
    paddingVertical: scale(16),
    borderRadius: scale(16),
    alignItems: 'center',
  },
  btnText: {
    color: C.white,
    fontWeight: '800',
    fontSize: scale(16),
  },
});

export default GuestDashboardScreen;