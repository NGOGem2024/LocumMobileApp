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
  Animated,
  TextInput,
  Modal,
  Platform,
  Image,
  Linking,
  KeyboardAvoidingView,
  FlatList,
  StatusBar,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {
  useAuth,
  DoctorProfile,
  Experience,
  Reference,
} from '../context/AuthContext';
import LinearGradient from 'react-native-linear-gradient';
import ReactNativeBlobUtil from 'react-native-blob-util';
import { pick, types } from '@react-native-documents/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Dropdown } from 'react-native-element-dropdown';
import EducationModal from '../components/EducationModal';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import api from '../services/axiosConfig';

// ─── Constants ───────────────────────────────────────────────────────────────
const GOOGLE_API_KEY = 'AIzaSyCUgfce6vE1U10ZsdF7s62KxOFD2Q_dNDc';
const { width: SW, height: SH } = Dimensions.get('window');
const scale = (size: number) => (SW / 390) * size;
const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

type DaySlot = 'full' | 'am' | 'pm' | null;
type DateAvailability = Record<string, DaySlot>;

// ─── Unified Clean Light Theme (Simplified/Flattened) ────────────────────────
const C = {
  background: '#F9FAFB', 
  cardBg: '#FFFFFF',
  border: '#E5E7EB',
  inputBg: '#F9FAFB',
  primary: '#007b8e',
  primaryLight: '#F0FBFC',
  accentCyan: '#00a8c2',
  ink: '#1F2937',
  textSub: '#6B7280',
  textMuted: '#9CA3AF',
  white: '#ffffff',
  urgent: '#ef4444',
  urgentLight: '#FEF2F2',
  success: '#10b981',
  successLight: '#ECFDF5',
  warning: '#f59e0b',
  warningLight: '#FFFBEB',
};

// ─── API Helpers ─────────────────────────────────────────────────────────────
const fetchDoctorProfile = async (): Promise<DoctorProfile> => {
  const { data } = await api.get('/api/doctors/show-profile');
  const profile = data?.doctor || data?.data || data;
  if (!profile?._id) throw new Error('Invalid profile data received');
  return profile;
};

const patchDoctorProfile = async (
  doctorId: string,
  body: Record<string, any>,
): Promise<DoctorProfile> => {
  const { data } = await api.patch(`/api/doctors/edit-profile/${doctorId}`, body);
  return data?.doctor || data?.data || data;
};

// ─── File Pickers ─────────────────────────────────────────────────────────────
const pickDocument = async () => {
  try {
    const res = await pick({ type: [types.pdf] });
    return Array.isArray(res) ? res : [res];
  } catch (err: any) {
    if (err?.code === 'DOCUMENT_PICKER_CANCELED' || err?.message?.includes('cancel'))
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
  const mimeType: string = fieldName === 'profile_pic'
    ? file.type?.startsWith('image/') ? file.type : 'image/jpeg'
    : 'application/pdf';
  const fileName: string = file.name || file.fileName ||
    (fieldName === 'profile_pic' ? `profile_${Date.now()}.jpg` : `resume_${Date.now()}.pdf`);
  const uri: string = file.uri || '';
  const url = `${api.defaults.baseURL}/api/doctors/upload-media/${doctorId}`;

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
          data: ReactNativeBlobUtil.wrap(Platform.OS === 'android' ? uri : uri.replace('file://', '')),
        },
      ],
    );

    const statusCode = response.respInfo.status;
    const responseText = response.data;
    if (statusCode >= 200 && statusCode < 300) {
      const data = JSON.parse(responseText);
      const updated = data?.doctor || data?.data || data;
      if (!updated?._id) throw new Error('Server returned OK but no doctor object');
      return updated as DoctorProfile;
    } else {
      throw new Error(`Server error ${statusCode}: ${responseText?.slice(0, 200)}`);
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
  const url = `${api.defaults.baseURL}/api/doctors/edit-profile/${doctorId}`;
  const cleanUrl = (u: string) => (u ? u.split('?')[0] : '');
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
    orderedRegs = existingRegs.map((r, i) => i === editIndex ? newReg : stripReg(r));
  } else {
    orderedRegs = [newReg, ...existingRegs.map(stripReg)];
  }

  const fields: any[] = [{ name: 'medical_registrations', data: JSON.stringify(orderedRegs) }];

  certFiles.forEach((certFile, index) => {
    if (certFile?.uri) {
      const mimeType = certFile.type?.startsWith('image/') ? certFile.type : 'application/pdf';
      const fileName = certFile.name || `certificate_${Date.now()}_${index}.pdf`;
      const uri: string = certFile.uri;
      fields.push({
        name: 'medical_certificate',
        filename: fileName,
        type: mimeType,
        data: ReactNativeBlobUtil.wrap(Platform.OS === 'android' ? uri : uri.replace('file://', '')),
      });
    }
  });

  const response = await ReactNativeBlobUtil.fetch('PATCH', url, {
    Authorization: `Bearer ${token}`,
    Accept: 'application/json',
    'Content-Type': 'multipart/form-data',
  }, fields);

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

const confirmDelete = (title: string, message: string, onConfirm: () => void) => {
  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: onConfirm },
  ]);
};

// ─── SectionCard (Clean Layout With Updated Margins & Padding) ────────────────────────
interface SectionCardProps {
  title: string;
  icon?: string;
  children: React.ReactNode;
  onEdit?: () => void;
  onAdd?: () => void;
  addLabel?: string;
  addLoading?: boolean;
}

const SectionCard: React.FC<SectionCardProps> = ({ title, children, onEdit, onAdd, addLabel, addLoading }) => (
  <View style={sc.card}>
    <View style={sc.header}>
      <Text style={sc.title}>{title}</Text>
      <View style={sc.actions}>
        {onEdit && (
          <TouchableOpacity style={sc.ghostBtn} onPress={onEdit}>
            <Text style={sc.ghostText}>Edit</Text>
          </TouchableOpacity>
        )}
        {onAdd && (
          <TouchableOpacity
            style={[sc.ghostBtn, addLoading && { opacity: 0.6 }]}
            onPress={addLoading ? undefined : onAdd}
            disabled={addLoading}
          >
            {addLoading ? (
              <ActivityIndicator color={C.primary} size="small" />
            ) : (
              <Text style={sc.ghostText}>+ {addLabel || 'Add'}</Text>
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
    marginHorizontal: scale(22), 
    marginBottom: scale(20), 
    padding: scale(16),         
    borderRadius: scale(16),    
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: C.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: scale(12),
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  title: { fontSize: scale(16), fontWeight: '800', color: C.ink },
  actions: { flexDirection: 'row', gap: scale(8) },
  ghostBtn: { paddingVertical: scale(4), paddingHorizontal: scale(4) },
  ghostText: { fontSize: scale(13), color: C.primary, fontWeight: '700' },
  body: { paddingTop: scale(14) },
});

// ─── InfoRow ─────────────────────────────────────────────────────────────────
const InfoRow: React.FC<{ label: string; value?: string; icon?: string }> = ({ label, value }) => (
  <View style={ir.row}>
    <Text style={ir.label}>{label}</Text>
    <Text style={ir.value}>{value || '—'}</Text>
  </View>
);

const ir = StyleSheet.create({
  row: { marginBottom: scale(12) },
  label: { fontSize: scale(11), color: C.textSub, fontWeight: '500', marginBottom: scale(2) },
  value: { fontSize: scale(14), color: C.ink, fontWeight: '600' },
});

// ─── Pill ─────────────────────────────────────────────────────────────────────
const Pill: React.FC<{ text: string }> = ({ text }) => (
  <View style={pill.wrap}>
    <Text style={pill.text}>{text}</Text>
  </View>
);

const pill = StyleSheet.create({
  wrap: {
    backgroundColor: C.inputBg,
    borderRadius: scale(8),
    paddingHorizontal: scale(10),
    paddingVertical: scale(6),
    marginRight: scale(8),
    marginBottom: scale(8),
    borderWidth: 1,
    borderColor: C.border,
  },
  text: { fontSize: scale(12), color: C.ink, fontWeight: '500' },
});

// ─── StatusBadge ─────────────────────────────────────────────────────────────
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const colorMap: Record<string, string> = { pending: C.warning, approved: C.success, rejected: C.urgent };
  const color = colorMap[status?.toLowerCase()] || C.textMuted;
  return (
    <View style={[sb.wrap, { backgroundColor: color + '15' }]}>
      <View style={[sb.dot, { backgroundColor: color }]} />
      <Text style={[sb.text, { color }]}>{status?.toUpperCase() || 'UNKNOWN'}</Text>
    </View>
  );
};

const sb = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: scale(12),
    paddingHorizontal: scale(8),
    paddingVertical: scale(4),
    gap: scale(6),
  },
  dot: { width: scale(6), height: scale(6), borderRadius: scale(3) },
  text: { fontSize: scale(10), fontWeight: '700', letterSpacing: 0.5 },
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

const ProfileAvatar: React.FC<ProfileAvatarProps> = ({ localUri, serverUrl, initials, uploading, isVerified, onPress }) => {
  const imageUri = localUri || serverUrl || null;
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} disabled={uploading} style={avatarStyles.wrap}>
      <View style={avatarStyles.avatar}>
        {uploading ? (
          <View style={avatarStyles.uploading}>
            <ActivityIndicator color={C.primary} size="small" />
          </View>
        ) : imageUri ? (
          <Image source={{ uri: imageUri }} style={avatarStyles.image} resizeMode="cover" />
        ) : (
          <Text style={avatarStyles.text}>{initials}</Text>
        )}
      </View>
      <View style={avatarStyles.cameraBadge}>
        <Ionicons name="camera" size={scale(12)} color={C.white} />
      </View>
      {isVerified && (
        <View style={avatarStyles.verifiedBadge}>
          <Ionicons name="checkmark" size={scale(12)} color={C.white} />
        </View>
      )}
    </TouchableOpacity>
  );
};

