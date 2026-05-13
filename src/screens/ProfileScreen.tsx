import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
  StatusBar,
  Animated,
  Switch,
  TextInput,
  Modal,
  Platform,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {
  useAuth,
  DoctorProfile,
  Experience,
  Reference,
} from '../context/AuthContext';
import ReactNativeBlobUtil from 'react-native-blob-util';

import { pick, types } from '@react-native-documents/picker';
import DateTimePicker from '@react-native-community/datetimepicker';

// ─── Constants ───────────────────────────────────────────────────────────────

const { width: SW } = Dimensions.get('window');
const scale = (size: number) => (SW / 390) * size;

const BASE_URL =
  'https://locumhtbe-h6fvftgnfudxc5hw.centralindia-01.azurewebsites.net';

const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const C = {
  primary: '#007b8e',
  primaryDark: '#005f6e',
  primaryDeep: '#003d4a',
  primaryLight: '#e0f5f8',
  primaryMid: '#b2e4ec',
  accent: '#00c9e0',
  accentGreen: '#00b894',
  white: '#ffffff',
  offWhite: '#f7fdfe',
  bg: '#f0fbfc',
  text: '#0d2b30',
  textSub: '#3d6b75',
  textMuted: '#7aa8b0',
  border: '#c2e6ed',
  cardBg: '#ffffff',
  warning: '#f59e0b',
  error: '#e53935',
  inputBg: '#f9fdfe',
};

// ─── API Helpers ──────────────────────────────────────────────────────────────

const fetchDoctorProfile = async (token: string): Promise<DoctorProfile> => {
  const res = await fetch(`${BASE_URL}/api/doctors/show-profile`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || 'Failed to fetch profile');

  const profile = data?.doctor || data?.data || data;
  if (!profile?._id) throw new Error('Invalid profile data received');

  return profile;
};

