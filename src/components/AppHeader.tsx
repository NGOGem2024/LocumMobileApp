import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  StatusBar,
  useWindowDimensions,
  Platform,
  ScrollView,
  Modal,
  Pressable,
} from 'react-native';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';

// Using your Auth Context
import { useAuth } from '../context/AuthContext'; 

interface AppHeaderProps {
  screenName?: string;
  onBack?: () => void;
}

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
  danger: '#ef4444',
  dangerLight: '#fee2e2',
  grayLight: '#f3f4f6',
};

const AppHeader: React.FC<AppHeaderProps> = ({ screenName = '', onBack }) => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  
  // Auth variables
  const { isRegistered, doctor, logout } = useAuth();

  // Modal States
  const [isSidebarVisible, setSidebarVisible] = useState(false);
  const [guestModalVisible, setGuestModalVisible] = useState(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);

  const toggleSidebar = () => setSidebarVisible(!isSidebarVisible);

  const handleProfilePress = () => {
    if (doctor && isRegistered) {
      toggleSidebar(); 
    } else {
      setGuestModalVisible(true); 
    }
  };

  const navigateToScreen = (route: string) => {
    navigation.navigate(route);
    setSidebarVisible(false);
  };

  // ─── Custom Logout Logic ───
  const initiateLogout = () => {
    setSidebarVisible(false); // Close sidebar for a smooth transition
    setTimeout(() => {
      setLogoutModalVisible(true); // Open custom confirmation modal
    }, 150); // Slight delay prevents modal stacking flicker
  };

  const confirmLogout = async () => {
    setLogoutModalVisible(false);
    await logout();
    
    // Reset stack to DashboardScreen
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'DashboardScreen' }],
      })
    );
  };

  // Helper variables for profile
  const fullName = doctor ? `${doctor.first_name} ${doctor.last_name}` : 'Doctor';
  const initials = doctor
    ? `${doctor.first_name[0]}${doctor.last_name[0]}`.toUpperCase()
    : 'DR';

  return (
    <View style={{ zIndex: 1000 }}>
      {/* Status bar area */}
      <View style={{ backgroundColor: 'black', height: insets.top }} />

      {/* Main Header */}
      <View style={styles.header}>
        <StatusBar
          barStyle="light-content"
          backgroundColor="black"
          translucent={Platform.OS === 'android'}
        />

        {/* LEFT: Back Button & Logo */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack ? onBack : () => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
          <Image
            source={require('../assets/l.png')} 
            style={styles.logoImage}
            resizeMode="contain"
          />
          <Text style={styles.versionText}>v2.0</Text>
        </TouchableOpacity>

        {/* RIGHT: Screen Name & Profile Avatar */}
        <View style={styles.rightSection}>
          {screenName ? (
            <Text style={styles.screenNameText}>{screenName}</Text>
          ) : null}
          
          <TouchableOpacity style={styles.avatarBtn} onPress={handleProfilePress} activeOpacity={0.8}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            {doctor && <View style={styles.onlineDot} />}
          </TouchableOpacity>
        </View>
      </View>

      {/* ── SIDEBAR MODAL (For Authenticated Users) ── */}
      <Modal
        visible={isSidebarVisible}
        transparent
        animationType="fade"
        onRequestClose={toggleSidebar}
      >
        <Pressable style={styles.sidebarOverlay} onPress={toggleSidebar}>
          <Pressable style={[styles.sidebar, { width: width * 0.75 }]} onPress={() => {}}>
            {/* Sidebar Profile Header */}
            <View style={styles.sidebarHeader}>
              <View style={styles.userInfo}>
                <View style={[styles.avatar, { width: 44, height: 44, borderRadius: 22 }]}>
                  <Text style={[styles.avatarText, { fontSize: 16 }]}>{initials}</Text>
                </View>
                <View style={styles.userDetails}>
                  <Text style={styles.userName} numberOfLines={1}>{fullName}</Text>
                  <Text style={styles.userRole}>Doctor</Text>
                </View>
              </View>
              <TouchableOpacity onPress={toggleSidebar} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color="#0d2b30" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.menuContainer}>
              <TouchableOpacity style={styles.drawerItem} onPress={() => navigateToScreen('HomeScreen')}>
                <Ionicons name="grid-outline" size={22} color={C.primary} />
                <Text style={styles.drawerItemText}>Dashboard</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.drawerItem} onPress={() => navigateToScreen('ProfileScreen')}>
                <Ionicons name="person-outline" size={22} color={C.primary} />
                <Text style={styles.drawerItemText}>My Profile</Text>
              </TouchableOpacity>
            </ScrollView>

            {/* Pinned Bottom Section */}
            <View style={styles.bottomSection}>
              <TouchableOpacity
                style={styles.drawerItem}
                onPress={initiateLogout}
              >
                <Ionicons name="log-out-outline" size={22} color={C.danger} />
                <Text style={[styles.drawerItemText, styles.logoutText]}>Log Out</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── CUSTOM LOGOUT CONFIRMATION MODAL ── */}
      <Modal
        visible={logoutModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLogoutModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setLogoutModalVisible(false)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <View style={[styles.modalIconRing, { backgroundColor: C.dangerLight }]}>
              <Ionicons name="log-out-outline" size={32} color={C.danger} />
            </View>
            <Text style={styles.modalTitle}>Log Out</Text>
            <Text style={styles.modalSub}>
              Are you sure you want to securely log out of your account? You will need to sign in again to access your dashboard.
            </Text>
            
            <View style={styles.rowActions}>
              <TouchableOpacity
                style={[styles.modalBtnPrimary, styles.cancelBtn]}
                activeOpacity={0.8}
                onPress={() => setLogoutModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalBtnPrimary, styles.confirmLogoutBtn]}
                activeOpacity={0.8}
                onPress={confirmLogout}
              >
                <Text style={styles.modalBtnPrimaryText}>Log Out</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── GUEST MODAL (For Unauthenticated Users) ── */}
      <Modal
        visible={guestModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setGuestModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setGuestModalVisible(false)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <View style={styles.modalIconRing}>
              <Text style={styles.modalIcon}>🔒</Text>
            </View>
            <Text style={styles.modalTitle}>Registration Required</Text>
            <Text style={styles.modalSub}>
              Your profile is only accessible after completing your doctor registration. It takes less than 3 minutes!
            </Text>
            <View style={styles.modalDivider} />
            {['Complete your profile', 'Get verified in 24h', 'Access your dashboard'].map((step, i) => (
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
    </View>
  );
};

const styles = StyleSheet.create({
  // ── Header Structure ──
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 15,
    backgroundColor: C.primary,
    borderBottomWidth: 1,
    borderBottomColor: 'white',
    borderTopColor: 'white',
    borderTopWidth: 1,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: -5,
  },
  logoImage: {
    width: 90,
    height: 35,
    marginLeft: 5,
  },
  versionText: {
    position: 'absolute',
    bottom: -2,
    right: -15,
    color: '#FFFFFF',
    fontSize: 10,
    opacity: 0.8,
    fontWeight: 'bold',
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  screenNameText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
    marginRight: 10,
  },

  // ── Avatar ──
  avatarBtn: { position: 'relative' },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: C.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: C.primaryLight,
  },
  avatarText: {
    color: C.primary,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#00b894',
    borderWidth: 1.5,
    borderColor: C.white,
  },

  // ── Sidebar Drawer ──
  sidebarOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  sidebar: {
    backgroundColor: C.white,
    height: '100%',
    paddingTop: Platform.OS === 'ios' ? 40 : 20,
    paddingBottom: 20,
    borderTopLeftRadius: 24,
    borderBottomLeftRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: -5, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
  },
  sidebarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    marginBottom: 10,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userDetails: { marginLeft: 12, flex: 1 },
  userName: { fontSize: 16, fontWeight: '600', color: C.text },
  userRole: { fontSize: 13, color: C.textSub, marginTop: 2 },
  closeBtn: { padding: 4 },
  menuContainer: { paddingHorizontal: 16, paddingBottom: 20 },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  drawerItemText: { fontSize: 15, fontWeight: '500', color: C.text, marginLeft: 16 },
  bottomSection: {
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    marginTop: 'auto',
  },
  logoutText: { color: C.danger },

  // ── Shared Modal Styles ──
  modalOverlay: {
    flex: 1,
    backgroundColor: C.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    backgroundColor: C.white,
    borderRadius: 24,
    padding: 24,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 16,
  },
  modalIconRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: C.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  modalIcon: { fontSize: 28 },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: C.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSub: {
    fontSize: 13,
    color: C.textSub,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  modalDivider: {
    width: '100%',
    height: 1,
    backgroundColor: '#eef6f7',
    marginBottom: 16,
  },
  modalStep: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    marginBottom: 10,
    gap: 12,
  },
  modalStepDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: C.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalStepNum: { fontSize: 12, fontWeight: '800', color: C.primary },
  modalStepText: { fontSize: 13, color: C.text, fontWeight: '500' },
  
  // Custom Logout Actions
  rowActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginTop: 10,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: C.grayLight,
    shadowColor: 'transparent',
    elevation: 0,
  },
  cancelBtnText: {
    color: C.text,
    fontSize: 15,
    fontWeight: '700',
  },
  confirmLogoutBtn: {
    flex: 1,
    backgroundColor: C.danger,
    shadowColor: C.danger,
  },

  modalActions: { width: '100%', marginTop: 20, gap: 10 },
  modalBtnPrimary: {
    backgroundColor: C.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  modalBtnPrimaryText: {
    color: C.white,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  modalBtnSecondary: { paddingVertical: 12, alignItems: 'center' },
  modalBtnSecondaryText: { color: C.textMuted, fontSize: 14, fontWeight: '600' },
});

export default AppHeader;