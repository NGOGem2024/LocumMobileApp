import React, { useState, useRef, useEffect } from 'react';
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
  Animated,
  StatusBar,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import TermsModal from '../components/TermsModal';
import PrivacyPolicyModal from '../components/PrivacyPolicyModal';
import { useAuth } from '../context/AuthContext';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import api from '../services/axiosConfig' // ⬅️ Imported the custom Axios instance

const GOOGLE_API_KEY = 'AIzaSyCUgfce6vE1U10ZsdF7s62KxOFD2Q_dNDc';

// ─── RESPONSIVE SCALE ─────────────────────────────────────────────────────────
const { width: SW } = Dimensions.get('window');
const scale = (size: number) => (SW / 390) * size;

// ─── LIGHT THEME COLORS ───────────────────────────────────────────────────────
const C = {
  background: '#F9FAFB', 
  cardBg: '#FFFFFF',     
  border: '#F3F4F6',     
  inputBg: '#FFFFFF',    
  primary: '#007b8e',
  primaryBorder: 'rgba(0, 123, 142, 0.35)', // Aesthetic translucent teal border
  accentCyan: '#00a8c2',
  primaryDark: '#04424c',
  primaryLight: '#E0F5F8',
  ink: '#111827',        
  textSub: '#4B5563',    
  textMuted: '#9CA3AF',  
  white: '#ffffff',
  error: '#ef4444',
  success: '#10b981',
};

// ⬅️ Removed BASE_URL constant since it is now managed by Axios

const SPECIALIZATIONS = [
  'General Physician', 'Pediatrics', 'Gynecology & Obstetrics', 'Orthopedics',
  'Dermatology', 'ENT', 'Ophthalmology', 'Psychiatry', 'General Surgery',
  'Anesthesiology', 'Pathology', 'Radiology', 'Cardiology', 'Neurology',
  'Gastroenterology', 'Pulmonology', 'Nephrology', 'Urology', 'Oncology',
  'Endocrinology', 'Rheumatology', 'Physiotherapy', 'Ayurveda', 'Homeopathy',
  'Dentistry', 'Other',
];

const QUALIFICATIONS = [
  'MBBS', 'MD', 'MS', 'MBBS + MD', 'MBBS + MS', 'BDS', 'MDS', 'DNB', 'DM', 
  'MCh', 'FRCS', 'MRCP', 'PhD (Medical)', 'Other',
];

const EXPERIENCE_RANGES = [
  'Less than 1 year', '1–3 years', '3–5 years', '5–10 years', '10–15 years',
  '15–20 years', '20+ years',
];

const MEDICAL_COUNCILS = [
  'Andhra Pradesh Medical Council', 'Arunachal Pradesh Medical Council',
  'Assam Medical Council', 'Bihar Medical Council', 'Chhattisgarh Medical Council',
  'Delhi Medical Council', 'Goa Medical Council', 'Gujarat Medical Council',
  'Haryana Medical Council', 'Himachal Pradesh Medical Council',
  'Jammu & Kashmir Medical Council', 'Jharkhand Medical Council',
  'Karnataka Medical Council', 'Kerala Medical Council',
  'Madhya Pradesh Medical Council', 'Maharashtra Medical Council',
  'Manipur Medical Council', 'Meghalaya Medical Council',
  'Mizoram Medical Council', 'Nagaland Medical Council', 'Odisha Medical Council',
  'Punjab Medical Council', 'Rajasthan Medical Council', 'Sikkim Medical Council',
  'Tamil Nadu Medical Council', 'Telangana Medical Council',
  'Tripura Medical Council', 'Uttar Pradesh Medical Council',
  'Uttarakhand Medical Council', 'West Bengal Medical Council',
  'National Medical Commission (NMC)', 'Other',
];

const TITLES = ['Dr', 'Mr', 'Ms', 'Mrs'];
const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: currentYear - 1969 }, (_, i) => String(currentYear - i));
const MONTHS = [
  { label: 'January', value: '01' }, { label: 'February', value: '02' },
  { label: 'March', value: '03' }, { label: 'April', value: '04' },
  { label: 'May', value: '05' }, { label: 'June', value: '06' },
  { label: 'July', value: '07' }, { label: 'August', value: '08' },
  { label: 'September', value: '09' }, { label: 'October', value: '10' },
  { label: 'November', value: '11' }, { label: 'December', value: '12' },
];

