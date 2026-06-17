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
  Linking,
  KeyboardAvoidingView,
  FlatList,
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
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Dropdown } from 'react-native-element-dropdown';
import EducationModal from '../components/EducationModal';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
// import ExperienceModal from '../components/ExperienceModal';
// import { Picker } from '@react-native-picker/picker';

// ─── Constants ───────────────────────────────────────────────────────────────

const GOOGLE_API_KEY = 'AIzaSyCUgfce6vE1U10ZsdF7s62KxOFD2Q_dNDc';

const { width: SW } = Dimensions.get('window');
const scale = (size: number) => (SW / 390) * size;

const BASE_URL =
  'https://locumbackenduat-ewcbfyghbvb2h0ez.centralindia-01.azurewebsites.net';

const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

type DaySlot = 'full' | 'am' | 'pm' | null;
type DateAvailability = Record<string, DaySlot>;

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

const slotColor = (slot: any): string => {
  const s = (slot || '').toString().toLowerCase();
  if (s === 'am') return C.warning;
  if (s === 'pm') return C.primary;
  if (s === 'full' || s === 'all') return C.accentGreen;
  return 'transparent';
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
    const res = await pick({ type: [types.pdf] });
    return Array.isArray(res) ? res : [res];
  } catch (err: any) {
    if (
      err?.code === 'DOCUMENT_PICKER_CANCELED' ||
      err?.message?.includes('cancel')
    )
      return null;
    throw err;
  }
};

// ─── Core Upload ──────────────────────────────────────────────────────────────
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

    if (statusCode >= 200 && statusCode < 300) {
      const data = JSON.parse(responseText);
      const updated = data?.doctor || data?.data || data;
      if (!updated?._id)
        throw new Error('Server returned OK but no doctor object');
      return updated as DoctorProfile;
    } else {
      throw new Error(
        `Server error ${statusCode}: ${responseText?.slice(0, 200)}`,
      );
    }
  } catch (err: any) {
    throw new Error(err?.message || '');
  }
};

const uploadMedicalRegistration = async (
  regData: {
    registration_type: string;
    medical_council_name: string;
    registration_number: string;
    registration_date: string;
  },
  certFiles: any[],
  existingUrls: string[],
  existingRegs: any[],
  doctorId: string,
  token: string,
  editIndex?: number,
): Promise<DoctorProfile> => {
  const url = `${BASE_URL}/api/doctors/complete-profile/${doctorId}`;

  // Strip SAS token (?sv=...) — backend expects clean blob URL
  const cleanUrl = (u: string) => (u ? u.split('?')[0] : '');

  // Only send fields the Mongoose schema accepts
  const stripReg = (r: any) => ({
    registration_type: r.registration_type || '',
    medical_council_name: r.medical_council_name || '',
    registration_number: r.registration_number || '',
    registration_date: r.registration_date || '',
    certificate_url: cleanUrl(r.certificate_url || r.document_url || ''),
  });

  const newReg = {
    registration_type: regData.registration_type,
    medical_council_name: regData.medical_council_name,
    registration_number: regData.registration_number,
    registration_date: regData.registration_date,
  };

  let orderedRegs: any[];
  if (editIndex !== undefined) {
    orderedRegs = existingRegs.map((r, i) =>
      i === editIndex ? newReg : stripReg(r),
    );
  } else {
    orderedRegs = [newReg, ...existingRegs.map(stripReg)];
  }

  const fields: any[] = [
    {
      name: 'medical_registrations',
      data: JSON.stringify(orderedRegs),
    },
  ];

  // Attach new certificate files
  certFiles.forEach((certFile, index) => {
    if (certFile?.uri) {
      const mimeType = certFile.type?.startsWith('image/')
        ? certFile.type
        : 'application/pdf';
      const fileName =
        certFile.name || `certificate_${Date.now()}_${index}.pdf`;
      const uri: string = certFile.uri;
      fields.push({
        name: 'medical_certificate',
        filename: fileName,
        type: mimeType,
        data: ReactNativeBlobUtil.wrap(
          Platform.OS === 'android' ? uri : uri.replace('file://', ''),
        ),
      });
    }
  });

  const response = await ReactNativeBlobUtil.fetch(
    'PATCH',
    url,
    {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'Content-Type': 'multipart/form-data',
    },
    fields,
  );

  const statusCode = response.respInfo.status;
  const responseText = response.data;

  if (statusCode >= 200 && statusCode < 300) {
    const data = JSON.parse(responseText);
    const updated = data?.doctor || data?.data || data;
    if (!updated?._id) throw new Error('Invalid response from server');
    return updated as DoctorProfile;
  }
  throw new Error(`Server error ${statusCode}: ${responseText?.slice(0, 300)}`);
};
const isValidPhone = (num: string) => /^[6-9]\d{9}$/.test(num);

// ─── Confirm Delete Helper ────────────────────────────────────────────────────

