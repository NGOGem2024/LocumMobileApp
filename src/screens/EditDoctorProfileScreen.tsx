import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Modal,
  FlatList,
  StatusBar,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import api from '../services/axiosConfig';

const GOOGLE_API_KEY = 'AIzaSyCUgfce6vE1U10ZsdF7s62KxOFD2Q_dNDc';

const { width: SW } = Dimensions.get('window');
const scale = (size: number) => (SW / 390) * size;

// ─── THEME COLORS ───────────────────────────────────────────────────────
const C = {
  background: '#F9FAFB', cardBg: '#FFFFFF', border: '#F3F4F6', inputBg: '#FFFFFF',
  primary: '#007b8e', primaryBorder: 'rgba(0, 123, 142, 0.35)', accentCyan: '#00a8c2',
  primaryDark: '#04424c', primaryLight: '#E0F5F8', ink: '#111827', textSub: '#4B5563',
  textMuted: '#9CA3AF', white: '#ffffff', error: '#ef4444', success: '#10b981',
};

// ─── DROPDOWN OPTIONS ───────────────────────────────────────────────────
const SPECIALIZATIONS = ['General Physician', 'Pediatrics', 'Gynecology & Obstetrics', 'Orthopedics', 'Dermatology', 'ENT', 'Ophthalmology', 'Psychiatry', 'General Surgery', 'Other'];
const QUALIFICATIONS = ['MBBS', 'MD', 'MS', 'BDS', 'MDS', 'BHMS', 'BAMS', 'DNB', 'Other'];
const EXPERIENCE_RANGES = ['Less than 1 year', '1–3 years', '3–5 years', '5–10 years', '10–15 years', '15–20 years', '20+ years'];
const MEDICAL_COUNCILS = ['National Medical Commission (NMC)', 'Maharashtra Medical Council', 'Karnataka Medical Council', 'Delhi Medical Council', 'Other'];
const TITLES = ['Dr', 'Mr', 'Ms', 'Mrs'];

interface FormData {
  title: string; first_name: string; middle_name: string; last_name: string;
  mobile_number: string; email: string; specialization: string; qualification: string;
  experience: string; medical_council_name: string; clinic_name: string;
  clinic_address: string; city: string; state: string; pincode: string;
  job_type: string[]; preferred_km: string; preferred_pincode: string;
}

const EditDoctorProfileScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { doctor, setDoctor } = useAuth(); // Assuming your auth context holds the doctor ID
  
  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pincodeLoading, setPincodeLoading] = useState(false);
  const [pincodeFetched, setPincodeFetched] = useState(true);

  const [dropdownConfig, setDropdownConfig] = useState<{
    visible: boolean; field: keyof FormData | null; options: string[]; title: string;
  }>({ visible: false, field: null, options: [], title: '' });

  const [form, setForm] = useState<FormData>({
    title: '', first_name: '', middle_name: '', last_name: '', mobile_number: '',
    email: '', specialization: '', qualification: '', experience: '', medical_council_name: '',
    clinic_name: '', clinic_address: '', city: '', state: '', pincode: '',
    job_type: ['locum_shifts'], preferred_km: '', preferred_pincode: '',
  });

  // ─── FETCH EXISTING DATA ────────────────────────────────────────────────
  useEffect(() => {
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    try {
      setLoadingData(true);
      // Calls your showProfile controller
      const res = await api.get('/api/doctors/show-profile');
      const data = res.data.data;
      
      // Map backend data to local form state
      setForm({
        title: data.prefix || 'Dr.',
        first_name: data.first_name || '',
        middle_name: data.middle_name || '',
        last_name: data.last_name || '',
        mobile_number: data.mobile_number ? data.mobile_number.replace('+91', '') : '',
        email: data.email || '',
        specialization: data.education?.[0]?.speciality || '',
        qualification: data.education?.[0]?.degree || '',
        experience: data.experience?.[0]?.years_of_experience ? `${data.experience[0].years_of_experience} years` : '', // Map this properly based on your logic
        medical_council_name: data.medical_registrations?.[0]?.medical_council_name || '',
        clinic_name: data.experience?.[0]?.clinic_hospital_name || '',
        clinic_address: data.address_line1 || '',
        city: data.city_district || '',
        state: data.state || '',
        pincode: data.current_location_pincode || '',
        job_type: ['locum_shifts'], // Hardcoded as per your registration
        preferred_km: data.preferred_locations?.[0]?.distance_km?.toString() || '50',
        preferred_pincode: data.preferred_locations?.[0]?.pincode || '',
      });
    } catch (error: any) {
      Alert.alert('Error', 'Failed to load profile data.');
    } finally {
      setLoadingData(false);
    }
  };

  const setField = (field: keyof FormData, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const openDropdown = (field: keyof FormData, options: string[], title: string) => 
    setDropdownConfig({ visible: true, field, options, title });

  const selectDropdown = (value: string) => {
    if (dropdownConfig.field) setField(dropdownConfig.field, value);
    setDropdownConfig(p => ({ ...p, visible: false }));
  };

  // ─── LOCATION FETCHING ────────────────────────────────────────────────
  const fetchLocationByPincode = async (pincode: string) => {
    if (pincode.length !== 6) return;
    setPincodeLoading(true); setPincodeFetched(false);
    try {
      const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${pincode}&region=IN&key=${GOOGLE_API_KEY}`);
      const data = await res.json();
      if (data.status !== 'OK' || !data.results?.length) throw new Error('Invalid pincode');

      const components = data.results[0].address_components;
      const getComponent = (type: string) => components.find((c: any) => c.types.includes(type))?.long_name || '';

      const city = getComponent('locality') || getComponent('administrative_area_level_2');
      const state = getComponent('administrative_area_level_1');

      setForm(prev => ({ ...prev, city, state }));
      setPincodeFetched(true);
    } catch {
      setForm(prev => ({ ...prev, city: '', state: '' }));
    } finally {
      setPincodeLoading(false);
    }
  };

  // ─── SUBMIT HANDLER ───────────────────────────────────────────────────
  const handleSave = async () => {
    if (!form.first_name || !form.mobile_number || !form.pincode) {
      Alert.alert('Validation Error', 'Please fill in all required fields.');
      return;
    }
    
    setSaving(true);
    try {
      const payload = {
        prefix: form.title,
        first_name: form.first_name.trim(),
        middle_name: form.middle_name.trim(),
        last_name: form.last_name.trim(),
        mobile_number: `+91${form.mobile_number}`,
        email: form.email.trim().toLowerCase(),
        current_location_pincode: form.pincode,
        city_district: form.city,
        state: form.state,
        address_line1: form.clinic_address.trim(),
        medical_council_name: form.medical_council_name.trim(),
        education: [{
          degree: form.qualification,
          speciality: form.specialization,
        }],
        experience: [{
          years_of_experience: parseInt(form.experience.match(/\d+/)?.[0] || '0', 10),
          clinic_hospital_name: form.clinic_name.trim() || '',
          designation: form.qualification,
          is_current: true,
        }],
        preferred_distance_km: Number(form.preferred_km),
        preferred_pincode: form.preferred_pincode.trim() || undefined,
      };

      // Calls your updateDoctorProfile controller
      // Using 'me' since your backend uses req.user?.id to determine the ID
      const response = await api.patch('/api/doctors/edit-profile/me', payload);
      
      if (response.data.success) {
        setDoctor(response.data.doctor); // Update local context
        Alert.alert('Success', 'Profile updated successfully!', [
            { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Update failed. Please try again.';
      Alert.alert('Update Failed', errorMessage);
    } finally {
      setSaving(false);
    }
  };

  if (loadingData) {
    return (
      <View style={[styles.root, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={C.primary} />
        <Text style={{ marginTop: 10, color: C.textSub }}>Loading Profile...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor={C.background} />
      
      {/* ── Top Header ── */}
      <View style={styles.topNav}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color={C.ink} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <View style={{ width: scale(40) }} /> 
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView style={styles.flex} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          
          {/* ══ SECTION: PERSONAL DETAILS ══ */}
          <Text style={styles.sectionTitle}>Personal Details</Text>
          <DropdownField label="TITLE" required icon="person-outline" placeholder="Select" value={form.title} onPress={() => openDropdown('title', TITLES, 'Select Title')} />
          <Field label="FIRST NAME" required icon="person-outline" placeholder="First name" value={form.first_name} onChangeText={v => setField('first_name', v)} />
          <Field label="MIDDLE NAME" icon="person-outline" placeholder="Optional" value={form.middle_name} onChangeText={v => setField('middle_name', v)} />
          <Field label="LAST NAME" required icon="person-outline" placeholder="Last name" value={form.last_name} onChangeText={v => setField('last_name', v)} />
          <Field label="MOBILE NUMBER" required icon="call-outline" placeholder="9876543210" value={form.mobile_number} onChangeText={v => setField('mobile_number', v.replace(/\D/g, '').slice(0, 10))} keyboardType="phone-pad" maxLength={10} prefix="+91" />
          <Field label="EMAIL ADDRESS" required icon="mail-outline" placeholder="name@domain.com" value={form.email} onChangeText={v => setField('email', v.trim())} keyboardType="email-address" autoCapitalize="none" />
          <Field label="PINCODE" required icon="location-outline" placeholder="6-digit pincode" value={form.pincode} onChangeText={v => { setField('pincode', v.replace(/\D/g, '').slice(0, 6)); if (v.length === 6) fetchLocationByPincode(v); }} keyboardType="numeric" maxLength={6} />
          {pincodeLoading && <Text style={styles.pinText}>Fetching location…</Text>}
          
          <Field label="CITY" icon="business-outline" value={form.city} onChangeText={() => {}} placeholder="Auto-filled" />
          <Field label="STATE" icon="map-outline" value={form.state} onChangeText={() => {}} placeholder="Auto-filled" />
          <Field label="CLINIC / HOME ADDRESS" required icon="home-outline" placeholder="Full address details" value={form.clinic_address} onChangeText={v => setField('clinic_address', v)} multiline numberOfLines={3} />

          {/* ══ SECTION: PROFESSIONAL PROFILE ══ */}
          <View style={styles.divider} />
          <Text style={styles.sectionTitle}>Professional Profile</Text>
          <DropdownField label="SPECIALIZATION" required icon="pricetag-outline" placeholder="Select specialization" value={form.specialization} onPress={() => openDropdown('specialization', SPECIALIZATIONS, 'Select Specialization')} />
          <DropdownField label="HIGHEST QUALIFICATION" required icon="school-outline" placeholder="Select qualification" value={form.qualification} onPress={() => openDropdown('qualification', QUALIFICATIONS, 'Select Qualification')} />
          <DropdownField label="YEARS OF EXPERIENCE" required icon="time-outline" placeholder="Select range" value={form.experience} onPress={() => openDropdown('experience', EXPERIENCE_RANGES, 'Select Experience')} />
          <DropdownField label="MEDICAL COUNCIL NAME" required icon="library-outline" placeholder="Select council" value={form.medical_council_name} onPress={() => openDropdown('medical_council_name', MEDICAL_COUNCILS, 'Select Medical Council')} />
          
          {/* ══ SECTION: WORK PREFERENCES ══ */}
          <View style={styles.divider} />
          <Text style={styles.sectionTitle}>Work Preferences</Text>
          <View style={{ marginBottom: scale(20) }}>
            <Text style={fieldStyles.label}>PREFERRED DISTANCE <Text style={fieldStyles.req}>*</Text></Text>
            <View style={styles.chipGroup}>
              {['5', '10', '20', '50', '100'].map(km => {
                const selected = form.preferred_km === km;
                return (
                  <TouchableOpacity key={km} onPress={() => setField('preferred_km', km)} style={[styles.chip, selected && styles.chipActive]}>
                    <Text style={[styles.chipText, selected && styles.chipTextActive]}>{km} km</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
          <Field label="PREFERRED WORK PINCODE" icon="location-outline" placeholder="Area pincode (optional)" value={form.preferred_pincode} onChangeText={v => setField('preferred_pincode', v.replace(/\D/g, '').slice(0, 6))} keyboardType="numeric" maxLength={6} />

        </ScrollView>
      </KeyboardAvoidingView>

      {/* ─── ACTION BAR ─────────────────────────────────────────── */}
      <View style={styles.floatingActionBar}>
        <TouchableOpacity style={styles.nextBtnWrapper} onPress={handleSave} disabled={saving} activeOpacity={0.85}>
           <LinearGradient colors={['#00a8c2', '#007b8e']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.nextBtnGradient, saving && { opacity: 0.7 }]}>
              {saving ? <ActivityIndicator color={C.white} /> : <Text style={styles.nextBtnTxt}>Save Changes</Text>}
           </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* ─── DROPDOWN MODAL ─────────────────────────────────────── */}
      <Modal visible={dropdownConfig.visible} transparent animationType="slide" onRequestClose={() => setDropdownConfig(p => ({ ...p, visible: false }))}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setDropdownConfig(p => ({ ...p, visible: false }))}>
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>{dropdownConfig.title}</Text>
            <FlatList
              data={dropdownConfig.options}
              keyExtractor={i => i}
              renderItem={({ item }) => {
                const isSelected = dropdownConfig.field ? form[dropdownConfig.field] === item : false;
                return (
                  <TouchableOpacity style={[styles.option, isSelected && styles.optionSel]} onPress={() => selectDropdown(item)}>
                    <Text style={[styles.optionTxt, isSelected && styles.optionTxtSel]}>{item}</Text>
                    {isSelected && <Ionicons name="checkmark" size={20} color={C.primary} />}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

// ─── SUB-COMPONENTS ───────────────────────────────────────────────────────────
interface FieldProps {
  label: string; required?: boolean; icon: string; placeholder: string; value: string;
  onChangeText: (v: string) => void; keyboardType?: 'default' | 'phone-pad' | 'email-address' | 'numeric';
  autoCapitalize?: 'none' | 'words' | 'sentences' | 'characters'; maxLength?: number; multiline?: boolean; numberOfLines?: number; prefix?: string;
}

const Field: React.FC<FieldProps> = ({ label, required, icon, placeholder, value, onChangeText, keyboardType = 'default', autoCapitalize = 'sentences', maxLength, multiline = false, numberOfLines = 1, prefix }) => (
  <View style={fieldStyles.wrapper}>
    <Text style={fieldStyles.label}>{label}{required && <Text style={fieldStyles.req}> *</Text>}</Text>
    <View style={[fieldStyles.inputRow, multiline ? fieldStyles.inputRowMulti : null]}>
      <Ionicons name={icon} size={18} color={C.textMuted} style={fieldStyles.icon} />
      {prefix && <Text style={fieldStyles.prefix}>{prefix}</Text>}
      <TextInput
        style={[fieldStyles.input, multiline && { height: numberOfLines * scale(28), textAlignVertical: 'top' }]}
        placeholder={placeholder} placeholderTextColor={C.textMuted} value={value}
        onChangeText={onChangeText} keyboardType={keyboardType} autoCapitalize={autoCapitalize}
        maxLength={maxLength} multiline={multiline} numberOfLines={multiline ? numberOfLines : 1}
      />
    </View>
  </View>
);

const DropdownField: React.FC<{ label: string; required?: boolean; icon: string; placeholder: string; value: string; onPress: () => void; }> = ({ label, required, icon, placeholder, value, onPress }) => (
  <View style={fieldStyles.wrapper}>
    <Text style={fieldStyles.label}>{label}{required && <Text style={fieldStyles.req}> *</Text>}</Text>
    <TouchableOpacity style={fieldStyles.inputRow} onPress={onPress} activeOpacity={0.85}>
      <Ionicons name={icon} size={18} color={C.textMuted} style={fieldStyles.icon}/>
      <Text style={[fieldStyles.dropdownText, !value && fieldStyles.placeholderText]} numberOfLines={1}>
        {value || placeholder}
      </Text>
      <Ionicons name="chevron-down" size={18} color={value ? C.primary : C.textMuted} />
    </TouchableOpacity>
  </View>
);

// ─── STYLES ───────────────────────────────────────────────────────────────────
const fieldStyles = StyleSheet.create({
  wrapper: { marginBottom: scale(16) }, 
  label: { fontSize: scale(11), fontWeight: '700', color: C.textMuted, marginBottom: scale(6), letterSpacing: 0.8 },
  req: { color: C.error },
  inputRow: { flexDirection: 'row', alignItems: 'center', borderRadius: scale(12), backgroundColor: C.inputBg, paddingHorizontal: scale(14), minHeight: scale(48), borderWidth: 1, borderColor: C.primaryBorder },
  inputRowMulti: { alignItems: 'flex-start', paddingVertical: scale(12) },
  icon: { marginRight: scale(8) },
  prefix: { fontSize: scale(14), color: C.ink, fontWeight: '600', marginRight: scale(6) },
  input: { flex: 1, fontSize: scale(14), color: C.ink, paddingVertical: 0, fontWeight: '500' },
  dropdownText: { flex: 1, fontSize: scale(14), color: C.ink, fontWeight: '500' },
  placeholderText: { color: C.textMuted, fontWeight: '400' },
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background }, flex: { flex: 1 },
  topNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: scale(24), paddingTop: scale(12), paddingBottom: scale(8) },
  iconBtn: { width: scale(40), height: scale(40), borderRadius: scale(20), backgroundColor: C.white, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: scale(18), fontWeight: '800', color: C.ink },
  scroll: { paddingHorizontal: scale(24), paddingTop: scale(10), paddingBottom: scale(120) },
  sectionTitle: { fontSize: scale(20), fontWeight: '800', color: C.ink, marginBottom: scale(20), letterSpacing: -0.3 },
  divider: { height: 1, backgroundColor: C.border, marginVertical: scale(24) },
  chipGroup: { flexDirection: 'row', flexWrap: 'wrap', gap: scale(10) },
  chip: { paddingHorizontal: scale(18), paddingVertical: scale(12), borderRadius: scale(24), borderWidth: 1, borderColor: C.primaryBorder, backgroundColor: C.white },
  chipActive: { borderColor: C.primary, backgroundColor: C.primaryLight },
  chipText: { color: C.textSub, fontSize: scale(14), fontWeight: '600' },
  chipTextActive: { color: C.primary, fontWeight: '800' },
  pinText: { fontSize: scale(12), color: C.textMuted, marginTop: -scale(12), marginBottom: scale(16), marginLeft: 4, fontWeight: '600' },
  floatingActionBar: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: scale(24), paddingTop: scale(16), paddingBottom: Platform.OS === 'ios' ? 36 : scale(24), backgroundColor: 'rgba(249, 250, 251, 0.95)' },
  nextBtnWrapper: { width: '100%' },
  nextBtnGradient: { borderRadius: scale(16), paddingVertical: scale(16), alignItems: 'center', justifyContent: 'center' },
  nextBtnTxt: { color: C.white, fontSize: scale(15), fontWeight: '800' },
  overlay: { flex: 1, backgroundColor: 'rgba(17, 24, 39, 0.6)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: C.white, borderTopLeftRadius: scale(24), borderTopRightRadius: scale(24), paddingTop: 12, maxHeight: '75%' },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: 'center', marginBottom: 14 },
  sheetTitle: { fontSize: scale(16), fontWeight: '800', color: C.ink, paddingHorizontal: scale(24), paddingBottom: scale(16), borderBottomWidth: 1, borderBottomColor: C.border },
  option: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: scale(24), paddingVertical: scale(16), borderBottomWidth: 1, borderBottomColor: '#f9fafb' },
  optionSel: { backgroundColor: C.primaryLight },
  optionTxt: { fontSize: scale(15), color: C.textSub, fontWeight: '500' },
  optionTxtSel: { color: C.primary, fontWeight: '800' },
});

export default EditDoctorProfileScreen;