interface FormData {
  qualification_other: string; specialization_other: string; title: string;
  first_name: string; middle_name: string; last_name: string; mobile_number: string;
  email: string; specialization: string; qualification: string; experience: string;
  medical_council_name: string; registration_number: string; registration_date_day: string;
  registration_date_month: string; registration_date_year: string; clinic_name: string;
  clinic_address: string; city: string; state: string; pincode: string;
  job_type: string[]; preferred_km: string; preferred_pincode: string;
}

interface FormErrors {
  [key: string]: string | undefined;
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
const RegisterDoctorScreen: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [pincodeLoading, setPincodeLoading] = useState(false);
  const [pincodeFetched, setPincodeFetched] = useState(false);
  const [doctorUniqueId, setDoctorUniqueId] = useState('');
  const [termsVisible, setTermsVisible] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [dataConsentAccepted, setDataConsentAccepted] = useState(false);
  const [privacyVisible, setPrivacyVisible] = useState(false);
  const { setDoctor } = useAuth();

  const [dropdownConfig, setDropdownConfig] = useState<{
    visible: boolean; field: keyof FormData | 'reg_month' | 'reg_year' | null;
    options: string[]; title: string;
  }>({ visible: false, field: null, options: [], title: '' });

  // Navigation & Screen Animations
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const successScale = useRef(new Animated.Value(0)).current;
  const navigation = useNavigation<any>();

  // Stepper Stretch Animations
  const dotWidths = useRef([
    new Animated.Value(scale(24)),
    new Animated.Value(scale(8)),
    new Animated.Value(scale(8)),
  ]).current;

  useEffect(() => {
    Animated.parallel(
      dotWidths.map((anim, index) =>
        Animated.timing(anim, {
          toValue: currentStep === index + 1 ? scale(24) : scale(8),
          duration: 300,
          useNativeDriver: false, // Width animations require false
        })
      )
    ).start();
  }, [currentStep, dotWidths]);

  const [form, setForm] = useState<FormData>({
    title: '', first_name: '', middle_name: '', last_name: '',
    mobile_number: '', email: '', specialization: '', specialization_other: '',
    qualification: '', qualification_other: '', experience: '',
    medical_council_name: '', registration_number: '', registration_date_day: '',
    registration_date_month: '', registration_date_year: '', clinic_name: '',
    clinic_address: '', city: '', state: '', pincode: '',
    job_type: ['locum_shifts'], preferred_km: '', preferred_pincode: '',
  });
  
  const [errors, setErrors] = useState<FormErrors>({});