const confirmDelete = (
  title: string,
  message: string,
  onConfirm: () => void,
) => {
  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: onConfirm },
  ]);
};

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
  const imageUri = localUri || serverUrl || null;
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      disabled={uploading}
      style={styles.avatarRing}
    >
      {uploading ? (
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
        />
      ) : (
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
      )}
      <View style={styles.cameraBadge}>
        <Text style={{ fontSize: scale(10) }}>📷</Text>
      </View>
      {isVerified && (
        <View style={styles.verifiedBadge}>
          <Text style={styles.verifiedTick}>✓</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

// ─── Generic EditModal ────────────────────────────────────────────────────────

interface EditField {
  key: string;
  label: string;
  value: string;
  keyboardType?: 'default' | 'numeric' | 'email-address' | 'phone-pad';
  multiline?: boolean;
  placeholder?: string;

  // ADD THESE
  type?: 'text' | 'dropdown';
  options?: string[];
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
                ) : f.type === 'dropdown' ? (
                  <View
                    style={{
                      borderWidth: 1.5,
                      borderColor: C.border,
                      borderRadius: scale(12),
                      backgroundColor: C.inputBg,
                      paddingHorizontal: scale(12),
                      paddingVertical:
                        Platform.OS === 'ios' ? scale(14) : scale(4),
                    }}
                  >
                    <Dropdown
                      style={{
                        height: scale(45),
                      }}
                      placeholderStyle={{
                        color: '#999',
                        fontSize: scale(14),
                      }}
                      selectedTextStyle={{
                        color: C.text,
                        fontSize: scale(14),
                      }}
                      itemTextStyle={{
                        fontSize: scale(14),
                        color: C.text,
                      }}
                      containerStyle={{
                        borderRadius: scale(12),
                        maxHeight: scale(250), // THIS reduces popup height
                      }}
                      data={
                        f.key === 'super_speciality'
                          ? (SPECIALITY_MAP[vals.speciality] || []).map(
                              (item: string) => ({
                                label: item,
                                value: item,
                              }),
                            )
                          : (f.options || []).map((item: string) => ({
                              label: item,
                              value: item,
                            }))
                      }
                      labelField="label"
                      valueField="value"
                      placeholder={f.placeholder || 'Select'}
                      value={vals[f.key]}
                      maxHeight={250}
                      onChange={item => {
                        setVals(prev => {
                          const updated = {
                            ...prev,
                            [f.key]: item.value,
                          };

                          if (f.key === 'speciality') {
                            updated.super_speciality = '';
                          }

                          return updated;
                        });
                      }}
                    />
                  </View>
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
                        setVals(p => ({
                          ...p,
                          [f.key]: cleaned.slice(0, 10),
                        }));
                      } else {
                        setVals(p => ({
                          ...p,
                          [f.key]: v,
                        }));
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
    width: '100%',
    borderTopLeftRadius: scale(24),
    borderTopRightRadius: scale(24),
    paddingHorizontal: scale(12),
    paddingTop: scale(20),
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
  btns: {
    flexDirection: 'row',
    gap: scale(10),
    marginTop: scale(16),
    // marginBottom: scale(15),
  },
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

// ─── Medical Registration Modal ───────────────────────────────────────────────

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// ── Council Lists ─────────────────────────────────────────────────
const STATE_COUNCILS = [
  'Andhra Pradesh Medical Council',
  'Arunachal Pradesh Medical Council',
  'Assam Medical Council',
  'Bihar Medical Council',
  'Chhattisgarh Medical Council',
  'Delhi Medical Council',
  'Goa Medical Council',
  'Gujarat Medical Council',
  'Haryana Medical Council',
  'Himachal Pradesh Medical Council',
  'Jammu & Kashmir Medical Council',
  'Jharkhand Medical Council',
  'Karnataka Medical Council',
  'Kerala Medical Council',
  'Madhya Pradesh Medical Council',
  'Maharashtra Medical Council',
  'Manipur Medical Council',
  'Meghalaya Medical Council',
  'Mizoram Medical Council',
  'Nagaland Medical Council',
  'Odisha Medical Council',
  'Punjab Medical Council',
  'Rajasthan Medical Council',
  'Sikkim Medical Council',
  'Tamil Nadu Medical Council',
  'Telangana State Medical Council',
  'Tripura Medical Council',
  'Uttar Pradesh Medical Council',
  'Uttarakhand Medical Council',
  'West Bengal Medical Council',
  'Other',
];

type RegType = 'national' | 'state';

// ── Certificate item ──────────────────────────────────────────────
interface CertItem {
  id: string; // local unique id
  file: any | null; // picked file object
  uri: string; // preview URI (local or server)
  name: string; // display filename
  isExisting: boolean; // came from server
}

// ── Form state ────────────────────────────────────────────────────
interface FormState {
  registration_type: RegType;
  medical_council_name: string;
  registration_number: string;
  registration_date: Date | null;
  certificates: CertItem[];
}

// ── Props ─────────────────────────────────────────────────────────
interface Props {
  visible: boolean;
  initial: any | null;
  onClose: () => void;
  onSave: (data: {
    registration_type: string;
    medical_council_name: string;
    registration_number: string;
    registration_date: string;
    certificate_files: any[]; // ← array now
    existing_certificate_urls: string[]; // ← keep existing ones
  }) => void;
  loading: boolean;
}

// ── Helpers ───────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2);

const isImageUri = (uri: string) =>
  /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(uri);

const formatDate = (d: Date) => {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

const parseDate = (str: string): Date | null => {
  if (!str) return null;
  // DD/MM/YYYY
  const parts = str.split('/');
  if (parts.length === 3) {
    const d = new Date(+parts[2], +parts[1] - 1, +parts[0]);
    if (!isNaN(d.getTime())) return d;
  }
  // ISO
  const iso = new Date(str);
  if (!isNaN(iso.getTime())) return iso;
  return null;
};

const EMPTY_FORM: FormState = {
  registration_type: 'state',
  medical_council_name: '',
  registration_number: '',
  registration_date: null,
  certificates: [],
};

// ═══════════════════════════════════════════════════════════════════
// Council Picker Sheet
// ═══════════════════════════════════════════════════════════════════
const CouncilSheet: React.FC<{
  visible: boolean;
  selected: string;
  onSelect: (v: string) => void;
  onClose: () => void;
}> = ({ visible, selected, onSelect, onClose }) => {
  const [search, setSearch] = useState('');
  const [customMode, setCustomMode] = useState(false);
  const [customVal, setCustomVal] = useState('');

  const filtered = STATE_COUNCILS.filter(c =>
    c.toLowerCase().includes(search.toLowerCase()),
  );

  const handlePick = (item: string) => {
    if (item === 'Other') {
      setCustomMode(true);
      return;
    }
    onSelect(item);
    setSearch('');
    setCustomMode(false);
    setCustomVal('');
    onClose();
  };

  const confirmCustom = () => {
    if (customVal.trim()) onSelect(customVal.trim());
    setSearch('');
    setCustomMode(false);
    setCustomVal('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={cs.backdrop}
        activeOpacity={1}
        onPress={onClose}
      />
      <View style={cs.sheet}>
        <View style={cs.handle} />
        <View style={cs.head}>
          <Text style={cs.title}>Select State Medical Council</Text>
          <TouchableOpacity
            onPress={onClose}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={cs.close}>✕</Text>
          </TouchableOpacity>
        </View>

        <View style={cs.searchRow}>
          <Text style={{ fontSize: 14 }}>🔍</Text>
          <TextInput
            style={cs.searchInput}
            placeholder="Search council…"
            placeholderTextColor="#aaa"
            value={search}
            onChangeText={setSearch}
            autoCorrect={false}
          />
          {!!search && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Text style={{ color: '#aaa', fontSize: 14 }}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {customMode && (
          <View style={cs.customBox}>
            <Text style={[cs.customLbl, { color: C.primary }]}>
              Type council name
            </Text>
            <TextInput
              style={cs.customInput}
              placeholder="e.g. Puducherry Medical Council"
              placeholderTextColor="#aaa"
              value={customVal}
              onChangeText={setCustomVal}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={confirmCustom}
            />
            <TouchableOpacity
              style={[cs.customBtn, { backgroundColor: C.primary }]}
              onPress={confirmCustom}
            >
              <Text style={cs.customBtnTxt}>Confirm</Text>
            </TouchableOpacity>
          </View>
        )}

        <FlatList
          data={filtered}
          keyExtractor={i => i}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 32 }}
          renderItem={({ item }) => {
            const sel = item === selected;
            return (
              <TouchableOpacity
                style={[cs.item, sel && { backgroundColor: C.primary + '18' }]}
                onPress={() => handlePick(item)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    cs.itemTxt,
                    sel && { color: C.primary, fontWeight: '700' },
                  ]}
                >
                  {item}
                </Text>
                {sel && (
                  <Text
                    style={{
                      color: C.primary,
                      fontSize: 16,
                      fontWeight: '900',
                    }}
                  >
                    ✓
                  </Text>
                )}
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <Text style={cs.empty}>No results for "{search}"</Text>
          }
        />
      </View>
    </Modal>
  );
};

// ═══════════════════════════════════════════════════════════════════
// Main Modal
// ═══════════════════════════════════════════════════════════════════
export const MedicalRegistrationModal: React.FC<Props> = ({
  visible,
  initial,
  onClose,
  onSave,
  loading,
}) => {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [councilOpen, setCouncilOpen] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const isEdit = !!initial;

  // ── Seed form on open ──────────────────────────────────────────
  useEffect(() => {
    if (!visible) return;
    if (initial) {
      const certs: CertItem[] = [];
      // Load all certificates — supports new array format and old single URL
      const certUrls: string[] = initial.certificate_urls?.length
        ? initial.certificate_urls
        : initial.certificate_url
        ? [initial.certificate_url]
        : [];

      certUrls.forEach((url: string, i: number) => {
        certs.push({
          id: uid(),
          file: null,
          uri: url,
          name: initial.certificate_file_name
            ? i === 0
              ? initial.certificate_file_name
              : `Certificate ${i + 1}`
            : `Certificate ${i + 1}`,
          isExisting: true,
        });
      });
      setForm({
        registration_type: 'state',
        medical_council_name: initial.medical_council_name || '',
        registration_number: initial.registration_number || '',
        registration_date: parseDate(initial.registration_date || ''),
        certificates: certs,
      });
    } else {
      setForm(EMPTY_FORM);
    }
  }, [visible, initial]);

  const set = <K extends keyof FormState>(key: K, val: FormState[K]) =>
    setForm(prev => ({ ...prev, [key]: val }));

  const handleTypeChange = (type: RegType) =>
    setForm(prev => ({
      ...prev,
      registration_type: type,
      medical_council_name: '',
    }));

  // ── Certificate operations ─────────────────────────────────────
  const handleAddCertificate = async () => {
    if (form.certificates.length > 1) {
      Alert.alert(
        'Limit Exceeded',
        'Only 1 certificate is allowed per registration.',
      );
      return;
    }
    try {
      const result = await pick({
        type: [types.pdf, types.images],
        allowMultiSelection: false,
      });
      const file = Array.isArray(result) ? result[0] : result;
      if (!file?.uri) return;
      const newCert: CertItem = {
        id: uid(),
        file,
        uri: file.uri,
        name: file.name || 'Certificate',
        isExisting: false,
      };
      set('certificates', [...form.certificates, newCert]);
    } catch (err: any) {
      if (
        err?.code === 'DOCUMENT_PICKER_CANCELED' ||
        err?.message?.toLowerCase().includes('cancel')
      )
        return;
      Alert.alert('Error', 'Could not pick file.');
    }
  };

  const handleRemoveCertificate = (id: string) =>
    set(
      'certificates',
      form.certificates.filter(c => c.id !== id),
    );

  // ── Save ───────────────────────────────────────────────────────
  const handleSave = () => {
    if (
      form.registration_type === 'state' &&
      !form.medical_council_name.trim()
    ) {
      Alert.alert('Required', 'Please select a state medical council.');
      return;
    }
    if (!form.registration_number.trim()) {
      Alert.alert('Required', 'Please enter registration number.');
      return;
    }
    // Separate new files from existing server URLs
    const newFiles = form.certificates
      .filter(c => !c.isExisting && c.file)
      .map(c => c.file);
    const existingUrls = form.certificates
      .filter(c => c.isExisting && c.uri)
      .map(c => c.uri);

    onSave({
      registration_type:
        form.registration_type === 'national'
          ? 'National Council Registration'
          : 'State Council Registration',
      medical_council_name:
        form.registration_type === 'national'
          ? 'National Medical Commission (NMC)'
          : form.medical_council_name,
      registration_number: form.registration_number,
      registration_date: form.registration_date
        ? formatDate(form.registration_date)
        : '',
      certificate_files: newFiles,
      existing_certificate_urls: existingUrls,
    });
  };

  // ── Date picker handler ────────────────────────────────────────
  const onDateChange = (_: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (selectedDate) set('registration_date', selectedDate);
  };

  const canAddMore = form.certificates.length < 1;

  // ── Render ─────────────────────────────────────────────────────
  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        transparent
        onRequestClose={onClose}
        statusBarTranslucent
      >
        <View style={s.overlay}>
          {/* Tappable dim area to close */}
          <TouchableOpacity
            style={s.dimArea}
            activeOpacity={1}
            onPress={onClose}
          />

          <View style={s.sheet}>
            {/* Handle bar */}
            <View style={s.handle} />

            {/* ── Header ── */}
            <View style={s.header}>
              <View style={{ flex: 1 }}>
                <Text style={s.title}>
                  {isEdit
                    ? 'Edit Medical Registration'
                    : 'Add Medical Registration'}
                </Text>
                <Text style={s.subtitle}>
                  Add your clinical credentials and licensing.
                </Text>
              </View>
              <TouchableOpacity style={s.closeBtn} onPress={onClose}>
                <Text style={s.closeTxt}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* ── Body ── */}
            <ScrollView
              contentContainerStyle={s.body}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              {/* Registration Type */}
              <Text style={s.fieldLabel}>SELECT REGISTRATION TYPE</Text>
              <View style={s.radioRow}>
                {(['national', 'state'] as RegType[]).map(type => (
                  <TouchableOpacity
                    key={type}
                    style={s.radioOption}
                    onPress={() => handleTypeChange(type)}
                    activeOpacity={0.75}
                  >
                    <View
                      style={[
                        s.radioOuter,
                        form.registration_type === type && {
                          borderColor: C.primary,
                        },
                      ]}
                    >
                      {form.registration_type === type && (
                        <View
                          style={[s.radioInner, { backgroundColor: C.primary }]}
                        />
                      )}
                    </View>
                    <Text
                      style={[
                        s.radioLabel,
                        form.registration_type === type && {
                          color: C.primary,
                          fontWeight: '800',
                        },
                      ]}
                    >
                      {type === 'national'
                        ? 'National Council Registration'
                        : 'State Council Registration'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* State Council Dropdown — hidden when National */}
              {form.registration_type === 'state' && (
                <>
                  <Text style={[s.fieldLabel, { marginTop: 20 }]}>
                    SELECT STATE MEDICAL COUNCIL
                  </Text>
                  <TouchableOpacity
                    style={s.dropdown}
                    onPress={() => setCouncilOpen(true)}
                    activeOpacity={0.75}
                  >
                    <Text
                      style={[
                        s.dropdownTxt,
                        !form.medical_council_name && s.dropdownPh,
                      ]}
                      numberOfLines={1}
                    >
                      {form.medical_council_name || 'Select Medical Council'}
                    </Text>
                    <Text style={[s.dropdownChev, { color: C.primary }]}>
                      ▾
                    </Text>
                  </TouchableOpacity>
                </>
              )}

              {/* Reg Number + Date */}
              <View style={s.twoCol}>
                {/* Registration Number */}
                <View style={{ flex: 1 }}>
                  <Text style={s.fieldLabel}>
                    {form.registration_type === 'national'
                      ? 'NATIONAL REG NUMBER'
                      : 'STATE REG NUMBER'}
                  </Text>
                  <TextInput
                    style={s.input}
                    value={form.registration_number}
                    onChangeText={v => set('registration_number', v)}
                    placeholder="Enter registration number"
                    placeholderTextColor="#c0c0cc"
                    autoCapitalize="characters"
                  />
                </View>

                {/* Date of Registration */}
                <View style={{ flex: 1 }}>
                  <Text style={s.fieldLabel}>DATE OF REGISTRATION</Text>
                  <TouchableOpacity
                    style={s.dateBtn}
                    onPress={() => setShowDatePicker(true)}
                    activeOpacity={0.75}
                  >
                    <Text
                      style={[s.dateTxt, !form.registration_date && s.datePh]}
                    >
                      {form.registration_date
                        ? formatDate(form.registration_date)
                        : 'DD/MM/YYYY'}
                    </Text>
                    <Text style={{ fontSize: 16 }}>📅</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* iOS date picker inline */}
              {showDatePicker && Platform.OS === 'ios' && (
                <View style={s.datePickerWrap}>
                  <DateTimePicker
                    value={form.registration_date || new Date()}
                    mode="date"
                    display="spinner"
                    maximumDate={new Date()}
                    onChange={onDateChange}
                    textColor={C.text}
                  />
                  <TouchableOpacity
                    style={[s.dateConfirmBtn, { backgroundColor: C.primary }]}
                    onPress={() => setShowDatePicker(false)}
                  >
                    <Text style={s.dateConfirmTxt}>Confirm Date</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Android date picker */}
              {showDatePicker && Platform.OS === 'android' && (
                <DateTimePicker
                  value={form.registration_date || new Date()}
                  mode="date"
                  display="default"
                  maximumDate={new Date()}
                  onChange={onDateChange}
                />
              )}

              {/* ── Certificates Section ── */}
              <Text style={[s.fieldLabel, { marginTop: 20 }]}>
                {form.registration_type === 'national'
                  ? 'UPLOAD NATIONAL CERTIFICATE'
                  : 'UPLOAD STATE CERTIFICATE'}
                <Text style={{ color: C.textMuted, fontWeight: '500' }}>
                  {'  '}({form.certificates.length}/1)
                </Text>
              </Text>

              {/* Existing certificate cards */}
              {form.certificates.map((cert, idx) => {
                const isImg = isImageUri(cert.uri);
                return (
                  <View key={cert.id} style={s.certCard}>
                    {isImg ? (
                      // ── Image — tappable preview ──
                      <TouchableOpacity
                        activeOpacity={0.85}
                        onPress={() =>
                          cert.uri
                            ? Linking.openURL(cert.uri).catch(() =>
                                Alert.alert('Error', 'Could not open file.'),
                              )
                            : null
                        }
                      >
                        <Image
                          source={{ uri: cert.uri }}
                          style={s.certImage}
                          resizeMode="cover"
                        />
                        <View style={s.certImgOverlay}>
                          <Text style={s.certImgOverlayTxt}>
                            👁 Tap to preview
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ) : (
                      // ── PDF row ──
                      <View style={s.certPdfRow}>
                        <Text style={s.certPdfIcon}>📄</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={s.certName} numberOfLines={2}>
                            {cert.name}
                          </Text>
                          <Text
                            style={[
                              s.certStatus,
                              {
                                color: cert.isExisting
                                  ? C.accentGreen
                                  : C.warning,
                              },
                            ]}
                          >
                            {cert.isExisting
                              ? '✓ Already uploaded'
                              : '✓ Ready to upload'}
                          </Text>
                        </View>
                        {/* View button — only for existing server certs and new local files */}
                        {!!cert.uri && (
                          <TouchableOpacity
                            style={s.certViewBtn}
                            activeOpacity={0.75}
                            onPress={() =>
                              Linking.openURL(cert.uri).catch(() =>
                                Alert.alert('Error', 'Could not open file.'),
                              )
                            }
                          >
                            <Text style={s.certViewTxt}>👁 View</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    )}

                    {/* Remove button */}
                    <TouchableOpacity
                      style={s.certRemove}
                      onPress={() => handleRemoveCertificate(cert.id)}
                      activeOpacity={0.75}
                    >
                      <Text style={s.certRemoveTxt}>🗑️ Remove</Text>
                    </TouchableOpacity>
                  </View>
                );
              })}

              {/* Upload zone / Add more button */}
              {form.certificates.length === 0 ? (
                // Empty state — full dashed upload zone
                <TouchableOpacity
                  style={s.uploadZone}
                  onPress={handleAddCertificate}
                  activeOpacity={0.75}
                >
                  <Text style={s.uploadIcon}>⬆️</Text>
                  <Text style={s.uploadTxt}>Click to upload certificate</Text>
                  <Text style={s.uploadSub}>(PDF or Image)</Text>
                </TouchableOpacity>
              ) : (
                // Certificate added — hide upload button entirely
                <View style={s.limitReached}>
                  <Text style={s.limitTxt}>✓ Certificate added</Text>
                </View>
              )}
            </ScrollView>

            {/* ── Footer — wrapped in SafeAreaView so it clears home bar ── */}
            <SafeAreaView style={s.footerSafe}>
              <View style={s.footer}>
                <TouchableOpacity
                  style={[
                    s.saveBtn,
                    { backgroundColor: C.primary },
                    loading && { opacity: 0.6 },
                  ]}
                  onPress={handleSave}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  {loading ? (
                    <ActivityIndicator color={C.white} size="small" />
                  ) : (
                    <Text style={s.saveTxt}>
                      {isEdit ? 'Update Registration' : 'Add Registration'}
                    </Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={s.cancelBtn}
                  onPress={onClose}
                  activeOpacity={0.75}
                >
                  <Text style={s.cancelTxt}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </SafeAreaView>
          </View>
        </View>
      </Modal>

      {/* Council picker — rendered as sibling so it layers above modal */}
      <CouncilSheet
        visible={councilOpen}
        selected={form.medical_council_name}
        onSelect={v => set('medical_council_name', v)}
        onClose={() => setCouncilOpen(false)}
      />
    </>
  );
};

// ═══════════════════════════════════════════════════════════════════
// Styles
// ═══════════════════════════════════════════════════════════════════
const s = StyleSheet.create({
  // ── Modal shell ───────────────────────────────────────────────
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  dimArea: {
    flex: 1,
  },
  sheet: {
    backgroundColor: C.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: SCREEN_HEIGHT * 0.9,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#ddd',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 2,
  },

  // ── Header ────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  title: { fontSize: 20, fontWeight: '900', color: C.text },
  subtitle: { fontSize: 12, color: C.textMuted, marginTop: 3 },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: C.bg,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
    marginTop: 2,
  },
  closeTxt: { fontSize: 13, color: C.textMuted, fontWeight: '700' },

  // ── Body ──────────────────────────────────────────────────────
  body: {
    padding: 20,
    paddingBottom: 16,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: C.textMuted,
    letterSpacing: 0.8,
    marginBottom: 10,
  },

  // ── Radio ─────────────────────────────────────────────────────
  radioRow: {
    gap: 12,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: C.border,
    backgroundColor: C.bg,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 11,
    height: 11,
    borderRadius: 6,
  },
  radioLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: C.text,
    flex: 1,
  },

  // ── Dropdown ──────────────────────────────────────────────────
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: C.bg,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: C.border,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  dropdownTxt: { flex: 1, fontSize: 14, fontWeight: '600', color: C.text },
  dropdownPh: { color: '#c0c0cc', fontWeight: '400' },
  dropdownChev: { fontSize: 18, marginLeft: 8 },

  // ── Two column row ────────────────────────────────────────────
  twoCol: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },

  // ── Input ─────────────────────────────────────────────────────
  input: {
    backgroundColor: C.bg,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: C.border,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 14,
    color: C.text,
    fontWeight: '500',
  },

  // ── Date button ───────────────────────────────────────────────
  dateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: C.bg,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: C.border,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  dateTxt: { fontSize: 14, fontWeight: '600', color: C.text },
  datePh: { color: '#c0c0cc', fontWeight: '400' },

  // iOS date picker container
  datePickerWrap: {
    backgroundColor: C.bg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    marginTop: 10,
    overflow: 'hidden',
    paddingBottom: 8,
  },
  dateConfirmBtn: {
    marginHorizontal: 20,
    marginTop: 4,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  dateConfirmTxt: { color: C.white, fontWeight: '800', fontSize: 14 },

  // ── Certificate card ──────────────────────────────────────────
  certCard: {
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 10,
    backgroundColor: C.bg,
  },
  certImage: {
    width: '100%',
    height: 140,
    backgroundColor: C.primaryLight,
  },
  certPdfRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
  },
  certPdfIcon: { fontSize: 36 },
  certName: { fontSize: 13, fontWeight: '700', color: C.text, marginBottom: 4 },
  certStatus: { fontSize: 12, fontWeight: '600' },
  certRemoveTxt: { fontSize: 13, fontWeight: '700', color: C.error },
  certRemove: {
    backgroundColor: '#ffecec',
    paddingVertical: 10,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#ffcdd2',
  },
  // Image overlay
  certImgOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.42)',
    paddingVertical: 7,
    alignItems: 'center',
  },
  certImgOverlayTxt: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  // PDF view button
  certViewBtn: {
    backgroundColor: C.primaryLight,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: C.border,
    marginLeft: 8,
    alignSelf: 'center',
  },
  certViewTxt: {
    fontSize: 12,
    fontWeight: '700',
    color: C.primary,
  },

  // ── Upload zone (empty state) ─────────────────────────────────
  uploadZone: {
    borderWidth: 1.5,
    borderColor: C.border,
    borderStyle: 'dashed',
    borderRadius: 14,
    paddingVertical: 28,
    alignItems: 'center',
    gap: 6,
    backgroundColor: C.bg,
  },
  uploadIcon: { fontSize: 28 },
  uploadTxt: { fontSize: 14, fontWeight: '700', color: C.textSub },
  uploadSub: { fontSize: 12, color: C.textMuted },

  // ── Add more button ───────────────────────────────────────────
  addMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderColor: C.primary,
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
    backgroundColor: C.primaryLight,
  },
  addMoreTxt: { fontSize: 14, fontWeight: '800' },
  addMoreSub: { fontSize: 11, color: C.textMuted, fontWeight: '500' },

  // ── Limit reached ─────────────────────────────────────────────
  limitReached: {
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    backgroundColor: C.primaryLight,
    borderWidth: 1,
    borderColor: C.border,
  },
  limitTxt: { fontSize: 13, color: C.accentGreen, fontWeight: '700' },

  // ── Footer ────────────────────────────────────────────────────
  footerSafe: {
    backgroundColor: C.white,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  footer: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 14,
  },
  saveBtn: {
    flex: 2,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  saveTxt: { fontSize: 15, fontWeight: '800', color: C.white },
  cancelBtn: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.bg,
    borderWidth: 1.5,
    borderColor: C.border,
    minHeight: 52,
  },
  cancelTxt: { fontSize: 15, fontWeight: '700', color: C.textMuted },
});

// ── Council sheet styles ──────────────────────────────────────────
const cs = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    backgroundColor: C.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '72%',
    paddingBottom: Platform.OS === 'ios' ? 24 : 0,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#ddd',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  title: { fontSize: 16, fontWeight: '800', color: C.text },
  close: { fontSize: 16, color: C.textMuted, fontWeight: '700' },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 12,
    backgroundColor: C.bg,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14, color: C.text, fontWeight: '500' },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  itemTxt: { flex: 1, fontSize: 14, color: '#333', fontWeight: '500' },
  empty: {
    textAlign: 'center',
    color: '#bbb',
    fontSize: 13,
    paddingVertical: 24,
    fontStyle: 'italic',
  },
  customBox: {
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: '#f0faff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#b3e5fc',
  },
  customLbl: { fontSize: 12, fontWeight: '700', marginBottom: 8 },
  customInput: {
    backgroundColor: C.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#b3e5fc',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: C.text,
  },
  customBtn: {
    marginTop: 8,
    borderRadius: 8,
    paddingVertical: 9,
    alignItems: 'center',
  },
  customBtnTxt: { color: C.white, fontWeight: '800', fontSize: 13 },
});

// ─── Experience Modal ─────────────────────────────────────────────────────────

const DESIGNATION_OPTIONS = [
  'Consultant',
  'Senior Consultant',
  'Junior Consultant',
  'Resident Doctor',
  'Senior Resident',
  'Junior Resident',
  'Intern',
  'Medical Officer',
  'Chief Medical Officer',
  'Assistant Professor',
  'Associate Professor',
  'Professor',
  'Head of Department',
  'Director',
  'Visiting Consultant',
  'Fellow',
  'Registrar',
  'House Officer',
  'Other',
];

interface ExperienceModalProps {
  visible: boolean;
  initial?: any;
  isEdit?: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  loading?: boolean;
  googleApiKey: string;
}

const ExperienceModal: React.FC<ExperienceModalProps> = ({
  visible,
  initial,
  isEdit,
  onClose,
  onSave,
  loading,
}) => {
  const [clinicName, setClinicName] = useState('');
  // ── NEW: hospital autocomplete state ─────────────────────────────────────
  const [hospitalSuggestions, setHospitalSuggestions] = useState<any[]>([]);
  const [showHospitalList, setShowHospitalList] = useState(false);
  const hospitalTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // ── NEW: designation dropdown state ──────────────────────────────────────
  const [designationDropdown, setDesignationDropdown] = useState(''); // selected option
  const [designationOther, setDesignationOther] = useState(''); // free text if 'Other'
  const [showDesigList, setShowDesigList] = useState(false);
  // ─────────────────────────────────────────────────────────────────────────
  const [yearsExp, setYearsExp] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isCurrent, setIsCurrent] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [activeDateField, setActiveDateField] = useState<'start' | 'end'>(
    'start',
  );

  useEffect(() => {
    if (visible) {
      setClinicName(initial?.clinic_hospital_name || '');
      setYearsExp(String(initial?.years_of_experience || ''));
      setStartDate(initial?.start_date?.slice(0, 10) || '');
      setEndDate(initial?.end_date?.slice(0, 10) || '');
      setIsCurrent(initial?.is_current || false);
      // Reset autocomplete state
      setHospitalSuggestions([]);
      setShowHospitalList(false);
      // Seed designation: if saved value is in the list use it; else treat as Other
      const saved = initial?.designation || '';
      if (!saved) {
        setDesignationDropdown('');
        setDesignationOther('');
      } else if (DESIGNATION_OPTIONS.includes(saved)) {
        setDesignationDropdown(saved);
        setDesignationOther('');
      } else {
        setDesignationDropdown('Other');
        setDesignationOther(saved);
      }
      setShowDesigList(false);
      const cae = initial?.clinical_area_experience || {};
    }
  }, [visible, initial]);

  // ── Hospital autocomplete helpers ─────────────────────────────────────────
  const fetchHospitalSuggestions = async (query: string) => {
    if (query.length < 3) {
      setHospitalSuggestions([]);
      return;
    }
    try {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json` +
          `?input=${encodeURIComponent(
            query,
          )}&types=establishment&key=${GOOGLE_API_KEY}`,
      );
      const json = await res.json();
      if (json.status === 'OK')
        setHospitalSuggestions((json.predictions || []).slice(0, 6));
      else setHospitalSuggestions([]);
    } catch {
      setHospitalSuggestions([]);
    }
  };

  const handleClinicNameChange = (text: string) => {
    setClinicName(text);
    setShowHospitalList(true);
    if (hospitalTimer.current) clearTimeout(hospitalTimer.current);
    hospitalTimer.current = setTimeout(
      () => fetchHospitalSuggestions(text),
      350,
    );
  };

  const handleHospitalSelect = (prediction: any) => {
    setClinicName(prediction.structured_formatting.main_text);
    setHospitalSuggestions([]);
    setShowHospitalList(false);
  };
  // ─────────────────────────────────────────────────────────────────────────

  const openDatePicker = (field: 'start' | 'end') => {
    setActiveDateField(field);
    setShowDatePicker(true);
  };

  const onChangeDate = (_: any, selected?: Date) => {
    setShowDatePicker(false);
    if (selected) {
      const iso = selected.toISOString().slice(0, 10);
      if (activeDateField === 'start') setStartDate(iso);
      else setEndDate(iso);
    }
  };

  const handleSave = () => {
    if (!clinicName.trim()) {
      Alert.alert('Required', 'Please enter clinic/hospital name');
      return;
    }
    const finalDesignation =
      designationDropdown === 'Other'
        ? designationOther.trim()
        : designationDropdown;
    onSave({
      clinic_hospital_name: clinicName,
      designation: finalDesignation,
      years_of_experience: Number(yearsExp) || 0,
      start_date: startDate || undefined,
      end_date: isCurrent ? undefined : endDate || undefined,
      is_current: isCurrent,
    });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={exm.overlay}>
        <View style={exm.sheet}>
          <View style={exm.handle} />
          <Text style={exm.title}>
            {isEdit ? 'Edit Experience' : 'Add Experience'}
          </Text>
          <ScrollView
            showsVerticalScrollIndicator={false}
            style={{ maxHeight: scale(460) }}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
          >
            {/* ── Clinic / Hospital Name — Google Places autocomplete ── */}
            <View style={[exm.fieldWrap, { zIndex: 30 }]}>
              <Text style={exm.label}>Clinic / Hospital Name</Text>
              <TextInput
                style={exm.input}
                value={clinicName}
                onChangeText={handleClinicNameChange}
                placeholder="e.g. City Hospital"
                placeholderTextColor={C.textMuted}
                onBlur={() => setTimeout(() => setShowHospitalList(false), 200)}
              />
              {showHospitalList && hospitalSuggestions.length > 0 && (
                <View style={exm.suggestionList}>
                  {hospitalSuggestions.map(item => (
                    <TouchableOpacity
                      key={item.place_id}
                      style={exm.suggestionItem}
                      onPress={() => handleHospitalSelect(item)}
                      activeOpacity={0.75}
                    >
                      <Text style={exm.suggestionMain}>
                        {item.structured_formatting.main_text}
                      </Text>
                      <Text style={exm.suggestionSub}>
                        {item.structured_formatting.secondary_text}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* ── Designation — Dropdown ── */}
            <View style={[exm.fieldWrap, { zIndex: 20 }]}>
              <Text style={exm.label}>Designation</Text>
              <TouchableOpacity
                style={[exm.input, exm.dropdownTrigger]}
                onPress={() => setShowDesigList(o => !o)}
                activeOpacity={0.8}
              >
                <Text
                  style={{
                    fontSize: scale(14),
                    color: designationDropdown ? C.text : C.textMuted,
                    flex: 1,
                  }}
                >
                  {designationDropdown || 'Select Designation'}
                </Text>
                <Text style={{ fontSize: scale(11), color: C.textMuted }}>
                  {showDesigList ? '▲' : '▼'}
                </Text>
              </TouchableOpacity>

              {/* Dropdown list — inline, pushes content down */}
              {showDesigList && (
                <View style={exm.dropdownList}>
                  <ScrollView
                    nestedScrollEnabled
                    showsVerticalScrollIndicator={true}
                    style={{ maxHeight: scale(200) }}
                  >
                    {DESIGNATION_OPTIONS.map(opt => (
                      <TouchableOpacity
                        key={opt}
                        style={[
                          exm.dropdownItem,
                          designationDropdown === opt && exm.dropdownItemActive,
                        ]}
                        onPress={() => {
                          setDesignationDropdown(opt);
                          setShowDesigList(false);
                          if (opt !== 'Other') setDesignationOther('');
                        }}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            exm.dropdownItemTxt,
                            designationDropdown === opt &&
                              exm.dropdownItemTxtActive,
                          ]}
                        >
                          {opt}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* Free-text input when 'Other' is selected */}
              {designationDropdown === 'Other' && (
                <TextInput
                  style={[exm.input, { marginTop: scale(8) }]}
                  value={designationOther}
                  onChangeText={setDesignationOther}
                  placeholder="Specify your designation"
                  placeholderTextColor={C.textMuted}
                  autoFocus
                />
              )}
            </View>

            {/* ── Years of Experience — UNCHANGED ── */}
            <View style={exm.fieldWrap}>
              <Text style={exm.label}>Years of Experience</Text>
              <TextInput
                style={exm.input}
                value={yearsExp}
                onChangeText={setYearsExp}
                placeholder="e.g. 2"
                placeholderTextColor={C.textMuted}
                keyboardType="numeric"
              />
            </View>

            {/* ── Start Date — UNCHANGED ── */}
            <View style={exm.fieldWrap}>
              <Text style={exm.label}>Start Date</Text>
              <TouchableOpacity
                style={[
                  exm.input,
                  {
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  },
                ]}
                onPress={() => openDatePicker('start')}
              >
                <Text
                  style={{
                    color: startDate ? C.text : C.textMuted,
                    fontSize: scale(14),
                  }}
                >
                  {startDate || 'Select start date'}
                </Text>
                <Text style={{ fontSize: scale(16) }}>📅</Text>
              </TouchableOpacity>
            </View>

            {/* ── Currently working checkbox — UNCHANGED ── */}
            <TouchableOpacity
              style={exm.checkRow}
              onPress={() => {
                setIsCurrent(!isCurrent);
                if (!isCurrent) setEndDate('');
              }}
              activeOpacity={0.7}
            >
              <View style={[exm.checkbox, isCurrent && exm.checkboxOn]}>
                {isCurrent && <Text style={exm.checkmark}>✓</Text>}
              </View>
              <Text style={exm.checkLabel}>I am currently working here</Text>
            </TouchableOpacity>

            {/* ── End Date — UNCHANGED ── */}
            {!isCurrent && (
              <View style={exm.fieldWrap}>
                <Text style={exm.label}>End Date</Text>
                <TouchableOpacity
                  style={[
                    exm.input,
                    {
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    },
                  ]}
                  onPress={() => openDatePicker('end')}
                >
                  <Text
                    style={{
                      color: endDate ? C.text : C.textMuted,
                      fontSize: scale(14),
                    }}
                  >
                    {endDate || 'Select end date'}
                  </Text>
                  <Text style={{ fontSize: scale(16) }}>📅</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>

          {/* ── DateTimePicker — UNCHANGED ── */}
          {showDatePicker && (
            <DateTimePicker
              value={new Date()}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onChangeDate}
            />
          )}

          {/* ── Buttons — UNCHANGED ── */}
          <View style={exm.btns}>
            <TouchableOpacity
              style={exm.cancelBtn}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={exm.cancelTxt}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[exm.saveBtn, loading && { opacity: 0.6 }]}
              onPress={handleSave}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color={C.white} size="small" />
              ) : (
                <Text style={exm.saveTxt}>Save Changes</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const exm = StyleSheet.create({
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
    paddingVertical: scale(12),
    fontSize: scale(14),
    color: C.text,
    backgroundColor: C.inputBg,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
    marginBottom: scale(16),
    paddingVertical: scale(4),
  },
  checkbox: {
    width: scale(22),
    height: scale(22),
    borderRadius: scale(6),
    borderWidth: 2,
    borderColor: C.border,
    backgroundColor: C.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: { backgroundColor: C.primary, borderColor: C.primary },
  checkmark: { color: C.white, fontSize: scale(13), fontWeight: '900' },
  checkLabel: {
    fontSize: scale(14),
    color: C.text,
    fontWeight: '600',
    flex: 1,
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

  clinicalSection: {
    marginTop: scale(18),
  },

  clinicalTitle: {
    fontSize: scale(16),
    fontWeight: '800',
    color: C.text,
  },

  clinicalSub: {
    fontSize: scale(12),
    color: C.textMuted,
    marginTop: scale(4),
    marginBottom: scale(14),
  },

  clinicalCard: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: scale(16),
    padding: scale(14),
    marginBottom: scale(12),
    backgroundColor: C.white,
  },

  clinicalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: scale(12),
  },

  clinicalLabel: {
    fontSize: scale(12),
    fontWeight: '800',
    color: C.text,
  },

  clinicalDesc: {
    fontSize: scale(11),
    color: C.textMuted,
    marginTop: scale(4),
  },

  toggleWrap: {
    flexDirection: 'row',
    backgroundColor: '#eef2f7',
    borderRadius: scale(20),
    padding: scale(3),
  },

  toggleBtn: {
    paddingHorizontal: scale(16),
    paddingVertical: scale(7),
    borderRadius: scale(18),
  },

  toggleBtnInactive: {
    backgroundColor: C.white,
  },

  toggleBtnActive: {
    backgroundColor: C.primary,
  },

  toggleText: {
    fontSize: scale(12),
    fontWeight: '700',
    color: C.textMuted,
  },

  toggleTextRed: {
    color: '#ff4d4f',
  },

  toggleTextWhite: {
    color: C.white,
  },

  icuRow: {
    flexDirection: 'row',
    gap: scale(12),
    marginTop: scale(14),
  },

  miniLabel: {
    fontSize: scale(10),
    fontWeight: '700',
    color: C.textMuted,
    marginBottom: scale(6),
  },

  miniInput: {
    borderWidth: 1.2,
    borderColor: C.border,
    borderRadius: scale(12),
    paddingHorizontal: scale(12),
    paddingVertical: scale(10),
    fontSize: scale(13),
    color: C.text,
    backgroundColor: C.inputBg,
  },
  suggestionList: {
    borderWidth: 1.5,
    borderColor: C.primary,
    borderRadius: scale(12),
    backgroundColor: C.white,
    marginTop: scale(4),
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
  },
  suggestionItem: {
    paddingHorizontal: scale(14),
    paddingVertical: scale(11),
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  suggestionMain: {
    fontSize: scale(13),
    fontWeight: '700',
    color: C.text,
  },
  suggestionSub: {
    fontSize: scale(11),
    color: C.textMuted,
    marginTop: scale(2),
  },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownList: {
    borderWidth: 1.5,
    borderColor: C.primary,
    borderRadius: scale(12),
    backgroundColor: C.white,
    marginTop: scale(4),
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
  },
  dropdownItem: {
    paddingHorizontal: scale(14),
    paddingVertical: scale(12),
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  dropdownItemActive: {
    backgroundColor: C.primaryLight,
  },
  dropdownItemTxt: {
    fontSize: scale(14),
    color: C.text,
  },
  dropdownItemTxtActive: {
    color: C.primary,
    fontWeight: '700',
  },
});

// ─── Clinical Area Modal ──────────────────────────────────────────────────────

interface ClinicalAreaModalProps {
  visible: boolean;
  initial?: any;
  onClose: () => void;
  onSave: (data: any) => void;
  loading?: boolean;
}

const CLINICAL_CONFIG = [
  { key: 'icu', label: 'ICU', subtitle: 'Intensive Care Unit' },
  { key: 'emergency', label: 'Emergency', subtitle: 'Accident & Emergency' },
  { key: 'ot', label: 'OT', subtitle: 'Operation Theatre' },
  { key: 'opd', label: 'OPD', subtitle: 'Outpatient Department' },
  { key: 'ip', label: 'IP', subtitle: 'In-patient Ward' },
] as const;

type AreaKey = (typeof CLINICAL_CONFIG)[number]['key'];

interface AreaState {
  status: boolean;
  years: string;
  remarks: string;
}

type ClinicalState = Record<AreaKey, AreaState>;

const defaultClinicalState = (): ClinicalState => ({
  icu: { status: false, years: '', remarks: '' },
  emergency: { status: false, years: '', remarks: '' },
  ot: { status: false, years: '', remarks: '' },
  opd: { status: false, years: '', remarks: '' },
  ip: { status: false, years: '', remarks: '' },
});

// ── Standalone card — defined at module level so it never remounts ──────────
interface AreaCardProps {
  config: (typeof CLINICAL_CONFIG)[number];
  state: AreaState;
  onToggle: (key: AreaKey) => void;
  onYearsChange: (key: AreaKey, val: string) => void;
  onRemarksChange: (key: AreaKey, val: string) => void;
}

const AreaCard: React.FC<AreaCardProps> = ({
  config,
  state,
  onToggle,
  onYearsChange,
  onRemarksChange,
}) => (
  <View style={cam.card}>
    <View style={cam.cardHeader}>
      <View style={{ flex: 1 }}>
        <Text style={cam.cardLabel}>{config.label}</Text>
        <Text style={cam.cardSub}>{config.subtitle}</Text>
      </View>
      <View style={cam.toggle}>
        <TouchableOpacity
          style={[cam.toggleBtn, !state.status && cam.toggleNo]}
          onPress={() => onToggle(config.key)}
        >
          <Text style={[cam.toggleTxt, !state.status && cam.toggleTxtNo]}>
            No
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[cam.toggleBtn, state.status && cam.toggleYes]}
          onPress={() => onToggle(config.key)}
        >
          <Text style={[cam.toggleTxt, state.status && cam.toggleTxtYes]}>
            Yes
          </Text>
        </TouchableOpacity>
      </View>
    </View>

    {state.status && (
      <View style={cam.inputRow}>
        <View style={{ flex: 0.35 }}>
          <Text style={cam.miniLabel}>YEARS</Text>
          <TextInput
            style={cam.miniInput}
            value={state.years}
            onChangeText={t => onYearsChange(config.key, t)}
            keyboardType="numeric"
            placeholder="e.g. 2"
            placeholderTextColor={C.textMuted}
          />
        </View>
        <View style={{ flex: 0.65 }}>
          <Text style={cam.miniLabel}>REMARKS</Text>
          <TextInput
            style={cam.miniInput}
            value={state.remarks}
            onChangeText={t => onRemarksChange(config.key, t)}
            placeholder="e.g. Assisted surgeries"
            placeholderTextColor={C.textMuted}
          />
        </View>
      </View>
    )}
  </View>
);

const ClinicalAreaModal: React.FC<ClinicalAreaModalProps> = ({
  visible,
  initial,
  onClose,
  onSave,
  loading,
}) => {
  const [areas, setAreas] = useState<ClinicalState>(defaultClinicalState);

  useEffect(() => {
    if (visible) {
      const cae = initial || {};
      setAreas({
        icu: {
          status: cae.icu?.status === 'yes',
          years: cae.icu?.years || '',
          remarks: cae.icu?.remarks || '',
        },
        emergency: {
          status: cae.emergency?.status === 'yes',
          years: cae.emergency?.years || '',
          remarks: cae.emergency?.remarks || '',
        },
        ot: {
          status: cae.ot?.status === 'yes',
          years: cae.ot?.years || '',
          remarks: cae.ot?.remarks || '',
        },
        opd: {
          status: cae.opd?.status === 'yes',
          years: cae.opd?.years || '',
          remarks: cae.opd?.remarks || '',
        },
        ip: {
          status: cae.ip?.status === 'yes',
          years: cae.ip?.years || '',
          remarks: cae.ip?.remarks || '',
        },
      });
    }
  }, [visible, initial]);

  const handleToggle = useCallback((key: AreaKey) => {
    setAreas(prev => ({
      ...prev,
      [key]: { ...prev[key], status: !prev[key].status },
    }));
  }, []);

  const handleYears = useCallback((key: AreaKey, val: string) => {
    setAreas(prev => ({ ...prev, [key]: { ...prev[key], years: val } }));
  }, []);

  const handleRemarks = useCallback((key: AreaKey, val: string) => {
    setAreas(prev => ({ ...prev, [key]: { ...prev[key], remarks: val } }));
  }, []);

  const handleSave = () => {
    const payload: Record<string, any> = {};
    (Object.keys(areas) as AreaKey[]).forEach(key => {
      payload[key] = {
        status: areas[key].status ? 'yes' : 'no',
        years: areas[key].years,
        remarks: areas[key].remarks,
      };
    });
    onSave(payload);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={cam.overlay}>
        <View style={cam.sheet}>
          <View style={cam.handle} />

          <View style={cam.titleRow}>
            <View style={cam.titleIcon}>
              <Text style={{ fontSize: scale(22) }}>🏥</Text>
            </View>
            <View>
              <Text style={cam.title}>Clinical Area Experience</Text>
              <Text style={cam.titleSub}>
                Saved once across your entire profile
              </Text>
            </View>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            style={{ maxHeight: scale(480) }}
            keyboardShouldPersistTaps="handled"
          >
            {CLINICAL_CONFIG.map(config => (
              <AreaCard
                key={config.key}
                config={config}
                state={areas[config.key]}
                onToggle={handleToggle}
                onYearsChange={handleYears}
                onRemarksChange={handleRemarks}
              />
            ))}
            <View style={{ height: scale(12) }} />
          </ScrollView>

          <View style={cam.btns}>
            <TouchableOpacity
              style={cam.cancelBtn}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={cam.cancelTxt}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[cam.saveBtn, loading && { opacity: 0.6 }]}
              onPress={handleSave}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color={C.white} size="small" />
              ) : (
                <Text style={cam.saveTxt}>Save</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const cam = StyleSheet.create({
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(12),
    marginBottom: scale(18),
  },
  titleIcon: {
    width: scale(46),
    height: scale(46),
    borderRadius: scale(14),
    backgroundColor: C.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  title: { fontSize: scale(16), fontWeight: '800', color: C.text },
  titleSub: { fontSize: scale(11), color: C.textMuted, marginTop: scale(2) },

  card: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: scale(14),
    padding: scale(14),
    marginBottom: scale(10),
    backgroundColor: C.white,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: scale(12),
  },
  cardLabel: { fontSize: scale(13), fontWeight: '800', color: C.text },
  cardSub: { fontSize: scale(11), color: C.textMuted, marginTop: scale(2) },

  toggle: {
    flexDirection: 'row',
    backgroundColor: '#eef2f7',
    borderRadius: scale(20),
    padding: scale(3),
  },
  toggleBtn: {
    paddingHorizontal: scale(14),
    paddingVertical: scale(6),
    borderRadius: scale(18),
  },
  toggleNo: { backgroundColor: C.white },
  toggleYes: { backgroundColor: C.primary },
  toggleTxt: { fontSize: scale(12), fontWeight: '700', color: C.textMuted },
  toggleTxtNo: { color: '#ff4d4f' },
  toggleTxtYes: { color: C.white },

  inputRow: { flexDirection: 'row', gap: scale(12), marginTop: scale(12) },
  miniLabel: {
    fontSize: scale(10),
    fontWeight: '700',
    color: C.textMuted,
    marginBottom: scale(5),
  },
  miniInput: {
    borderWidth: 1.2,
    borderColor: C.border,
    borderRadius: scale(10),
    paddingHorizontal: scale(12),
    paddingVertical: scale(9),
    fontSize: scale(13),
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

// // ─── Availability Modal ───────────────────────────────────────────────────────

// // ─── Calendar Availability Modal ─────────────────────────────────────────────

// interface AvailabilityModalProps {
//   visible: boolean;
//   initialDates: DateAvailability;
//   onClose: () => void;
//   onSave: (dates: DateAvailability) => void;
//   loading?: boolean;
// }

// const MONTH_NAMES = [
//   'January',
//   'February',
//   'March',
//   'April',
//   'May',
//   'June',
//   'July',
//   'August',
//   'September',
//   'October',
//   'November',
//   'December',
// ];

// const AvailabilityModal: React.FC<AvailabilityModalProps> = ({
//   visible,
//   initialDates,
//   onClose,
//   onSave,
//   loading,
// }) => {
//   const now = new Date();
//   const [selectedYear, setSelectedYear] = useState(now.getFullYear());
//   const [selectedMonth, setSelectedMonth] = useState(now.getMonth()); // 0-based
//   const [availability, setAvailability] = useState<DateAvailability>({});
//   const [activeDate, setActiveDate] = useState<string | null>(null);
//   const [showSavedDates, setShowSavedDates] = useState(false);

//   // Year options: current year ± 2
//   const years = [
//     // now.getFullYear() - 1,
//     now.getFullYear(),
//     // now.getFullYear() + 1,
//   ];

//   useEffect(() => {
//     if (visible) {
//       setAvailability({ ...initialDates });
//       setActiveDate(null);
//     }
//   }, [visible, initialDates]);

//   // Build calendar days for selectedYear/selectedMonth
//   const getDaysInMonth = () => {
//     const firstDay = new Date(selectedYear, selectedMonth, 1).getDay(); // 0=Sun
//     const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
//     // Shift so Mon=0
//     const startOffset = (firstDay + 6) % 7;
//     return { startOffset, daysInMonth };
//   };

//   const { startOffset, daysInMonth } = getDaysInMonth();

//   const dateKey = (day: number) =>
//     `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(
//       day,
//     ).padStart(2, '0')}`;

//   const handleDayPress = (day: number) => {
//     const key = dateKey(day);
//     setActiveDate(prev => (prev === key ? null : key));
//   };

//   const setSlotForActive = (slot: DaySlot) => {
//     if (!activeDate) return;
//     setAvailability(prev => {
//       const next = { ...prev };
//       if (slot === null) {
//         delete next[activeDate];
//       } else {
//         next[activeDate] = slot;
//       }
//       return next;
//     });
//     setActiveDate(null);
//   };

//   const slotLabel = (slot: any) => {
//     const s = (slot || '').toString().toLowerCase();
//     if (s === 'am') return 'AM';
//     if (s === 'pm') return 'PM';
//     if (s === 'full' || s === 'all') return '●';
//     return '';
//   };

//   const WEEK_LABELS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

//   const groupedAvailability = Object.entries(availability).reduce(
//     (acc: any, [date, slot]) => {
//       const d = new Date(date + 'T00:00:00');

//       const monthYear = d.toLocaleString('default', {
//         month: 'long',
//         year: 'numeric',
//       });

//       if (!acc[monthYear]) {
//         acc[monthYear] = [];
//       }

//       acc[monthYear].push({
//         date,
//         slot,
//         day: d.getDate(),
//       });

//       return acc;
//     },
//     {},
//   );

//   const calendarCells: (number | null)[] = [
//     ...Array(startOffset).fill(null),
//     ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
//   ];
//   // Pad to complete last row
//   while (calendarCells.length % 7 !== 0) calendarCells.push(null);

//   return (
//     <Modal
//       visible={visible}
//       transparent
//       animationType="slide"
//       onRequestClose={onClose}
//     >
//       <View style={avm.overlay}>
//         <View style={avm.sheet}>
//           <View style={avm.handle} />

//           {/* Header */}
//           <View style={avm.headerRow}>
//             <Text style={avm.title}>Availability</Text>

//             <View style={{ flexDirection: 'row', alignItems: 'center' }}>
//               <TouchableOpacity
//                 onPress={onClose}
//                 hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
//               >
//                 <Text style={avm.closeX}>✕</Text>
//               </TouchableOpacity>
//             </View>
//           </View>
//           <Text style={avm.subtitle}>
//             Tap a date to set your availability slot.
//           </Text>

//           {/* Month / Year selectors */}
//           <View style={avm.selectors}>
//             <ScrollView
//               horizontal
//               showsHorizontalScrollIndicator={false}
//               style={{ flexGrow: 0 }}
//             >
//               <View style={avm.pillRow}>
//                 {MONTH_NAMES.map((m, i) => (
//                   <TouchableOpacity
//                     key={m}
//                     style={[
//                       avm.monthPill,
//                       selectedMonth === i && avm.monthPillOn,
//                     ]}
//                     onPress={() => {
//                       setSelectedMonth(i);
//                       setActiveDate(null);
//                     }}
//                     activeOpacity={0.7}
//                   >
//                     <Text
//                       style={[
//                         avm.monthPillTxt,
//                         selectedMonth === i && avm.monthPillTxtOn,
//                       ]}
//                     >
//                       {m.slice(0, 3)}
//                     </Text>
//                   </TouchableOpacity>
//                 ))}
//               </View>
//             </ScrollView>
//             <View style={avm.yearRow}>
//               {years.map(y => (
//                 <TouchableOpacity
//                   key={y}
//                   style={[avm.yearBtn, selectedYear === y && avm.yearBtnOn]}
//                   onPress={() => {
//                     setSelectedYear(y);
//                     setActiveDate(null);
//                   }}
//                   activeOpacity={0.7}
//                 >
//                   <Text
//                     style={[avm.yearTxt, selectedYear === y && avm.yearTxtOn]}
//                   >
//                     {y}
//                   </Text>
//                 </TouchableOpacity>
//               ))}
//             </View>
//           </View>

//           {/* Calendar grid */}
//           <View style={avm.calendarBox}>
//             {/* Week labels */}
//             <View style={avm.weekRow}>
//               {WEEK_LABELS.map(d => (
//                 <Text key={d} style={avm.weekLabel}>
//                   {d}
//                 </Text>
//               ))}
//             </View>
//             {/* Day cells */}
//             {Array.from({ length: calendarCells.length / 7 }, (_, row) => (
//               <View key={row} style={avm.weekRow}>
//                 {calendarCells.slice(row * 7, row * 7 + 7).map((day, col) => {
//                   if (!day) return <View key={col} style={avm.dayCell} />;
//                   const key = dateKey(day);
//                   const slot = availability[key] ?? null;
//                   const isActive = activeDate === key;
//                   const isToday =
//                     day === now.getDate() &&
//                     selectedMonth === now.getMonth() &&
//                     selectedYear === now.getFullYear();
//                   return (
//                     <TouchableOpacity
//                       key={col}
//                       style={[
//                         avm.dayCell,
//                         isActive && avm.dayCellActive,
//                         isToday && !isActive && avm.dayCellToday,
//                       ]}
//                       onPress={() => handleDayPress(day)}
//                       activeOpacity={0.7}
//                     >
//                       <Text
//                         style={[
//                           avm.dayNum,
//                           isActive && avm.dayNumActive,
//                           isToday && !isActive && avm.dayNumToday,
//                         ]}
//                       >
//                         {day}
//                       </Text>
//                       {slot && (
//                         <View
//                           style={[
//                             avm.slotDot,
//                             { backgroundColor: slotColor(slot) },
//                           ]}
//                         >
//                           {slot === 'full' ? null : (
//                             <Text style={avm.slotDotTxt}>
//                               {slotLabel(slot)}
//                             </Text>
//                           )}
//                         </View>
//                       )}
//                     </TouchableOpacity>
//                   );
//                 })}
//               </View>
//             ))}
//           </View>

//           {/* Slot picker — shown when a date is tapped */}
//           {activeDate && (
//             <View style={avm.slotPicker}>
//               <Text style={avm.slotPickerLabel}>
//                 {new Date(activeDate + 'T00:00:00').toLocaleDateString(
//                   'en-IN',
//                   {
//                     day: '2-digit',
//                     month: 'short',
//                     year: 'numeric',
//                   },
//                 )}
//               </Text>
//               <View style={avm.slotBtns}>
//                 {(['am', 'pm', 'full', null] as DaySlot[]).map((s, i) => {
//                   const label = s === null ? 'Off' : s.toUpperCase();
//                   const current = availability[activeDate] ?? null;
//                   const isOn = current === s;
//                   return (
//                     <TouchableOpacity
//                       key={i}
//                       style={[
//                         avm.slotBtn,
//                         isOn && {
//                           backgroundColor: slotColor(s),
//                           borderColor: slotColor(s),
//                         },
//                       ]}
//                       onPress={() => setSlotForActive(s)}
//                       activeOpacity={0.7}
//                     >
//                       <Text
//                         style={[
//                           avm.slotTxt,
//                           isOn && { color: s === 'am' ? '#5f3d00' : C.white },
//                         ]}
//                       >
//                         {label}
//                       </Text>
//                     </TouchableOpacity>
//                   );
//                 })}
//               </View>
//             </View>
//           )}

//           {/* Legend */}
//           <View style={avm.legend}>
//             {[
//               { slot: 'am' as DaySlot, label: 'Morning' },
//               { slot: 'pm' as DaySlot, label: 'Afternoon' },
//               { slot: 'full' as DaySlot, label: 'Full day' },
//             ].map(({ slot, label }) => (
//               <View key={label} style={avm.legendItem}>
//                 <View
//                   style={[avm.legendDot, { backgroundColor: slotColor(slot) }]}
//                 />
//                 <Text style={avm.legendTxt}>{label}</Text>
//               </View>
//             ))}
//           </View>

//           {/* Saved Dates Modal */}
//           <Modal
//             visible={showSavedDates}
//             transparent
//             animationType="fade"
//             onRequestClose={() => setShowSavedDates(false)}
//           >
//             <View
//               style={{
//                 flex: 1,
//                 backgroundColor: 'rgba(0,0,0,0.45)',
//                 justifyContent: 'center',
//                 alignItems: 'center',
//                 padding: scale(20),
//               }}
//             >
//               <View
//                 style={{
//                   width: '100%',
//                   maxHeight: '75%',
//                   backgroundColor: C.white,
//                   borderRadius: scale(20),
//                   padding: scale(18),
//                 }}
//               >
//                 <View
//                   style={{
//                     flexDirection: 'row',
//                     justifyContent: 'space-between',
//                     alignItems: 'center',
//                     marginBottom: scale(14),
//                   }}
//                 >
//                   <Text
//                     style={{
//                       fontSize: scale(17),
//                       fontWeight: '800',
//                       color: C.text,
//                     }}
//                   >
//                     Saved Availability
//                   </Text>

//                   <TouchableOpacity onPress={() => setShowSavedDates(false)}>
//                     <Text style={{ fontSize: scale(18) }}>✕</Text>
//                   </TouchableOpacity>
//                 </View>

//                 <ScrollView showsVerticalScrollIndicator={false}>
//                   {Object.keys(groupedAvailability).length === 0 ? (
//                     <Text
//                       style={{
//                         textAlign: 'center',
//                         color: C.textMuted,
//                         marginTop: scale(20),
//                       }}
//                     >
//                       No availability added
//                     </Text>
//                   ) : (
//                     Object.entries(groupedAvailability).map(
//                       ([month, dates]: any, idx) => (
//                         <View key={idx} style={{ marginBottom: scale(18) }}>
//                           <Text
//                             style={{
//                               fontSize: scale(15),
//                               fontWeight: '800',
//                               color: C.primary,
//                               marginBottom: scale(10),
//                             }}
//                           >
//                             {month}
//                           </Text>

//                           <View
//                             style={{
//                               flexDirection: 'row',
//                               flexWrap: 'wrap',
//                             }}
//                           >
//                             {dates.map((item: any, i: number) => (
//                               <View
//                                 key={i}
//                                 style={{
//                                   backgroundColor: slotColor(item.slot),
//                                   paddingHorizontal: scale(12),
//                                   paddingVertical: scale(8),
//                                   borderRadius: scale(12),
//                                   marginRight: scale(8),
//                                   marginBottom: scale(8),
//                                 }}
//                               >
//                                 <Text
//                                   style={{
//                                     color: C.white,
//                                     fontWeight: '700',
//                                     fontSize: scale(12),
//                                   }}
//                                 >
//                                   {item.day} • {item.slot}
//                                 </Text>
//                               </View>
//                             ))}
//                           </View>
//                         </View>
//                       ),
//                     )
//                   )}
//                 </ScrollView>
//               </View>
//             </View>
//           </Modal>

//           {/* Action buttons */}
//           <View style={avm.btns}>
//             <TouchableOpacity
//               style={avm.cancelBtn}
//               onPress={onClose}
//               activeOpacity={0.7}
//             >
//               <Text style={avm.cancelTxt}>Cancel</Text>
//             </TouchableOpacity>
//             <TouchableOpacity
//               style={[avm.saveBtn, loading && { opacity: 0.6 }]}
//               onPress={() => onSave(availability)}
//               disabled={loading}
//               activeOpacity={0.85}
//             >
//               {loading ? (
//                 <ActivityIndicator color={C.white} size="small" />
//               ) : (
//                 <Text style={avm.saveTxt}>Save</Text>
//               )}
//             </TouchableOpacity>
//           </View>
//         </View>
//       </View>
//     </Modal>
//   );
// };

// const avm = StyleSheet.create({
//   overlay: {
//     flex: 1,
//     backgroundColor: 'rgba(0,30,35,0.55)',
//     justifyContent: 'flex-end',
//   },
//   sheet: {
//     backgroundColor: C.white,
//     borderTopLeftRadius: scale(24),
//     borderTopRightRadius: scale(24),
//     padding: scale(20),
//     paddingBottom: Platform.OS === 'ios' ? 36 : scale(24),
//     maxHeight: '92%',
//   },
//   handle: {
//     width: scale(40),
//     height: 4,
//     borderRadius: 2,
//     backgroundColor: C.border,
//     alignSelf: 'center',
//     marginBottom: scale(14),
//   },
//   headerRow: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'space-between',
//     marginBottom: scale(4),
//   },
//   title: { fontSize: scale(20), fontWeight: '800', color: C.text },
//   closeX: { fontSize: scale(16), color: C.textMuted, fontWeight: '700' },
//   subtitle: {
//     fontSize: scale(13),
//     color: C.textMuted,
//     marginBottom: scale(14),
//   },

//   selectors: { marginBottom: scale(14) },
//   pillRow: { flexDirection: 'row', gap: scale(6), paddingVertical: scale(4) },
//   monthPill: {
//     paddingHorizontal: scale(12),
//     paddingVertical: scale(6),
//     borderRadius: scale(20),
//     borderWidth: 1.5,
//     borderColor: C.border,
//     backgroundColor: C.bg,
//   },
//   monthPillOn: { backgroundColor: C.primary, borderColor: C.primary },
//   monthPillTxt: { fontSize: scale(12), color: C.textMuted, fontWeight: '700' },
//   monthPillTxtOn: { color: C.white },
//   yearRow: { flexDirection: 'row', gap: scale(8), marginTop: scale(10) },
//   yearBtn: {
//     paddingHorizontal: scale(16),
//     paddingVertical: scale(6),
//     borderRadius: scale(10),
//     borderWidth: 1.5,
//     borderColor: C.border,
//     backgroundColor: C.bg,
//   },
//   yearBtnOn: { backgroundColor: C.primaryDeep, borderColor: C.primaryDeep },
//   yearTxt: { fontSize: scale(13), color: C.textMuted, fontWeight: '700' },
//   yearTxtOn: { color: C.white },

//   calendarBox: {
//     backgroundColor: C.bg,
//     borderRadius: scale(16),
//     paddingVertical: scale(12),
//     paddingHorizontal: scale(4),
//     borderWidth: 1,
//     borderColor: C.border,
//     marginBottom: scale(12),
//     width: '100%',
//     alignSelf: 'center',
//   },
//   weekRow: { flexDirection: 'row' },
//   weekLabel: {
//     flex: 1,
//     textAlign: 'center',
//     fontSize: scale(11),
//     color: C.textMuted,
//     fontWeight: '700',
//     paddingBottom: scale(8),
//   },
//   dayCell: {
//     flex: 1,
//     aspectRatio: 0.9,
//     minHeight: scale(46),
//     alignItems: 'center',
//     justifyContent: 'center',
//     borderRadius: scale(8),
//     margin: scale(1),
//   },
//   dayCellActive: { backgroundColor: C.primary },
//   dayCellToday: { borderWidth: 1.5, borderColor: C.primary },
//   dayNum: { fontSize: scale(13), color: C.text, fontWeight: '600' },
//   dayNumActive: { color: C.white, fontWeight: '800' },
//   dayNumToday: { color: C.primary, fontWeight: '800' },
//   slotDot: {
//     width: scale(14),
//     height: scale(12),
//     borderRadius: scale(3),
//     marginTop: scale(2),
//     alignItems: 'center',
//     justifyContent: 'center',
//   },
//   slotDotTxt: { fontSize: scale(7), color: C.white, fontWeight: '900' },

//   slotPicker: {
//     backgroundColor: C.primaryLight,
//     borderRadius: scale(14),
//     padding: scale(12),
//     marginBottom: scale(10),
//   },
//   slotPickerLabel: {
//     fontSize: scale(13),
//     color: C.primaryDark,
//     fontWeight: '700',
//     marginBottom: scale(10),
//   },
//   slotBtns: { flexDirection: 'row', gap: scale(8) },
//   slotBtn: {
//     flex: 1,
//     paddingVertical: scale(10),
//     borderRadius: scale(10),
//     borderWidth: 1.5,
//     borderColor: C.border,
//     backgroundColor: C.white,
//     alignItems: 'center',
//   },
//   slotTxt: { fontSize: scale(13), color: C.textMuted, fontWeight: '700' },

//   legend: { flexDirection: 'row', gap: scale(16), marginBottom: scale(14) },
//   legendItem: { flexDirection: 'row', alignItems: 'center', gap: scale(6) },
//   legendDot: { width: scale(10), height: scale(10), borderRadius: scale(5) },
//   legendTxt: { fontSize: scale(12), color: C.textMuted, fontWeight: '600' },

//   btns: { flexDirection: 'row', gap: scale(10) },
//   cancelBtn: {
//     flex: 1,
//     borderWidth: 1.5,
//     borderColor: C.border,
//     borderRadius: scale(12),
//     paddingVertical: scale(14),
//     alignItems: 'center',
//   },
//   cancelTxt: { color: C.textSub, fontWeight: '700', fontSize: scale(14) },
//   saveBtn: {
//     flex: 2,
//     backgroundColor: C.primary,
//     borderRadius: scale(12),
//     paddingVertical: scale(14),
//     alignItems: 'center',
//   },
//   saveTxt: { color: C.white, fontWeight: '800', fontSize: scale(14) },
// });

// const MiniMonthCalendar = ({
//   monthYear,
//   availability,
// }: {
//   monthYear: string;
//   availability: DateAvailability;
// }) => {
//   const [month, year] = monthYear.split(' ');
//   const monthIndex = MONTH_NAMES.indexOf(month);
//   const now = new Date();

//   const firstDay = new Date(Number(year), monthIndex, 1).getDay();
//   const daysInMonth = new Date(Number(year), monthIndex + 1, 0).getDate();
//   const startOffset = (firstDay + 6) % 7;

//   const dateKey = (day: number) =>
//     `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(
//       2,
//       '0',
//     )}`;

//   const cells: (number | null)[] = [
//     ...Array(startOffset).fill(null),
//     ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
//   ];
//   while (cells.length % 7 !== 0) cells.push(null);

//   return (
//     <View style={styles.miniCal}>
//       <View style={styles.miniWeekRow}>
//         {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map(d => (
//           <Text key={d} style={styles.miniWeekLabel}>
//             {d}
//           </Text>
//         ))}
//       </View>
//       {Array.from({ length: Math.ceil(cells.length / 7) }, (_, row) => (
//         <View key={row} style={styles.miniWeekRow}>
//           {cells.slice(row * 7, row * 7 + 7).map((day, col) => {
//             if (!day) return <View key={col} style={styles.miniDayCell} />;
//             const key = dateKey(day);
//             const slot = availability[key] ?? null;
//             const isToday =
//               day === now.getDate() &&
//               monthIndex === now.getMonth() &&
//               Number(year) === now.getFullYear();

//             return (
//               <View
//                 key={col}
//                 style={[
//                   styles.miniDayCell,
//                   isToday && styles.miniDayCellToday,
//                   slot && { backgroundColor: slotColor(slot) + '20' },
//                 ]}
//               >
//                 <Text
//                   style={[styles.miniDayNum, slot && { fontWeight: '700' }]}
//                 >
//                   {day}
//                 </Text>
//                 {slot && (
//                   <View
//                     style={[
//                       styles.miniDot,
//                       { backgroundColor: slotColor(slot) },
//                     ]}
//                   />
//                 )}
//               </View>
//             );
//           })}
//         </View>
//       ))}
//     </View>
//   );
// };
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

const SPECIALITY_MAP: Record<string, string[]> = {
  'General Medicine': [
    'Cardiology',
    'Neurology',
    'Nephrology',
    'Gastroenterology',
    'Endocrinology',
    'Clinical Hematology',
    'Medical Oncology',
    'Rheumatology',
    'Infectious Diseases',
    'Critical Care Medicine',
    'Hepatology',
    'Geriatrics',
  ],

  Pediatrics: [
    'Neonatology',
    'Pediatric Cardiology',
    'Pediatric Neurology',
    'Pediatric Nephrology',
    'Pediatric Gastroenterology',
    'Pediatric Oncology',
    'Pediatric Critical Care',
  ],

  'General Surgery': [
    'Neurosurgery',
    'Urology',
    'Cardiothoracic & Vascular Surgery (CTVS)',
    'Surgical Oncology',
    'Pediatric Surgery',
    'GI Surgery',
    'Plastic Surgery',
    'Vascular Surgery',
    'Thoracic Surgery',
    'Transplant Surgery',
  ],

  Orthopedics: [
    'Spine Surgery',
    'Arthroscopy',
    'Joint Replacement',
    'Pediatric Orthopedics',
    'Sports Injury Surgery',
    'Hand Surgery',
  ],

  'Obstetrics & Gynecology': [
    'Reproductive Medicine',
    'Gynecologic Oncology',
    'Maternal & Fetal Medicine',
    'Urogynecology',
    'Fetal Medicine',
  ],

  'ENT (Otorhinolaryngology)': [
    'Head & Neck Surgery',
    'Otology',
    'Neurotology',
    'Rhinology',
    'Laryngology',
  ],

  Ophthalmology: [
    'Retina',
    'Cornea',
    'Glaucoma',
    'Oculoplasty',
    'Pediatric Ophthalmology',
    'Neuro-Ophthalmology',
  ],

  Dermatology: [
    'Dermatosurgery',
    'Cosmetic Dermatology',
    'Trichology',
    'Pediatric Dermatology',
  ],

  Psychiatry: [
    'Child Psychiatry',
    'Addiction Psychiatry',
    'Geriatric Psychiatry',
    'Consultation-Liaison Psychiatry',
  ],

  Radiology: [
    'Interventional Radiology',
    'Neuroradiology',
    'Pediatric Radiology',
  ],

  Anesthesiology: [
    'Critical Care',
    'Cardiac Anesthesia',
    'Neuroanesthesia',
    'Pain Medicine',
    'Pediatric Anesthesia',
  ],

  'Pulmonary Medicine': [
    'Critical Care Medicine',
    'Sleep Medicine',
    'Interventional Pulmonology',
  ],

  Pathology: [
    'Hematopathology',
    'Molecular Pathology',
    'Neuropathology',
    'Cytopathology',
  ],

  'Emergency Medicine': ['Trauma Care', 'Critical Care', 'Toxicology'],

  'Nuclear Medicine': ['PET Imaging', 'Radionuclide Therapy'],

  'Physical Medicine & Rehabilitation': [
    'Neurorehabilitation',
    'Sports Rehabilitation',
    'Pain Rehabilitation',
  ],

  'Community Medicine': ['Epidemiology', 'Public Health Administration'],

  'Family Medicine': ['Geriatric Care', 'Palliative Care'],

  'Dentistry (BDS)': [
    'Orthodontics',
    'Oral Surgery',
    'Prosthodontics',
    'Endodontics',
    'Periodontics',
    'Pedodontics',
  ],

  'Cardiac Sciences': ['Interventional Cardiology', 'Electrophysiology'],

  'Neurology Sciences': ['Stroke Medicine', 'Epilepsy', 'Movement Disorders'],

  Oncology: ['Radiation Oncology', 'Surgical Oncology', 'Medical Oncology'],

  'Gastro Sciences': ['Hepatology', 'GI Surgery', 'Pancreatology'],

  'Renal Sciences': ['Renal Transplant', 'Dialysis Medicine'],
};

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
  const [localProfilePicUri, setLocalProfilePicUri] = useState<string | null>(
    null,
  );

  const [medRegModalVisible, setMedRegModalVisible] = useState(false);
  const [medRegModalInitial, setMedRegModalInitial] = useState<any>(null);
  const [medRegEditIndex, setMedRegEditIndex] = useState<number | undefined>(
    undefined,
  );

  const [eduModalVisible, setEduModalVisible] = useState(false);
  const [eduModalInitial, setEduModalInitial] = useState<any>(null);
  const [eduModalEditIndex, setEduModalEditIndex] = useState<
    number | undefined
  >(undefined);

  // Add these alongside your other modal states:
  const [clinicalModalVisible, setClinicalModalVisible] = useState(false);

  const handleClinicalSave = async (data: any) => {
    await updateProfile({ clinical_area_experience: data });
    setClinicalModalVisible(false);
  };

  const [showClinicalAreas, setShowClinicalAreas] = useState(false);

  const [availabilityModalVisible, setAvailabilityModalVisible] =
    useState(false);
  // REMOVE:
  const [daySlots, setDaySlots] = useState<Record<string, DaySlot>>({});

  const [dateAvailability, setDateAvailability] = useState<DateAvailability>(
    {},
  );

  const [expModalVisible, setExpModalVisible] = useState(false);
  const [expModalInitial, setExpModalInitial] = useState<any>(null);
  const [expModalIdx, setExpModalIdx] = useState<number | undefined>(undefined);

  const [deletingResume, setDeletingResume] = useState(false);
  const [deletingProfilePic, setDeletingProfilePic] = useState(false);
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
            logout(); // ← this alone is enough; navigator reacts automatically
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

      // Sync availability for UI display
      const availMap: DateAvailability = {};
      if (doctor.availability?.length) {
        doctor.availability.forEach((item: any) => {
          if (item?.date) {
            const dateStr = String(item.date).split('T')[0];
            availMap[dateStr] = item.slot as DaySlot;
          }
        });
      }
      setDateAvailability(availMap);

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
              logout(); // navigator handles the rest
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

  const handleUploadProfilePic = async () => {
    if (!token || !profile) {
      Alert.alert('Error', 'Session expired.');
      return;
    }
    try {
      const result = await pick({ type: [types.images] });
      if (!result) return;
      const file = Array.isArray(result) ? result[0] : result;
      if (!file?.uri) return;
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
      if (
        err?.code === 'DOCUMENT_PICKER_CANCELED' ||
        err?.message?.toLowerCase()?.includes('cancel')
      )
        return;
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
      Alert.alert('Upload Failed', err.message || 'Could not upload resume.');
    } finally {
      setUploadingResume(false);
    }
  };

  // ─── Delete Resume ────────────────────────────────────────────────────────

  const handleDeleteResume = () => {
    if (!token || !profile) return;
    Alert.alert(
      'Delete Resume',
      'Are you sure you want to delete your resume?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeletingResume(true);
            try {
              const res = await fetch(
                `${BASE_URL}/api/doctors/delete-resume/${profile._id}`,
                {
                  method: 'DELETE',
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                  },
                },
              );
              const data = await res.json();
              if (!res.ok) throw new Error(data?.message || 'Delete failed');
              const updated: DoctorProfile = { ...profile, resume_url: '' };
              setProfile(updated);
              setAuthDoctor(updated);
              setProfile(updated as DoctorProfile);
              setAuthDoctor(updated as DoctorProfile);
              Alert.alert('Success', 'Resume deleted successfully');
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Could not delete resume.');
            } finally {
              setDeletingResume(false);
            }
          },
        },
      ],
      { cancelable: true },
    );
  };

  // ─── Delete Profile Picture ───────────────────────────────────────────────

  const handleDeleteProfilePic = () => {
    if (!token || !profile) return;
    Alert.alert(
      'Delete Profile Picture',
      'Are you sure you want to delete your profile picture?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeletingProfilePic(true);
            setLocalProfilePicUri(null);
            try {
              const res = await fetch(
                `${BASE_URL}/api/doctors/delete-photo/${profile._id}`,
                {
                  method: 'DELETE',
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                  },
                },
              );
              const data = await res.json();
              if (!res.ok) throw new Error(data?.message || 'Delete failed');
              const updated: DoctorProfile = {
                ...profile,
                profile_pic_url: '',
              };
              setProfile(updated);
              setLocalProfilePicUri(null);
              setAuthDoctor(updated);
              setProfile(updated as DoctorProfile);
              setAuthDoctor(updated as DoctorProfile);
              Alert.alert('Success', 'Profile picture deleted successfully');
            } catch (err: any) {
              Alert.alert(
                'Error',
                err.message || 'Could not delete profile picture.',
              );
            } finally {
              setDeletingProfilePic(false);
            }
          },
        },
      ],
      { cancelable: true },
    );
  };

  const handlePreviewResume = () => {
    const url = profile?.resume_url;
    if (!url) return;
    Linking.openURL(url).catch(() =>
      Alert.alert(
        'Error',
        'Could not open resume. Try downloading it instead.',
      ),
    );
  };

  // ─── Modal Openers ────────────────────────────────────────────────────────

  const openPersonalEdit = () => {
    if (!profile) return;
    setModalState({
      visible: true,
      title: 'Edit Personal Details',
      fields: [
        {
          key: 'prefix',
          label: 'Prefix',
          value: profile.prefix || '',
          placeholder: 'Dr. / Mr. / Ms.',
        },
        {
          key: 'first_name',
          label: 'First Name',
          value: profile.first_name || '',
          placeholder: 'First name',
        },
        {
          key: 'middle_name',
          label: 'Middle Name',
          value: profile.middle_name || '',
          placeholder: 'Middle name (optional)',
        },
        {
          key: 'last_name',
          label: 'Last Name',
          value: profile.last_name || '',
          placeholder: 'Last name',
        },
        {
          key: 'email',
          label: 'Email',
          value: profile.email || '',
          keyboardType: 'email-address',
          placeholder: 'doctor@example.com',
        },
        {
          key: 'specialization',
          label: 'Specialization',
          value:
            profile.specialization || profile.education?.[0]?.speciality || '',
          placeholder: 'e.g. Cardiology',
        },
        {
          key: 'years_of_experience',
          label: 'Total Years of Experience',
          value: String(profile.experience?.[0]?.years_of_experience || ''),
          keyboardType: 'numeric',
          placeholder: 'e.g. 5',
        },
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
          key: 'address_line1',
          label: 'Address Line 1',
          value: profile.address_line1 || '',
          placeholder: 'House / Flat / Building...',
        },
        {
          key: 'address_line2',
          label: 'Address Line 2',
          value: profile.address_line2 || '',
          placeholder: 'Near landmark, area...',
        },
        {
          key: 'city_district',
          label: 'City',
          value: profile.city_district || '',
          placeholder: 'e.g. Mumbai',
        },
        {
          key: 'state',
          label: 'State',
          value: profile.state || '',
          placeholder: 'e.g. Maharashtra',
        },
        {
          key: 'current_location_pincode',
          label: 'Pincode',
          value: profile.current_location_pincode || '',
          keyboardType: 'numeric',
          placeholder: 'e.g. 400001',
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

  // ─── Experience ───────────────────────────────────────────────────────────

  const openExperienceModal = (exp?: any, idx?: number) => {
    setExpModalInitial({
      ...(exp || {}),
      // attach top-level clinical data so modal can pre-populate
      clinical_area_experience:
        (profile as any)?.clinical_area_experience || {},
    });
    setExpModalIdx(idx);
    setExpModalVisible(true);
  };

  const handleExperienceSave = (data: any) => {
    const existing = profile?.experience || [];
    const newExp = {
      clinic_hospital_name: data.clinic_hospital_name,
      designation: data.designation,
      years_of_experience: data.years_of_experience,
      start_date: data.start_date || undefined,
      end_date: data.end_date || undefined,
      is_current: data.is_current,
    };
    const updated =
      expModalIdx !== undefined
        ? existing.map((ex, i) =>
            i === expModalIdx ? { ...ex, ...newExp } : ex,
          )
        : [...existing, newExp];
    setExpModalVisible(false);
    updateProfile({ experience: updated });
  };

  const handleDeleteExperience = (idx: number) => {
    confirmDelete(
      'Delete Experience',
      'Are you sure you want to remove this experience?',
      () => {
        const updated = (profile?.experience || []).filter((_, i) => i !== idx);
        updateProfile({ experience: updated });
      },
    );
  };

  // ─── Education ────────────────────────────────────────────────────────────

  const openEducationEdit = (edu?: any, idx?: number) => {
    setEduModalInitial(edu || null);
    setEduModalEditIndex(idx);
    setEduModalVisible(true);
  };

  const handleDeleteEducation = (idx: number) => {
    confirmDelete(
      'Delete Education',
      'Are you sure you want to remove this education record?',
      () => {
        const updated = (profile?.education || []).filter((_, i) => i !== idx);
        updateProfile({ education: updated });
      },
    );
  };

  // ─── Reference ────────────────────────────────────────────────────────────

  const openReferenceEdit = (ref?: Reference, idx?: number) => {
    const r = ref || {
      ref_name: '',
      ref_email: '',
      ref_contact_no: '',
      ref_profession: '',
      ref_designation: '',
      ref_clinic: '',
    };
    setModalState({
      visible: true,
      title: idx !== undefined ? 'Edit Reference' : 'Add Reference',
      fields: [
        {
          key: 'ref_name',
          label: 'Reference Name (Full Name)',
          value: r.ref_name,
          placeholder: 'Dr. Full Name',
        },
        {
          key: 'ref_profession',
          label: 'Designation (Profession)',
          value: r.ref_profession,
          placeholder: 'e.g. Senior Physician',
        },
        {
          key: 'ref_clinic',
          label: 'Clinic / Hospital',
          value: (r as any).ref_clinic || '',
          placeholder: 'e.g. Apollo Hospital',
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

  const handleDeleteReference = (idx: number) => {
    confirmDelete(
      'Delete Reference',
      'Are you sure you want to remove this reference?',
      () => {
        const updated = (profile?.references || []).filter((_, i) => i !== idx);
        updateProfile({ references: updated });
      },
    );
  };

  // ─── Preferences ─────────────────────────────────────────────────────────

  const [prefModalVisible, setPrefModalVisible] = useState(false);
  const [prefForm, setPrefForm] = useState({
    preferred_pincode: '',
    city_district: '',
    state: '',
    address_line1: '',
    preferred_distance_km: '',
  });
  const prefAcRef = useRef<any>(null);

  const openPreferencesEdit = () => {
    if (!profile) return;
    setPrefForm({
      preferred_pincode: profile.preferred_pincode || '',
      city_district: profile.city_district || '',
      state: profile.state || '',
      address_line1: profile.address_line1 || '',
      preferred_distance_km: String(profile.preferred_distance_km || ''),
    });
    setPrefModalVisible(true);
  };

  const handlePrefSave = () => {
    updateProfile({
      preferred_pincode: prefForm.preferred_pincode,
      city_district: prefForm.city_district,
      state: prefForm.state,
      address_line1: prefForm.address_line1,
      preferred_distance_km:
        Number(prefForm.preferred_distance_km) ||
        profile?.preferred_distance_km,
    });
    setPrefModalVisible(false);
  };

  // ─── Availability ─────────────────────────────────────────────────────────

  const handleAvailabilitySave = (dates: DateAvailability) => {
    if (!profile || !token) return;

    const availabilityArray = Object.entries(dates).map(([date, slot]) => ({
      date,
      slot: slot === 'full' ? 'full' : (slot || 'full').toLowerCase(),
    }));

    setDateAvailability(dates);

    updateProfile({ availability: availabilityArray })
      .then(() => {
        setAvailabilityModalVisible(false);
        Alert.alert('Success', 'Availability updated successfully');
      })
      .catch((err: any) => {
        Alert.alert('Error', err.message || 'Failed to save availability');
        setAvailabilityModalVisible(false);
      });
  };
  // ─── Medical Registration (Fixed) ─────────────────────────────────────────

  const openMedRegModal = (reg?: any, idx?: number) => {
    if (reg) {
      // Normalise: build certificate list from certificate_urls array
      // or fall back to single certificate_url for older records
      const certUrls: string[] = reg.certificate_urls?.length
        ? reg.certificate_urls
        : reg.certificate_url
        ? [reg.certificate_url]
        : [];

      setMedRegModalInitial({
        ...reg,
        // Pass normalised array so modal can show all previews
        certificate_urls: certUrls,
      });
    } else {
      setMedRegModalInitial(null);
    }
    setMedRegEditIndex(idx);
    setMedRegModalVisible(true);
  };
  const handleMedRegSave = async (data: any) => {
    if (!profile || !token) return;
    setUploadingCert(true);

    try {
      const existingRegs = (profile as any)?.medical_registrations || [];

      // 1 certificate per registration
      const existingCertCount = data.existing_certificate_urls?.length || 0;
      const newCertCount = data.certificate_files?.length || 0;
      if (existingCertCount + newCertCount > 1) {
        Alert.alert(
          'Limit Exceeded',
          'Only 1 certificate is allowed per registration.',
        );
        return;
      }

      const regData = {
        registration_type: data.registration_type,
        medical_council_name: data.medical_council_name,
        registration_number: data.registration_number,
        registration_date: data.registration_date,
      };

      const updated = await uploadMedicalRegistration(
        regData,
        data.certificate_files || [],
        data.existing_certificate_urls || [],
        existingRegs,
        profile._id,
        token,
        medRegEditIndex,
      );

      setProfile(updated);
      setAuthDoctor(updated);
      setMedRegModalVisible(false);
      setMedRegModalInitial(null);
      setMedRegEditIndex(undefined);
      Alert.alert(
        'Success',
        medRegEditIndex !== undefined
          ? 'Registration updated successfully'
          : 'Medical registration added successfully',
      );
    } catch (err: any) {
      Alert.alert(
        'Upload Failed',
        err.message || 'Could not save registration.',
      );
    } finally {
      setUploadingCert(false);
    }
  };

  const handleDeleteMedReg = (idx: number) => {
    confirmDelete(
      'Delete Registration',
      'Are you sure you want to remove this medical registration?',
      async () => {
        if (!profile || !token) return;
        setSaving(true);
        try {
          const existing = (profile as any)?.medical_registrations || [];

          const filtered = existing
            .filter((_: any, i: number) => i !== idx)
            .map((r: any) => ({
              registration_type: r.registration_type,
              medical_council_name: r.medical_council_name,
              registration_number: r.registration_number,
              registration_date: r.registration_date,
              certificate_url: r.certificate_url
                ? r.certificate_url.split('?')[0]
                : '',
            }));

          // Hit the JSON update endpoint, NOT the multipart complete-profile
          const res = await fetch(`${BASE_URL}/api/doctors/update-profile`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              medical_registrations: filtered,
            }),
          });

          const data = await res.json();
          if (!res.ok) throw new Error(data?.message || 'Delete failed');

          const updated = data?.doctor || data?.data || data;
          if (!updated?._id) throw new Error('Invalid response from server');

          setProfile(updated);
          setAuthDoctor(updated);
          Alert.alert('Success', 'Registration deleted successfully');
        } catch (err: any) {
          Alert.alert('Error', err.message || 'Could not delete registration.');
        } finally {
          setSaving(false);
        }
      },
    );
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

  const generateMonths = () => {
    const months = [];
    const now = new Date();

    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() + i, 1);

      months.push({
        month: date.getMonth(),
        year: date.getFullYear(),
      });
    }

    return months;
  };

  const monthsList = generateMonths();

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
                  value={`+91 ${profile.alternate_mobile_number}`}
                  icon="📱"
                />
              )}
            </View>
            <View style={styles.col}>
              <InfoRow label="Email" value={profile.email} icon="✉️" />

              {(profile as any).specialization && (
                <InfoRow
                  label="Specialization"
                  value={(profile as any).specialization}
                />
              )}
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
          // addLabel="Education"
        >
          {profile.education?.length ? (
            profile.education.map((edu, i) => (
              <View
                key={(edu as any)._id || i}
                style={[styles.expCard, i > 0 && styles.expCardBorder]}
              >
                <View style={styles.expIconCol}>
                  <View style={styles.expIcon}>
                    <Text style={{ fontSize: scale(16) }}>🏫</Text>
                  </View>
                </View>
                <View style={styles.expBody}>
                  <Text style={styles.expTitle}>
                    {edu.degree === 'Other'
                      ? (edu as any).specify_degree
                      : edu.degree}
                  </Text>
                  <Text style={styles.expSub}>{edu.speciality}</Text>
                  {(edu as any).super_speciality && (
                    <Text style={styles.expMeta}>
                      Super: {(edu as any).super_speciality}
                    </Text>
                  )}
                  {edu.university && (
                    <Text style={styles.expMeta}>{edu.university}</Text>
                  )}
                  {(edu as any).location && (
                    <Text style={styles.expDate}>
                      📍 {(edu as any).location}
                    </Text>
                  )}
                  {edu.pass_out_year && (
                    <Text style={styles.expDate}>
                      Passed out: {edu.pass_out_year}
                    </Text>
                  )}
                </View>
                {/* Edit + Delete */}
                <View style={styles.actionBtns}>
                  <TouchableOpacity
                    style={styles.expEditBtn}
                    onPress={() => openEducationEdit(edu, i)}
                  >
                    <Text style={{ fontSize: scale(13) }}>✏️</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.expDeleteBtn}
                    onPress={() => handleDeleteEducation(i)}
                  >
                    <Text style={{ fontSize: scale(13) }}>🗑️</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>
              No education records added. Tap + to add education.
            </Text>
          )}
        </SectionCard>

        <SectionCard
          title="Experience"
          icon="🏥"
          onAdd={() => openExperienceModal()}
        >
          {/* ── Clinical Area Experience row ── */}

          {(() => {
            const cae = (profile as any)?.clinical_area_experience || {};
            const activeAreas = CLINICAL_CONFIG.filter(
              c => cae[c.key]?.status === 'yes',
            );

            return (
              <View style={styles.caeContainer}>
                {/* ── Header row — single line ── */}
                <View style={styles.caeHeaderRow}>
                  {/* Left: icon + title + subtitle */}
                  <View style={styles.caeHeaderLeft}>
                    <View style={styles.caeIconWrap}>
                      <Text style={{ fontSize: scale(15) }}>🩺</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.caeTitle}>
                        Clinical Area Experience
                      </Text>
                      <Text style={styles.caeSub}>
                        {activeAreas.length === 0
                          ? 'No clinical areas added'
                          : `${activeAreas.length} area${
                              activeAreas.length !== 1 ? 's' : ''
                            } added`}
                      </Text>
                    </View>
                  </View>

                  {/* Right: edit + chevron */}
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: scale(6),
                    }}
                  >
                    <TouchableOpacity
                      style={styles.caeEditBtn}
                      onPress={() => setClinicalModalVisible(true)}
                      activeOpacity={0.7}
                    >
                      <Text style={{ fontSize: scale(13) }}>✏️</Text>
                    </TouchableOpacity>

                    {activeAreas.length > 0 && (
                      <TouchableOpacity
                        style={styles.caeChevronBtn}
                        onPress={() => setShowClinicalAreas(p => !p)}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={{
                            fontSize: scale(26),
                            color: C.primary,
                            fontWeight: '900',
                            lineHeight: scale(22),
                            transform: [
                              { rotate: showClinicalAreas ? '180deg' : '0deg' },
                            ],
                          }}
                        >
                          ▾
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                {/* ── Expanded cards ── */}
                {showClinicalAreas && activeAreas.length > 0 && (
                  <View style={styles.caeCardsWrap}>
                    {activeAreas.map((c, idx) => (
                      <View
                        key={c.key}
                        style={[
                          styles.caeCard,
                          idx > 0 && styles.caeCardBorder,
                        ]}
                      >
                        {/* Top row: label badge + years badge */}
                        <View style={styles.caeCardTop}>
                          <View style={styles.caeCardBadge}>
                            <Text style={styles.caeCardBadgeTxt}>
                              {c.label}
                            </Text>
                          </View>
                          {!!cae[c.key]?.years && (
                            <View style={styles.caeYearsBadge}>
                              <Text style={styles.caeYearsTxt}>
                                {cae[c.key].years} yr
                                {Number(cae[c.key].years) !== 1 ? 's' : ''}
                              </Text>
                            </View>
                          )}
                        </View>

                        {/* Subtitle */}
                        <Text style={styles.caeCardSubtitle}>{c.subtitle}</Text>

                        {/* Remarks */}
                        {!!cae[c.key]?.remarks && (
                          <View style={styles.caeRemarksWrap}>
                            <Text style={styles.caeRemarksLabel}>REMARKS</Text>
                            <Text style={styles.caeRemarksText}>
                              {cae[c.key].remarks}
                            </Text>
                          </View>
                        )}
                      </View>
                    ))}
                  </View>
                )}

                {/* Add button when empty */}
                {activeAreas.length === 0 && (
                  <TouchableOpacity
                    style={styles.caeAddBtn}
                    onPress={() => setClinicalModalVisible(true)}
                    activeOpacity={0.75}
                  >
                    <Text style={styles.caeAddTxt}>＋ Add Clinical Areas</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })()}
          {/* ── Divider ── */}
          <View style={[styles.divider, { marginVertical: scale(12) }]} />

          {/* ── Experience cards ── */}
          {profile.experience?.length ? (
            profile.experience.map((exp, i) => (
              <View
                key={(exp as any)._id || i}
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
                    {exp.is_current
                      ? 'Present'
                      : exp.end_date
                      ? formatDate(exp.end_date)
                      : ''}
                  </Text>
                  <Text style={styles.expMeta}>
                    {exp.years_of_experience} yrs experience
                  </Text>
                </View>
                <View style={styles.actionBtns}>
                  <TouchableOpacity
                    style={styles.expEditBtn}
                    onPress={() => openExperienceModal(exp, i)}
                    activeOpacity={0.7}
                  >
                    <Text style={{ fontSize: scale(13) }}>✏️</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.expDeleteBtn}
                    onPress={() => handleDeleteExperience(i)}
                    activeOpacity={0.7}
                  >
                    <Text style={{ fontSize: scale(13) }}>🗑️</Text>
                  </TouchableOpacity>
                </View>
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
          // addLabel="Reference"
        >
          {profile.references?.length ? (
            <View style={styles.refGrid}>
              {profile.references.map((ref, i) => (
                <View key={(ref as any)._id || i} style={styles.refCard}>
                  <View style={styles.refAvatar}>
                    <Text style={{ fontSize: scale(18) }}>👨‍⚕️</Text>
                  </View>
                  <Text style={styles.refName}>{ref.ref_name}</Text>
                  <Text style={styles.refProfession}>{ref.ref_profession}</Text>
                  {(ref as any).ref_clinic && (
                    <Text style={[styles.refProfession, { marginTop: 2 }]}>
                      🏥 {(ref as any).ref_clinic}
                    </Text>
                  )}
                  <View style={styles.refDivider} />
                  <Text style={styles.refMeta}>✉️ {ref.ref_email}</Text>
                  <Text style={styles.refMeta}>📱 {ref.ref_contact_no}</Text>
                  {/* Edit + Delete */}
                  <View style={styles.refActionRow}>
                    <TouchableOpacity
                      style={styles.refEditBtn}
                      onPress={() => openReferenceEdit(ref, i)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.refEditTxt}>✏️ Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.refDeleteBtn}
                      onPress={() => handleDeleteReference(i)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.refDeleteTxt}>🗑️</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.emptyText}>No references added yet</Text>
          )}
        </SectionCard>

        {/* ── MEDICAL REGISTRATIONS ── */}
        <SectionCard
          title="Medical Registrations"
          icon="🏛️"
          onAdd={() => openMedRegModal()}
          // addLabel="Registration"
          addLoading={uploadingCert}
        >
          {(profile as any)?.medical_registrations?.length ? (
            (profile as any).medical_registrations.map(
              (reg: any, i: number) => (
                <View
                  key={i}
                  style={[styles.expCard, i > 0 && styles.expCardBorder]}
                >
                  <View style={styles.expIconCol}>
                    <View style={styles.expIcon}>
                      <Text style={{ fontSize: scale(16) }}>📋</Text>
                    </View>
                  </View>
                  <View style={styles.expBody}>
                    <Text style={styles.expTitle}>
                      {reg.registration_type || 'Registration'}
                    </Text>
                    <Text style={styles.expSub}>
                      {reg.medical_council_name}
                    </Text>
                    <Text style={styles.expDate}>
                      Reg No: {reg.registration_number}
                    </Text>
                    {reg.registration_date && (
                      <Text style={styles.expDate}>
                        Date: {reg.registration_date}
                      </Text>
                    )}
                    {/* Show count of all certificates */}
                    {(() => {
                      const urls = reg.certificate_urls?.length
                        ? reg.certificate_urls
                        : reg.certificate_url
                        ? [reg.certificate_url]
                        : [];
                      return urls.length > 0 ? (
                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 6,
                            marginTop: 2,
                          }}
                        >
                          {/* <Text
                            style={[styles.expMeta, { color: C.accentGreen }]}
                          >
                            ✓ {urls.length} certificate
                            {urls.length > 1 ? 's' : ''} attached
                          </Text> */}

                          <Text
                            style={[styles.expMeta, { color: C.accentGreen }]}
                          >
                            ✓{' '}
                            {reg.certificate_file_name
                              ? reg.certificate_file_name
                              : 'Certificate attached'}
                          </Text>
                        </View>
                      ) : null;
                    })()}
                  </View>
                  {/* Edit + Delete */}
                  <View style={styles.actionBtns}>
                    <TouchableOpacity
                      style={styles.expEditBtn}
                      onPress={() => openMedRegModal(reg, i)}
                      activeOpacity={0.7}
                    >
                      <Text style={{ fontSize: scale(13) }}>✏️</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.expDeleteBtn}
                      onPress={() => handleDeleteMedReg(i)}
                      activeOpacity={0.7}
                    >
                      <Text style={{ fontSize: scale(13) }}>🗑️</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ),
            )
          ) : (
            <Text style={styles.emptyText}>
              No medical registrations added yet.
            </Text>
          )}
        </SectionCard>

        {/* ── AVAILABILITY ──

        <SectionCard
          title="Availability Status"
          icon="📅"
          onEdit={() => setAvailabilityModalVisible(true)}
        >
          {/* <Text style={styles.prefLabel}>Saved Availability</Text> */}

        {!profile?.availability || profile.availability.length === 0 ? (
          <Text style={styles.emptyText}>
            No availability set yet. Tap Edit to add dates.
          </Text>
        ) : (
          <>
            {/* Scroll Indicator */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginBottom: scale(8),
              }}
            >
              {/* <Text style={{ fontSize: scale(13), color: C.textMuted }}>
                Scroll horizontally to see more months →
              </Text> */}
            </View>

            {/* <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{
                paddingVertical: scale(8),
                paddingRight: scale(20),
              }}
            >
              {Object.entries(
                (profile.availability || []).reduce((acc: any, item: any) => {
                  if (!item || !item.date) return acc;

                  const dateStr = String(item.date);
                  const date = new Date(dateStr);
                  if (isNaN(date.getTime())) return acc;

                  const monthYear = date.toLocaleString('default', {
                    month: 'long',
                    year: 'numeric',
                  });

                  if (!acc[monthYear]) acc[monthYear] = [];
                  acc[monthYear].push({
                    date: dateStr.split('T')[0],
                    slot: item.slot || 'full',
                    day: date.getDate(),
                  });
                  return acc;
                }, {}),
              )
                .sort(([a], [b]) => b.localeCompare(a)) // Newest first
                .map(([monthYear, dates]: any) => (
                  <View
                    key={monthYear}
                    style={{
                      marginRight: scale(20),
                      width: SW - scale(70), // Better responsive width
                      backgroundColor: C.white,
                      borderRadius: scale(16),
                      padding: scale(12),
                      borderWidth: 1,
                      borderColor: C.border,
                    }}
                  >
                    <Text
                      style={[
                        styles.prefLabel,
                        { color: C.primary, marginBottom: scale(8) },
                      ]}
                    >
                      {monthYear}
                    </Text>

                    {/* <MiniMonthCalendar
                        monthYear={monthYear}
                        availability={dateAvailability}
                      /> */}
            {/* 
                    <View
                      style={{
                        flexDirection: 'row',
                        flexWrap: 'wrap',
                        gap: scale(6),
                        marginTop: scale(10),
                      }}
                    >
                      {dates
                        .sort((a: any, b: any) => a.day - b.day)
                        .map((item: any, i: number) => (
                          <View
                            key={i}
                            style={{
                              backgroundColor: slotColor(item.slot),
                              paddingHorizontal: scale(12),
                              paddingVertical: scale(6),
                              borderRadius: scale(20),
                            }}
                          >
                            <Text
                              style={{
                                color: '#fff',
                                fontWeight: '700',
                                fontSize: scale(12.5),
                              }}
                            >
                              {item.day} •{' '}
                              {String(item.slot || 'Full').toUpperCase()}
                            </Text>
                          </View>
                        ))}
                    </View>
                  </View>
                ))}
            </ScrollView>  */}
          </>
        )}
        {/* </SectionCard>  */}

        {/* ── WORK PREFERENCES ── */}
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

          {/* ── Location Details ── */}
          <Text style={styles.prefLabel}>Preferred Location</Text>
          <View
            style={{
              // backgroundColor: C.primary,
              borderRadius: scale(12),
              padding: scale(12),
              marginBottom: scale(12),
              borderWidth: 1,
              borderColor: C.border,
            }}
          >
            {/* Pincode | City | State row */}
            <View
              style={{
                flexDirection: 'row',
                gap: scale(10),
                marginBottom: scale(10),
              }}
            >
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: scale(9),
                    fontWeight: '800',
                    color: C.textMuted,
                    letterSpacing: 0.8,
                    marginBottom: scale(4),
                  }}
                >
                  PINCODE
                </Text>
                <Text
                  style={{
                    fontSize: scale(13),
                    fontWeight: '700',
                    color: C.text,
                  }}
                >
                  {profile.preferred_pincode || '—'}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: scale(9),
                    fontWeight: '800',
                    color: C.textMuted,
                    letterSpacing: 0.8,
                    marginBottom: scale(4),
                  }}
                >
                  CITY
                </Text>
                <Text
                  style={{
                    fontSize: scale(13),
                    fontWeight: '700',
                    color: C.text,
                  }}
                >
                  {profile.city_district || '—'}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: scale(9),
                    fontWeight: '800',
                    color: C.textMuted,
                    letterSpacing: 0.8,
                    marginBottom: scale(4),
                  }}
                >
                  STATE
                </Text>
                <Text
                  style={{
                    fontSize: scale(13),
                    fontWeight: '700',
                    color: C.text,
                  }}
                >
                  {profile.state || '—'}
                </Text>
              </View>
            </View>

            {/* Area */}
            {!!profile.address_line1 && (
              <View
                style={{
                  borderTopWidth: 1,
                  borderTopColor: C.border,
                  paddingTop: scale(10),
                }}
              >
                <Text
                  style={{
                    fontSize: scale(9),
                    fontWeight: '800',
                    color: C.textMuted,
                    letterSpacing: 0.8,
                    marginBottom: scale(4),
                  }}
                >
                  AREA
                </Text>
                <Text
                  style={{
                    fontSize: scale(13),
                    fontWeight: '700',
                    color: C.text,
                  }}
                >
                  {profile.address_line1}
                </Text>
              </View>
            )}
          </View>

          <InfoRow
            label="Preferred Distance"
            value={`${profile.preferred_distance_km} km radius`}
            icon="📍"
          />
        </SectionCard>

        {/* ── CLINICAL DOCUMENTS ── */}
        <SectionCard title="Documents" icon="📄">
          {/* Resume Row */}
          <View style={styles.docRow}>
            <View style={styles.docIcon}>
              <Text style={{ fontSize: scale(20) }}>📋</Text>
            </View>
            <View style={styles.docBody}>
              <Text style={styles.docLabel}>Resume / CV</Text>
              {profile.resume_url ? (
                <TouchableOpacity
                  onPress={() => {
                    if (profile.resume_url) Linking.openURL(profile.resume_url);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.docLink} numberOfLines={1}>
                    ✓ Uploaded —{' '}
                    <Text style={{ textDecorationLine: 'underline' }}>
                      Tap to view
                    </Text>
                  </Text>
                </TouchableOpacity>
              ) : (
                <Text style={styles.docEmpty}>No resume uploaded</Text>
              )}
            </View>
            <View style={{ flexDirection: 'row', gap: scale(6) }}>
              {/* Upload / Change button */}
              <TouchableOpacity
                style={[
                  styles.docUploadBtn,
                  (uploadingResume || deletingResume) && { opacity: 0.6 },
                ]}
                onPress={
                  uploadingResume || deletingResume
                    ? undefined
                    : handleUploadResume
                }
                disabled={uploadingResume || deletingResume}
                activeOpacity={0.75}
              >
                {uploadingResume ? (
                  <ActivityIndicator color={C.white} size="small" />
                ) : (
                  <Text style={styles.docUploadTxt}>
                    {profile.resume_url ? 'Change' : 'Upload'}
                  </Text>
                )}
              </TouchableOpacity>
              {/* Delete button — only shown when resume exists */}
              {!!profile.resume_url && (
                <TouchableOpacity
                  style={[
                    styles.docDeleteBtn,
                    (deletingResume || uploadingResume) && { opacity: 0.6 },
                  ]}
                  onPress={
                    deletingResume || uploadingResume
                      ? undefined
                      : handleDeleteResume
                  }
                  disabled={deletingResume || uploadingResume}
                  activeOpacity={0.75}
                >
                  {deletingResume ? (
                    <ActivityIndicator color="#e53935" size="small" />
                  ) : (
                    <Text style={styles.docDeleteTxt}>🗑️</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>

          <View style={styles.divider} />

          {/* Profile Picture Row */}
          <View style={styles.docRow}>
            <View style={styles.docIcon}>
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
            <View style={{ flexDirection: 'row', gap: scale(6) }}>
              {/* Upload / Change button */}
              <TouchableOpacity
                style={[
                  styles.docUploadBtn,
                  (uploadingProfilePic || deletingProfilePic) && {
                    opacity: 0.6,
                  },
                ]}
                onPress={
                  uploadingProfilePic || deletingProfilePic
                    ? undefined
                    : handleUploadProfilePic
                }
                disabled={uploadingProfilePic || deletingProfilePic}
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
              {/* Delete button — only shown when pic exists */}
              {!!profile.profile_pic_url && (
                <TouchableOpacity
                  style={[
                    styles.docDeleteBtn,
                    (deletingProfilePic || uploadingProfilePic) && {
                      opacity: 0.6,
                    },
                  ]}
                  onPress={
                    deletingProfilePic || uploadingProfilePic
                      ? undefined
                      : handleDeleteProfilePic
                  }
                  disabled={deletingProfilePic || uploadingProfilePic}
                  activeOpacity={0.75}
                >
                  {deletingProfilePic ? (
                    <ActivityIndicator color="#e53935" size="small" />
                  ) : (
                    <Text style={styles.docDeleteTxt}>🗑️</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
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

      {/* Generic Edit Modal */}
      <EditModal
        visible={modalState.visible}
        title={modalState.title}
        fields={modalState.fields}
        onClose={() => setModalState(MODAL_CLOSED)}
        onSave={modalState.onSave}
        loading={saving}
      />

      {/* Medical Registration Modal — shared for add & edit */}
      <MedicalRegistrationModal
        visible={medRegModalVisible}
        initial={medRegModalInitial} // null = add, object = edit ✅
        onClose={() => {
          setMedRegModalVisible(false);
          setMedRegModalInitial(null);
          setMedRegEditIndex(undefined);
        }}
        onSave={handleMedRegSave} // your existing handler ✅
        loading={uploadingCert}
      />
      {/* Experience Modal */}
      <ExperienceModal
        visible={expModalVisible}
        initial={expModalInitial}
        isEdit={expModalIdx !== undefined}
        onClose={() => setExpModalVisible(false)}
        onSave={handleExperienceSave}
        loading={saving}
        googleApiKey={GOOGLE_API_KEY} // ← add this line only
      />

      <EducationModal
        visible={eduModalVisible}
        initial={eduModalInitial}
        editIndex={eduModalEditIndex}
        profile={profile}
        onClose={() => {
          setEduModalVisible(false);
          setEduModalInitial(null);
          setEduModalEditIndex(undefined);
        }}
        onSave={updatedEducation =>
          updateProfile({ education: updatedEducation })
        }
        loading={saving}
        googleApiKey={GOOGLE_API_KEY}
      />
      <ClinicalAreaModal
        visible={clinicalModalVisible}
        initial={(profile as any)?.clinical_area_experience}
        onClose={() => setClinicalModalVisible(false)}
        onSave={handleClinicalSave}
        loading={saving}
      />

      {/* Availability Modal */}
      {/* <AvailabilityModal
        visible={availabilityModalVisible}
        initialDates={dateAvailability}
        onClose={() => setAvailabilityModalVisible(false)}
        onSave={handleAvailabilitySave}
        loading={saving}
      /> */}

      {/* Preferences Location Modal */}
      <Modal
        visible={prefModalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setPrefModalVisible(false)}
        statusBarTranslucent
      >
        <KeyboardAvoidingView
          style={{ flex: 1, backgroundColor: C.bg }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {/* Header */}
          <SafeAreaView
            edges={['top']}
            style={{ backgroundColor: C.primaryDeep }}
          >
            <View style={styles.headerBar}>
              <TouchableOpacity
                onPress={() => setPrefModalVisible(false)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Text style={styles.backArrow}>‹</Text>
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Work Preferences</Text>
              <View style={{ width: 28 }} />
            </View>
          </SafeAreaView>

          <ScrollView
            contentContainerStyle={{
              padding: scale(20),
              paddingBottom: scale(40),
            }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Page title */}
            <Text
              style={{
                fontSize: scale(18),
                fontWeight: '900',
                color: C.text,
                marginBottom: scale(4),
              }}
            >
              Edit Preferred Hospital Location
            </Text>
            <Text
              style={{
                fontSize: scale(13),
                color: C.textMuted,
                fontWeight: '500',
                marginBottom: scale(20),
              }}
            >
              Search or manually type the hospital location details below.
            </Text>

            {/* ── Quick Search Card ── */}
            <View style={prefStyles.card}>
              <Text style={prefStyles.cardLabel}>
                Quick Search (Google Maps)
              </Text>

              <GooglePlacesAutocomplete
                ref={prefAcRef}
                placeholder="Type hospital name, area, or city (e.g. Apollo Delhi)…"
                fetchDetails
                onPress={(_data, detail) => {
                  if (!detail?.address_components) return;
                  const get = (type: string) =>
                    detail.address_components!.find((c: any) =>
                      c.types.includes(type),
                    )?.long_name || '';

                  const pincode =
                    get('postal_code') ||
                    detail.formatted_address?.match(/\b\d{6}\b/)?.[0] ||
                    '';
                  const city =
                    get('locality') ||
                    get('administrative_area_level_2') ||
                    get('sublocality_level_1') ||
                    '';
                  const state = get('administrative_area_level_1');
                  const area =
                    get('sublocality_level_1') ||
                    get('sublocality') ||
                    get('neighborhood') ||
                    get('premise') ||
                    '';

                  setPrefForm(prev => ({
                    ...prev,
                    preferred_pincode: pincode,
                    city_district: city,
                    state,
                    address_line1: area,
                  }));
                }}
                query={{
                  key: GOOGLE_API_KEY,
                  language: 'en',
                  components: 'country:in',
                }}
                styles={{
                  container: { flex: 0 },
                  textInputContainer: prefStyles.acInputContainer,
                  textInput: prefStyles.acInput,
                  listView: prefStyles.acList,
                  row: prefStyles.acRow,
                  description: prefStyles.acDesc,
                  poweredContainer: { display: 'none' },
                }}
                renderLeftButton={() => (
                  <View
                    style={{
                      width: scale(42),
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ fontSize: scale(16) }}>🔍</Text>
                  </View>
                )}
                renderRightButton={() =>
                  prefAcRef.current?.getAddressText() ? (
                    <TouchableOpacity
                      style={{
                        width: scale(36),
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      onPress={() => prefAcRef.current?.clear()}
                    >
                      <Text
                        style={{
                          fontSize: scale(14),
                          color: '#aaa',
                          fontWeight: '700',
                        }}
                      >
                        ✕
                      </Text>
                    </TouchableOpacity>
                  ) : null
                }
                enablePoweredByContainer={false}
                debounce={300}
                minLength={2}
                keyboardShouldPersistTaps="handled"
              />
            </View>

            {/* OR Divider */}
            <View style={prefStyles.orRow}>
              <View style={prefStyles.orLine} />
              <Text style={prefStyles.orTxt}>OR</Text>
              <View style={prefStyles.orLine} />
            </View>

            {/* ── Location Details Card ── */}
            <View style={prefStyles.card}>
              <Text style={prefStyles.cardLabel}>Location Details</Text>

              {/* Pincode | City | State */}
              {/* Pincode | City | State — stacked in 2 rows to avoid clipping */}
              <View
                style={{
                  flexDirection: 'row',
                  gap: scale(10),
                  marginBottom: scale(14),
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={prefStyles.fieldLabel}>PINCODE</Text>
                  <TextInput
                    style={prefStyles.input}
                    value={prefForm.preferred_pincode}
                    onChangeText={v =>
                      setPrefForm(p => ({ ...p, preferred_pincode: v }))
                    }
                    placeholder="110078"
                    placeholderTextColor="#c0c0cc"
                    keyboardType="numeric"
                    maxLength={6}
                  />
                </View>
                <View style={{ flex: 1.4 }}>
                  <Text style={prefStyles.fieldLabel}>CITY</Text>
                  <TextInput
                    style={prefStyles.input}
                    value={prefForm.city_district}
                    onChangeText={v =>
                      setPrefForm(p => ({ ...p, city_district: v }))
                    }
                    placeholder="e.g. New Delhi"
                    placeholderTextColor="#c0c0cc"
                  />
                </View>
              </View>
              <View>
                <Text style={prefStyles.fieldLabel}>STATE</Text>
                <TextInput
                  style={prefStyles.input}
                  value={prefForm.state}
                  onChangeText={v => setPrefForm(p => ({ ...p, state: v }))}
                  placeholder="e.g. Maharashtra"
                  placeholderTextColor="#c0c0cc"
                />
              </View>

              {/* Area */}
              <View style={{ marginTop: scale(14) }}>
                <Text style={prefStyles.fieldLabel}>AREA</Text>
                <TextInput
                  style={prefStyles.input}
                  value={prefForm.address_line1}
                  onChangeText={v =>
                    setPrefForm(p => ({ ...p, address_line1: v }))
                  }
                  placeholder="e.g. Apollo Hospital, Sarita Vihar"
                  placeholderTextColor="#c0c0cc"
                />
              </View>
            </View>

            {/* ── Distance Card ── */}
            <View style={[prefStyles.card, { marginTop: scale(12) }]}>
              <Text style={prefStyles.cardLabel}>Travel Preference</Text>
              <Text style={prefStyles.fieldLabel}>PREFERRED DISTANCE (KM)</Text>
              <TextInput
                style={prefStyles.input}
                value={prefForm.preferred_distance_km}
                onChangeText={v =>
                  setPrefForm(p => ({ ...p, preferred_distance_km: v }))
                }
                placeholder="e.g. 10"
                placeholderTextColor="#c0c0cc"
                keyboardType="numeric"
              />
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={prefStyles.footer}>
            <TouchableOpacity
              style={prefStyles.cancelBtn}
              onPress={() => setPrefModalVisible(false)}
              activeOpacity={0.75}
            >
              <Text style={prefStyles.cancelTxt}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                prefStyles.saveBtn,
                { backgroundColor: C.primary },
                saving && { opacity: 0.6 },
              ]}
              onPress={handlePrefSave}
              disabled={saving}
              activeOpacity={0.85}
            >
              {saving ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={prefStyles.saveTxt}>Save Changes</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
    backgroundColor: C.primary,
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
    fontSize: scale(11),
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

  // ── New: stacked edit + delete buttons ──
  actionBtns: {
    flexDirection: 'column',
    gap: scale(6),
    alignSelf: 'flex-start',
  },
  expEditBtn: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(10),
    backgroundColor: C.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expDeleteBtn: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(10),
    backgroundColor: '#ffecec',
    alignItems: 'center',
    justifyContent: 'center',
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
  // ── Updated reference action row ──
  refActionRow: {
    flexDirection: 'row',
    gap: scale(8),
    marginTop: scale(10),
    alignItems: 'center',
  },
  refEditBtn: {
    backgroundColor: C.primaryLight,
    borderRadius: scale(8),
    paddingHorizontal: scale(10),
    paddingVertical: scale(5),
  },
  refEditTxt: { fontSize: scale(11), color: C.primary, fontWeight: '700' },
  refDeleteBtn: {
    backgroundColor: '#ffecec',
    borderRadius: scale(8),
    paddingHorizontal: scale(10),
    paddingVertical: scale(5),
  },
  refDeleteTxt: { fontSize: scale(13) },

  prefLabel: {
    fontSize: scale(11),
    color: C.textMuted,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: scale(10),
  },

  // Add inside styles = StyleSheet.create({...}):
  calViewHeader: { marginBottom: scale(8) },
  miniCal: {
    backgroundColor: C.bg,
    borderRadius: scale(14),
    padding: scale(10),
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: scale(12),
  },
  miniWeekRow: { flexDirection: 'row' },
  miniWeekLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: scale(10),
    color: C.textMuted,
    fontWeight: '700',
    paddingBottom: scale(6),
  },
  miniDayCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scale(4),
    borderRadius: scale(6),
    margin: scale(1),
  },
  miniDayCellToday: { backgroundColor: C.primaryLight },
  miniDayNum: { fontSize: scale(11), color: C.text, fontWeight: '500' },
  miniDayNumToday: { color: C.primary, fontWeight: '800' },
  miniDot: {
    width: scale(5),
    height: scale(5),
    borderRadius: scale(3),
    marginTop: scale(2),
  },
  miniLegend: { flexDirection: 'row', gap: scale(14) },
  miniLegendItem: { flexDirection: 'row', alignItems: 'center', gap: scale(5) },
  miniLegendDot: { width: scale(8), height: scale(8), borderRadius: scale(4) },
  miniLegendTxt: { fontSize: scale(11), color: C.textMuted, fontWeight: '600' },
  daysRow: { flexDirection: 'row', flexWrap: 'wrap', gap: scale(8) },
  dayChip: {
    paddingHorizontal: scale(10),
    paddingVertical: scale(6),
    borderRadius: scale(10),
    borderWidth: 1.5,
    borderColor: C.border,
    backgroundColor: C.bg,
    alignItems: 'center',
  },
  dayChipOn: { backgroundColor: C.primary, borderColor: C.primary },
  dayTxt: { fontSize: scale(12), color: C.textMuted, fontWeight: '700' },
  dayTxtOn: { color: C.white },
  daySlotTxt: {
    fontSize: scale(9),
    color: C.textMuted,
    fontWeight: '600',
    marginTop: 2,
  },
  daySlotTxtOn: { color: 'rgba(255,255,255,0.75)' },

  dayBtn: {
    paddingHorizontal: scale(14),
    paddingVertical: scale(8),
    borderRadius: scale(10),
    borderWidth: 1.5,
    borderColor: C.border,
    backgroundColor: C.bg,
  },
  dayBtnOn: { backgroundColor: C.primary, borderColor: C.primary },

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

  // ── Clinical Area Experience ──────────────────────────────

  caeContainer: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: scale(16),
    overflow: 'hidden',
    marginBottom: scale(4),
    backgroundColor: C.white,
  },
  caeHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: scale(12),
    backgroundColor: C.primaryLight,
  },
  caeHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
    flex: 1,
  },
  caeIconWrap: {
    width: scale(38),
    height: scale(38),
    borderRadius: scale(11),
    backgroundColor: C.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  caeTitle: {
    fontSize: scale(13),
    fontWeight: '800',
    color: C.text,
  },
  caeSub: {
    fontSize: scale(11),
    color: C.textMuted,
    marginTop: scale(2),
  },
  caeEditBtn: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(9),
    backgroundColor: C.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.border,
  },
  caeChevronBtn: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(10),
    backgroundColor: C.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.border,
  },
  caeCardsWrap: {
    backgroundColor: C.white,
  },
  caeCard: {
    paddingHorizontal: scale(14),
    paddingVertical: scale(12),
    backgroundColor: C.white,
  },
  caeCardBorder: {
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  caeCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
    marginBottom: scale(4),
  },
  caeCardBadge: {
    backgroundColor: C.primary,
    borderRadius: scale(6),
    paddingHorizontal: scale(8),
    paddingVertical: scale(3),
  },
  caeCardBadgeTxt: {
    fontSize: scale(11),
    fontWeight: '800',
    color: C.white,
  },
  caeYearsBadge: {
    backgroundColor: C.primaryLight,
    borderRadius: scale(6),
    paddingHorizontal: scale(8),
    paddingVertical: scale(3),
    borderWidth: 1,
    borderColor: C.border,
  },
  caeYearsTxt: {
    fontSize: scale(11),
    fontWeight: '700',
    color: C.primary,
  },
  caeCardSubtitle: {
    fontSize: scale(11),
    color: C.textMuted,
    fontWeight: '500',
    marginBottom: scale(6),
  },
  caeRemarksWrap: {
    backgroundColor: C.bg,
    borderRadius: scale(8),
    padding: scale(8),
    marginTop: scale(4),
    borderLeftWidth: 3,
    borderLeftColor: C.primary,
  },
  caeRemarksLabel: {
    fontSize: scale(9),
    fontWeight: '800',
    color: C.textMuted,
    letterSpacing: 0.8,
    marginBottom: scale(3),
  },
  caeRemarksText: {
    fontSize: scale(12),
    color: C.text,
    fontWeight: '500',
    lineHeight: scale(17),
  },
  caeAddBtn: {
    margin: scale(12),
    borderWidth: 1.5,
    borderColor: C.primary,
    borderStyle: 'dashed',
    borderRadius: scale(10),
    paddingVertical: scale(10),
    alignItems: 'center',
  },
  caeAddTxt: {
    fontSize: scale(13),
    fontWeight: '700',
    color: C.primary,
  },

  caeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(14),
    paddingVertical: scale(12),
    backgroundColor: C.primaryLight,
    marginBottom: scale(4),
  },

  caeActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  caeDropdownBtn: {
    width: scale(34),
    height: scale(34),
    borderRadius: scale(10),
    backgroundColor: '#eef9fb',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: scale(8),
    marginTop: 55,
  },

  caeEmptyTxt: {
    fontSize: scale(12),
    color: C.textMuted,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: scale(12),
    paddingHorizontal: scale(14),
    backgroundColor: C.white,
  },
  caeAreaCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: scale(14),
    paddingVertical: scale(11),
    backgroundColor: C.white,
    borderTopWidth: 1,
    borderTopColor: C.border,
    gap: scale(8),
  },
  caeAreaLeft: {
    flex: 1,
  },
  caeAreaLabel: {
    fontSize: scale(12),
    fontWeight: '800',
    color: C.text,
    marginBottom: scale(3),
  },
  caeAreaRemarks: {
    fontSize: scale(11),
    color: C.textSub,
    fontWeight: '500',
    lineHeight: scale(16),
  },

  caeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: C.primaryLight,
    borderRadius: scale(14),
    padding: scale(12),
    gap: scale(10),
  },
  caeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
    flex: 1,
  },

  caeBadgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: scale(4) },

  // replace old caeBadge, caeBadgeTxt and add new ones
  caeBadge: {
    backgroundColor: C.white,
    borderRadius: scale(8),
    paddingHorizontal: scale(10),
    paddingVertical: scale(7),
    borderWidth: 1,
    borderColor: C.border,
  },
  caeBadgeTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
  },
  caeBadgeTxt: {
    fontSize: scale(12),
    fontWeight: '800',
    color: C.primary,
  },
  caeBadgeYearPill: {
    backgroundColor: C.primaryLight,
    borderRadius: scale(6),
    paddingHorizontal: scale(6),
    paddingVertical: scale(2),
  },
  caeBadgeYearTxt: {
    fontSize: scale(10),
    fontWeight: '700',
    color: C.primary,
  },
  caeBadgeRemarks: {
    fontSize: scale(11),
    color: C.textSub,
    fontWeight: '500',
    marginTop: scale(3),
  },

  docDeleteBtn: {
    backgroundColor: '#ffecec',
    borderRadius: scale(10),
    paddingHorizontal: scale(10),
    paddingVertical: scale(8),
    minWidth: scale(38),
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#ffcdd2',
  },
  docDeleteTxt: {
    fontSize: scale(14),
  },
});