const patchDoctorProfile = async (
  doctorId: string,
  token: string,
  body: Record<string, any>,
): Promise<DoctorProfile> => {
  const res = await fetch(
    `${BASE_URL}/api/doctors/complete-profile/${doctorId}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    },
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || 'Update failed');
  return data?.doctor || data?.data || data;
};

// ─── File Pickers ─────────────────────────────────────────────────────────────
const pickDocument = async () => {
  try {
    const res = await pick({
      type: [types.pdf],
    });

    return Array.isArray(res) ? res : [res];
  } catch (err) {
    console.log('Document Picker Error:', err);

    // Handle cancel safely
    if (
      err?.code === 'DOCUMENT_PICKER_CANCELED' ||
      err?.message?.includes('cancel')
    ) {
      return null;
    }

    throw err;
  }
};

const pickImage = async () => {
  try {
    const res = await pick({
      type: [types.images],
    });

    return Array.isArray(res) ? res : [res];
  } catch (err) {
    console.log('Image Picker Error:', err);

    // Handle cancel safely
    if (
      err?.code === 'DOCUMENT_PICKER_CANCELED' ||
      err?.message?.includes('cancel')
    ) {
      return null;
    }

    throw err;
  }
};

// ─── Core Upload via ReactNativeBlobUtil ──────────────────────────────────────
// fieldName must match multer field: "profile_pic" | "resume"

const uploadFileViaXHR = async (
  file: any,
  fieldName: 'profile_pic' | 'resume',
  doctorId: string,
  token: string,
): Promise<DoctorProfile> => {
  const mimeType: string =
    fieldName === 'profile_pic'
      ? file.type?.startsWith('image/')
        ? file.type
        : 'image/jpeg'
      : 'application/pdf';

  const fileName: string =
    file.name ||
    file.fileName ||
    (fieldName === 'profile_pic'
      ? `profile_${Date.now()}.jpg`
      : `resume_${Date.now()}.pdf`);

  const uri: string = file.uri || '';

  console.log('[Upload] Field:', fieldName);
  console.log('[Upload] URI:', uri);
  console.log('[Upload] MIME:', mimeType);
  console.log('[Upload] Name:', fileName);
  console.log('[Upload] DoctorId:', doctorId);

  const url = `${BASE_URL}/api/doctors/complete-profile/${doctorId}`;

  try {
    const response = await ReactNativeBlobUtil.fetch(
      'PATCH',
      url,
      {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        'Content-Type': 'multipart/form-data',
      },
      [
        {
          name: fieldName,
          filename: fileName,
          type: mimeType,
          data: ReactNativeBlobUtil.wrap(
            Platform.OS === 'android' ? uri : uri.replace('file://', ''),
          ),
        },
      ],
    );

    const statusCode = response.respInfo.status;
    const responseText = response.data;

    console.log('[Upload] HTTP status:', statusCode);
    console.log('[Upload] Response:', responseText?.slice(0, 300));

    if (statusCode >= 200 && statusCode < 300) {
      try {
        const data = JSON.parse(responseText);
        const updated = data?.doctor || data?.data || data;
        if (!updated?._id) {
          throw new Error('Server returned OK but no doctor object');
        }
        return updated as DoctorProfile;
      } catch (e) {
        throw new Error(
          `Could not parse server response: ${responseText?.slice(0, 100)}`,
        );
      }
    } else {
      throw new Error(
        `Server error ${statusCode}: ${responseText?.slice(0, 200)}`,
      );
    }
  } catch (err: any) {
    console.error('[Upload] ReactNativeBlobUtil error:', err);
    throw new Error(err?.message || '');
  }
};

const isValidPhone = (num: string) => /^[6-9]\d{9}$/.test(num);

// ─── SectionCard ─────────────────────────────────────────────────────────────

interface SectionCardProps {
  title: string;
  icon: string;
  children: React.ReactNode;
  onEdit?: () => void;
  onAdd?: () => void;
  addLabel?: string;
  addLoading?: boolean;
}

const SectionCard: React.FC<SectionCardProps> = ({
  title,
  icon,
  children,
  onEdit,
  onAdd,
  addLabel,
  addLoading,
}) => (
  <View style={sc.card}>
    <View style={sc.header}>
      <View style={sc.titleRow}>
        <View style={sc.iconBox}>
          <Text style={sc.icon}>{icon}</Text>
        </View>
        <Text style={sc.title}>{title}</Text>
      </View>
      <View style={sc.actions}>
        {onEdit && (
          <TouchableOpacity
            style={sc.editBtn}
            onPress={onEdit}
            activeOpacity={0.7}
          >
            <Text style={sc.editText}>✏️ Edit</Text>
          </TouchableOpacity>
        )}
        {onAdd && (
          <TouchableOpacity
            style={[sc.addBtn, addLoading && { opacity: 0.6 }]}
            onPress={addLoading ? undefined : onAdd}
            activeOpacity={0.7}
            disabled={addLoading}
          >
            {addLoading ? (
              <ActivityIndicator
                color={C.white}
                size="small"
                style={{ paddingHorizontal: scale(4) }}
              />
            ) : (
              <Text style={sc.addText}>+ {addLabel || 'Add'}</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
    <View style={sc.body}>{children}</View>
  </View>
);

const sc = StyleSheet.create({
  card: {
    backgroundColor: C.cardBg,
    borderRadius: scale(20),
    marginBottom: scale(14),
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 3,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(16),
    paddingVertical: scale(14),
    borderBottomWidth: 1,
    borderBottomColor: '#f0fbfc',
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: scale(10) },
  iconBox: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(10),
    backgroundColor: C.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: { fontSize: scale(15) },
  title: {
    fontSize: scale(15),
    fontWeight: '800',
    color: C.text,
    letterSpacing: 0.2,
  },
  actions: { flexDirection: 'row', gap: scale(8) },
  editBtn: {
    backgroundColor: C.primaryLight,
    borderRadius: scale(10),
    paddingHorizontal: scale(10),
    paddingVertical: scale(5),
  },
  editText: { fontSize: scale(11), color: C.primary, fontWeight: '700' },
  addBtn: {
    backgroundColor: C.primary,
    borderRadius: scale(10),
    paddingHorizontal: scale(10),
    paddingVertical: scale(5),
    minWidth: scale(60),
    alignItems: 'center',
    justifyContent: 'center',
  },
  addText: { fontSize: scale(11), color: C.white, fontWeight: '700' },
  body: { padding: scale(16) },
});

// ─── InfoRow ─────────────────────────────────────────────────────────────────

const InfoRow: React.FC<{ label: string; value?: string; icon?: string }> = ({
  label,
  value,
  icon,
}) => (
  <View style={ir.row}>
    <Text style={ir.label}>{label}</Text>
    <Text style={ir.value}>
      {icon ? `${icon} ` : ''}
      {value || '—'}
    </Text>
  </View>
);

const ir = StyleSheet.create({
  row: { marginBottom: scale(12) },
  label: {
    fontSize: scale(10),
    color: C.textMuted,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  value: { fontSize: scale(14), color: C.text, fontWeight: '500' },
});

// ─── Pill ─────────────────────────────────────────────────────────────────────

const Pill: React.FC<{ text: string }> = ({ text }) => (
  <View style={pill.wrap}>
    <Text style={pill.text}>{text}</Text>
  </View>
);

const pill = StyleSheet.create({
  wrap: {
    backgroundColor: C.primaryLight,
    borderRadius: scale(20),
    paddingHorizontal: scale(12),
    paddingVertical: scale(5),
    borderWidth: 1,
    borderColor: C.primaryMid,
    marginRight: scale(8),
    marginBottom: scale(8),
  },
  text: { fontSize: scale(12), color: C.primary, fontWeight: '700' },
});

// ─── StatusBadge ─────────────────────────────────────────────────────────────

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const colorMap: Record<string, string> = {
    pending: C.warning,
    approved: C.accentGreen,
    rejected: C.error,
  };
  const color = colorMap[status?.toLowerCase()] || C.textMuted;
  return (
    <View
      style={[sb.wrap, { backgroundColor: color + '20', borderColor: color }]}
    >
      <View style={[sb.dot, { backgroundColor: color }]} />
      <Text style={[sb.text, { color }]}>
        {status?.toUpperCase() || 'UNKNOWN'}
      </Text>
    </View>
  );
};

const sb = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: scale(20),
    paddingHorizontal: scale(10),
    paddingVertical: scale(4),
    borderWidth: 1,
    gap: scale(5),
  },
  dot: { width: scale(6), height: scale(6), borderRadius: scale(3) },
  text: { fontSize: scale(10), fontWeight: '800', letterSpacing: 1 },
});

// ─── ProfileAvatar ────────────────────────────────────────────────────────────
// Dedicated component that handles: local preview → server URL → initials fallback

interface ProfileAvatarProps {
  localUri: string | null;
  serverUrl?: string;
  initials: string;
  uploading: boolean;
  isVerified: boolean;
  onPress: () => void;
}

const ProfileAvatar: React.FC<ProfileAvatarProps> = ({
  localUri,
  serverUrl,
  initials,
  uploading,
  isVerified,
  onPress,
}) => {
  // Priority: localUri (instant preview) → serverUrl (after upload success) → initials
  const imageUri = localUri || serverUrl || null;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      disabled={uploading}
      style={styles.avatarRing}
    >
      {uploading ? (
        // Show spinner over whatever was there before
        <View style={styles.avatar}>
          {imageUri ? (
            <Image
              source={{ uri: imageUri }}
              style={[styles.avatar, { opacity: 0.5 }]}
              resizeMode="cover"
            />
          ) : (
            <Text style={styles.avatarText}>{initials}</Text>
          )}
          <View style={styles.avatarUploadOverlay}>
            <ActivityIndicator color={C.white} size="large" />
            <Text style={styles.avatarUploadText}>Uploading…</Text>
          </View>
        </View>
      ) : imageUri ? (
        <Image
          source={{ uri: imageUri }}
          style={styles.avatar}
          resizeMode="cover"
          onError={() => {
            // Image load error is silently ignored; fallback to initials handled
            // by clearing the URI at the component level if needed
            console.warn('[ProfileAvatar] Failed to load image:', imageUri);
          }}
        />
      ) : (
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
      )}

      {/* Camera badge — always visible so user knows it's tappable */}
      <View style={styles.cameraBadge}>
        <Text style={{ fontSize: scale(10) }}>📷</Text>
      </View>

      {/* Verified tick */}
      {isVerified && (
        <View style={styles.verifiedBadge}>
          <Text style={styles.verifiedTick}>✓</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

// ─── EditModal ────────────────────────────────────────────────────────────────

interface EditField {
  key: string;
  label: string;
  value: string;
  keyboardType?: 'default' | 'numeric' | 'email-address' | 'phone-pad';
  multiline?: boolean;
  placeholder?: string;
}

interface EditModalProps {
  visible: boolean;
  title: string;
  fields: EditField[];
  onClose: () => void;
  onSave: (data: Record<string, string>) => void;
  loading?: boolean;
}

const EditModal: React.FC<EditModalProps> = ({
  visible,
  title,
  fields,
  onClose,
  onSave,
  loading,
}) => {
  const [vals, setVals] = useState<Record<string, string>>({});
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [activeDateKey, setActiveDateKey] = useState<string | null>(null);

  const onChangeDate = (_: any, selected?: Date) => {
    setShowDatePicker(false);
    if (selected && activeDateKey) {
      const iso = selected.toISOString().slice(0, 10);
      setVals(prev => ({ ...prev, [activeDateKey]: iso }));
    }
  };

  useEffect(() => {
    const init: Record<string, string> = {};
    fields.forEach(f => {
      init[f.key] = f.value;
    });
    setVals(init);
  }, [fields, visible]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={em.overlay}>
        <View style={em.sheet}>
          <View style={em.handle} />
          <Text style={em.title}>{title}</Text>
          <ScrollView
            showsVerticalScrollIndicator={false}
            style={{ maxHeight: scale(420) }}
            keyboardShouldPersistTaps="handled"
          >
            {fields.map(f => (
              <View key={f.key} style={em.fieldWrap}>
                <Text style={em.label}>{f.label}</Text>
                {f.key.toLowerCase().includes('date') ? (
                  <TouchableOpacity
                    style={[
                      em.input,
                      {
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingRight: scale(10),
                      },
                    ]}
                    onPress={() => {
                      setActiveDateKey(f.key);
                      setShowDatePicker(true);
                    }}
                  >
                    <Text
                      numberOfLines={1}
                      style={{
                        flex: 1,
                        color: vals[f.key] ? C.text : C.textMuted,
                        fontSize: scale(14),
                      }}
                    >
                      {vals[f.key] || f.placeholder || 'Select date'}
                    </Text>
                    <Text style={{ marginLeft: scale(8), fontSize: scale(16) }}>
                      📅
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <TextInput
                    style={[
                      em.input,
                      f.multiline && {
                        height: scale(80),
                        textAlignVertical: 'top',
                      },
                    ]}
                    value={vals[f.key] ?? ''}
                    onChangeText={v => {
                      if (
                        f.key === 'alternate_mobile_number' ||
                        f.key === 'ref_contact_no'
                      ) {
                        const cleaned = v.replace(/[^0-9]/g, '');
                        setVals(p => ({ ...p, [f.key]: cleaned.slice(0, 10) }));
                      } else {
                        setVals(p => ({ ...p, [f.key]: v }));
                      }
                    }}
                    keyboardType={f.keyboardType || 'default'}
                    multiline={f.multiline}
                    placeholder={f.placeholder || ''}
                    placeholderTextColor={C.textMuted}
                  />
                )}
              </View>
            ))}
          </ScrollView>
          {showDatePicker && (
            <DateTimePicker
              value={new Date()}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onChangeDate}
            />
          )}
          <View style={em.btns}>
            <TouchableOpacity
              style={em.cancelBtn}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={em.cancelTxt}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[em.saveBtn, loading && { opacity: 0.6 }]}
              onPress={() => onSave(vals)}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color={C.white} size="small" />
              ) : (
                <Text style={em.saveTxt}>Save Changes</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const em = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,30,35,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: C.white,
    borderTopLeftRadius: scale(24),
    borderTopRightRadius: scale(24),
    padding: scale(20),
    paddingBottom: Platform.OS === 'ios' ? 36 : scale(24),
  },
  handle: {
    width: scale(40),
    height: 4,
    borderRadius: 2,
    backgroundColor: C.border,
    alignSelf: 'center',
    marginBottom: scale(16),
  },
  title: {
    fontSize: scale(17),
    fontWeight: '800',
    color: C.text,
    marginBottom: scale(16),
  },
  fieldWrap: { marginBottom: scale(14) },
  label: {
    fontSize: scale(12),
    fontWeight: '700',
    color: C.textSub,
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  input: {
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: scale(12),
    paddingHorizontal: scale(14),
    paddingVertical: scale(10),
    fontSize: scale(14),
    color: C.text,
    backgroundColor: C.inputBg,
  },
  btns: { flexDirection: 'row', gap: scale(10), marginTop: scale(16) },
  cancelBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: scale(12),
    paddingVertical: scale(14),
    alignItems: 'center',
  },
  cancelTxt: { color: C.textSub, fontWeight: '700', fontSize: scale(14) },
  saveBtn: {
    flex: 2,
    backgroundColor: C.primary,
    borderRadius: scale(12),
    paddingVertical: scale(14),
    alignItems: 'center',
  },
  saveTxt: { color: C.white, fontWeight: '800', fontSize: scale(14) },
});

// ─── Modal State ──────────────────────────────────────────────────────────────

interface ModalState {
  visible: boolean;
  title: string;
  fields: EditField[];
  onSave: (data: Record<string, string>) => void;
}

const MODAL_CLOSED: ModalState = {
  visible: false,
  title: '',
  fields: [],
  onSave: () => {},
};

// ─── Main Screen ──────────────────────────────────────────────────────────────

const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const {
    doctor: authDoctor,
    token,
    setDoctor: setAuthDoctor,
    logout,
  } = useAuth();

  const [profile, setProfile] = useState<DoctorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [uploadingProfilePic, setUploadingProfilePic] = useState(false);
  const [uploadingCert, setUploadingCert] = useState(false);

  const [modalState, setModalState] = useState<ModalState>(MODAL_CLOSED);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // ── Profile picture preview state ────────────────────────────────────────
  // localProfilePicUri: set immediately on file pick for instant preview.
  // Cleared to null once the server responds with a confirmed URL, so the
  // component falls back to profile.profile_pic_url (the authoritative value).
  const [localProfilePicUri, setLocalProfilePicUri] = useState<string | null>(
    null,
  );

  // ─── Logout ───────────────────────────────────────────────────────────────

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: () => {
            logout();
            navigation.reset({ index: 0, routes: [{ name: 'LoginScreen' }] });
          },
        },
      ],
      { cancelable: true },
    );
  };

  // ─── Fetch Profile ────────────────────────────────────────────────────────

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    try {
      if (!token) throw new Error('Session expired. Please login again.');
      const doctor = await fetchDoctorProfile(token);
      setProfile(doctor);
      setAuthDoctor(doctor);
      // Clear any local preview when we fetch fresh data — server URL is now authoritative
      setLocalProfilePicUri(null);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }).start();
    } catch (err: any) {
      const isAuthError = ['token', 'session', 'unauthorized', 'expired'].some(
        k => err.message?.toLowerCase().includes(k),
      );
      if (isAuthError) {
        Alert.alert('Session Expired', 'Please login again.', [
          {
            text: 'OK',
            onPress: () => {
              logout();
              navigation.reset({ index: 0, routes: [{ name: 'LoginScreen' }] });
            },
          },
        ]);
        return;
      }
      Alert.alert('Error', err.message || 'Failed to load profile.', [
        { text: 'Retry', onPress: fetchProfile },
      ]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // ─── Update Profile (JSON PATCH) ──────────────────────────────────────────

  const updateProfile = async (body: Record<string, any>) => {
    if (!profile || !token) return;
    if (
      body.alternate_mobile_number &&
      !isValidPhone(body.alternate_mobile_number)
    ) {
      Alert.alert('Invalid Phone', 'Enter valid 10-digit mobile number');
      return;
    }
    setSaving(true);
    try {
      const updated = await patchDoctorProfile(profile._id, token, body);
      setProfile(updated);
      setAuthDoctor(updated);
      setModalState(MODAL_CLOSED);
    } catch (err: any) {
      Alert.alert('Update Failed', err.message || 'Could not update profile.');
    } finally {
      setSaving(false);
    }
  };

  // ─── Upload Profile Picture ───────────────────────────────────────────────
  //
  // Flow:
  //  1. User picks image  →  setLocalProfilePicUri(file.uri)  →  instant avatar preview
  //  2. Upload starts     →  uploadingProfilePic = true        →  spinner overlay on avatar
  //  3a. Upload success   →  setProfile(updated)               →  profile.profile_pic_url is now set
  //                          setLocalProfilePicUri(null)        →  drop local URI; use server URL
  //  3b. Upload failure   →  setLocalProfilePicUri(null)        →  revert to previous state

  const handleUploadProfilePic = async () => {
    if (!token || !profile) {
      Alert.alert('Error', 'Session expired.');
      return;
    }

    try {
      const result = await pick({
        type: [types.images],
      });

      // User cancelled picker
      if (!result) {
        return;
      }

      const file = Array.isArray(result) ? result[0] : result;

      // No file selected
      if (!file?.uri) {
        return;
      }

      setLocalProfilePicUri(file.uri);
      setUploadingProfilePic(true);

      const updated = await uploadFileViaXHR(
        file,
        'profile_pic',
        profile._id,
        token,
      );

      setProfile(updated);
      setAuthDoctor(updated);
      setLocalProfilePicUri(null);

      Alert.alert('Success', 'Profile picture updated successfully');
    } catch (err: any) {
      console.log('PROFILE PICKER ERROR:', err);

      // Ignore cancel event completely
      if (
        err?.code === 'DOCUMENT_PICKER_CANCELED' ||
        err?.message?.toLowerCase()?.includes('cancel')
      ) {
        return;
      }

      setLocalProfilePicUri(null);

      Alert.alert(
        'Upload Failed',
        err?.message || 'Could not upload profile picture.',
      );
    } finally {
      setUploadingProfilePic(false);
    }
  };

  // ─── Upload Resume ────────────────────────────────────────────────────────

  const handleUploadResume = async () => {
    if (!token || !profile) {
      Alert.alert('Error', 'Session expired.');
      return;
    }
    try {
      const files = await pickDocument();
      if (!files || files.length === 0) return;

      const file = files[0];
      console.log('[Resume] Picked file:', JSON.stringify(file));
      setUploadingResume(true);

      const updated = await uploadFileViaXHR(
        file,
        'resume',
        profile._id,
        token,
      );
      setProfile(updated);
      setAuthDoctor(updated);
      Alert.alert('Success', 'Resume uploaded successfully');
    } catch (err: any) {
      console.error('[Resume] Error:', err.message);
      Alert.alert('Upload Failed', err.message || 'Could not upload resume.');
    } finally {
      setUploadingResume(false);
    }
  };

  // ─── Upload Certificate ───────────────────────────────────────────────────

  const handleAddCertificate = async () => {
    Alert.alert('Coming Soon', 'Certificate upload will be available soon.');
  };

  // ─── Toggle Helpers ───────────────────────────────────────────────────────

  const toggleDay = (day: string) => {
    if (!profile) return;
    const days = profile.available_days || [];
    const updated = days.includes(day)
      ? days.filter(d => d !== day)
      : [...days, day];
    updateProfile({ available_days: updated });
  };

  const toggleSwitch = (
    key:
      | 'open_for_consultation'
      | 'open_for_duty_doctorship'
      | 'open_for_shift',
  ) => {
    if (!profile) return;
    updateProfile({ [key]: !profile[key] });
  };

  // ─── Modal Openers ────────────────────────────────────────────────────────

  const openPersonalEdit = () => {
    if (!profile) return;
    setModalState({
      visible: true,
      title: 'Edit Personal Details',
      fields: [
        {
          key: 'date_of_birth',
          label: 'Date of Birth',
          value: profile.date_of_birth?.slice(0, 10) || '',
          placeholder: 'YYYY-MM-DD',
        },
        {
          key: 'gender',
          label: 'Gender',
          value: profile.gender || '',
          placeholder: 'Male / Female / Other',
        },
        {
          key: 'alternate_mobile_number',
          label: 'Alternate Mobile',
          value: profile.alternate_mobile_number || '',
          keyboardType: 'phone-pad',
          placeholder: '10-digit number',
        },
        {
          key: 'address_line2',
          label: 'Address Line 2',
          value: profile.address_line2 || '',
          placeholder: 'Near landmark, area...',
        },
        {
          key: 'current_clinic_hospital_name',
          label: 'Current Clinic / Hospital',
          value: profile.current_clinic_hospital_name || '',
          placeholder: 'Hospital or clinic name',
        },
      ],
      onSave: data => updateProfile(data),
    });
  };

  const openExperienceEdit = (exp?: Experience, idx?: number) => {
    const e = exp || {
      years_of_experience: 0,
      clinic_hospital_name: '',
      designation: '',
      is_current: false,
    };
    setModalState({
      visible: true,
      title: idx !== undefined ? 'Edit Experience' : 'Add Experience',
      fields: [
        {
          key: 'clinic_hospital_name',
          label: 'Clinic / Hospital Name',
          value: e.clinic_hospital_name,
          placeholder: 'e.g. City Hospital',
        },
        {
          key: 'designation',
          label: 'Designation',
          value: e.designation,
          placeholder: 'e.g. Junior Doctor',
        },
        {
          key: 'years_of_experience',
          label: 'Years of Experience',
          value: String(e.years_of_experience),
          keyboardType: 'numeric',
          placeholder: 'e.g. 2',
        },
        {
          key: 'start_date',
          label: 'Start Date',
          value: e.start_date?.slice(0, 10) || '',
          placeholder: 'YYYY-MM-DD',
        },
      ],
      onSave: data => {
        const newExp: Experience = {
          clinic_hospital_name: data.clinic_hospital_name,
          designation: data.designation,
          years_of_experience: Number(data.years_of_experience) || 0,
          start_date: data.start_date || undefined,
          is_current: idx === 0 || !profile?.experience?.length,
        };
        const existing = profile?.experience || [];
        const updated =
          idx !== undefined
            ? existing.map((ex, i) => (i === idx ? { ...ex, ...newExp } : ex))
            : [...existing, newExp];
        updateProfile({ experience: updated });
      },
    });
  };

  const openReferenceEdit = (ref?: Reference, idx?: number) => {
    const r = ref || {
      ref_name: '',
      ref_email: '',
      ref_contact_no: '',
      ref_profession: '',
    };
    setModalState({
      visible: true,
      title: idx !== undefined ? 'Edit Reference' : 'Add Reference',
      fields: [
        {
          key: 'ref_name',
          label: 'Full Name',
          value: r.ref_name,
          placeholder: 'Dr. Name',
        },
        {
          key: 'ref_profession',
          label: 'Profession',
          value: r.ref_profession,
          placeholder: 'e.g. Senior Physician',
        },
        {
          key: 'ref_email',
          label: 'Email',
          value: r.ref_email,
          keyboardType: 'email-address',
          placeholder: 'doctor@example.com',
        },
        {
          key: 'ref_contact_no',
          label: 'Contact Number',
          value: r.ref_contact_no,
          keyboardType: 'phone-pad',
          placeholder: '10-digit number',
        },
      ],
      onSave: data => {
        if (data.ref_contact_no && !isValidPhone(data.ref_contact_no)) {
          Alert.alert('Invalid Phone', 'Enter valid reference number');
          return;
        }
        const existing = profile?.references || [];
        const updated =
          idx !== undefined
            ? existing.map((r2, i) => (i === idx ? { ...r2, ...data } : r2))
            : [...existing, data];
        updateProfile({ references: updated });
      },
    });
  };

  const openPreferencesEdit = () => {
    if (!profile) return;
    setModalState({
      visible: true,
      title: 'Edit Work Preferences',
      fields: [
        {
          key: 'preferred_distance_km',
          label: 'Preferred Distance (km)',
          value: String(profile.preferred_distance_km || ''),
          keyboardType: 'numeric',
          placeholder: 'e.g. 10',
        },
        {
          key: 'preferred_pincode',
          label: 'Preferred Pincode',
          value: profile.preferred_pincode || '',
          keyboardType: 'numeric',
          placeholder: 'e.g. 422003',
        },
      ],
      onSave: data =>
        updateProfile({
          preferred_distance_km:
            Number(data.preferred_distance_km) || profile.preferred_distance_km,
          preferred_pincode: data.preferred_pincode,
        }),
    });
  };

  const openEducationEdit = (edu?: any, idx?: number) => {
    const e = edu || {
      degree: '',
      speciality: '',
      university: '',
      pass_out_year: '',
    };
    setModalState({
      visible: true,
      title: idx !== undefined ? 'Edit Education' : 'Add Education',
      fields: [
        { key: 'degree', label: 'Degree', value: e.degree },
        { key: 'speciality', label: 'Speciality', value: e.speciality },
        { key: 'university', label: 'University', value: e.university },
        {
          key: 'pass_out_year',
          label: 'Year',
          value: String(e.pass_out_year),
          keyboardType: 'numeric',
        },
      ],
      onSave: data => {
        const existing = profile?.education || [];
        const updated =
          idx !== undefined
            ? existing.map((ed, i) => (i === idx ? { ...ed, ...data } : ed))
            : [...existing, data];
        updateProfile({ education: updated });
      },
    });
  };

  // ─── Helpers ──────────────────────────────────────────────────────────────

  const formatDate = (iso?: string) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  // ─── Loading / Empty States ───────────────────────────────────────────────

  if (loading) {
    return (
      <SafeAreaView style={styles.root}>
        <StatusBar barStyle="light-content" backgroundColor={C.primaryDeep} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={C.primary} />
          <Text style={styles.loadingText}>Loading your profile…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.centered}>
          <Text style={{ fontSize: scale(40) }}>😕</Text>
          <Text style={styles.loadingText}>Profile not found</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchProfile}>
            <Text style={styles.retryTxt}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ─── Derived ──────────────────────────────────────────────────────────────

  const fullName = [
    profile.prefix,
    profile.first_name,
    profile.middle_name,
    profile.last_name,
  ]
    .filter(Boolean)
    .join(' ');
  const initials = `${profile.first_name?.[0] || ''}${
    profile.last_name?.[0] || ''
  }`.toUpperCase();

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor={C.primaryDeep} />

      {/* HEADER */}
      <View style={styles.headerBar}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          activeOpacity={0.6}
        >
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Clinical Portfolio</Text>
        <TouchableOpacity
          onPress={fetchProfile}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          activeOpacity={0.6}
        >
          <Text style={{ fontSize: scale(18), color: 'rgba(255,255,255,0.7)' }}>
            ↻
          </Text>
        </TouchableOpacity>
      </View>

      <Animated.ScrollView
        style={{ opacity: fadeAnim }}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── HERO CARD ── */}
        <View style={styles.heroCard}>
          <View style={styles.heroBlob1} />
          <View style={styles.heroBlob2} />
          <View style={styles.heroContent}>
            {/* ── PROFILE AVATAR (with instant preview) ── */}
            <ProfileAvatar
              localUri={localProfilePicUri}
              serverUrl={profile.profile_pic_url}
              initials={initials}
              uploading={uploadingProfilePic}
              isVerified={!!profile.is_verified}
              onPress={handleUploadProfilePic}
            />

            <Text style={styles.heroName}>{fullName}</Text>
            <Text style={styles.heroSpec}>
              {profile.education?.[0]?.speciality || 'Medical Professional'}
            </Text>
            <Text style={styles.heroId}>{profile.doctor_unique_id}</Text>
            <View style={styles.heroBadgeRow}>
              <StatusBadge status={profile.approval_status} />
              {profile.is_profile_complete && (
                <View style={styles.completePill}>
                  <Text style={styles.completePillText}>
                    ✅ Profile Complete
                  </Text>
                </View>
              )}
            </View>
          </View>
          <View style={styles.statsStrip}>
            {[
              {
                val: profile.experience?.length
                  ? `${profile.experience[0].years_of_experience}+ yrs`
                  : '—',
                label: 'Experience',
              },
              {
                val: profile.preferred_distance_km
                  ? `${profile.preferred_distance_km} km`
                  : '—',
                label: 'Radius',
              },
            ].map((s, i) => (
              <React.Fragment key={i}>
                <View style={styles.statItem}>
                  <Text style={styles.statVal}>{s.val}</Text>
                  <Text style={styles.statLbl}>{s.label}</Text>
                </View>
                {i < 1 && <View style={styles.statDivider} />}
              </React.Fragment>
            ))}
          </View>
        </View>

        {/* ── PERSONAL DETAILS ── */}
        <SectionCard
          title="Personal Details"
          icon="👤"
          onEdit={openPersonalEdit}
        >
          <View style={styles.twoCol}>
            <View style={styles.col}>
              <InfoRow label="Full Name" value={fullName} />
              <InfoRow
                label="Date of Birth"
                value={formatDate(profile.date_of_birth)}
              />
              <InfoRow label="Gender" value={profile.gender} />
              <InfoRow
                label="Phone"
                value={`+91 ${profile.mobile_number}`}
                icon="📱"
              />
              {profile.alternate_mobile_number && (
                <InfoRow
                  label="Alt. Phone"
                  value={profile.alternate_mobile_number}
                  icon="📱"
                />
              )}
            </View>
            <View style={styles.col}>
              <InfoRow label="Email" value={profile.email} icon="✉️" />
              <InfoRow
                label="Medical Council"
                value={profile.medical_council_name}
              />
            </View>
          </View>
          <View style={styles.divider} />
          <InfoRow
            label="Location"
            value={`${profile.city_district}, ${profile.state} — ${profile.current_location_pincode}`}
            icon="📍"
          />
          {profile.address_line1 && (
            <InfoRow
              label="Address"
              value={[profile.address_line1, profile.address_line2]
                .filter(Boolean)
                .join(', ')}
            />
          )}
          {profile.current_clinic_hospital_name && (
            <InfoRow
              label="Current Clinic/Hospital"
              value={profile.current_clinic_hospital_name}
              icon="🏥"
            />
          )}
        </SectionCard>

        {/* ── EDUCATION ── */}
        <SectionCard
          title="Education & Qualifications"
          icon="🎓"
          onAdd={() => openEducationEdit()}
          addLabel="Education"
        >
          {profile.education?.length ? (
            profile.education.map((edu, i) => (
              <View
                key={edu._id || i}
                style={[styles.expCard, i > 0 && styles.expCardBorder]}
              >
                <View style={styles.expIconCol}>
                  <View style={styles.expIcon}>
                    <Text style={{ fontSize: scale(16) }}>🏫</Text>
                  </View>
                </View>
                <View style={styles.expBody}>
                  <Text style={styles.expTitle}>
                    {edu.degree === 'Other' ? edu.specify_degree : edu.degree}
                  </Text>
                  <Text style={styles.expSub}>{edu.speciality}</Text>
                  {edu.university && (
                    <Text style={styles.expMeta}>{edu.university}</Text>
                  )}
                  {edu.pass_out_year && (
                    <Text style={styles.expDate}>
                      Passed out: {edu.pass_out_year}
                    </Text>
                  )}
                </View>
                <TouchableOpacity
                  style={styles.expEditBtn}
                  onPress={() => openEducationEdit(edu, i)}
                >
                  <Text style={{ fontSize: scale(14) }}>✏️</Text>
                </TouchableOpacity>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>
              No education records added. Tap + to add education.
            </Text>
          )}
        </SectionCard>

        {/* ── EXPERIENCE ── */}
        <SectionCard
          title="Clinical Experience"
          icon="🏥"
          onAdd={() => openExperienceEdit()}
          addLabel="Experience"
        >
          {profile.experience?.length ? (
            profile.experience.map((exp, i) => (
              <View
                key={exp._id || i}
                style={[styles.expCard, i > 0 && styles.expCardBorder]}
              >
                <View style={styles.expIconCol}>
                  <View style={styles.expIcon}>
                    <Text style={{ fontSize: scale(16) }}>🏨</Text>
                  </View>
                </View>
                <View style={styles.expBody}>
                  <View style={styles.expTitleRow}>
                    <Text style={styles.expTitle}>
                      {exp.clinic_hospital_name}
                    </Text>
                    {exp.is_current && (
                      <View style={styles.currentBadge}>
                        <Text style={styles.currentBadgeTxt}>CURRENT</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.expSub}>{exp.designation}</Text>
                  <Text style={styles.expDate}>
                    {exp.start_date ? `${formatDate(exp.start_date)} → ` : ''}
                    {exp.is_current ? 'Present' : ''}
                  </Text>
                  <Text style={styles.expMeta}>
                    {exp.years_of_experience} yrs experience
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.expEditBtn}
                  onPress={() => openExperienceEdit(exp, i)}
                  activeOpacity={0.7}
                >
                  <Text style={{ fontSize: scale(14) }}>✏️</Text>
                </TouchableOpacity>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>No experience added yet</Text>
          )}
        </SectionCard>

        {/* ── REFERENCES ── */}
        <SectionCard
          title="Professional References"
          icon="🤝"
          onAdd={() => openReferenceEdit()}
          addLabel="Reference"
        >
          {profile.references?.length ? (
            <View style={styles.refGrid}>
              {profile.references.map((ref, i) => (
                <View key={ref._id || i} style={styles.refCard}>
                  <View style={styles.refAvatar}>
                    <Text style={{ fontSize: scale(18) }}>👨‍⚕️</Text>
                  </View>
                  <Text style={styles.refName}>{ref.ref_name}</Text>
                  <Text style={styles.refProfession}>{ref.ref_profession}</Text>
                  <View style={styles.refDivider} />
                  <Text style={styles.refMeta}>✉️ {ref.ref_email}</Text>
                  <Text style={styles.refMeta}>📱 {ref.ref_contact_no}</Text>
                  <TouchableOpacity
                    style={styles.refEditBtn}
                    onPress={() => openReferenceEdit(ref, i)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.refEditTxt}>✏️ Edit</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.emptyText}>No references added yet</Text>
          )}
        </SectionCard>

        {/* ── CERTIFICATES ── */}
        <SectionCard
          title="Certificates"
          icon="📜"
          onAdd={handleAddCertificate}
          addLabel="Certificate"
          addLoading={uploadingCert}
        >
          {profile?.certificates?.length ? (
            profile.certificates.map((c, i) => (
              <View key={i} style={styles.certRow}>
                <View style={styles.certIcon}>
                  <Text style={{ fontSize: scale(16) }}>📄</Text>
                </View>
                <Text style={styles.certLink} numberOfLines={1}>{`Certificate ${
                  i + 1
                }`}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>No certificates uploaded yet.</Text>
          )}
        </SectionCard>

        {/* ── AVAILABILITY ── */}
        <SectionCard title="Availability Status" icon="📅">
          <Text style={styles.prefLabel}>Available Days</Text>
          <View style={styles.daysRow}>
            {DAYS_OF_WEEK.map(day => {
              const active = profile.available_days?.includes(day);
              return (
                <TouchableOpacity
                  key={day}
                  style={[styles.dayBtn, active && styles.dayBtnOn]}
                  onPress={() => toggleDay(day)}
                  activeOpacity={0.7}
                  disabled={saving}
                >
                  <Text style={[styles.dayTxt, active && styles.dayTxtOn]}>
                    {day}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <View style={styles.divider} />
          {(
            [
              {
                key: 'open_for_consultation' as const,
                label: 'Open for Consultation',
                icon: '💊',
              },
              {
                key: 'open_for_duty_doctorship' as const,
                label: 'Open for Duty Doctorship',
                icon: '🩺',
              },
              {
                key: 'open_for_shift' as const,
                label: 'Open for Shift',
                icon: '🕐',
              },
            ] as const
          ).map(({ key, label, icon }) => (
            <View key={key} style={styles.toggleRow}>
              <View style={styles.toggleLeft}>
                <Text style={styles.toggleIcon}>{icon}</Text>
                <Text style={styles.toggleLabel}>{label}</Text>
              </View>
              <Switch
                value={!!profile[key]}
                onValueChange={() => toggleSwitch(key)}
                trackColor={{ false: C.border, true: C.primaryMid }}
                thumbColor={profile[key] ? C.primary : C.white}
                ios_backgroundColor={C.border}
                disabled={saving}
              />
            </View>
          ))}
        </SectionCard>

        {/* ── WORK PREFERENCES ── */}
        <SectionCard
          title="Work Preferences"
          icon="🎯"
          onEdit={openPreferencesEdit}
        >
          <Text style={styles.prefLabel}>Interested In</Text>
          <View style={styles.pillsRow}>
            {profile.interested_in?.map((item, i) => (
              <Pill key={i} text={item} />
            ))}
          </View>
          <View style={styles.divider} />
          <InfoRow
            label="Preferred Distance"
            value={`${profile.preferred_distance_km} km radius`}
            icon="📍"
          />
          {profile.preferred_pincode && (
            <InfoRow
              label="Preferred Pincode"
              value={profile.preferred_pincode}
              icon="📮"
            />
          )}
        </SectionCard>

        {/* ── CLINICAL DOCUMENTS ── */}
        <SectionCard title="Documents" icon="📄">
          {/* Resume */}
          <View style={styles.docRow}>
            <View style={styles.docIcon}>
              <Text style={{ fontSize: scale(20) }}>📋</Text>
            </View>
            <View style={styles.docBody}>
              <Text style={styles.docLabel}>Resume / CV</Text>
              {profile.resume_url ? (
                <Text style={styles.docLink} numberOfLines={1}>
                  {profile.resume_url}
                </Text>
              ) : (
                <Text style={styles.docEmpty}>No resume uploaded</Text>
              )}
            </View>
            <TouchableOpacity
              style={[styles.docUploadBtn, uploadingResume && { opacity: 0.6 }]}
              onPress={uploadingResume ? undefined : handleUploadResume}
              disabled={uploadingResume}
              activeOpacity={0.75}
            >
              {uploadingResume ? (
                <ActivityIndicator color={C.white} size="small" />
              ) : (
                <Text style={styles.docUploadTxt}>Upload</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.divider} />

          {/* Profile Picture document row */}
          <View style={styles.docRow}>
            <View style={styles.docIcon}>
              {/* Mini preview of the profile picture in the docs section */}
              {localProfilePicUri || profile.profile_pic_url ? (
                <Image
                  source={{
                    uri: localProfilePicUri || profile.profile_pic_url,
                  }}
                  style={styles.docIconImage}
                  resizeMode="cover"
                />
              ) : (
                <Text style={{ fontSize: scale(20) }}>🖼️</Text>
              )}
            </View>
            <View style={styles.docBody}>
              <Text style={styles.docLabel}>Profile Picture</Text>
              {profile.profile_pic_url ? (
                <Text style={styles.docLink} numberOfLines={1}>
                  Uploaded ✓
                </Text>
              ) : localProfilePicUri ? (
                <Text
                  style={[styles.docLink, { color: C.warning }]}
                  numberOfLines={1}
                >
                  Uploading…
                </Text>
              ) : (
                <Text style={styles.docEmpty}>No profile picture uploaded</Text>
              )}
            </View>
            <TouchableOpacity
              style={[
                styles.docUploadBtn,
                uploadingProfilePic && { opacity: 0.6 },
              ]}
              onPress={uploadingProfilePic ? undefined : handleUploadProfilePic}
              disabled={uploadingProfilePic}
              activeOpacity={0.75}
            >
              {uploadingProfilePic ? (
                <ActivityIndicator color={C.white} size="small" />
              ) : (
                <Text style={styles.docUploadTxt}>
                  {profile.profile_pic_url ? 'Change' : 'Upload'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </SectionCard>

        {/* LOGOUT */}
        <View style={{ marginTop: scale(10) }}>
          <TouchableOpacity
            style={styles.logoutBtn}
            activeOpacity={0.85}
            onPress={handleLogout}
          >
            <Text style={styles.logoutIcon}>🚪</Text>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: scale(24) }} />
      </Animated.ScrollView>

      {saving && (
        <View style={styles.savingOverlay}>
          <ActivityIndicator color={C.white} size="small" />
          <Text style={styles.savingText}>Saving…</Text>
        </View>
      )}

      <EditModal
        visible={modalState.visible}
        title={modalState.title}
        fields={modalState.fields}
        onClose={() => setModalState(MODAL_CLOSED)}
        onSave={modalState.onSave}
        loading={saving}
      />
    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  scroll: { paddingBottom: scale(40), paddingHorizontal: scale(16) },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(12),
  },
  loadingText: {
    fontSize: scale(14),
    color: C.textSub,
    fontWeight: '600',
    marginTop: scale(12),
  },
  retryBtn: {
    backgroundColor: C.primary,
    borderRadius: scale(12),
    paddingHorizontal: scale(24),
    paddingVertical: scale(12),
    marginTop: scale(8),
  },
  retryTxt: { color: C.white, fontWeight: '800', fontSize: scale(14) },

  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(20),
    paddingVertical: scale(14),
    backgroundColor: C.primaryDeep,
  },
  backArrow: {
    fontSize: scale(28),
    color: C.white,
    fontWeight: '300',
    lineHeight: scale(30),
  },
  headerTitle: { fontSize: scale(17), fontWeight: '800', color: C.white },

  heroCard: {
    backgroundColor: C.primaryDeep,
    borderRadius: scale(24),
    overflow: 'hidden',
    marginBottom: scale(16),
  },
  heroBlob1: {
    position: 'absolute',
    width: scale(200),
    height: scale(200),
    borderRadius: scale(100),
    backgroundColor: 'rgba(0,201,224,0.1)',
    top: scale(-60),
    right: scale(-40),
  },
  heroBlob2: {
    position: 'absolute',
    width: scale(140),
    height: scale(140),
    borderRadius: scale(70),
    backgroundColor: 'rgba(0,229,176,0.07)',
    bottom: scale(-30),
    left: scale(-40),
  },
  heroContent: {
    alignItems: 'center',
    paddingTop: scale(28),
    paddingHorizontal: scale(20),
  },

  // ── Avatar styles ──────────────────────────────────────────────────────────
  avatarRing: {
    width: scale(88),
    height: scale(88),
    borderRadius: scale(44),
    borderWidth: 3,
    borderColor: C.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scale(14),
  },
  avatar: {
    width: scale(76),
    height: scale(76),
    borderRadius: scale(38),
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarText: { fontSize: scale(28), fontWeight: '900', color: C.white },
  // Overlay shown on top of the avatar while uploading
  avatarUploadOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: scale(38),
    backgroundColor: 'rgba(0,61,74,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(4),
  },
  avatarUploadText: {
    fontSize: scale(8),
    color: C.white,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  cameraBadge: {
    position: 'absolute',
    bottom: scale(2),
    left: scale(2),
    backgroundColor: C.primaryDeep,
    width: scale(22),
    height: scale(22),
    borderRadius: scale(11),
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: C.accent,
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: C.accentGreen,
    width: scale(24),
    height: scale(24),
    borderRadius: scale(12),
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: C.primaryDeep,
  },
  verifiedTick: { color: C.white, fontSize: scale(12), fontWeight: '900' },
  // ──────────────────────────────────────────────────────────────────────────

  heroName: {
    fontSize: scale(22),
    fontWeight: '900',
    color: C.white,
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  heroSpec: {
    fontSize: scale(13),
    color: 'rgba(255,255,255,0.65)',
    fontWeight: '500',
    marginTop: scale(4),
    textAlign: 'center',
  },
  heroId: {
    fontSize: scale(11),
    color: C.accent,
    fontWeight: '700',
    letterSpacing: 1,
    marginTop: scale(6),
  },
  heroBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
    marginTop: scale(12),
    marginBottom: scale(20),
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  completePill: {
    backgroundColor: 'rgba(0,184,148,0.2)',
    borderRadius: scale(20),
    paddingHorizontal: scale(10),
    paddingVertical: scale(4),
    borderWidth: 1,
    borderColor: C.accentGreen,
  },
  completePillText: {
    fontSize: scale(10),
    color: C.accentGreen,
    fontWeight: '800',
  },

  statsStrip: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    paddingVertical: scale(14),
    paddingHorizontal: scale(20),
  },
  statItem: { flex: 1, alignItems: 'center' },
  statVal: { fontSize: scale(18), fontWeight: '900', color: C.white },
  statLbl: {
    fontSize: scale(10),
    color: 'rgba(255,255,255,0.55)',
    fontWeight: '600',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginVertical: scale(4),
  },

  twoCol: { flexDirection: 'row', gap: scale(16) },
  col: { flex: 1 },
  divider: { height: 1, backgroundColor: C.border, marginVertical: scale(12) },

  expCard: { flexDirection: 'row', gap: scale(12), paddingVertical: scale(12) },
  expCardBorder: { borderTopWidth: 1, borderTopColor: C.primaryLight },
  expIconCol: { paddingTop: 2 },
  expIcon: {
    width: scale(38),
    height: scale(38),
    borderRadius: scale(11),
    backgroundColor: C.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expBody: { flex: 1 },
  expTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
    flexWrap: 'wrap',
  },
  expTitle: { fontSize: scale(14), fontWeight: '800', color: C.text },
  expSub: {
    fontSize: scale(12),
    color: C.textSub,
    fontWeight: '600',
    marginTop: 2,
  },
  expDate: {
    fontSize: scale(11),
    color: C.textMuted,
    fontWeight: '500',
    marginTop: 2,
  },
  expMeta: {
    fontSize: scale(11),
    color: C.primary,
    fontWeight: '600',
    marginTop: 2,
  },
  expEditBtn: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(10),
    backgroundColor: C.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  currentBadge: {
    backgroundColor: C.accentGreen + '25',
    borderRadius: scale(8),
    paddingHorizontal: scale(6),
    paddingVertical: scale(2),
    borderWidth: 1,
    borderColor: C.accentGreen + '60',
  },
  currentBadgeTxt: {
    fontSize: scale(8),
    fontWeight: '800',
    color: C.accentGreen,
    letterSpacing: 0.5,
  },

  refGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: scale(12) },
  refCard: {
    flex: 1,
    minWidth: scale(140),
    backgroundColor: C.bg,
    borderRadius: scale(16),
    padding: scale(14),
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
  },
  refAvatar: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(22),
    backgroundColor: C.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scale(8),
  },
  refName: {
    fontSize: scale(13),
    fontWeight: '800',
    color: C.text,
    textAlign: 'center',
  },
  refProfession: {
    fontSize: scale(11),
    color: C.textSub,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 2,
  },
  refDivider: {
    height: 1,
    backgroundColor: C.border,
    width: '100%',
    marginVertical: scale(8),
  },
  refMeta: {
    fontSize: scale(11),
    color: C.textMuted,
    fontWeight: '500',
    marginBottom: 2,
  },
  refEditBtn: {
    backgroundColor: C.primaryLight,
    borderRadius: scale(8),
    paddingHorizontal: scale(10),
    paddingVertical: scale(4),
    marginTop: scale(8),
  },
  refEditTxt: { fontSize: scale(11), color: C.primary, fontWeight: '700' },

  certRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
    paddingVertical: scale(8),
    borderBottomWidth: 1,
    borderBottomColor: C.primaryLight,
  },
  certIcon: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(9),
    backgroundColor: C.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  certLink: {
    flex: 1,
    fontSize: scale(13),
    color: C.primary,
    fontWeight: '600',
  },

  prefLabel: {
    fontSize: scale(11),
    color: C.textMuted,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: scale(10),
  },
  daysRow: { flexDirection: 'row', flexWrap: 'wrap', gap: scale(8) },
  dayBtn: {
    paddingHorizontal: scale(14),
    paddingVertical: scale(8),
    borderRadius: scale(10),
    borderWidth: 1.5,
    borderColor: C.border,
    backgroundColor: C.bg,
  },
  dayBtnOn: { backgroundColor: C.primary, borderColor: C.primary },
  dayTxt: { fontSize: scale(12), color: C.textMuted, fontWeight: '700' },
  dayTxtOn: { color: C.white },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: scale(10),
  },
  toggleLeft: { flexDirection: 'row', alignItems: 'center', gap: scale(10) },
  toggleIcon: { fontSize: scale(18) },
  toggleLabel: { fontSize: scale(14), color: C.text, fontWeight: '600' },

  pillsRow: { flexDirection: 'row', flexWrap: 'wrap' },

  docRow: { flexDirection: 'row', gap: scale(14), alignItems: 'center' },
  docIcon: {
    width: scale(42),
    height: scale(42),
    borderRadius: scale(12),
    backgroundColor: C.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  // Mini image preview inside the doc icon cell
  docIconImage: {
    width: scale(42),
    height: scale(42),
    borderRadius: scale(12),
  },
  docBody: { flex: 1 },
  docLabel: {
    fontSize: scale(13),
    fontWeight: '700',
    color: C.text,
    marginBottom: 4,
  },
  docLink: { fontSize: scale(12), color: C.primary, fontWeight: '500' },
  docEmpty: { fontSize: scale(12), color: C.textMuted, fontWeight: '500' },
  docUploadBtn: {
    backgroundColor: C.primary,
    borderRadius: scale(10),
    paddingHorizontal: scale(12),
    paddingVertical: scale(8),
    minWidth: scale(60),
    alignItems: 'center',
    justifyContent: 'center',
  },
  docUploadTxt: { color: C.white, fontSize: scale(12), fontWeight: '800' },

  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffecec',
    borderRadius: scale(14),
    paddingVertical: scale(14),
    borderWidth: 1,
    borderColor: '#ffcdd2',
    gap: scale(8),
  },
  logoutIcon: { fontSize: scale(16) },
  logoutText: { fontSize: scale(14), fontWeight: '800', color: '#e53935' },

  savingOverlay: {
    position: 'absolute',
    bottom: scale(32),
    left: scale(80),
    right: scale(80),
    backgroundColor: C.primaryDeep,
    borderRadius: scale(20),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(10),
    paddingVertical: scale(12),
    shadowColor: C.primaryDeep,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  savingText: { color: C.white, fontWeight: '700', fontSize: scale(13) },
  emptyText: {
    fontSize: scale(13),
    color: C.textMuted,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: scale(8),
  },
});

export default ProfileScreen;