const avatarStyles = StyleSheet.create({
  wrap: { width: scale(96), height: scale(96), borderRadius: scale(48), backgroundColor: C.cardBg, alignItems: 'center', justifyContent: 'center', marginBottom: scale(12) },
  avatar: { width: scale(96), height: scale(96), borderRadius: scale(48), backgroundColor: C.inputBg, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  image: { width: '100%', height: '100%', borderRadius: scale(48) },
  text: { fontSize: scale(32), fontWeight: '700', color: C.primary },
  uploading: { position: 'absolute', backgroundColor: 'rgba(255,255,255,0.7)', width: '100%', height: '100%', borderRadius: scale(48), justifyContent: 'center' },
  cameraBadge: { position: 'absolute', bottom: 0, right: scale(4), backgroundColor: C.primary, borderRadius: scale(14), padding: scale(6), borderWidth: 2, borderColor: C.cardBg },
  verifiedBadge: { position: 'absolute', top: 0, right: 0, backgroundColor: C.success, borderRadius: scale(14), padding: scale(4), borderWidth: 2, borderColor: C.cardBg },
});

// ─── Generic EditModal ────────────────────────────────────────────────────────
interface EditField {
  key: string; label: string; value: string; keyboardType?: 'default' | 'numeric' | 'email-address' | 'phone-pad';
  multiline?: boolean; placeholder?: string; type?: 'text' | 'dropdown'; options?: string[];
}

interface EditModalProps {
  visible: boolean; title: string; fields: EditField[];
  onClose: () => void; onSave: (data: Record<string, string>) => void; loading?: boolean;
}

const EditModal: React.FC<EditModalProps> = ({ visible, title, fields, onClose, onSave, loading }) => {
  const [vals, setVals] = useState<Record<string, string>>({});
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [activeDateKey, setActiveDateKey] = useState<string | null>(null);

  const onChangeDate = (_: any, selected?: Date) => {
    setShowDatePicker(false);
    if (selected && activeDateKey) {
      setVals(prev => ({ ...prev, [activeDateKey]: selected.toISOString().slice(0, 10) }));
    }
  };

  useEffect(() => {
    const init: Record<string, string> = {};
    fields.forEach(f => { init[f.key] = f.value; });
    setVals(init);
  }, [fields, visible]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={em.overlay}>
        <View style={em.sheet}>
          <View style={em.header}>
            <Text style={em.title}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={em.closeBtn}>
              <Ionicons name="close" size={scale(20)} color={C.textSub} />
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: scale(450) }} keyboardShouldPersistTaps="handled">
            {fields.map(f => (
              <View key={f.key} style={em.fieldWrap}>
                <Text style={em.label}>{f.label}</Text>
                {f.key.toLowerCase().includes('date') ? (
                  <TouchableOpacity style={em.inputBtn} onPress={() => { setActiveDateKey(f.key); setShowDatePicker(true); }}>
                    <Text numberOfLines={1} style={{ color: vals[f.key] ? C.ink : C.textMuted }}>{vals[f.key] || f.placeholder || 'Select date'}</Text>
                  </TouchableOpacity>
                ) : f.type === 'dropdown' ? (
                  <View style={em.dropdownWrap}>
                    <Dropdown
                      style={{ height: scale(40) }}
                      placeholderStyle={{ color: C.textMuted, fontSize: scale(14) }}
                      selectedTextStyle={{ color: C.ink, fontSize: scale(14) }}
                      itemTextStyle={{ fontSize: scale(14), color: C.ink }}
                      data={f.key === 'super_speciality'
                        ? (SPECIALITY_MAP[vals.speciality] || []).map((item: string) => ({ label: item, value: item }))
                        : (f.options || []).map((item: string) => ({ label: item, value: item }))}
                      labelField="label"
                      valueField="value"
                      placeholder={f.placeholder || 'Select'}
                      value={vals[f.key]}
                      onChange={item => {
                        setVals(prev => {
                          const updated = { ...prev, [f.key]: item.value };
                          if (f.key === 'speciality') updated.super_speciality = '';
                          return updated;
                        });
                      }}
                    />
                  </View>
                ) : (
                  <TextInput
                    style={[em.input, f.multiline && { height: scale(80), textAlignVertical: 'top' }]}
                    value={vals[f.key] ?? ''}
                    onChangeText={v => {
                      if (f.key === 'alternate_mobile_number' || f.key === 'ref_contact_no') {
                        setVals(p => ({ ...p, [f.key]: v.replace(/[^0-9]/g, '').slice(0, 10) }));
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
            <DateTimePicker value={new Date()} mode="date" display={Platform.OS === 'ios' ? 'spinner' : 'default'} onChange={onChangeDate} />
          )}
          <View style={em.btns}>
            <TouchableOpacity style={[em.saveBtn, loading && { opacity: 0.6 }]} onPress={() => onSave(vals)} disabled={loading}>
              {loading ? <ActivityIndicator color={C.white} size="small" /> : <Text style={em.saveTxt}>Save Changes</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const em = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: C.cardBg, borderTopLeftRadius: scale(20), borderTopRightRadius: scale(20), paddingHorizontal: scale(20), paddingBottom: Platform.OS === 'ios' ? 36 : scale(24) },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: scale(16), borderBottomWidth: 1, borderBottomColor: C.border, marginBottom: scale(16) },
  title: { fontSize: scale(16), fontWeight: '700', color: C.ink },
  closeBtn: { padding: scale(4) },
  fieldWrap: { marginBottom: scale(16) },
  label: { fontSize: scale(11), fontWeight: '600', color: C.textSub, marginBottom: scale(6) },
  input: { borderWidth: 1, borderColor: C.border, borderRadius: scale(8), paddingHorizontal: scale(12), paddingVertical: scale(10), fontSize: scale(14), color: C.ink, backgroundColor: C.inputBg },
  inputBtn: { borderWidth: 1, borderColor: C.border, borderRadius: scale(8), paddingHorizontal: scale(12), paddingVertical: scale(12), backgroundColor: C.inputBg },
  dropdownWrap: { borderWidth: 1, borderColor: C.border, borderRadius: scale(8), backgroundColor: C.inputBg, paddingHorizontal: scale(12), justifyContent: 'center' },
  btns: { marginTop: scale(10) },
  saveBtn: { backgroundColor: C.primary, borderRadius: scale(8), paddingVertical: scale(14), alignItems: 'center' },
  saveTxt: { color: C.white, fontWeight: '600', fontSize: scale(14) },
});

// ─── Medical Registration Modal ───────────────────────────────────────────────
const STATE_COUNCILS = [
  'Andhra Pradesh Medical Council', 'Arunachal Pradesh Medical Council', 'Assam Medical Council',
  'Bihar Medical Council', 'Chhattisgarh Medical Council', 'Delhi Medical Council', 'Goa Medical Council',
  'Gujarat Medical Council', 'Haryana Medical Council', 'Himachal Pradesh Medical Council',
  'Jammu & Kashmir Medical Council', 'Jharkhand Medical Council', 'Karnataka Medical Council',
  'Kerala Medical Council', 'Madhya Pradesh Medical Council', 'Maharashtra Medical Council',
  'Manipur Medical Council', 'Meghalaya Medical Council', 'Mizoram Medical Council',
  'Nagaland Medical Council', 'Odisha Medical Council', 'Punjab Medical Council',
  'Rajasthan Medical Council', 'Sikkim Medical Council', 'Tamil Nadu Medical Council',
  'Telangana State Medical Council', 'Tripura Medical Council', 'Uttar Pradesh Medical Council',
  'Uttarakhand Medical Council', 'West Bengal Medical Council', 'Other',
];

type RegType = 'national' | 'state';
interface CertItem { id: string; file: any | null; uri: string; name: string; isExisting: boolean; }
interface FormState { registration_type: RegType; medical_council_name: string; registration_number: string; registration_date: Date | null; certificates: CertItem[]; }
interface MedRegProps { visible: boolean; initial: any | null; onClose: () => void; onSave: (data: any) => void; loading: boolean; }

const uid = () => Math.random().toString(36).slice(2);
const formatDate = (d: Date) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
const parseDate = (str: string): Date | null => {
  if (!str) return null;
  const parts = str.split('/');
  if (parts.length === 3) {
    const d = new Date(+parts[2], +parts[1] - 1, +parts[0]);
    if (!isNaN(d.getTime())) return d;
  }
  const iso = new Date(str);
  if (!isNaN(iso.getTime())) return iso;
  return null;
};

const EMPTY_FORM: FormState = { registration_type: 'state', medical_council_name: '', registration_number: '', registration_date: null, certificates: [] };

export const MedicalRegistrationModal: React.FC<MedRegProps> = ({ visible, initial, onClose, onSave, loading }) => {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [councilOpen, setCouncilOpen] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const isEdit = !!initial;

  useEffect(() => {
    if (!visible) return;
    if (initial) {
      const certs: CertItem[] = [];
      const certUrls: string[] = initial.certificate_urls?.length ? initial.certificate_urls : initial.certificate_url ? [initial.certificate_url] : [];
      certUrls.forEach((url: string, i: number) => {
        certs.push({ id: uid(), file: null, uri: url, name: initial.certificate_file_name || `Certificate ${i + 1}`, isExisting: true });
      });
      setForm({
        registration_type: 'state', medical_council_name: initial.medical_council_name || '',
        registration_number: initial.registration_number || '', registration_date: parseDate(initial.registration_date || ''), certificates: certs,
      });
    } else {
      setForm(EMPTY_FORM);
    }
  }, [visible, initial]);

  const handleAddCertificate = async () => {
    if (form.certificates.length > 0) return Alert.alert('Limit Exceeded', 'Only 1 certificate allowed.');
    try {
      const result = await pick({ type: [types.pdf, types.images], allowMultiSelection: false });
      const file = Array.isArray(result) ? result[0] : result;
      if (!file?.uri) return;
      setForm(p => ({ ...p, certificates: [...p.certificates, { id: uid(), file, uri: file.uri, name: file.name || 'Certificate', isExisting: false }] }));
    } catch (err: any) { }
  };

  const handleSave = () => {
    if (form.registration_type === 'state' && !form.medical_council_name.trim()) return Alert.alert('Required', 'Select a state medical council.');
    if (!form.registration_number.trim()) return Alert.alert('Required', 'Enter registration number.');
    onSave({
      registration_type: form.registration_type === 'national' ? 'National Council Registration' : 'State Council Registration',
      medical_council_name: form.registration_type === 'national' ? 'National Medical Commission (NMC)' : form.medical_council_name,
      registration_number: form.registration_number,
      registration_date: form.registration_date ? formatDate(form.registration_date) : '',
      certificate_files: form.certificates.filter(c => !c.isExisting && c.file).map(c => c.file),
      existing_certificate_urls: form.certificates.filter(c => c.isExisting && c.uri).map(c => c.uri),
    });
  };

  return (
    <>
      <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
        <View style={em.overlay}>
          <View style={em.sheet}>
            <View style={em.header}>
              <Text style={em.title}>{isEdit ? 'Edit Registration' : 'Add Registration'}</Text>
              <TouchableOpacity onPress={onClose} style={em.closeBtn}><Ionicons name="close" size={20} color={C.textSub} /></TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: scale(500) }}>
              <Text style={em.label}>Registration Type</Text>
              <View style={{ flexDirection: 'row', gap: scale(10), marginBottom: scale(16) }}>
                {(['national', 'state'] as RegType[]).map(type => (
                  <TouchableOpacity
                    key={type}
                    style={[mrm.radioBtn, form.registration_type === type && mrm.radioBtnActive]}
                    onPress={() => setForm(p => ({ ...p, registration_type: type, medical_council_name: '' }))}
                  >
                    <Text style={[mrm.radioTxt, form.registration_type === type && mrm.radioTxtActive]}>
                      {type === 'national' ? 'National' : 'State'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {form.registration_type === 'state' && (
                <View style={em.fieldWrap}>
                  <Text style={em.label}>Medical Council</Text>
                  <TouchableOpacity style={em.inputBtn} onPress={() => setCouncilOpen(true)}>
                    <Text style={{ color: form.medical_council_name ? C.ink : C.textMuted }}>{form.medical_council_name || 'Select Council'}</Text>
                  </TouchableOpacity>
                </View>
              )}

              <View style={em.fieldWrap}>
                <Text style={em.label}>Registration Number</Text>
                <TextInput
                  style={em.input}
                  value={form.registration_number}
                  onChangeText={v => setForm(p => ({ ...p, registration_number: v }))}
                  placeholder="Enter number"
                  placeholderTextColor={C.textMuted}
                />
              </View>

              <View style={em.fieldWrap}>
                <Text style={em.label}>Date of Registration</Text>
                <TouchableOpacity style={em.inputBtn} onPress={() => setShowDatePicker(true)}>
                  <Text style={{ color: form.registration_date ? C.ink : C.textMuted }}>
                    {form.registration_date ? formatDate(form.registration_date) : 'Select Date'}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={em.fieldWrap}>
                <Text style={em.label}>Certificate ({form.certificates.length}/1)</Text>
                {form.certificates.map(cert => (
                  <View key={cert.id} style={mrm.certCard}>
                    <Text style={mrm.certName} numberOfLines={1}>{cert.name}</Text>
                    <TouchableOpacity onPress={() => setForm(p => ({ ...p, certificates: p.certificates.filter(c => c.id !== cert.id) }))}>
                      <Ionicons name="trash" size={18} color={C.urgent} />
                    </TouchableOpacity>
                  </View>
                ))}
                {form.certificates.length === 0 && (
                  <TouchableOpacity style={mrm.uploadBtn} onPress={handleAddCertificate}>
                    <Text style={mrm.uploadTxt}>+ Upload PDF/Image</Text>
                  </TouchableOpacity>
                )}
              </View>
            </ScrollView>
            {showDatePicker && (
              <DateTimePicker value={form.registration_date || new Date()} mode="date" display={Platform.OS === 'ios' ? 'spinner' : 'default'} onChange={(_, d) => { setShowDatePicker(false); if (d) setForm(p => ({ ...p, registration_date: d })); }} />
            )}
            <View style={em.btns}>
              <TouchableOpacity style={[em.saveBtn, loading && { opacity: 0.6 }]} onPress={handleSave} disabled={loading}>
                {loading ? <ActivityIndicator color={C.white} size="small" /> : <Text style={em.saveTxt}>Save</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Council Search Sheet */}
      <Modal visible={councilOpen} transparent animationType="slide" onRequestClose={() => setCouncilOpen(false)}>
        <View style={em.overlay}>
          <View style={[em.sheet, { maxHeight: '80%' }]}>
            <View style={em.header}>
              <Text style={em.title}>Select Council</Text>
              <TouchableOpacity onPress={() => setCouncilOpen(false)} style={em.closeBtn}><Ionicons name="close" size={20} color={C.textSub} /></TouchableOpacity>
            </View>
            <FlatList
              data={STATE_COUNCILS}
              keyExtractor={i => i}
              renderItem={({ item }) => (
                <TouchableOpacity style={mrm.listItem} onPress={() => { setForm(p => ({ ...p, medical_council_name: item })); setCouncilOpen(false); }}>
                  <Text style={{ fontSize: scale(14), color: C.ink }}>{item}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </>
  );
};

const mrm = StyleSheet.create({
  radioBtn: { flex: 1, paddingVertical: scale(10), borderWidth: 1, borderColor: C.border, borderRadius: scale(8), alignItems: 'center', backgroundColor: C.inputBg },
  radioBtnActive: { borderColor: C.primary, backgroundColor: C.primaryLight },
  radioTxt: { fontSize: scale(13), color: C.textSub, fontWeight: '500' },
  radioTxtActive: { color: C.primary, fontWeight: '700' },
  certCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: scale(12), borderWidth: 1, borderColor: C.border, borderRadius: scale(8), backgroundColor: C.inputBg, marginBottom: scale(8) },
  certName: { flex: 1, fontSize: scale(13), color: C.ink },
  uploadBtn: { paddingVertical: scale(14), borderWidth: 1, borderColor: C.border, borderStyle: 'dashed', borderRadius: scale(8), alignItems: 'center', backgroundColor: C.inputBg },
  uploadTxt: { fontSize: scale(13), color: C.primary, fontWeight: '600' },
  listItem: { paddingVertical: scale(14), borderBottomWidth: 1, borderBottomColor: C.border },
});


// ─── Experience Modal ─────────────────────────────────────────────────────────
interface ExperienceModalProps { visible: boolean; initial?: any; isEdit?: boolean; onClose: () => void; onSave: (data: any) => void; loading?: boolean; googleApiKey: string; }

const ExperienceModal: React.FC<ExperienceModalProps> = ({ visible, initial, isEdit, onClose, onSave, loading }) => {
  const [form, setForm] = useState({ clinic_hospital_name: '', designation: '', years_of_experience: '', start_date: '', end_date: '', is_current: false });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [activeDateField, setActiveDateField] = useState<'start' | 'end'>('start');

  useEffect(() => {
    if (visible) {
      setForm({
        clinic_hospital_name: initial?.clinic_hospital_name || '',
        designation: initial?.designation || '',
        years_of_experience: String(initial?.years_of_experience || ''),
        start_date: initial?.start_date?.slice(0, 10) || '',
        end_date: initial?.end_date?.slice(0, 10) || '',
        is_current: initial?.is_current || false,
      });
    }
  }, [visible, initial]);

  const handleSave = () => {
    if (!form.clinic_hospital_name.trim()) return Alert.alert('Required', 'Enter clinic/hospital name');
    onSave({ ...form, years_of_experience: Number(form.years_of_experience) || 0, end_date: form.is_current ? undefined : form.end_date || undefined });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={em.overlay}>
        <View style={em.sheet}>
          <View style={em.header}>
            <Text style={em.title}>{isEdit ? 'Edit Experience' : 'Add Experience'}</Text>
            <TouchableOpacity onPress={onClose} style={em.closeBtn}><Ionicons name="close" size={20} color={C.textSub} /></TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: scale(450) }}>
            <View style={em.fieldWrap}>
              <Text style={em.label}>Clinic / Hospital Name</Text>
              <TextInput style={em.input} value={form.clinic_hospital_name} onChangeText={v => setForm(p => ({ ...p, clinic_hospital_name: v }))} placeholder="e.g. City Hospital" placeholderTextColor={C.textMuted} />
            </View>
            <View style={em.fieldWrap}>
              <Text style={em.label}>Designation</Text>
              <TextInput style={em.input} value={form.designation} onChangeText={v => setForm(p => ({ ...p, designation: v }))} placeholder="e.g. Senior Consultant" placeholderTextColor={C.textMuted} />
            </View>
            <View style={em.fieldWrap}>
              <Text style={em.label}>Years of Experience</Text>
              <TextInput style={em.input} value={form.years_of_experience} onChangeText={v => setForm(p => ({ ...p, years_of_experience: v }))} keyboardType="numeric" placeholder="e.g. 5" placeholderTextColor={C.textMuted} />
            </View>
            <View style={em.fieldWrap}>
              <Text style={em.label}>Start Date</Text>
              <TouchableOpacity style={em.inputBtn} onPress={() => { setActiveDateField('start'); setShowDatePicker(true); }}>
                <Text style={{ color: form.start_date ? C.ink : C.textMuted }}>{form.start_date || 'Select start date'}</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }} onPress={() => setForm(p => ({ ...p, is_current: !p.is_current, end_date: !p.is_current ? '' : p.end_date }))}>
              <View style={{ width: 20, height: 20, borderWidth: 1, borderColor: form.is_current ? C.primary : C.border, backgroundColor: form.is_current ? C.primary : 'transparent', alignItems: 'center', justifyContent: 'center', borderRadius: 4 }}>
                {form.is_current && <Ionicons name="checkmark" size={14} color={C.white} />}
              </View>
              <Text style={{ fontSize: scale(13), color: C.ink }}>I currently work here</Text>
            </TouchableOpacity>
            {!form.is_current && (
              <View style={em.fieldWrap}>
                <Text style={em.label}>End Date</Text>
                <TouchableOpacity style={em.inputBtn} onPress={() => { setActiveDateField('end'); setShowDatePicker(true); }}>
                  <Text style={{ color: form.end_date ? C.ink : C.textMuted }}>{form.end_date || 'Select end date'}</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
          {showDatePicker && (
            <DateTimePicker value={new Date()} mode="date" display="default" onChange={(_, d) => { setShowDatePicker(false); if (d) setForm(p => ({ ...p, [activeDateField === 'start' ? 'start_date' : 'end_date']: d.toISOString().slice(0, 10) })); }} />
          )}
          <View style={em.btns}>
            <TouchableOpacity style={[em.saveBtn, loading && { opacity: 0.6 }]} onPress={handleSave} disabled={loading}>
              {loading ? <ActivityIndicator color={C.white} size="small" /> : <Text style={em.saveTxt}>Save</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};


// ─── Clinical Area Modal ──────────────────────────────────────────────────────
const CLINICAL_CONFIG = [
  { key: 'icu', label: 'ICU' }, { key: 'emergency', label: 'Emergency' },
  { key: 'ot', label: 'OT' }, { key: 'opd', label: 'OPD' }, { key: 'ip', label: 'IP' },
] as const;

type AreaKey = (typeof CLINICAL_CONFIG)[number]['key'];
interface AreaState { status: boolean; years: string; remarks: string; }
type ClinicalState = Record<AreaKey, AreaState>;

const ClinicalAreaModal: React.FC<{ visible: boolean; initial?: any; onClose: () => void; onSave: (data: any) => void; loading?: boolean; }> = ({ visible, initial, onClose, onSave, loading }) => {
  const [areas, setAreas] = useState<ClinicalState>({
    icu: { status: false, years: '', remarks: '' }, emergency: { status: false, years: '', remarks: '' },
    ot: { status: false, years: '', remarks: '' }, opd: { status: false, years: '', remarks: '' }, ip: { status: false, years: '', remarks: '' },
  });

  useEffect(() => {
    if (visible) {
      const caeArray = Array.isArray(initial) ? initial : [];
      const newAreas = { ...areas };
      
      CLINICAL_CONFIG.forEach(c => {
        // Search the array for a matching area name
        const matched = caeArray.find((item: any) => item.area?.toLowerCase() === c.label.toLowerCase());
        
        if (matched) {
          newAreas[c.key] = { status: true, years: String(matched.years || ''), remarks: matched.remarks || '' };
        } else {
          newAreas[c.key] = { status: false, years: '', remarks: '' };
        }
      });
      
      setAreas(newAreas);
    }
  }, [visible, initial]);

  const handleSave = () => {
    const payload: Record<string, any> = {};
    (Object.keys(areas) as AreaKey[]).forEach(key => { payload[key] = { status: areas[key].status ? 'yes' : 'no', years: areas[key].years, remarks: areas[key].remarks }; });
    onSave(payload);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={em.overlay}>
        <View style={em.sheet}>
          <View style={em.header}>
            <Text style={em.title}>Clinical Area Experience</Text>
            <TouchableOpacity onPress={onClose} style={em.closeBtn}><Ionicons name="close" size={20} color={C.textSub} /></TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: scale(450) }}>
            {CLINICAL_CONFIG.map(config => (
              <View key={config.key} style={{ marginBottom: scale(16), padding: scale(12), borderWidth: 1, borderColor: C.border, borderRadius: scale(8) }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: areas[config.key].status ? scale(12) : 0 }}>
                  <Text style={{ fontSize: scale(14), fontWeight: '600', color: C.ink }}>{config.label}</Text>
                  <TouchableOpacity onPress={() => setAreas(p => ({ ...p, [config.key]: { ...p[config.key], status: !p[config.key].status } }))}>
                    <View style={{ width: scale(40), height: scale(22), borderRadius: scale(11), backgroundColor: areas[config.key].status ? C.primary : C.border, justifyContent: 'center', paddingHorizontal: scale(2) }}>
                      <View style={{ width: scale(18), height: scale(18), borderRadius: scale(9), backgroundColor: C.white, alignSelf: areas[config.key].status ? 'flex-end' : 'flex-start' }} />
                    </View>
                  </TouchableOpacity>
                </View>
                {areas[config.key].status && (
                  <View style={{ flexDirection: 'row', gap: scale(8) }}>
                    <TextInput style={[em.input, { flex: 0.3 }]} value={areas[config.key].years} onChangeText={v => setAreas(p => ({ ...p, [config.key]: { ...p[config.key], years: v } }))} placeholder="Yrs" keyboardType="numeric" />
                    <TextInput style={[em.input, { flex: 0.7 }]} value={areas[config.key].remarks} onChangeText={v => setAreas(p => ({ ...p, [config.key]: { ...p[config.key], remarks: v } }))} placeholder="Remarks" />
                  </View>
                )}
              </View>
            ))}
          </ScrollView>
          <View style={em.btns}>
            <TouchableOpacity style={[em.saveBtn, loading && { opacity: 0.6 }]} onPress={handleSave} disabled={loading}>
              {loading ? <ActivityIndicator color={C.white} size="small" /> : <Text style={em.saveTxt}>Save</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};


// ─── Main Screen ──────────────────────────────────────────────────────────────
const SPECIALITY_MAP: Record<string, string[]> = {
  'General Medicine': ['Cardiology', 'Neurology', 'Nephrology', 'Gastroenterology', 'Endocrinology', 'Clinical Hematology', 'Medical Oncology', 'Rheumatology', 'Infectious Diseases', 'Critical Care Medicine', 'Hepatology', 'Geriatrics'],
  'Pediatrics': ['Neonatology', 'Pediatric Cardiology', 'Pediatric Neurology', 'Pediatric Nephrology', 'Pediatric Gastroenterology', 'Pediatric Oncology', 'Pediatric Critical Care'],
  'General Surgery': ['Neurosurgery', 'Urology', 'Cardiothoracic & Vascular Surgery (CTVS)', 'Surgical Oncology', 'Pediatric Surgery', 'GI Surgery', 'Plastic Surgery', 'Vascular Surgery', 'Thoracic Surgery', 'Transplant Surgery'],
  'Orthopedics': ['Spine Surgery', 'Arthroscopy', 'Joint Replacement', 'Pediatric Orthopedics', 'Sports Injury Surgery', 'Hand Surgery'],
  'Obstetrics & Gynecology': ['Reproductive Medicine', 'Gynecologic Oncology', 'Maternal & Fetal Medicine', 'Urogynecology', 'Fetal Medicine'],
  'ENT (Otorhinolaryngology)': ['Head & Neck Surgery', 'Otology', 'Neurotology', 'Rhinology', 'Laryngology'],
  'Ophthalmology': ['Retina', 'Cornea', 'Glaucoma', 'Oculoplasty', 'Pediatric Ophthalmology', 'Neuro-Ophthalmology'],
  'Dermatology': ['Dermatosurgery', 'Cosmetic Dermatology', 'Trichology', 'Pediatric Dermatology'],
  'Psychiatry': ['Child Psychiatry', 'Addiction Psychiatry', 'Geriatric Psychiatry', 'Consultation-Liaison Psychiatry'],
  'Radiology': ['Interventional Radiology', 'Neuroradiology', 'Pediatric Radiology'],
  'Anesthesiology': ['Critical Care', 'Cardiac Anesthesia', 'Neuroanesthesia', 'Pain Medicine', 'Pediatric Anesthesia'],
  'Pulmonary Medicine': ['Critical Care Medicine', 'Sleep Medicine', 'Interventional Pulmonology'],
  'Pathology': ['Hematopathology', 'Molecular Pathology', 'Neuropathology', 'Cytopathology'],
  'Emergency Medicine': ['Trauma Care', 'Critical Care', 'Toxicology'],
  'Nuclear Medicine': ['PET Imaging', 'Radionuclide Therapy'],
  'Physical Medicine & Rehabilitation': ['Neurorehabilitation', 'Sports Rehabilitation', 'Pain Rehabilitation'],
  'Community Medicine': ['Epidemiology', 'Public Health Administration'],
  'Family Medicine': ['Geriatric Care', 'Palliative Care'],
  'Dentistry (BDS)': ['Orthodontics', 'Oral Surgery', 'Prosthodontics', 'Endodontics', 'Periodontics', 'Pedodontics'],
  'Cardiac Sciences': ['Interventional Cardiology', 'Electrophysiology'],
  'Neurology Sciences': ['Stroke Medicine', 'Epilepsy', 'Movement Disorders'],
  'Oncology': ['Radiation Oncology', 'Surgical Oncology', 'Medical Oncology'],
  'Gastro Sciences': ['Hepatology', 'GI Surgery', 'Pancreatology'],
  'Renal Sciences': ['Renal Transplant', 'Dialysis Medicine'],
};

const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { doctor: authDoctor, token, setDoctor: setAuthDoctor, logout } = useAuth();
  const [profile, setProfile] = useState<DoctorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [uploadingResume, setUploadingResume] = useState(false);
  const [uploadingProfilePic, setUploadingProfilePic] = useState(false);
  const [uploadingCert, setUploadingCert] = useState(false);
  const [deletingResume, setDeletingResume] = useState(false);
  const [deletingProfilePic, setDeletingProfilePic] = useState(false);

  const [modalState, setModalState] = useState<{ visible: boolean; title: string; fields: EditField[]; onSave: (data: any) => void; }>({ visible: false, title: '', fields: [], onSave: () => {} });
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [localProfilePicUri, setLocalProfilePicUri] = useState<string | null>(null);

  const [medRegModalVisible, setMedRegModalVisible] = useState(false);
  const [medRegModalInitial, setMedRegModalInitial] = useState<any>(null);
  const [medRegEditIndex, setMedRegEditIndex] = useState<number | undefined>(undefined);

  const [eduModalVisible, setEduModalVisible] = useState(false);
  const [eduModalInitial, setEduModalInitial] = useState<any>(null);
  const [eduModalEditIndex, setEduModalEditIndex] = useState<number | undefined>(undefined);

  const [clinicalModalVisible, setClinicalModalVisible] = useState(false);

  const [expModalVisible, setExpModalVisible] = useState(false);
  const [expModalInitial, setExpModalInitial] = useState<any>(null);
  const [expModalIdx, setExpModalIdx] = useState<number | undefined>(undefined);

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: () => logout() },
    ]);
  };

  const fetchProfile = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      if (!token) throw new Error('Session expired. Please login again.');
      const doctor = await fetchDoctorProfile();
      setProfile(doctor);
      setAuthDoctor(doctor);
      setLocalProfilePicUri(null);
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    } catch (err: any) {
      if (['token', 'session', 'unauthorized', 'expired'].some(k => err.message?.toLowerCase().includes(k))) {
        Alert.alert('Session Expired', 'Please login again.', [{ text: 'OK', onPress: () => logout() }]);
      } else {
        Alert.alert('Error', err.message || 'Failed to load profile.', [{ text: 'Retry', onPress: () => fetchProfile(false) }]);
      }
    } finally {
      if (!isRefresh) setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);
  const onRefresh = useCallback(async () => { setRefreshing(true); await fetchProfile(true); setRefreshing(false); }, [fetchProfile]);

  const updateProfile = async (body: Record<string, any>, successMessage?: string) => {
    if (!profile || !token) return;
    if (body.alternate_mobile_number && !isValidPhone(body.alternate_mobile_number)) return Alert.alert('Invalid Phone', 'Enter valid 10-digit mobile number');
    setSaving(true);
    try {
      const updated = await patchDoctorProfile(profile._id, body);
      setProfile(updated);
      setAuthDoctor(updated);
      setModalState(prev => ({ ...prev, visible: false }));
      if (successMessage) Alert.alert('Success', successMessage);
    } catch (err: any) {
      Alert.alert('Update Failed', err.message || 'Could not update profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleUploadProfilePic = async () => {
    if (!token || !profile) return Alert.alert('Error', 'Session expired.');
    try {
      const result = await pick({ type: [types.images] });
      if (!result) return;
      const file = Array.isArray(result) ? result[0] : result;
      if (!file?.uri) return;
      setLocalProfilePicUri(file.uri);
      setUploadingProfilePic(true);
      const updated = await uploadFileViaXHR(file, 'profile_pic', profile._id, token);
      setProfile(updated);
      setAuthDoctor(updated);
      setLocalProfilePicUri(null);
      Alert.alert('Success', 'Profile picture updated');
    } catch (err: any) {
      if (err?.code !== 'DOCUMENT_PICKER_CANCELED' && !err?.message?.toLowerCase()?.includes('cancel')) {
        Alert.alert('Upload Failed', err?.message || 'Could not upload profile picture.');
      }
      setLocalProfilePicUri(null);
    } finally { setUploadingProfilePic(false); }
  };

  const handleUploadResume = async () => {
    if (!token || !profile) return;
    try {
      const files = await pickDocument();
      if (!files || files.length === 0) return;
      setUploadingResume(true);
      const updated = await uploadFileViaXHR(files[0], 'resume', profile._id, token);
      setProfile(updated);
      setAuthDoctor(updated);
      Alert.alert('Success', 'Resume uploaded');
    } catch (err: any) {
      Alert.alert('Upload Failed', err.message || 'Could not upload resume.');
    } finally { setUploadingResume(false); }
  };

  const handleDeleteResume = () => {
    if (!token || !profile) return;
    confirmDelete('Delete Resume', 'Are you sure?', async () => {
      setDeletingResume(true);
      try {
        await api.delete(`/api/doctors/delete-resume/${profile._id}`);
        const updated = { ...profile, resume_url: '' };
        setProfile(updated); setAuthDoctor(updated);
        Alert.alert('Success', 'Resume deleted');
      } catch (err: any) { Alert.alert('Error', 'Could not delete resume.'); }
      finally { setDeletingResume(false); }
    });
  };

  const handleDeleteProfilePic = () => {
    if (!token || !profile) return;
    confirmDelete('Delete Profile Picture', 'Are you sure?', async () => {
      setDeletingProfilePic(true);
      setLocalProfilePicUri(null);
      try {
        await api.delete(`/api/doctors/delete-photo/${profile._id}`);
        const updated = { ...profile, profile_pic_url: '' };
        setProfile(updated); setAuthDoctor(updated);
        Alert.alert('Success', 'Profile picture deleted');
      } catch (err: any) { Alert.alert('Error', 'Could not delete profile picture.'); }
      finally { setDeletingProfilePic(false); }
    });
  };

  const openPersonalEdit = () => {
    if (!profile) return;
    setModalState({
      visible: true, title: 'Personal Details',
      fields: [
        { key: 'prefix', label: 'Prefix', value: profile.prefix || '' },
        { key: 'first_name', label: 'First Name', value: profile.first_name || '' },
        { key: 'last_name', label: 'Last Name', value: profile.last_name || '' },
        { key: 'email', label: 'Email', value: profile.email || '', keyboardType: 'email-address' },
        { key: 'date_of_birth', label: 'Date of Birth', value: profile.date_of_birth?.slice(0, 10) || '', placeholder: 'YYYY-MM-DD' },
        { key: 'gender', label: 'Gender', value: profile.gender || '' },
        { key: 'alternate_mobile_number', label: 'Alt Mobile', value: profile.alternate_mobile_number || '', keyboardType: 'phone-pad' },
        { key: 'city_district', label: 'City', value: profile.city_district || '' },
        { key: 'state', label: 'State', value: profile.state || '' },
      ],
      onSave: data => updateProfile(data),
    });
  };

  const handleClinicalSave = async (data: any) => {
    await updateProfile({ clinical_area_experience: data });
    setClinicalModalVisible(false);
  };

  const handleExperienceSave = (data: any) => {
    const existing = profile?.experience || [];
    const updated = expModalIdx !== undefined ? existing.map((ex, i) => i === expModalIdx ? { ...ex, ...data } : ex) : [...existing, data];
    setExpModalVisible(false);
    updateProfile({ experience: updated });
  };

  const handleDeleteExperience = (idx: number) => {
    confirmDelete('Delete Experience', 'Remove this experience?', () => {
      updateProfile({ experience: (profile?.experience || []).filter((_, i) => i !== idx) });
    });
  };

  const handleDeleteEducation = (idx: number) => {
    confirmDelete('Delete Education', 'Remove this education record?', () => {
      updateProfile({ education: (profile?.education || []).filter((_, i) => i !== idx) });
    });
  };

  const openReferenceEdit = (ref?: Reference, idx?: number) => {
    const r = ref || { ref_name: '', ref_email: '', ref_contact_no: '', ref_profession: '', ref_clinic: '' };
    setModalState({
      visible: true, title: idx !== undefined ? 'Edit Reference' : 'Add Reference',
      fields: [
        { key: 'ref_name', label: 'Name', value: r.ref_name },
        { key: 'ref_profession', label: 'Profession', value: r.ref_profession },
        { key: 'ref_clinic', label: 'Clinic/Hospital', value: (r as any).ref_clinic || '' },
        { key: 'ref_email', label: 'Email', value: r.ref_email, keyboardType: 'email-address' },
        { key: 'ref_contact_no', label: 'Contact', value: r.ref_contact_no, keyboardType: 'phone-pad' },
      ],
      onSave: data => {
        if (data.ref_contact_no && !isValidPhone(data.ref_contact_no)) return Alert.alert('Invalid Phone', 'Enter valid number');
        const existing = profile?.references || [];
        updateProfile({ references: idx !== undefined ? existing.map((r2, i) => (i === idx ? { ...r2, ...data } : r2)) : [...existing, data] });
      },
    });
  };

  const handleDeleteReference = (idx: number) => {
    confirmDelete('Delete Reference', 'Remove this reference?', () => {
      updateProfile({ references: (profile?.references || []).filter((_, i) => i !== idx) });
    });
  };

  const handleMedRegSave = async (data: any) => {
    if (!profile || !token) return;
    setUploadingCert(true);
    try {
      const existingRegs = (profile as any)?.medical_registrations || [];
      if ((data.existing_certificate_urls?.length || 0) + (data.certificate_files?.length || 0) > 1) {
        return Alert.alert('Limit Exceeded', 'Only 1 certificate allowed.');
      }
      const updated = await uploadMedicalRegistration(data, data.certificate_files || [], data.existing_certificate_urls || [], existingRegs, profile._id, token, medRegEditIndex);
      setProfile(updated); setAuthDoctor(updated); setMedRegModalVisible(false);
      Alert.alert('Success', medRegEditIndex !== undefined ? 'Registration updated' : 'Registration added');
    } catch (err: any) { Alert.alert('Failed', err.message || 'Could not save registration.'); }
    finally { setUploadingCert(false); }
  };

  const handleDeleteMedReg = (idx: number) => {
    confirmDelete('Delete Registration', 'Remove this registration?', async () => {
      if (!profile || !token) return;
      setSaving(true);
      try {
        const filtered = ((profile as any)?.medical_registrations || []).filter((_: any, i: number) => i !== idx).map((r: any) => ({
          registration_type: r.registration_type, medical_council_name: r.medical_council_name, registration_number: r.registration_number,
          registration_date: r.registration_date, certificate_url: r.certificate_url ? r.certificate_url.split('?')[0] : '',
        }));
        const { data } = await api.patch('/api/doctors/update-profile', { medical_registrations: filtered });
        const updated = data?.doctor || data?.data || data;
        setProfile(updated); setAuthDoctor(updated);
        Alert.alert('Success', 'Registration deleted');
      } catch (err: any) { Alert.alert('Error', 'Could not delete registration.'); }
      finally { setSaving(false); }
    });
  };

  const formatDateString = (iso?: any) => {
    if (!iso || typeof iso !== 'string') return '—';
    return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  if (loading) return (
    <SafeAreaView style={styles.root}>
      <View style={styles.centered}><ActivityIndicator size="large" color={C.primary} /></View>
    </SafeAreaView>
  );

  if (!profile) return (
    <SafeAreaView style={styles.root}>
      <View style={styles.centered}>
        <Text style={{ color: C.textSub }}>Profile not found.</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => fetchProfile(false)}><Text style={{ color: C.white }}>Retry</Text></TouchableOpacity>
      </View>
    </SafeAreaView>
  );

  const fullName = [profile.prefix, profile.first_name, profile.last_name].filter(Boolean).join(' ');
  const initials = `${profile.first_name?.[0] || ''}${profile.last_name?.[0] || ''}`.toUpperCase();

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor={C.background} />

      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation?.goBack()}>
          <Ionicons name="arrow-back" size={scale(22)} color={C.ink} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={{ width: scale(36) }} />
      </View>

      <Animated.ScrollView
        style={{ opacity: fadeAnim }}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />}
      >
        <View style={styles.heroSection}>
          <ProfileAvatar localUri={localProfilePicUri} serverUrl={profile.profile_pic_url} initials={initials} uploading={uploadingProfilePic} isVerified={!!profile.is_verified} onPress={handleUploadProfilePic} />
          <Text style={styles.heroName}>{fullName}</Text>
          <Text style={styles.heroSpec}>{profile.education?.[0]?.speciality || 'Medical Professional'}</Text>
          <View style={styles.badges}>
            <StatusBadge status={profile.approval_status} />
          </View>
        </View>

        <SectionCard title="Personal Info" onEdit={openPersonalEdit}>
          <View style={{ flexDirection: 'row', gap: scale(16) }}>
            <View style={{ flex: 1 }}><InfoRow label="Full Name" value={fullName} /></View>
            <View style={{ flex: 1 }}><InfoRow label="Email" value={profile.email} /></View>
          </View>
          
          <View style={{ flexDirection: 'row', gap: scale(16) }}>
            <View style={{ flex: 1 }}><InfoRow label="Date of Birth" value={formatDateString(profile.date_of_birth)} /></View>
            <View style={{ flex: 1 }}><InfoRow label="Gender" value={profile.gender} /></View>
          </View>

          <View style={{ flexDirection: 'row', gap: scale(16) }}>
            <View style={{ flex: 1 }}><InfoRow label="Phone" value={profile.mobile_number ? String(profile.mobile_number) : ''} /></View>
            <View style={{ flex: 1 }}>
              {!!profile.alternate_mobile_number && <InfoRow label="Alt. Phone" value={String(profile.alternate_mobile_number)} />}
            </View>
          </View>

          <View style={{ height: 1, backgroundColor: C.border, marginVertical: scale(12), marginTop: scale(4) }} />
          
          <View style={{ flexDirection: 'row', gap: scale(16) }}>
            <View style={{ flex: 1 }}><InfoRow label="Location" value={`${profile.city_district || ''}, ${profile.state || ''} — ${profile.current_location_pincode || ''}`} /></View>
            <View style={{ flex: 1 }}>
              {!!profile.address_line1 && <InfoRow label="Address" value={[profile.address_line1, profile.address_line2].filter(Boolean).join(', ')} />}
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: scale(16) }}>
            <View style={{ flex: 1 }}>
              {(profile as any).specialization && <InfoRow label="Specialization" value={(profile as any).specialization} />}
            </View>
            <View style={{ flex: 1 }}>
              {!!profile.current_clinic_hospital_name && <InfoRow label="Current Clinic/Hospital" value={profile.current_clinic_hospital_name} />}
            </View>
          </View>
        </SectionCard>

        <SectionCard title="Education" onAdd={() => { setEduModalInitial(null); setEduModalEditIndex(undefined); setEduModalVisible(true); }}>
          {profile.education?.map((edu, i) => (
            <View key={i} style={styles.listItem}>
              <View style={styles.listBody}>
                <Text style={styles.listTitle}>{edu.degree === 'Other' ? (edu as any).specify_degree : edu.degree}</Text>
                <Text style={styles.listSub}>{edu.speciality}</Text>
                <Text style={styles.listMeta}>{edu.university}</Text>
              </View>
              <View style={styles.listActions}>
                <TouchableOpacity style={styles.ghostIcon} onPress={() => { setEduModalInitial(edu); setEduModalEditIndex(i); setEduModalVisible(true); }}><Ionicons name="pencil" size={16} color={C.textSub} /></TouchableOpacity>
                <TouchableOpacity style={styles.ghostIcon} onPress={() => handleDeleteEducation(i)}><Ionicons name="trash" size={16} color={C.urgent} /></TouchableOpacity>
              </View>
            </View>
          ))}
          {!profile.education?.length && <Text style={styles.emptyTxt}>No education added</Text>}
        </SectionCard>

        <SectionCard title="Experience & Clinical Areas" onAdd={() => { setExpModalInitial(null); setExpModalIdx(undefined); setExpModalVisible(true); }}>
          <View style={styles.caeWrap}>
            <Text style={styles.caeTitle}>Clinical Area Experience</Text>
            <TouchableOpacity onPress={() => setClinicalModalVisible(true)}><Text style={{ color: C.primary, fontSize: scale(13), fontWeight: '600' }}>Edit</Text></TouchableOpacity>
          </View>

          {/* DISPLAY THE SAVED CLINICAL AREAS */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: scale(16), gap: scale(8) }}>
            {Array.isArray((profile as any)?.clinical_area_experience) && (profile as any).clinical_area_experience.map((item: any, idx: number) => {
              if (!item || !item.area) return null;
              return (
                <View key={`cae-${idx}`} style={pill.wrap}>
                  <Text style={pill.text}>
                    {item.area} {item.years ? `• ${item.years} yrs` : ''}
                  </Text>
                </View>
              );
            })}
          </View>

          {profile.experience?.map((exp, i) => (
            <View key={i} style={styles.listItem}>
              <View style={styles.listBody}>
                <Text style={styles.listTitle}>{exp.clinic_hospital_name}</Text>
                <Text style={styles.listSub}>{exp.designation}</Text>
                <Text style={styles.listMeta}>{exp.years_of_experience} yrs</Text>
              </View>
              <View style={styles.listActions}>
                <TouchableOpacity style={styles.ghostIcon} onPress={() => { setExpModalInitial(exp); setExpModalIdx(i); setExpModalVisible(true); }}><Ionicons name="pencil" size={16} color={C.textSub} /></TouchableOpacity>
                <TouchableOpacity style={styles.ghostIcon} onPress={() => handleDeleteExperience(i)}><Ionicons name="trash" size={16} color={C.urgent} /></TouchableOpacity>
              </View>
            </View>
          ))}
          {!profile.experience?.length && <Text style={styles.emptyTxt}>No experience added</Text>}
        </SectionCard>

        <SectionCard title="Medical Registrations" onAdd={() => { setMedRegModalInitial(null); setMedRegEditIndex(undefined); setMedRegModalVisible(true); }}>
          {(profile as any)?.medical_registrations?.map((reg: any, i: number) => (
            <View key={i} style={styles.listItem}>
              <View style={styles.listBody}>
                <Text style={styles.listTitle}>{reg.registration_type || 'Registration'}</Text>
                <Text style={styles.listSub}>{reg.medical_council_name}</Text>
                <Text style={styles.listMeta}>No: {reg.registration_number}</Text>
              </View>
              <View style={styles.listActions}>
                <TouchableOpacity style={styles.ghostIcon} onPress={() => { setMedRegModalInitial(reg); setMedRegEditIndex(i); setMedRegModalVisible(true); }}><Ionicons name="pencil" size={16} color={C.textSub} /></TouchableOpacity>
                <TouchableOpacity style={styles.ghostIcon} onPress={() => handleDeleteMedReg(i)}><Ionicons name="trash" size={16} color={C.urgent} /></TouchableOpacity>
              </View>
            </View>
          ))}
          {!(profile as any)?.medical_registrations?.length && <Text style={styles.emptyTxt}>No registrations added</Text>}
        </SectionCard>

        <SectionCard title="References" onAdd={() => openReferenceEdit()}>
          {profile.references?.map((ref, i) => (
            <View key={i} style={styles.listItem}>
              <View style={styles.listBody}>
                <Text style={styles.listTitle}>{ref.ref_name}</Text>
                <Text style={styles.listSub}>{ref.ref_profession}</Text>
                <Text style={styles.listMeta}>{ref.ref_contact_no}</Text>
              </View>
              <View style={styles.listActions}>
                <TouchableOpacity style={styles.ghostIcon} onPress={() => openReferenceEdit(ref, i)}><Ionicons name="pencil" size={16} color={C.textSub} /></TouchableOpacity>
                <TouchableOpacity style={styles.ghostIcon} onPress={() => handleDeleteReference(i)}><Ionicons name="trash" size={16} color={C.urgent} /></TouchableOpacity>
              </View>
            </View>
          ))}
          {!profile.references?.length && <Text style={styles.emptyTxt}>No references added</Text>}
        </SectionCard>

        <SectionCard title="Documents">
          <View style={styles.docRow}>
            <Ionicons name="document-text-outline" size={scale(24)} color={C.primary} />
            <View style={{ flex: 1, marginLeft: scale(12) }}>
              <Text style={styles.docTitle}>Resume / CV</Text>
              {profile.resume_url ? (
                <TouchableOpacity onPress={() => { if (profile.resume_url) Linking.openURL(profile.resume_url); }}><Text style={{ color: C.primary, fontSize: scale(12) }}>View uploaded file</Text></TouchableOpacity>
              ) : <Text style={{ color: C.textMuted, fontSize: scale(12) }}>No file uploaded</Text>}
            </View>
            <TouchableOpacity onPress={handleUploadResume} disabled={uploadingResume}><Text style={{ color: C.primary, fontWeight: '600' }}>{uploadingResume ? '...' : 'Upload'}</Text></TouchableOpacity>
            {!!profile.resume_url && <TouchableOpacity onPress={handleDeleteResume} style={{ marginLeft: scale(12) }}><Ionicons name="trash" size={18} color={C.urgent} /></TouchableOpacity>}
          </View>
        </SectionCard>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </Animated.ScrollView>

      {saving && (
        <View style={styles.savingOverlay}>
          <ActivityIndicator color={C.white} size="small" />
          <Text style={styles.savingText}>Saving…</Text>
        </View>
      )}

      <EditModal visible={modalState.visible} title={modalState.title} fields={modalState.fields} onClose={() => setModalState(prev => ({ ...prev, visible: false }))} onSave={modalState.onSave} loading={saving} />
      <MedicalRegistrationModal visible={medRegModalVisible} initial={medRegModalInitial} onClose={() => { setMedRegModalVisible(false); setMedRegModalInitial(null); setMedRegEditIndex(undefined); }} onSave={handleMedRegSave} loading={uploadingCert} />
      <ExperienceModal visible={expModalVisible} initial={expModalInitial} isEdit={expModalIdx !== undefined} onClose={() => setExpModalVisible(false)} onSave={handleExperienceSave} loading={saving} googleApiKey={GOOGLE_API_KEY} />
      <EducationModal visible={eduModalVisible} initial={eduModalInitial} editIndex={eduModalEditIndex} profile={profile} onClose={() => { setEduModalVisible(false); setEduModalInitial(null); setEduModalEditIndex(undefined); }} onSave={updatedEducation => { updateProfile({ education: updatedEducation }, 'Education updated'); setEduModalVisible(false); }} loading={saving} googleApiKey={GOOGLE_API_KEY} />
      <ClinicalAreaModal visible={clinicalModalVisible} initial={(profile as any)?.clinical_area_experience} onClose={() => setClinicalModalVisible(false)} onSave={handleClinicalSave} loading={saving} />

    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingBottom: scale(40) },
  headerBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: scale(24), paddingVertical: scale(16), backgroundColor: C.background },
  headerTitle: { fontSize: scale(18), fontWeight: '800', color: C.ink },
  iconBtn: { padding: scale(4) },
  heroSection: { alignItems: 'center', paddingVertical: scale(24), borderBottomWidth: 1, borderBottomColor: C.border, marginBottom: scale(24) },
  heroName: { fontSize: scale(20), fontWeight: '800', color: C.ink },
  heroSpec: { fontSize: scale(14), color: C.textSub, marginTop: scale(4), fontWeight: '500' },
  badges: { marginTop: scale(10), flexDirection: 'row', gap: scale(8) },
  listItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: scale(12), borderBottomWidth: 1, borderBottomColor: C.border },
  listBody: { flex: 1 },
  listTitle: { fontSize: scale(14), fontWeight: '700', color: C.ink },
  listSub: { fontSize: scale(13), color: C.textSub, marginTop: scale(2), fontWeight: '500' },
  listMeta: { fontSize: scale(12), color: C.textMuted, marginTop: scale(4) },
  listActions: { flexDirection: 'row', gap: scale(4), alignItems: 'center' },
  ghostIcon: { padding: scale(6) },
  caeWrap: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: scale(8), paddingBottom: scale(8), borderBottomWidth: 1, borderBottomColor: C.border },
  caeTitle: { fontSize: scale(14), fontWeight: '700', color: C.ink },
  docRow: { flexDirection: 'row', alignItems: 'center' },
  docTitle: { fontSize: scale(14), fontWeight: '700', color: C.ink, marginBottom: scale(2) },
  emptyTxt: { fontSize: scale(13), color: C.textMuted, fontStyle: 'italic', paddingVertical: scale(8) },
  logoutBtn: { marginHorizontal: scale(24), marginTop: scale(16), paddingVertical: scale(14), borderRadius: scale(12), alignItems: 'center', backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA' },
  logoutText: { color: C.urgent, fontWeight: '700', fontSize: scale(14) },
  savingOverlay: { position: 'absolute', bottom: scale(40), alignSelf: 'center', flexDirection: 'row', alignItems: 'center', backgroundColor: C.ink, paddingHorizontal: scale(16), paddingVertical: scale(10), borderRadius: scale(20), gap: scale(8), elevation: 5 },
  savingText: { color: C.white, fontSize: scale(13), fontWeight: '700' },
  retryBtn: { marginTop: scale(12), backgroundColor: C.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
});

export default ProfileScreen;