const prefStyles = StyleSheet.create({
  card: {
    backgroundColor: C.white,
    borderRadius: scale(16),
    borderWidth: 1,
    borderColor: C.border,
    padding: scale(16),
    marginBottom: scale(4),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardLabel: {
    fontSize: scale(14),
    fontWeight: '800',
    color: C.text,
    marginBottom: scale(10),
  },
  acInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.bg,
    borderRadius: scale(12),
    borderWidth: 1.5,
    borderColor: C.border,
    height: scale(52),
    paddingHorizontal: scale(4),
  },
  acInput: {
    flex: 1,
    height: scale(52),
    fontSize: scale(14),
    color: C.text,
    fontWeight: '500',
    backgroundColor: 'transparent',
  },
  acList: {
    marginTop: scale(4),
    borderRadius: scale(12),
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
    elevation: 4,
  },
  acRow: {
    paddingVertical: scale(13),
    paddingHorizontal: scale(14),
    borderBottomWidth: 1,
    borderBottomColor: C.primaryLight,
  },
  acDesc: { fontSize: scale(13), color: C.text, fontWeight: '500' },
  orRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: scale(14),
    gap: scale(10),
  },
  orLine: { flex: 1, height: 1, backgroundColor: C.border },
  orTxt: {
    fontSize: scale(11),
    fontWeight: '800',
    color: C.textMuted,
    letterSpacing: 1.5,
  },
  fieldLabel: {
    fontSize: scale(10),
    fontWeight: '800',
    color: C.textMuted,
    letterSpacing: 0.8,
    marginBottom: scale(6),
  },
  input: {
    backgroundColor: C.bg,
    borderRadius: scale(10),
    borderWidth: 1.5,
    borderColor: C.border,
    paddingHorizontal: scale(12),
    paddingVertical: scale(12),
    fontSize: scale(14),
    color: C.text,
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    gap: scale(12),
    padding: scale(16),
    paddingBottom: Platform.OS === 'ios' ? scale(32) : scale(16),
    borderTopWidth: 1,
    borderTopColor: C.border,
    backgroundColor: C.white,
  },
  cancelBtn: {
    flex: 1,
    borderRadius: scale(12),
    paddingVertical: scale(14),
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: C.border,
  },
  cancelTxt: { fontSize: scale(14), fontWeight: '700', color: C.textMuted },
  saveBtn: {
    flex: 2,
    borderRadius: scale(12),
    paddingVertical: scale(14),
    alignItems: 'center',
  },
  saveTxt: { fontSize: scale(14), fontWeight: '800', color: C.white },
});

export default ProfileScreen;
