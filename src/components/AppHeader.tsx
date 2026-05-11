import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Dimensions,
  TouchableOpacity,
  Modal,
  Pressable,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';

const { width: SW } = Dimensions.get('window');
const scale = (size: number) => (SW / 390) * size;

const C = {
  primary: '#007b8e',
  primaryDark: '#005f6e',
  primaryLight: '#e0f5f8',
  white: '#ffffff',
  text: '#0d2b30',
  textSub: '#4a7a82',
  textMuted: '#9ab8bc',
  border: '#eee',
  overlay: 'rgba(0,30,35,0.55)',
};

interface AppHeaderProps {
  onBack?: () => void;
  showProfile?: boolean; // optional override — defaults to auth state
}

const AppHeader = ({ onBack, showProfile }: AppHeaderProps) => {
  const { isRegistered, doctor } = useAuth();
  const navigation = useNavigation<any>();
  const [guestModalVisible, setGuestModalVisible] = useState(false);

  // Show profile icon only if explicitly set OR doctor is registered
  // const shouldShowProfile = showProfile ?? isRegistered;

  const shouldShowProfile = !!doctor; // show only if logged in
  const handleProfilePress = () => {
    if (isRegistered) {
      navigation.navigate('ProfileScreen'); // navigate to profile
    } else {
      setGuestModalVisible(true); // show "register first" popup
    }
  };

  const initials = doctor
    ? `${doctor.first_name[0]}${doctor.last_name[0]}`.toUpperCase()
    : '';

  return (
    <>
      <View style={styles.headerTop}>
        {/* LEFT: back button slot */}
        <View style={styles.leftSlot}>
          {onBack && (
            <TouchableOpacity
              onPress={onBack}
              hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
              activeOpacity={0.6}
            >
              <Text style={styles.backArrow}>‹</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* CENTER: logo */}
        <Image
          source={require('../assets/image.png')}
          style={styles.headerLogoImg}
          resizeMode="contain"
        />

        {/* RIGHT: profile icon or label */}
        <View style={styles.rightSlot}>
          {shouldShowProfile ? (
            <TouchableOpacity
              style={styles.avatarBtn}
              onPress={handleProfilePress}
              activeOpacity={0.8}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initials || 'DR'}</Text>
              </View>
              <View style={styles.onlineDot} />
            </TouchableOpacity>
          ) : (
            <Text style={styles.headerBrandSub} numberOfLines={2}>
              {'DOCTOR\nONBOARDING'}
            </Text>
          )}
        </View>
      </View>

      {/* ── "Register First" Guest Modal ── */}
      <Modal
        visible={guestModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setGuestModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setGuestModalVisible(false)}
        >
          <Pressable style={styles.modalCard} onPress={() => {}}>
            {/* Icon */}
            <View style={styles.modalIconRing}>
              <Text style={styles.modalIcon}>🔒</Text>
            </View>

            <Text style={styles.modalTitle}>Registration Required</Text>
            <Text style={styles.modalSub}>
              Your profile is only accessible after completing your doctor
              registration. It takes less than 3 minutes!
            </Text>

            <View style={styles.modalDivider} />

            {/* Steps hint */}
            {[
              'Complete your profile',
              'Get verified in 24h',
              'Access your dashboard',
            ].map((step, i) => (
              <View key={i} style={styles.modalStep}>
                <View style={styles.modalStepDot}>
                  <Text style={styles.modalStepNum}>{i + 1}</Text>
                </View>
                <Text style={styles.modalStepText}>{step}</Text>
              </View>
            ))}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalBtnPrimary}
                activeOpacity={0.85}
                onPress={() => {
                  setGuestModalVisible(false);
                  navigation.navigate('Register', { role: 'doctor' });
                }}
              >
                <Text style={styles.modalBtnPrimaryText}>Register Now →</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalBtnSecondary}
                activeOpacity={0.7}
                onPress={() => setGuestModalVisible(false)}
              >
                <Text style={styles.modalBtnSecondaryText}>Maybe Later</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
};

export default AppHeader;

const styles = StyleSheet.create({
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(12),
    height: scale(70),
    backgroundColor: C.white,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  leftSlot: {
    width: scale(20),
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  rightSlot: {
    width: scale(200),
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  backArrow: {
    fontSize: scale(40),
    color: C.primary,
    fontWeight: '300',
    lineHeight: scale(44),
    includeFontPadding: false,
    marginLeft: 5,
  },
  headerLogoImg: {
    width: scale(130),
    height: scale(40),
  },
  headerBrandSub: {
    fontSize: scale(10),
    color: C.primary,
    letterSpacing: 1.2,
    fontWeight: '700',
    textAlign: 'right',
    lineHeight: scale(15),
  },

  // ── Avatar ──
  avatarBtn: {
    position: 'relative',
  },
  avatar: {
    width: scale(38),
    height: scale(38),
    borderRadius: scale(19),
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: C.primaryLight,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  avatarText: {
    color: C.white,
    fontSize: scale(14),
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: scale(10),
    height: scale(10),
    borderRadius: scale(5),
    backgroundColor: '#00b894',
    borderWidth: 1.5,
    borderColor: C.white,
  },

  // ── Modal ──
  modalOverlay: {
    flex: 1,
    backgroundColor: C.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: scale(24),
  },
  modalCard: {
    backgroundColor: C.white,
    borderRadius: scale(24),
    padding: scale(24),
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 16,
  },
  modalIconRing: {
    width: scale(64),
    height: scale(64),
    borderRadius: scale(32),
    backgroundColor: C.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scale(14),
  },
  modalIcon: { fontSize: scale(28) },
  modalTitle: {
    fontSize: scale(18),
    fontWeight: '800',
    color: C.text,
    marginBottom: scale(8),
    textAlign: 'center',
  },
  modalSub: {
    fontSize: scale(13),
    color: C.textSub,
    textAlign: 'center',
    lineHeight: scale(20),
    marginBottom: scale(16),
  },
  modalDivider: {
    width: '100%',
    height: 1,
    backgroundColor: '#eef6f7',
    marginBottom: scale(16),
  },
  modalStep: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    marginBottom: scale(10),
    gap: scale(12),
  },
  modalStepDot: {
    width: scale(26),
    height: scale(26),
    borderRadius: scale(13),
    backgroundColor: C.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalStepNum: {
    fontSize: scale(12),
    fontWeight: '800',
    color: C.primary,
  },
  modalStepText: {
    fontSize: scale(13),
    color: C.text,
    fontWeight: '500',
  },
  modalActions: {
    width: '100%',
    marginTop: scale(20),
    gap: scale(10),
  },
  modalBtnPrimary: {
    backgroundColor: C.primary,
    borderRadius: scale(14),
    paddingVertical: scale(14),
    alignItems: 'center',
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  modalBtnPrimaryText: {
    color: C.white,
    fontSize: scale(15),
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  modalBtnSecondary: {
    paddingVertical: scale(12),
    alignItems: 'center',
  },
  modalBtnSecondaryText: {
    color: C.textMuted,
    fontSize: scale(14),
    fontWeight: '600',
  },
});