  const setField = (field: keyof FormData, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: undefined }));
  };

  const openDropdown = (field: keyof FormData | 'reg_month' | 'reg_year', options: string[], title: string) => 
    setDropdownConfig({ visible: true, field, options, title });

  const selectDropdown = (value: string) => {
    const { field } = dropdownConfig;
    if (!field) return;

    if (field === 'reg_month') {
      const found = MONTHS.find(m => m.label === value);
      if (found) setField('registration_date_month', found.value);
    } else if (field === 'reg_year') {
      setField('registration_date_year', value);
    } else {
      setField(field as keyof FormData, value);
      if (field === 'qualification' && value !== 'Other') {
        setForm(prev => ({ ...prev, qualification: value, qualification_other: '' }));
      }
    }
    setDropdownConfig(p => ({ ...p, visible: false }));
  };

  const fetchLocationByPincode = async (pincode: string) => {
    if (pincode.length !== 6) return;
    setPincodeLoading(true); setPincodeFetched(false);
    try {
      const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${pincode}&region=IN&key=${GOOGLE_API_KEY}`);
      const data = await res.json();
      if (data.status !== 'OK' || !data.results?.length) throw new Error('Invalid pincode');

      const components: any[] = data.results[0].address_components;
      const getComponent = (type: string): string => {
        const found = components.find((c: any) => c.types.includes(type));
        return found?.long_name || '';
      };

      const city = getComponent('locality') || getComponent('administrative_area_level_3') || getComponent('administrative_area_level_2');
      const state = getComponent('administrative_area_level_1');

      if (!city && !state) throw new Error('Location not found');

      setForm(prev => ({ ...prev, city: city || '', state: state || '' }));
      setPincodeFetched(true);
      setErrors(prev => ({ ...prev, pincode: undefined, city: undefined, state: undefined }));
    } catch {
      setForm(prev => ({ ...prev, city: '', state: '' }));
      setErrors(prev => ({ ...prev, pincode: 'Unable to fetch location.' }));
    } finally {
      setPincodeLoading(false);
    }
  };

  const handlePincodeChange = (val: string) => {
    const cleaned = val.replace(/\D/g, '').slice(0, 6);
    setField('pincode', cleaned);
    setPincodeFetched(false);
    setErrors(prev => ({ ...prev, pincode: undefined }));
    if (cleaned.length < 6) {
      setForm(prev => ({ ...prev, city: '', state: '' }));
    } else {
      fetchLocationByPincode(cleaned);
    }
  };

  const validateStep = (step: number): boolean => {
    const e: FormErrors = {};
    if (step === 1) {
      if (!form.title) e.title = 'Required';
      if (!form.first_name.trim()) e.first_name = 'Required';
      if (!form.last_name.trim()) e.last_name = 'Required';
      if (!form.mobile_number.trim()) e.mobile_number = 'Required';
      else if (!/^[6-9]\d{9}$/.test(form.mobile_number)) e.mobile_number = 'Invalid mobile number';
      if (!form.email.trim()) e.email = 'Required';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Invalid email address';
    }
    if (step === 2) {
      if (!form.specialization) e.specialization = 'Required';
      if (!form.qualification) e.qualification = 'Required';
      if (!form.experience) e.experience = 'Required';
      if (!form.medical_council_name) e.medical_council_name = 'Required';
    }
    if (step === 3) {
      if (!form.pincode.trim()) e.pincode = 'Required';
      else if (!/^\d{6}$/.test(form.pincode)) e.pincode = 'Invalid 6-digit pincode';
      if (!form.city.trim()) e.city = 'Invalid Pincode';
      if (!form.state.trim()) e.state = 'Invalid Pincode';
      if (!form.clinic_address.trim()) e.clinic_address = 'Required';
      if (!form.job_type.length) e.job_type = 'Required';
      if (!form.preferred_km) e.preferred_km = 'Required';
      if (form.preferred_pincode && !/^\d{6}$/.test(form.preferred_pincode)) e.preferred_pincode = 'Invalid 6-digit pincode';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const animateTransition = (dir: 'forward' | 'back', cb: () => void) => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: dir === 'forward' ? -30 : 30, duration: 150, useNativeDriver: true }),
    ]).start(() => {
      cb();
      slideAnim.setValue(dir === 'forward' ? 30 : -30);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
      ]).start();
    });
  };

  const goNext = () => {
    if (!validateStep(currentStep)) return;
    if (currentStep < 3) {
      animateTransition('forward', () => setCurrentStep(s => s + 1));
    } else {
      if (!termsAccepted || !dataConsentAccepted) {
        setTermsVisible(true);
        return;
      }
      handleSubmit();
    }
  };

  const goBack = () => {
    if (currentStep > 1) animateTransition('back', () => setCurrentStep(s => s - 1));
  };

  const handleSubmit = async () => {
    if (!validateStep(3)) return;
    if (!form.state.trim()) {
      Alert.alert('Missing State', 'Please enter a valid pincode and wait for location to load.');
      return;
    }
    setLoading(true);
    try {
      const payload: Record<string, any> = {
        first_name: `${form.title} ${form.first_name}`.trim(),
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
          specify_degree: form.qualification === 'Other' ? form.qualification_other.trim() : '',
          specify_speciality: form.specialization === 'Other' ? form.specialization_other.trim() : '',
        }],
        experience: [{
          years_of_experience: form.experience === 'Less than 1 year' ? 0 : parseInt(form.experience.match(/\d+/)?.[0] || '0', 10),
          clinic_hospital_name: form.clinic_name.trim() || '',
          designation: form.qualification === 'Other' ? 'Other' : form.qualification,
          start_date: new Date().toISOString(),
          is_current: true,
        }],
        interested_in: ['Locum shifts'],
        preferred_distance_km: Number(form.preferred_km),
      };

      if (form.preferred_pincode.trim()) {
        payload.preferred_pincode = form.preferred_pincode.trim();
      }

      // ⬅️ Refactored to use Axios instance
      const response = await api.post('/api/doctors/register', payload);
      const data = response.data;

      if (data?.doctor?.doctor_unique_id) {
        setDoctorUniqueId(data.doctor.doctor_unique_id);
      }

      setDoctor(data.doctor);
      setSubmitted(true);
      Animated.spring(successScale, { toValue: 1, friction: 6, tension: 80, useNativeDriver: true }).start();
    } catch (err: any) {
      // ⬅️ Refactored error handling for Axios structure
      const errorMessage = err.response?.data?.message || err.message || 'Registration failed. Please try again.';
      Alert.alert('Registration Failed', errorMessage, [{ text: 'OK' }]);
    } finally {
      setLoading(false);
    }
  };

  // ─── SUCCESS SCREEN ──────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
        <StatusBar barStyle="dark-content" backgroundColor={C.background} />
        <View style={styles.successBg}>
          <Animated.View style={[styles.successCard, { transform: [{ scale: successScale }] }]}>
            <View style={styles.successRing}>
              <Ionicons name="checkmark" size={32} color={C.white} />
            </View>

            <Text style={styles.successTitle}>Welcome Aboard!</Text>
            <Text style={styles.successName}>
              {form.title}. {form.first_name} {form.middle_name ? ` ${form.middle_name}` : ''} {form.last_name}
            </Text>
            <Text style={styles.successSub}>
              Your registration is submitted.{'\n'}We'll verify your profile within 24–48 hours.
            </Text>

            {doctorUniqueId ? (
              <View style={styles.idBadge}>
                <Text style={styles.idBadgeLabel}>YOUR DOCTOR ID</Text>
                <Text style={styles.idBadgeValue}>{doctorUniqueId}</Text>
              </View>
            ) : null}

            <Text style={styles.emailNote}>Confirmation sent to <Text style={{ fontWeight: '700', color: C.ink }}>{form.email}</Text></Text>

            <View style={styles.successDivider} />
            <SRow icon="call-outline" label="Mobile" value={`+91 ${form.mobile_number}`} />
            <SRow icon="location-outline" label="Location" value={`${form.city}, ${form.state}`} />
          </Animated.View>
          
          <TouchableOpacity
            style={styles.btnShadowWrapper}
            onPress={() => navigation.navigate('DashboardScreen')}
            activeOpacity={0.85}
          >
            <LinearGradient colors={['#00a8c2', '#007b8e']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.successBtnGradient}>
              <Text style={styles.successBtnText}>Go to Dashboard →</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ─── MAIN FORM ────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor={C.background} />
      
      {/* ── Top Header & Animated Stepper ── */}
      <View style={styles.topNav}>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => navigation?.canGoBack() && navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={24} color={C.ink} />
        </TouchableOpacity>

        <View style={styles.stepperContainer}>
          {[1, 2, 3].map((step, index) => {
            const isCompleted = currentStep > step;
            const isActive = currentStep === step;
            return (
              <Animated.View 
                key={step} 
                style={[
                  styles.stepperDot, 
                  { width: dotWidths[index] },
                  isActive ? styles.stepperDotActive : 
                  isCompleted ? styles.stepperDotCompleted : null
                ]} 
              />
            );
          })}
        </View>
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateX: slideAnim }] }}>
            
            {/* ══ STEP 1 ══════════════════════════════════════════════════ */}
            {currentStep === 1 && (
              <View>
                <Text style={styles.sectionTitle}>Personal Details</Text>
                
                <DropdownField label="TITLE" required icon="person-outline" placeholder="Select" value={form.title} error={errors.title} onPress={() => openDropdown('title', TITLES, 'Select Title')} />
                <Field label="FIRST NAME" required icon="person-outline" placeholder="First name" value={form.first_name} onChangeText={v => setField('first_name', v)} error={errors.first_name} />
                <Field label="MIDDLE NAME" icon="person-outline" placeholder="Optional" value={form.middle_name} onChangeText={v => setField('middle_name', v)} />
                <Field label="LAST NAME" required icon="person-outline" placeholder="Last name" value={form.last_name} onChangeText={v => setField('last_name', v)} error={errors.last_name} />
                <Field label="MOBILE NUMBER" required icon="call-outline" placeholder="9876543210" value={form.mobile_number} onChangeText={v => setField('mobile_number', v.replace(/\D/g, '').slice(0, 10))} error={errors.mobile_number} keyboardType="phone-pad" maxLength={10} prefix="+91" />
                <Field label="EMAIL ADDRESS" required icon="mail-outline" placeholder="name@domain.com" value={form.email} onChangeText={v => setField('email', v.trim())} error={errors.email} keyboardType="email-address" autoCapitalize="none" />
                <Field label="PINCODE" required icon="location-outline" placeholder="6-digit pincode" value={form.pincode} onChangeText={handlePincodeChange} error={errors.pincode} keyboardType="numeric" maxLength={6} />
                
                {pincodeLoading && <Text style={styles.pinText}>Fetching location…</Text>}
                {pincodeFetched && <Text style={[styles.pinText, { color: C.success }]}>Location verified</Text>}
                
                <Field label="CITY" icon="business-outline" value={form.city} onChangeText={() => {}} placeholder="Auto-filled" error={errors.city} />
                <Field label="STATE" icon="map-outline" value={form.state} onChangeText={() => {}} placeholder="Auto-filled" error={errors.state} />
                <Field label="CLINIC / HOME ADDRESS" required icon="home-outline" placeholder="Full address details" value={form.clinic_address} onChangeText={v => setField('clinic_address', v)} error={errors.clinic_address} multiline numberOfLines={3} />
              </View>
            )}

            {/* ══ STEP 2 ══════════════════════════════════════════════════ */}
            {currentStep === 2 && (
              <View>
                <Text style={styles.sectionTitle}>Professional Profile</Text>

                <DropdownField label="SPECIALIZATION" required icon="pricetag-outline" placeholder="Select specialization" value={form.specialization} error={errors.specialization} onPress={() => openDropdown('specialization', SPECIALIZATIONS, 'Select Specialization')} />
                {form.specialization === 'Other' && <Field label="SPECIFY SPECIALIZATION" icon="pencil-outline" placeholder="Type here..." value={form.specialization_other} onChangeText={v => setField('specialization_other', v)} error={errors.specialization_other} autoCapitalize="words" />}
                <DropdownField label="HIGHEST QUALIFICATION" required icon="school-outline" placeholder="Select qualification" value={form.qualification} error={errors.qualification} onPress={() => openDropdown('qualification', QUALIFICATIONS, 'Select Qualification')} />
                {form.qualification === 'Other' && <Field label="SPECIFY QUALIFICATION" icon="pencil-outline" placeholder="Type here..." value={form.qualification_other} onChangeText={v => setField('qualification_other', v)} error={errors.qualification_other} autoCapitalize="words" />}
                <DropdownField label="YEARS OF EXPERIENCE" required icon="time-outline" placeholder="Select range" value={form.experience} error={errors.experience} onPress={() => openDropdown('experience', EXPERIENCE_RANGES, 'Select Experience')} />
                <DropdownField label="MEDICAL COUNCIL NAME" required icon="library-outline" placeholder="Select council" value={form.medical_council_name} error={errors.medical_council_name} onPress={() => openDropdown('medical_council_name', MEDICAL_COUNCILS, 'Select Medical Council')} />
                
                <InfoBox text="Your details are securely verified to maintain network integrity." />
              </View>
            )}

            {/* ══ STEP 3 ══════════════════════════════════════════════════ */}
            {currentStep === 3 && (
              <View>
                <Text style={styles.sectionTitle}>Work Preferences</Text>

                <View style={{ marginBottom: scale(20) }}>
                  <Text style={fieldStyles.label}>INTERESTED IN</Text>
                  <View style={styles.chipGroup}>
                    {[{ key: 'locum_shifts', label: 'Locum Shifts' }].map(({ key, label }) => {
                      const selected = form.job_type.includes(key);
                      return (
                        <TouchableOpacity key={key} onPress={() => {}} style={[styles.chip, selected && styles.chipActive]} activeOpacity={1}>
                          <Text style={[styles.chipText, selected && styles.chipTextActive]}>{label}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

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
                  {errors.preferred_km && <Text style={fieldStyles.error}>⚠ {errors.preferred_km}</Text>}
                </View>

                <Field label="PREFERRED WORK PINCODE" icon="location-outline" placeholder="Area pincode (optional)" value={form.preferred_pincode} onChangeText={v => setField('preferred_pincode', v.replace(/\D/g, '').slice(0, 6))} error={errors.preferred_pincode} keyboardType="numeric" maxLength={6} />
                <InfoBox text="Enter a pincode to specify where you'd prefer to work. We use this to match you with nearby facilities." />
              </View>
            )}
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ─── FLOATING ACTION BAR ─────────────────────────────────────────── */}
      <View style={styles.floatingActionBar}>
        {currentStep > 1 && (
          <TouchableOpacity style={styles.backBtnBottom} onPress={goBack} activeOpacity={0.7}>
            <Text style={styles.backBtnTxt}>Back</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.nextBtnWrapper} onPress={goNext} disabled={loading} activeOpacity={0.85}>
           <LinearGradient colors={['#00a8c2', '#007b8e']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.nextBtnGradient, loading && styles.nextBtnOff]}>
              {loading ? (
                <ActivityIndicator color={C.white} />
              ) : (
                <Text style={styles.nextBtnTxt}>{currentStep === 3 ? 'Submit Profile' : 'Continue'}</Text>
              )}
           </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* ─── MODALS ──────────────────────────────────────────────────────── */}
      <TermsModal visible={termsVisible} onClose={() => setTermsVisible(false)} termsAccepted={termsAccepted} dataConsentAccepted={dataConsentAccepted} setTermsAccepted={setTermsAccepted} setDataConsentAccepted={setDataConsentAccepted} onSubmit={() => { setTermsVisible(false); handleSubmit(); }} />
      <PrivacyPolicyModal visible={privacyVisible} onClose={() => setPrivacyVisible(false)} />

      <Modal visible={dropdownConfig.visible} transparent animationType="slide" onRequestClose={() => setDropdownConfig(p => ({ ...p, visible: false }))}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setDropdownConfig(p => ({ ...p, visible: false }))}>
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>{dropdownConfig.title}</Text>
            <FlatList
              data={dropdownConfig.options}
              keyExtractor={i => i}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => {
                const isSelected = dropdownConfig.field ? form[dropdownConfig.field as keyof FormData] === item : false;
                return (
                  <TouchableOpacity style={[styles.option, isSelected && styles.optionSel]} onPress={() => selectDropdown(item)} activeOpacity={0.7}>
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
  onChangeText: (v: string) => void; error?: string; keyboardType?: 'default' | 'phone-pad' | 'email-address' | 'numeric';
  autoCapitalize?: 'none' | 'words' | 'sentences' | 'characters'; maxLength?: number; multiline?: boolean; numberOfLines?: number; prefix?: string;
}
const Field: React.FC<FieldProps> = ({ label, required, icon, placeholder, value, onChangeText, error, keyboardType = 'default', autoCapitalize = 'sentences', maxLength, multiline = false, numberOfLines = 1, prefix }) => (
  <View style={fieldStyles.wrapper}>
    <Text style={fieldStyles.label}>{label}{required && <Text style={fieldStyles.req}> *</Text>}</Text>
    <View style={[fieldStyles.inputRow, error ? fieldStyles.inputRowErr : null, multiline ? fieldStyles.inputRowMulti : null]}>
      <Ionicons name={icon} size={18} color={C.textMuted} style={fieldStyles.icon} />
      {prefix && <Text style={fieldStyles.prefix}>{prefix}</Text>}
      <TextInput
        style={[fieldStyles.input, multiline && { height: numberOfLines * scale(28), textAlignVertical: 'top' }]}
        placeholder={placeholder} placeholderTextColor={C.textMuted} value={value}
        onChangeText={onChangeText} keyboardType={keyboardType} autoCapitalize={autoCapitalize}
        maxLength={maxLength} multiline={multiline} numberOfLines={multiline ? numberOfLines : 1}
      />
    </View>
    {error && <Text style={fieldStyles.error}>⚠ {error}</Text>}
  </View>
);

interface DropdownFieldProps { label: string; required?: boolean; icon: string; placeholder: string; value: string; onPress: () => void; error?: string; }
const DropdownField: React.FC<DropdownFieldProps> = ({ label, required, icon, placeholder, value, onPress, error }) => (
  <View style={fieldStyles.wrapper}>
    <Text style={fieldStyles.label}>{label}{required && <Text style={fieldStyles.req}> *</Text>}</Text>
    <TouchableOpacity style={[fieldStyles.inputRow, error ? fieldStyles.inputRowErr : null]} onPress={onPress} activeOpacity={0.85}>
      <Ionicons name={icon} size={18} color={C.textMuted} style={fieldStyles.icon}/>
      <Text style={[fieldStyles.dropdownText, !value && fieldStyles.placeholderText]} numberOfLines={1}>
        {value || placeholder}
      </Text>
      <Ionicons name="chevron-down" size={18} color={value ? C.primary : C.textMuted} />
    </TouchableOpacity>
    {error && <Text style={fieldStyles.error}>⚠ {error}</Text>}
  </View>
);

const InfoBox: React.FC<{ text: string }> = ({ text }) => (
  <View style={ib.box}>
    <Ionicons name="information-circle" size={18} color={C.accentCyan} style={{ marginTop: 2 }}/>
    <Text style={ib.text}>{text}</Text>
  </View>
);
const ib = StyleSheet.create({
  box: { flexDirection: 'row', backgroundColor: 'rgba(0, 168, 194, 0.08)', borderRadius: scale(12), padding: scale(12), marginBottom: scale(20), alignItems: 'flex-start' },
  text: { flex: 1, fontSize: scale(12), color: C.primaryDark, lineHeight: scale(18), marginLeft: scale(8) },
});

const SRow: React.FC<{ icon: string; label: string; value: string }> = ({ icon, label, value }) => (
  <View style={sr.row}>
    <Ionicons name={icon} size={18} color={C.textSub} style={{ width: 22 }}/>
    <Text style={sr.lbl}>{label}</Text>
    <Text style={sr.val}>{value}</Text>
  </View>
);
const sr = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  lbl: { fontSize: scale(13), color: C.textSub, fontWeight: '600', width: scale(80) },
  val: { fontSize: scale(13), color: C.ink, flex: 1, fontWeight: '600' },
});

// ─── STYLES ───────────────────────────────────────────────────────────────────

const fieldStyles = StyleSheet.create({
  wrapper: { marginBottom: scale(16) }, 
  label: { fontSize: scale(11), fontWeight: '700', color: C.textMuted, marginBottom: scale(6), letterSpacing: 0.8 },
  req: { color: C.error },
  inputRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    borderRadius: scale(12), 
    backgroundColor: C.inputBg, 
    paddingHorizontal: scale(14), 
    minHeight: scale(48), 
    borderWidth: 1, 
    borderColor: C.primaryBorder, // Soft teal border
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.02, 
    shadowRadius: 8, 
    elevation: 1 
  },
  inputRowErr: { borderColor: C.error, backgroundColor: '#FEF2F2' },
  inputRowMulti: { alignItems: 'flex-start', paddingVertical: scale(12) },
  icon: { marginRight: scale(8) },
  prefix: { fontSize: scale(14), color: C.ink, fontWeight: '600', marginRight: scale(6) },
  input: { flex: 1, fontSize: scale(14), color: C.ink, paddingVertical: 0, fontWeight: '500' },
  dropdownText: { flex: 1, fontSize: scale(14), color: C.ink, fontWeight: '500' },
  placeholderText: { color: C.textMuted, fontWeight: '400' },
  error: { color: C.error, fontSize: scale(11), fontWeight: '600', marginTop: 4, marginLeft: 4 },
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background },
  flex: { flex: 1 },
  
  topNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: scale(24), paddingTop: scale(12), paddingBottom: scale(8) },
  iconBtn: { width: scale(40), height: scale(40), borderRadius: scale(20), backgroundColor: C.white, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 2 },
  
  stepperContainer: { flexDirection: 'row', gap: scale(6) },
  stepperDot: { 
    height: scale(8), 
    borderRadius: scale(4), 
    backgroundColor: C.primary, 
    opacity: 0.2 // Slightly visible translucent teal for inactive dots
  },
  stepperDotCompleted: { backgroundColor: C.primary, opacity: 0.5 },
  stepperDotActive: { backgroundColor: C.primary, opacity: 1 },

  scroll: { paddingHorizontal: scale(24), paddingTop: scale(10), paddingBottom: scale(120) }, // Padding bottom clears the floating bar
  sectionTitle: { fontSize: scale(24), fontWeight: '800', color: C.ink, lineHeight: scale(30), marginBottom: scale(24), letterSpacing: -0.3 },

  chipGroup: { flexDirection: 'row', flexWrap: 'wrap', gap: scale(10) },
  chip: { paddingHorizontal: scale(18), paddingVertical: scale(12), borderRadius: scale(24), borderWidth: 1, borderColor: C.primaryBorder, backgroundColor: C.white, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.02, shadowRadius: 4, elevation: 1 },
  chipActive: { borderColor: C.primary, backgroundColor: C.primaryLight },
  chipText: { color: C.textSub, fontSize: scale(14), fontWeight: '600' },
  chipTextActive: { color: C.primary, fontWeight: '800' },

  pinText: { fontSize: scale(12), color: C.textMuted, marginTop: -scale(12), marginBottom: scale(16), marginLeft: 4, fontWeight: '600' },

  floatingActionBar: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', paddingHorizontal: scale(24), paddingTop: scale(16), paddingBottom: Platform.OS === 'ios' ? 36 : scale(24), backgroundColor: 'rgba(249, 250, 251, 0.95)', borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.03)' },
  nextBtnWrapper: { flex: 1, shadowColor: C.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 6, borderRadius: scale(16) },
  nextBtnGradient: { borderRadius: scale(16), paddingVertical: scale(16), alignItems: 'center', justifyContent: 'center' },
  nextBtnOff: { opacity: 0.7 },
  nextBtnTxt: { color: C.white, fontSize: scale(15), fontWeight: '800' },
  backBtnBottom: { paddingVertical: scale(16), paddingHorizontal: scale(24), marginRight: scale(12) },
  backBtnTxt: { color: C.textSub, fontSize: scale(15), fontWeight: '700' },

  overlay: { flex: 1, backgroundColor: 'rgba(17, 24, 39, 0.6)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: C.white, borderTopLeftRadius: scale(24), borderTopRightRadius: scale(24), paddingTop: 12, maxHeight: '75%' },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: 'center', marginBottom: 14 },
  sheetTitle: { fontSize: scale(16), fontWeight: '800', color: C.ink, paddingHorizontal: scale(24), paddingBottom: scale(16), borderBottomWidth: 1, borderBottomColor: C.border },
  option: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: scale(24), paddingVertical: scale(16), borderBottomWidth: 1, borderBottomColor: '#f9fafb' },
  optionSel: { backgroundColor: C.primaryLight },
  optionTxt: { fontSize: scale(15), color: C.textSub, fontWeight: '500' },
  optionTxtSel: { color: C.primary, fontWeight: '800' },

  // SUCCESS SCREEN
  successBg: { flex: 1, backgroundColor: C.background, alignItems: 'center', justifyContent: 'center', padding: scale(24) },
  successCard: { backgroundColor: C.white, borderRadius: scale(32), padding: scale(32), width: '100%', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.05, shadowRadius: 24, elevation: 8, borderWidth: 1, borderColor: C.border },
  successRing: { width: scale(72), height: scale(72), borderRadius: scale(36), backgroundColor: C.primaryLight, alignItems: 'center', justifyContent: 'center', marginBottom: scale(24) },
  successTitle: { fontSize: scale(24), fontWeight: '900', color: C.ink, marginBottom: 8 },
  successName: { fontSize: scale(16), fontWeight: '700', color: C.textSub, marginBottom: 24, textAlign: 'center' },
  successSub: { fontSize: scale(14), color: C.textSub, textAlign: 'center', lineHeight: scale(22), marginBottom: 24 },
  idBadge: { backgroundColor: C.primaryLight, borderRadius: scale(16), paddingHorizontal: scale(24), paddingVertical: scale(16), alignItems: 'center', marginBottom: scale(20), borderWidth: 1, borderColor: '#c8e8ed', width: '100%' },
  idBadgeLabel: { fontSize: scale(10), color: C.primaryDark, fontWeight: '800', letterSpacing: 1.5, marginBottom: 4 },
  idBadgeValue: { fontSize: scale(22), color: C.primary, fontWeight: '900', letterSpacing: 1 },
  emailNote: { fontSize: scale(13), color: C.textMuted, textAlign: 'center', marginBottom: scale(24) },
  successDivider: { width: '100%', height: 1, backgroundColor: C.border, marginBottom: 20 },
  
  btnShadowWrapper: { width: '100%', shadowColor: C.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 12, elevation: 6, borderRadius: scale(16), marginTop: scale(32) },
  successBtnGradient: { borderRadius: scale(16), paddingVertical: scale(16), alignItems: 'center' },
  successBtnText: { color: C.white, fontWeight: '800', fontSize: scale(16) },
});

export default RegisterDoctorScreen;