import React, { useState, useRef } from 'react';
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
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// ─── RESPONSIVE SCALE ─────────────────────────────────────────────────────────
const { width: SW } = Dimensions.get('window');
const scale = (size: number) => (SW / 390) * size;

// ─── BRAND COLORS ─────────────────────────────────────────────────────────────
const C = {
  primary: '#007b8e',
  primaryDark: '#005f6e',
  primaryLight: '#e0f5f8',
  primaryMid: '#b2e4ec',
  accent: '#00b4cc',
  white: '#ffffff',
  bg: '#f4fbfc',
  text: '#0d2b30',
  textSub: '#4a7a82',
  textMuted: '#9ab8bc',
  border: '#c8e8ed',
  error: '#e53935',
  success: '#00b894',
  inputBg: '#f9fdfe',
};

const BASE_URL =
  'https://locumhtbe-h6fvftgnfudxc5hw.centralindia-01.azurewebsites.net';

const SPECIALIZATIONS = [
  'General Physician',
  'Cardiologist',
  'Dermatologist',
  'ENT Specialist',
  'Gastroenterologist',
  'Gynecologist',
  'Neurologist',
  'Oncologist',
  'Ophthalmologist',
  'Orthopedic Surgeon',
  'Pediatrician',
  'Psychiatrist',
  'Pulmonologist',
  'Radiologist',
  'Urologist',
  'Anesthesiologist',
  'Endocrinologist',
  'Nephrologist',
  'Rheumatologist',
  'Other',
];
const QUALIFICATIONS = [
  'MBBS',
  'MD',
  'MS',
  'MBBS + MD',
  'MBBS + MS',
  'BDS',
  'MDS',
  'DNB',
  'DM',
  'MCh',
  'FRCS',
  'MRCP',
  'PhD (Medical)',
  'Other',
];
const EXPERIENCE_RANGES = [
  'Less than 1 year',
  '1–3 years',
  '3–5 years',
  '5–10 years',
  '10–15 years',
  '15–20 years',
  '20+ years',
];

const MEDICAL_COUNCILS = [
  'Medical Council of India (MCI)',
  'National Medical Commission (NMC)',
  'Andhra Pradesh Medical Council',
  'Assam Medical Council',
  'Bihar Medical Council',
  'Chhattisgarh Medical Council',
  'Delhi Medical Council',
  'Goa Medical Council',
  'Gujarat Medical Council',
  'Haryana Medical Council',
  'Himachal Pradesh Medical Council',
  'Jharkhand Medical Council',
  'Karnataka Medical Council',
  'Kerala Medical Council',
  'Madhya Pradesh Medical Council',
  'Maharashtra Medical Council',
  'Manipur Medical Council',
  'Nagaland Medical Council',
  'Odisha Medical Council',
  'Punjab Medical Council',
  'Rajasthan Medical Council',
  'Tamil Nadu Medical Council',
  'Telangana Medical Council',
  'Uttar Pradesh Medical Council',
  'Uttarakhand Medical Council',
  'West Bengal Medical Council',
  'Other',
];

// Generate year list from 1970 to current year
const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: currentYear - 1969 }, (_, i) =>
  String(currentYear - i),
);
const MONTHS = [
  { label: 'January', value: '01' },
  { label: 'February', value: '02' },
  { label: 'March', value: '03' },
  { label: 'April', value: '04' },
  { label: 'May', value: '05' },
  { label: 'June', value: '06' },
  { label: 'July', value: '07' },
  { label: 'August', value: '08' },
  { label: 'September', value: '09' },
  { label: 'October', value: '10' },
  { label: 'November', value: '11' },
  { label: 'December', value: '12' },
];

interface FormData {
  first_name: string;
  middle_name: string;
  last_name: string;
  mobile_number: string;
  email: string;
  specialization: string;
  qualification: string;
  qualification_other: string;
  experience: string;
  medical_council_name: string;
  registration_number: string;
  registration_date_day: string;
  registration_date_month: string;
  registration_date_year: string;
  clinic_name: string;
  clinic_address: string;
  city: string;
  state: string;
  pincode: string;
  job_type: string[];
  preferred_km: string;
  preferred_pincode: string;
}
interface FormErrors {
  [key: string]: string | undefined;
}

const STEPS = [
  { id: 1, title: 'Personal', icon: '👤' },
  { id: 2, title: 'Professional', icon: '🩺' },
  { id: 3, title: 'Practice', icon: '🏥' },
];

// ─── DATE PICKER COMPONENT ────────────────────────────────────────────────────
interface DatePickerProps {
  label: string;
  required?: boolean;
  day: string;
  month: string;
  year: string;
  onDayChange: (v: string) => void;
  onMonthChange: (v: string) => void;
  onYearChange: (v: string) => void;
  error?: string;
  onOpenDropdown: (
    field: 'reg_month' | 'reg_year',
    options: { label: string; value: string }[] | string[],
    title: string,
  ) => void;
}

const DatePickerField: React.FC<DatePickerProps> = ({
  label,
  required,
  day,
  month,
  year,
  onDayChange,
  onMonthChange,
  onYearChange,
  error,
  onOpenDropdown,
}) => {
  const monthLabel = MONTHS.find(m => m.value === month)?.label || '';
  const maxDay =
    month && year ? new Date(Number(year), Number(month), 0).getDate() : 31;

  return (
    <View style={fieldStyles.wrapper}>
      <Text style={fieldStyles.label}>
        {label}
        {required && <Text style={fieldStyles.req}> *</Text>}
      </Text>
      <View style={styles.dateRow}>
        {/* Day */}
        <View style={styles.dateSegDay}>
          <View
            style={[
              fieldStyles.inputRow,
              error ? fieldStyles.inputRowErr : null,
            ]}
          >
            <TextInput
              style={[fieldStyles.input, { textAlign: 'center' }]}
              placeholder="DD"
              placeholderTextColor={C.textMuted}
              value={day}
              onChangeText={v => {
                const cleaned = v.replace(/\D/g, '').slice(0, 2);
                const num = parseInt(cleaned, 10);
                if (cleaned === '' || (num >= 1 && num <= maxDay)) {
                  onDayChange(cleaned);
                }
              }}
              keyboardType="numeric"
              maxLength={2}
            />
          </View>
          <Text style={styles.dateSegLabel}>Day</Text>
        </View>

        {/* Month */}
        <View style={styles.dateSegMonth}>
          <TouchableOpacity
            style={[
              fieldStyles.inputRow,
              error ? fieldStyles.inputRowErr : null,
              { paddingHorizontal: scale(10) },
            ]}
            onPress={() =>
              onOpenDropdown(
                'reg_month',
                MONTHS.map(m => m.label),
                'Select Month',
              )
            }
            activeOpacity={0.8}
          >
            <Text
              style={[fieldStyles.input, !month && { color: C.textMuted }]}
              numberOfLines={1}
            >
              {monthLabel || 'Month'}
            </Text>
            <Text style={{ fontSize: scale(16), color: C.textMuted }}>⌄</Text>
          </TouchableOpacity>
          <Text style={styles.dateSegLabel}>Month</Text>
        </View>

        {/* Year */}
        <View style={styles.dateSegYear}>
          <TouchableOpacity
            style={[
              fieldStyles.inputRow,
              error ? fieldStyles.inputRowErr : null,
              { paddingHorizontal: scale(10) },
            ]}
            onPress={() => onOpenDropdown('reg_year', YEARS, 'Select Year')}
            activeOpacity={0.8}
          >
            <Text
              style={[fieldStyles.input, !year && { color: C.textMuted }]}
              numberOfLines={1}
            >
              {year || 'Year'}
            </Text>
            <Text style={{ fontSize: scale(16), color: C.textMuted }}>⌄</Text>
          </TouchableOpacity>
          <Text style={styles.dateSegLabel}>Year</Text>
        </View>
      </View>
      {error && <Text style={fieldStyles.error}>⚠ {error}</Text>}
    </View>
  );
};

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

  // Unified dropdown config — supports both string[] and {label,value}[] options
  const [dropdownConfig, setDropdownConfig] = useState<{
    visible: boolean;
    field: keyof FormData | 'reg_month' | 'reg_year' | null;
    options: string[];
    title: string;
  }>({ visible: false, field: null, options: [], title: '' });

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const successScale = useRef(new Animated.Value(0)).current;

  const [form, setForm] = useState<FormData>({
    first_name: '',
    middle_name: '',
    last_name: '',
    mobile_number: '',
    email: '',
    specialization: '',
    qualification: '',
    qualification_other: '',
    experience: '',
    medical_council_name: '',
    registration_number: '',
    registration_date_day: '',
    registration_date_month: '',
    registration_date_year: '',
    clinic_name: '',
    clinic_address: '',
    city: '',
    state: '',
    pincode: '',
    job_type: [],
    preferred_km: '',
    preferred_pincode: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});

  const setField = (field: keyof FormData, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: undefined }));
  };

  const openDropdown = (
    field: keyof FormData | 'reg_month' | 'reg_year',
    options: string[],
    title: string,
  ) => setDropdownConfig({ visible: true, field, options, title });

  const selectDropdown = (value: string) => {
    const { field } = dropdownConfig;
    if (!field) return;

    if (field === 'reg_month') {
      const found = MONTHS.find(m => m.label === value);
      if (found) setField('registration_date_month', found.value);
      setErrors(prev => ({ ...prev, registration_date: undefined }));
    } else if (field === 'reg_year') {
      setField('registration_date_year', value);
      setErrors(prev => ({ ...prev, registration_date: undefined }));
    } else {
      setField(field as keyof FormData, value);
      if (field === 'qualification' && value !== 'Other') {
        setForm(prev => ({
          ...prev,
          qualification: value,
          qualification_other: '',
        }));
      }
    }
    setDropdownConfig(p => ({ ...p, visible: false }));
  };

  const fetchLocationByPincode = async (pincode: string) => {
    if (pincode.length !== 6) return;
    setPincodeLoading(true);
    setPincodeFetched(false);
    try {
      const res = await fetch(
        `https://api.postalpincode.in/pincode/${pincode}`,
      );
      const data = await res.json();
      if (data?.[0]?.Status === 'Success' && data[0].PostOffice?.length > 0) {
        const po = data[0].PostOffice[0];
        setForm(prev => ({
          ...prev,
          city: po.District || '',
          state: po.State || '',
        }));
        setPincodeFetched(true);
        setErrors(prev => ({
          ...prev,
          pincode: undefined,
          city: undefined,
          state: undefined,
        }));
      } else {
        throw new Error('Invalid pincode');
      }
    } catch {
      setForm(prev => ({ ...prev, city: '', state: '' }));
      setErrors(prev => ({
        ...prev,
        pincode:
          'Unable to fetch location. Please check your pincode or internet connection.',
      }));
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
      if (!form.first_name.trim()) e.first_name = 'First name is required';
      if (!form.last_name.trim()) e.last_name = 'Last name is required';
      if (!form.mobile_number.trim())
        e.mobile_number = 'Mobile number is required';
      else if (!/^[6-9]\d{9}$/.test(form.mobile_number))
        e.mobile_number = 'Enter a valid 10-digit mobile number';
      if (!form.email.trim()) e.email = 'Email is required';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
        e.email = 'Enter a valid email address';
    }
    if (step === 2) {
      if (!form.specialization)
        e.specialization = 'Please select a specialization';
      if (!form.qualification)
        e.qualification = 'Please select a qualification';
      if (form.qualification === 'Other' && !form.qualification_other.trim())
        e.qualification_other = 'Please specify your qualification';
      if (!form.experience) e.experience = 'Please select experience range';
      if (!form.medical_council_name)
        e.medical_council_name = 'Please select a medical council';
      if (!form.registration_number.trim())
        e.registration_number = 'Registration number is required';
      // Validate registration date — all three parts required
      const {
        registration_date_day,
        registration_date_month,
        registration_date_year,
      } = form;
      if (
        !registration_date_day ||
        !registration_date_month ||
        !registration_date_year
      ) {
        e.registration_date = 'Please enter a complete registration date';
      } else {
        const day = parseInt(registration_date_day, 10);
        const maxDay = new Date(
          Number(registration_date_year),
          Number(registration_date_month),
          0,
        ).getDate();
        if (day < 1 || day > maxDay) {
          e.registration_date = `Day must be between 1 and ${maxDay} for the selected month`;
        }
      }
    }
    if (step === 3) {
      if (!form.pincode.trim()) e.pincode = 'Pincode is required';
      else if (!/^\d{6}$/.test(form.pincode))
        e.pincode = 'Enter a valid 6-digit pincode';
      if (!form.city.trim())
        e.city = 'City could not be fetched — please check pincode';
      if (!form.state.trim())
        e.state = 'State could not be fetched — please check pincode';
      if (!form.clinic_address.trim())
        e.clinic_address = 'Clinic address is required';
      if (!form.job_type.length) e.job_type = 'Select at least one option';
      if (!form.preferred_km) e.preferred_km = 'Select preferred distance';
      if (form.preferred_pincode && !/^\d{6}$/.test(form.preferred_pincode))
        e.preferred_pincode = 'Enter a valid 6-digit pincode';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const animateTransition = (dir: 'forward' | 'back', cb: () => void) => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 140,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: dir === 'forward' ? -24 : 24,
        duration: 140,
        useNativeDriver: true,
      }),
    ]).start(() => {
      cb();
      slideAnim.setValue(dir === 'forward' ? 24 : -24);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  const goNext = () => {
    if (!validateStep(currentStep)) return;
    if (currentStep < 3) {
      animateTransition('forward', () => setCurrentStep(s => s + 1));
    } else {
      // Show T&C before submitting
      if (!termsAccepted || !dataConsentAccepted) {
        setTermsVisible(true);
        return;
      }
      handleSubmit();
    }
  };

  const goBack = () => {
    if (currentStep > 1)
      animateTransition('back', () => setCurrentStep(s => s - 1));
  };

  const parseExperienceYears = (exp: string): number => {
    if (exp === 'Less than 1 year') return 0;
    const match = exp.match(/\d+/);
    return match ? parseInt(match[0], 10) : 0;
  };

  const handleSubmit = async () => {
    if (!validateStep(3)) return;
    if (!form.state.trim()) {
      Alert.alert(
        'Missing State',
        'Please enter a valid pincode and wait for location to load.',
      );
      return;
    }
    setLoading(true);
    try {
      const mapJobType = (type: string): string => {
        switch (type) {
          case 'full_time':
            return 'Full time';
          case 'locum_shifts':
            return 'Locum shifts';
          case 'teleconsultation':
            return 'Teleconsultation';
          default:
            return '';
        }
      };

      const educationEntry: Record<string, string> = {
        degree: form.qualification,
        speciality: form.specialization,
      };
      if (form.qualification === 'Other' && form.qualification_other.trim()) {
        educationEntry.specify_degree = form.qualification_other.trim();
      }

      const experienceEntry = {
        years_of_experience: parseExperienceYears(form.experience),
        clinic_hospital_name: form.clinic_name.trim() || '',
        designation:
          form.qualification === 'Other'
            ? form.qualification_other.trim()
            : form.qualification,
        is_current: true,
      };

      // Build ISO date string from day/month/year parts
      const {
        registration_date_day,
        registration_date_month,
        registration_date_year,
      } = form;
      const registrationDateISO =
        registration_date_day &&
        registration_date_month &&
        registration_date_year
          ? `${registration_date_year}-${registration_date_month}-${String(
              registration_date_day,
            ).padStart(2, '0')}`
          : undefined;

      const payload: Record<string, any> = {
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
        doctor_license_no: form.registration_number.trim(),
        ...(registrationDateISO && { registration_date: registrationDateISO }),
        education: [educationEntry],
        experience: [experienceEntry],
        interested_in: form.job_type.map(mapJobType).filter(Boolean),
        preferred_distance_km: Number(form.preferred_km),
      };

      if (form.preferred_pincode.trim()) {
        payload.preferred_pincode = form.preferred_pincode.trim();
      }

      console.log('📤 Submitting payload:', JSON.stringify(payload, null, 2));

      const res = await fetch(`${BASE_URL}/api/doctors/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      let data: any;
      const text = await res.text();
      try {
        data = JSON.parse(text);
      } catch {
        console.error('❌ Non-JSON server response:', text);
        throw new Error(
          'Server returned an unexpected response. Please check the server is running.',
        );
      }

      if (!res.ok) {
        throw new Error(
          data?.message ||
            `Registration failed (HTTP ${res.status}). Please try again.`,
        );
      }

      if (data.doctor?.doctor_unique_id) {
        setDoctorUniqueId(data.doctor.doctor_unique_id);
      }

      setSubmitted(true);
      Animated.spring(successScale, {
        toValue: 1,
        friction: 6,
        tension: 80,
        useNativeDriver: true,
      }).start();
    } catch (err: any) {
      console.error('❌ Submit error:', err.message);
      Alert.alert(
        'Registration Failed',
        err.message || 'Something went wrong. Please try again.',
        [{ text: 'OK' }],
      );
    } finally {
      setLoading(false);
    }
  };

  // ─── SUCCESS SCREEN ──────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
        <StatusBar barStyle="light-content" backgroundColor={C.primaryDark} />
        <View style={styles.successBg}>
          <Animated.View
            style={[
              styles.successCard,
              { transform: [{ scale: successScale }] },
            ]}
          >
            {/* Tick */}
            <View style={styles.successRing}>
              <Text style={styles.successTick}>✓</Text>
            </View>

            <Text style={styles.successTitle}>Welcome Aboard!</Text>
            <Text style={styles.successName}>
              Dr. {form.first_name}
              {form.middle_name ? ` ${form.middle_name}` : ''} {form.last_name}
            </Text>
            <Text style={styles.successSub}>
              Your registration is submitted.{'\n'}We'll verify your profile
              within 24–48 hours.
            </Text>

            {doctorUniqueId ? (
              <View style={styles.idBadge}>
                <Text style={styles.idBadgeLabel}>YOUR DOCTOR ID</Text>
                <Text style={styles.idBadgeValue}>{doctorUniqueId}</Text>
              </View>
            ) : null}

            <Text style={styles.emailNote}>
              📧 Confirmation sent to{' '}
              <Text style={{ fontWeight: '700', color: C.primary }}>
                {form.email}
              </Text>
            </Text>

            <View style={styles.successPill}>
              <Text style={styles.successPillText}>
                🩺 {form.specialization}
              </Text>
            </View>

            <View style={styles.successDivider} />
            <SRow
              icon="📱"
              label="Mobile"
              value={`+91 ${form.mobile_number}`}
            />
            <SRow
              icon="📍"
              label="Location"
              value={`${form.city}, ${form.state}`}
            />
            <SRow icon="🪪" label="Reg. No." value={form.registration_number} />
          </Animated.View>
        </View>
      </SafeAreaView>
    );
  }

  // ─── MAIN FORM ────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor={C.primaryDark} />

      {/* ─── HEADER ─────────────────────────────────────────────────────── */}
      <View style={styles.headerTop}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          <Image
            source={require('../assets/HT_icon.png')}
            style={styles.headerLogoImg}
            resizeMode="contain"
          />
          <Text style={[styles.headerBrandName, { marginLeft: 6 }]}>Locum</Text>
        </View>
        <Text
          style={[styles.headerBrandSub, { flexShrink: 1, textAlign: 'right' }]}
          numberOfLines={1}
        >
          DOCTOR ONBOARDING
        </Text>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View
            style={{
              opacity: fadeAnim,
              transform: [{ translateX: slideAnim }],
            }}
          >
            {/* ══ STEP 1 ══════════════════════════════════════════════════ */}
            {currentStep === 1 && (
              <View style={styles.card}>
                <SectionHeader
                  icon="👤"
                  title="Basic Information"
                  step="Step 1 of 3"
                />
                <Field
                  label="First Name"
                  required
                  icon="👤"
                  placeholder="Enter first name"
                  value={form.first_name}
                  onChangeText={v => setField('first_name', v)}
                  error={errors.first_name}
                />
                <Field
                  label="Middle Name"
                  icon="👤"
                  placeholder="Optional"
                  value={form.middle_name}
                  onChangeText={v => setField('middle_name', v)}
                />
                <Field
                  label="Last Name"
                  required
                  icon="👤"
                  placeholder="Enter last name"
                  value={form.last_name}
                  onChangeText={v => setField('last_name', v)}
                  error={errors.last_name}
                />
                <Field
                  label="Mobile Number"
                  required
                  icon="📱"
                  placeholder="9876543210"
                  value={form.mobile_number}
                  onChangeText={v =>
                    setField('mobile_number', v.replace(/\D/g, '').slice(0, 10))
                  }
                  error={errors.mobile_number}
                  keyboardType="phone-pad"
                  maxLength={10}
                  prefix="+91"
                />
                <Field
                  label="Email"
                  required
                  icon="✉️"
                  placeholder="doctor@example.com"
                  value={form.email}
                  onChangeText={v => setField('email', v.trim())}
                  error={errors.email}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            )}

            {/* ══ STEP 2 ══════════════════════════════════════════════════ */}
            {currentStep === 2 && (
              <View style={styles.card}>
                <SectionHeader
                  icon="🩺"
                  title="Professional Details"
                  step="Step 2 of 3"
                />

                <DropdownField
                  label="Specialization"
                  required
                  icon="🏷️"
                  placeholder="Select your specialization"
                  value={form.specialization}
                  error={errors.specialization}
                  onPress={() =>
                    openDropdown(
                      'specialization',
                      SPECIALIZATIONS,
                      'Select Specialization',
                    )
                  }
                />

                <DropdownField
                  label="Highest Qualification"
                  required
                  icon="🎓"
                  placeholder="Select your qualification"
                  value={form.qualification}
                  error={errors.qualification}
                  onPress={() =>
                    openDropdown(
                      'qualification',
                      QUALIFICATIONS,
                      'Select Qualification',
                    )
                  }
                />

                {form.qualification === 'Other' && (
                  <Field
                    label="Specify Qualification"
                    required
                    icon="✏️"
                    placeholder="Enter your qualification"
                    value={form.qualification_other}
                    onChangeText={v => setField('qualification_other', v)}
                    error={errors.qualification_other}
                    autoCapitalize="words"
                  />
                )}

                <DropdownField
                  label="Years of Experience"
                  required
                  icon="⏱️"
                  placeholder="Select experience range"
                  value={form.experience}
                  error={errors.experience}
                  onPress={() =>
                    openDropdown(
                      'experience',
                      EXPERIENCE_RANGES,
                      'Select Experience',
                    )
                  }
                />

                {/* ── NEW: Medical Council Name ── */}
                <Field
                  label="Medical Council Name"
                  required
                  icon="🏛️"
                  placeholder="e.g. Maharashtra Medical Council"
                  value={form.medical_council_name}
                  onChangeText={v => setField('medical_council_name', v)}
                  error={errors.medical_council_name}
                  autoCapitalize="words"
                />

                {/* ── Registration Number (unchanged) ── */}
                <Field
                  label="Medical Registration Number"
                  required
                  icon="🪪"
                  placeholder="MCIXXXX / State Reg. No."
                  value={form.registration_number}
                  onChangeText={v => setField('registration_number', v)}
                  error={errors.registration_number}
                  autoCapitalize="characters"
                />

                {/* ── NEW: Registration Date ── */}
                <DatePickerField
                  label="Registration Date"
                  required
                  day={form.registration_date_day}
                  month={form.registration_date_month}
                  year={form.registration_date_year}
                  onDayChange={v => {
                    setField('registration_date_day', v);
                    setErrors(prev => ({
                      ...prev,
                      registration_date: undefined,
                    }));
                  }}
                  onMonthChange={v => {
                    setField('registration_date_month', v);
                    setErrors(prev => ({
                      ...prev,
                      registration_date: undefined,
                    }));
                  }}
                  onYearChange={v => {
                    setField('registration_date_year', v);
                    setErrors(prev => ({
                      ...prev,
                      registration_date: undefined,
                    }));
                  }}
                  error={errors.registration_date}
                  onOpenDropdown={(field, options, title) =>
                    openDropdown(field as any, options as string[], title)
                  }
                />

                <InfoBox text="Your registration number will be verified with the Medical Council of India." />
              </View>
            )}

            {/* ══ STEP 3 ══════════════════════════════════════════════════ */}
            {currentStep === 3 && (
              <View style={styles.card}>
                <SectionHeader
                  icon="⚙️"
                  title="Work Preferences"
                  step="Step 3 of 3"
                />

                {/* Interested In */}
                <View style={{ marginBottom: 20 }}>
                  <Text
                    style={{
                      marginBottom: 12,
                      fontWeight: '600',
                      color: C.textSub,
                      fontSize: scale(13),
                    }}
                  >
                    Interested In *
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                    {[
                      { key: 'full_time', label: 'Full-time' },
                      { key: 'locum_shifts', label: 'Locum Shifts' },
                      { key: 'teleconsultation', label: 'Teleconsultation' },
                    ].map(({ key, label }) => {
                      const selected = form.job_type.includes(key);
                      return (
                        <TouchableOpacity
                          key={key}
                          onPress={() => {
                            const updated = selected
                              ? form.job_type.filter(t => t !== key)
                              : [...form.job_type, key];
                            setField('job_type', updated);
                          }}
                          style={{
                            paddingHorizontal: scale(16),
                            paddingVertical: scale(10),
                            borderRadius: scale(20),
                            borderWidth: 1,
                            borderColor: selected ? C.primary : C.border,
                            backgroundColor: selected
                              ? C.primaryLight
                              : C.white,
                            marginRight: scale(10),
                            marginBottom: scale(10),
                          }}
                        >
                          <Text
                            style={{
                              color: selected ? C.primary : C.textSub,
                              fontSize: scale(14),
                            }}
                          >
                            {label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  {errors.job_type && (
                    <Text style={fieldStyles.error}>⚠ {errors.job_type}</Text>
                  )}
                </View>

                {/* Preferred Distance */}
                <View style={{ marginBottom: 20 }}>
                  <Text
                    style={{
                      marginBottom: 12,
                      fontWeight: '600',
                      color: C.textSub,
                      fontSize: scale(13),
                    }}
                  >
                    Preferred Distance *
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                    {['5', '10', '20', '50', '100'].map(km => {
                      const selected = form.preferred_km === km;
                      return (
                        <TouchableOpacity
                          key={km}
                          onPress={() => setField('preferred_km', km)}
                          style={{
                            paddingHorizontal: scale(16),
                            paddingVertical: scale(10),
                            borderRadius: scale(20),
                            borderWidth: 1,
                            borderColor: selected ? C.primary : C.border,
                            backgroundColor: selected
                              ? C.primaryLight
                              : C.white,
                            marginRight: scale(10),
                            marginBottom: scale(10),
                          }}
                        >
                          <Text
                            style={{
                              color: selected ? C.primary : C.textSub,
                              fontSize: scale(14),
                            }}
                          >
                            {km} km
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  {errors.preferred_km && (
                    <Text style={fieldStyles.error}>
                      ⚠ {errors.preferred_km}
                    </Text>
                  )}
                </View>

                <Field
                  label="Clinic / Hospital Name"
                  icon="🏥"
                  placeholder="Enter clinic or hospital name (optional)"
                  value={form.clinic_name}
                  onChangeText={v => setField('clinic_name', v)}
                  autoCapitalize="words"
                />

                <Field
                  label="Pincode"
                  required
                  icon="📮"
                  placeholder="Enter your area pincode"
                  value={form.pincode}
                  onChangeText={handlePincodeChange}
                  error={errors.pincode}
                  keyboardType="numeric"
                  maxLength={6}
                />
                {pincodeLoading && (
                  <Text style={styles.pinFetching}>⏳ Fetching location…</Text>
                )}
                {pincodeFetched && (
                  <Text style={styles.pinSuccess}>
                    ✅ Location fetched successfully
                  </Text>
                )}

                <Field
                  label="City / District"
                  icon="🏙️"
                  value={form.city}
                  onChangeText={() => {}}
                  placeholder="Auto-filled from pincode"
                  error={errors.city}
                />
                <Field
                  label="State"
                  icon="🗺️"
                  value={form.state}
                  onChangeText={() => {}}
                  placeholder="Auto-filled from pincode"
                  error={errors.state}
                />
                <Field
                  label="Clinic / Home Address"
                  required
                  icon="📍"
                  placeholder="Enter your full address"
                  value={form.clinic_address}
                  onChangeText={v => setField('clinic_address', v)}
                  error={errors.clinic_address}
                  multiline
                  numberOfLines={3}
                />
                <Field
                  label="Preferred Work Pincode"
                  icon="📮"
                  placeholder="Preferred area pincode (optional)"
                  value={form.preferred_pincode}
                  onChangeText={v =>
                    setField(
                      'preferred_pincode',
                      v.replace(/\D/g, '').slice(0, 6),
                    )
                  }
                  error={errors.preferred_pincode}
                  keyboardType="numeric"
                  maxLength={6}
                />
                <InfoBox text="Enter a pincode to specify where you'd prefer to work. Combined with your preferred distance, this helps match you to nearby opportunities." />
              </View>
            )}
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ─── BOTTOM NAV BAR ──────────────────────────────────────────────── */}
      <View style={styles.bottomBar}>
        <View style={styles.progressTrack}>
          {STEPS.map(s => (
            <View
              key={s.id}
              style={[
                styles.progressSeg,
                currentStep >= s.id && styles.progressSegOn,
              ]}
            />
          ))}
        </View>
        <View style={styles.bottomRow}>
          {currentStep > 1 && (
            <TouchableOpacity
              style={styles.backBtnBottom}
              onPress={goBack}
              activeOpacity={0.8}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={styles.arrow}>←</Text>
                <Text style={styles.backBtnTxt}>Back</Text>
              </View>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.nextBtn, loading && styles.nextBtnOff]}
            onPress={goNext}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color={C.white} />
            ) : (
              <Text style={styles.nextBtnTxt}>
                {currentStep === 3 ? 'Submit' : 'Next '}
                {currentStep !== 3 && <Text style={styles.arrow}>→</Text>}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
      {/* ─── TERMS & CONDITIONS MODAL ────────────────────────────────── */}
      <Modal
        visible={termsVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setTermsVisible(false)}
      >
        <View style={tnc.overlay}>
          <View style={tnc.sheet}>
            {/* Header */}
            <View style={tnc.header}>
              <Text style={tnc.headerTitle}>Terms & Conditions</Text>
              <TouchableOpacity onPress={() => setTermsVisible(false)}>
                <Text style={tnc.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={tnc.lastUpdated}>Last Updated: 20/04/2026</Text>

            {/* Scrollable content */}
            <ScrollView
              style={tnc.scrollArea}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 20 }}
            >
              <Text style={tnc.intro}>
                Welcome to Healtrack.ai. By completing your registration, you
                (the "Doctor" or "Practitioner") agree to be bound by the
                following Terms and Conditions. Please read these carefully
                before clicking "I Agree."
              </Text>

              {[
                {
                  title: '1. Professional Verification & Registration',
                  items: [
                    'Accuracy of Data: You represent that all information provided during registration—including medical degrees, licenses, and certifications—is true and accurate.',
                    'Credentialing: You authorize Healtrack.ai to conduct primary source verification of your credentials with relevant medical boards and councils.',
                    'License Maintenance: You must maintain an active, unrestricted license to practice medicine in the jurisdiction of your placement. You agree to notify Healtrack.ai within 24 hours of any change in your licensure status, pending disciplinary actions, or malpractice claims.',
                  ],
                },
                {
                  title: '2. The Matching & Placement Process',
                  items: [
                    'Role of Healtrack.ai: Healtrack.ai acts as a facilitator to map your qualifications to vacancies provided by partner hospitals.',
                    'No Guarantee of Placement: Registration on the platform does not guarantee a placement or an offer of employment from a hospital.',
                    'Engagement Terms: Once a "match" is confirmed, you may be required to sign a specific "Assignment Addendum" or "Offer Letter" detailing the shift timings, department, and hospital-specific protocols.',
                  ],
                },
                {
                  title: '3. Payroll & Remuneration',
                  items: [
                    'Payroll Administration: Healtrack.ai manages the payroll process on behalf of the hospital or as your direct employer (depending on the specific contract type).',
                    'Timesheet Submission: To ensure timely payment, you must submit verified timesheets or digital check-ins through the Healtrack.ai app.',
                    'Taxation & Deductions: All payments are subject to statutory deductions (e.g., TDS, Income Tax, Social Security) as per local labor and tax laws.',
                    'Payment Cycles: Payments will be disbursed on a Monthly/Fortnightly basis, provided all hospital-endorsed hours are submitted and approved.',
                  ],
                },
                {
                  title: '4. Professional Conduct & Standards',
                  items: [
                    'Clinical Autonomy: While Healtrack.ai manages your administrative and payroll needs, your clinical decisions remain your sole professional responsibility.',
                    'Compliance: You agree to adhere to the internal policies, safety protocols, and Code of Ethics of the hospital where you are placed.',
                    'Confidentiality: You must maintain strict patient confidentiality. Any breach of patient data privacy is grounds for immediate termination and legal action.',
                  ],
                },
                {
                  title: '5. Non-Circumvention & Direct Hiring',
                  items: [
                    'Placement Integrity: You agree that for a period of 12 months following an introduction to a hospital via Healtrack.ai, you will not accept a direct position or contract with that specific hospital without the written consent of Healtrack.ai or the payment of a placement fee.',
                  ],
                },
                {
                  title: '6. Limitation of Liability & Indemnity',
                  items: [
                    'Clinical Liability: Healtrack.ai is a technology and administrative platform and is not liable for clinical outcomes, medical malpractice, or negligence. You are encouraged to maintain your own Professional Indemnity Insurance.',
                    'Indemnity: You agree to indemnify Healtrack.ai against any claims arising from fraudulent information provided during registration or professional misconduct during an assignment.',
                  ],
                },
                {
                  title: '7. Termination of Account',
                  items: [
                    'By Doctor: You may deactivate your account at any time, subject to completing any currently active assignments.',
                    'By Healtrack.ai: We reserve the right to suspend or terminate your access if we find discrepancies in your credentials, receive multiple negative reports from hospitals, or if there is a breach of these terms.',
                  ],
                },
              ].map(section => (
                <View key={section.title} style={tnc.section}>
                  <Text style={tnc.sectionTitle}>{section.title}</Text>
                  {section.items.map((item, idx) => (
                    <View key={idx} style={tnc.bulletRow}>
                      <Text style={tnc.bullet}>•</Text>
                      <Text style={tnc.bulletText}>{item}</Text>
                    </View>
                  ))}
                </View>
              ))}

              <View style={tnc.declarationBox}>
                <Text style={tnc.declarationTitle}>Declaration</Text>
                <Text style={tnc.declarationText}>
                  I hereby declare that I have read the above Terms and
                  Conditions. I understand that my registration is subject to
                  verification and that Healtrack.ai will handle my payroll and
                  placement mapping based on the data I provide.
                </Text>
              </View>
            </ScrollView>

            {/* Checkboxes */}
            <View style={tnc.checkArea}>
              <TouchableOpacity
                style={tnc.checkRow}
                onPress={() => setTermsAccepted(v => !v)}
                activeOpacity={0.8}
              >
                <View style={[tnc.checkbox, termsAccepted && tnc.checkboxOn]}>
                  {termsAccepted && <Text style={tnc.checkmark}>✓</Text>}
                </View>
                <Text style={tnc.checkLabel}>
                  I accept the Terms and Conditions
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={tnc.checkRow}
                onPress={() => setDataConsentAccepted(v => !v)}
                activeOpacity={0.8}
              >
                <View
                  style={[tnc.checkbox, dataConsentAccepted && tnc.checkboxOn]}
                >
                  {dataConsentAccepted && <Text style={tnc.checkmark}>✓</Text>}
                </View>
                <Text style={tnc.checkLabel}>
                  I consent to the processing of my professional data for
                  matching and payroll purposes
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  tnc.agreeBtn,
                  (!termsAccepted || !dataConsentAccepted) && tnc.agreeBtnOff,
                ]}
                disabled={!termsAccepted || !dataConsentAccepted}
                onPress={() => {
                  setTermsVisible(false);
                  handleSubmit();
                }}
                activeOpacity={0.85}
              >
                <Text style={tnc.agreeBtnText}>I Agree & Submit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ─── DROPDOWN MODAL ──────────────────────────────────────────────── */}
      <Modal
        visible={dropdownConfig.visible}
        transparent
        animationType="slide"
        onRequestClose={() =>
          setDropdownConfig(p => ({ ...p, visible: false }))
        }
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setDropdownConfig(p => ({ ...p, visible: false }))}
        >
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>{dropdownConfig.title}</Text>
            <FlatList
              data={dropdownConfig.options}
              keyExtractor={i => i}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => {
                const field = dropdownConfig.field;
                let isSelected = false;
                if (field === 'reg_month') {
                  const found = MONTHS.find(m => m.label === item);
                  isSelected = found?.value === form.registration_date_month;
                } else if (field === 'reg_year') {
                  isSelected = item === form.registration_date_year;
                } else if (field) {
                  isSelected = form[field as keyof FormData] === item;
                }
                return (
                  <TouchableOpacity
                    style={[styles.option, isSelected && styles.optionSel]}
                    onPress={() => selectDropdown(item)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.optionTxt,
                        isSelected && styles.optionTxtSel,
                      ]}
                    >
                      {item}
                    </Text>
                    {isSelected && <Text style={styles.optionCheck}>✓</Text>}
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

const tnc = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,20,25,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: C.white,
    borderTopLeftRadius: scale(24),
    borderTopRightRadius: scale(24),
    maxHeight: '92%',
    paddingTop: scale(16),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(20),
    paddingBottom: scale(10),
    borderBottomWidth: 1,
    borderBottomColor: '#eef6f7',
  },
  headerTitle: {
    fontSize: scale(17),
    fontWeight: '800',
    color: C.text,
  },
  closeBtn: {
    fontSize: scale(18),
    color: C.textMuted,
    padding: scale(4),
  },
  lastUpdated: {
    fontSize: scale(11),
    color: C.textMuted,
    paddingHorizontal: scale(20),
    paddingTop: scale(8),
    paddingBottom: scale(4),
  },
  scrollArea: {
    paddingHorizontal: scale(20),
    paddingTop: scale(8),
  },
  intro: {
    fontSize: scale(13),
    color: C.textSub,
    lineHeight: scale(20),
    marginBottom: scale(16),
  },
  section: {
    marginBottom: scale(14),
  },
  sectionTitle: {
    fontSize: scale(13),
    fontWeight: '700',
    color: C.text,
    marginBottom: scale(6),
  },
  bulletRow: {
    flexDirection: 'row',
    marginBottom: scale(5),
    paddingLeft: scale(4),
  },
  bullet: {
    fontSize: scale(13),
    color: C.primary,
    marginRight: scale(8),
    lineHeight: scale(20),
  },
  bulletText: {
    flex: 1,
    fontSize: scale(12),
    color: C.textSub,
    lineHeight: scale(19),
  },
  declarationBox: {
    backgroundColor: C.primaryLight,
    borderRadius: scale(12),
    padding: scale(14),
    marginTop: scale(8),
  },
  declarationTitle: {
    fontSize: scale(13),
    fontWeight: '700',
    color: C.primaryDark,
    marginBottom: scale(6),
  },
  declarationText: {
    fontSize: scale(12),
    color: C.primaryDark,
    lineHeight: scale(19),
  },
  checkArea: {
    paddingHorizontal: scale(20),
    paddingTop: scale(14),
    paddingBottom: Platform.OS === 'ios' ? 36 : scale(24),
    borderTopWidth: 1,
    borderTopColor: '#eef6f7',
    gap: scale(12),
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: scale(10),
  },
  checkbox: {
    width: scale(22),
    height: scale(22),
    borderRadius: scale(6),
    borderWidth: 2,
    borderColor: C.border,
    backgroundColor: C.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: scale(1),
    flexShrink: 0,
  },
  checkboxOn: {
    borderColor: C.primary,
    backgroundColor: C.primary,
  },
  checkmark: {
    fontSize: scale(13),
    color: C.white,
    fontWeight: '800',
  },
  checkLabel: {
    flex: 1,
    fontSize: scale(13),
    color: C.text,
    lineHeight: scale(19),
  },
  agreeBtn: {
    backgroundColor: C.primary,
    borderRadius: scale(12),
    paddingVertical: scale(14),
    alignItems: 'center',
    marginTop: scale(4),
  },
  agreeBtnOff: {
    opacity: 0.4,
  },
  agreeBtnText: {
    color: C.white,
    fontSize: scale(15),
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});

// ─── SUB-COMPONENTS ───────────────────────────────────────────────────────────
const SectionHeader: React.FC<{
  icon: string;
  title: string;
  step: string;
}> = ({ icon, title, step }) => (
  <View style={sh.wrap}>
    <View style={sh.iconBox}>
      <Text style={sh.icon}>{icon}</Text>
    </View>
    <View>
      <Text style={sh.title}>{title}</Text>
      <Text style={sh.step}>{step}</Text>
    </View>
  </View>
);
const sh = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: scale(22),
    gap: scale(14),
  },
  iconBox: {
    width: scale(46),
    height: scale(46),
    borderRadius: 13,
    backgroundColor: C.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: { fontSize: scale(22) },
  title: { fontSize: scale(17), fontWeight: '700', color: C.text },
  step: {
    fontSize: scale(12),
    color: C.primary,
    fontWeight: '600',
    marginTop: 2,
  },
});

interface FieldProps {
  label: string;
  required?: boolean;
  icon: string;
  placeholder: string;
  value: string;
  onChangeText: (v: string) => void;
  error?: string;
  keyboardType?: 'default' | 'phone-pad' | 'email-address' | 'numeric';
  autoCapitalize?: 'none' | 'words' | 'sentences' | 'characters';
  maxLength?: number;
  multiline?: boolean;
  numberOfLines?: number;
  prefix?: string;
}
const Field: React.FC<FieldProps> = ({
  label,
  required,
  icon,
  placeholder,
  value,
  onChangeText,
  error,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  maxLength,
  multiline = false,
  numberOfLines = 1,
  prefix,
}) => (
  <View style={fieldStyles.wrapper}>
    <Text style={fieldStyles.label}>
      {label}
      {required && <Text style={fieldStyles.req}> *</Text>}
    </Text>
    <View
      style={[
        fieldStyles.inputRow,
        error ? fieldStyles.inputRowErr : null,
        multiline ? fieldStyles.inputRowMulti : null,
      ]}
    >
      <Text style={fieldStyles.icon}>{icon}</Text>
      {prefix && <Text style={fieldStyles.prefix}>{prefix}</Text>}
      <TextInput
        style={[
          fieldStyles.input,
          multiline && {
            height: numberOfLines * scale(42),
            textAlignVertical: 'top',
          },
        ]}
        placeholder={placeholder}
        placeholderTextColor={C.textMuted}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        maxLength={maxLength}
        multiline={multiline}
        numberOfLines={multiline ? numberOfLines : 1}
      />
    </View>
    {error && <Text style={fieldStyles.error}>⚠ {error}</Text>}
  </View>
);

interface DropdownFieldProps {
  label: string;
  required?: boolean;
  icon: string;
  placeholder: string;
  value: string;
  onPress: () => void;
  error?: string;
}
const DropdownField: React.FC<DropdownFieldProps> = ({
  label,
  required,
  icon,
  placeholder,
  value,
  onPress,
  error,
}) => (
  <View style={fieldStyles.wrapper}>
    <Text style={fieldStyles.label}>
      {label}
      {required && <Text style={fieldStyles.req}> *</Text>}
    </Text>
    <TouchableOpacity
      style={[
        fieldStyles.inputRow,
        error ? fieldStyles.inputRowErr : null,
        value ? fieldStyles.inputRowFilled : null,
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={fieldStyles.icon}>{icon}</Text>
      <Text
        style={[fieldStyles.input, !value && { color: C.textMuted }]}
        numberOfLines={1}
      >
        {value || placeholder}
      </Text>
      <Text style={{ fontSize: scale(20), color: C.textMuted, marginTop: -2 }}>
        ⌄
      </Text>
    </TouchableOpacity>
    {error && <Text style={fieldStyles.error}>⚠ {error}</Text>}
  </View>
);

const InfoBox: React.FC<{ text: string }> = ({ text }) => (
  <View style={ib.box}>
    <Text style={ib.icon}>ℹ️</Text>
    <Text style={ib.text}>{text}</Text>
  </View>
);
const ib = StyleSheet.create({
  box: {
    flexDirection: 'row',
    backgroundColor: C.primaryLight,
    borderRadius: 12,
    padding: scale(12),
    marginTop: 4,
    gap: 8,
    alignItems: 'flex-start',
  },
  icon: { fontSize: scale(13) },
  text: {
    flex: 1,
    fontSize: scale(12),
    color: C.primaryDark,
    lineHeight: scale(18),
  },
});

const SRow: React.FC<{ icon: string; label: string; value: string }> = ({
  icon,
  label,
  value,
}) => (
  <View style={sr.row}>
    <Text style={sr.icon}>{icon}</Text>
    <Text style={sr.lbl}>{label}</Text>
    <Text style={sr.val}>{value}</Text>
  </View>
);
const sr = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 10 },
  icon: { fontSize: scale(14) },
  lbl: {
    fontSize: scale(12),
    color: C.textSub,
    fontWeight: '600',
    width: scale(68),
  },
  val: { fontSize: scale(12), color: C.text, flex: 1, fontWeight: '500' },
});

const fieldStyles = StyleSheet.create({
  wrapper: { marginBottom: scale(16) },
  label: {
    fontSize: scale(13),
    fontWeight: '600',
    color: C.textSub,
    marginBottom: scale(7),
    letterSpacing: 0.2,
  },
  req: { color: C.error },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: scale(14),
    backgroundColor: C.inputBg,
    paddingHorizontal: scale(14),
    minHeight: scale(44),
  },
  inputRowErr: { borderColor: C.error, backgroundColor: '#fff8f8' },
  inputRowFilled: { borderColor: C.primary, backgroundColor: '#f0fafb' },
  inputRowMulti: { alignItems: 'flex-start', paddingVertical: scale(12) },
  icon: { fontSize: scale(16), marginRight: scale(10) },
  prefix: {
    fontSize: scale(14),
    color: C.primary,
    fontWeight: '700',
    marginRight: scale(8),
  },
  input: { flex: 1, fontSize: scale(14), color: C.text, paddingVertical: 0 },
  error: { color: C.error, fontSize: scale(12), marginTop: 5, marginLeft: 2 },
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  flex: { flex: 1 },

  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(16),
    paddingTop: scale(10),
    paddingBottom: scale(14),
  },
  headerLogoImg: {
    width: scale(38),
    height: scale(38),
    borderRadius: scale(10),
  },
  headerBrandName: {
    fontSize: scale(20),
    fontWeight: '800',
    color: C.primaryDark,
    letterSpacing: 0.2,
  },
  headerBrandSub: {
    fontSize: scale(12),
    color: C.primary,
    letterSpacing: 2,
    fontWeight: '700',
    marginTop: 2,
  },

  scroll: { padding: scale(16), paddingBottom: scale(16) },
  card: {
    backgroundColor: C.white,
    borderRadius: scale(20),
    padding: scale(20),
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.09,
    shadowRadius: 16,
    elevation: 4,
  },

  pinFetching: {
    fontSize: scale(12),
    color: C.primary,
    marginTop: 5,
    marginLeft: 2,
    marginBottom: 4,
  },
  pinSuccess: {
    fontSize: scale(12),
    color: C.success,
    marginTop: 5,
    marginLeft: 2,
    marginBottom: 4,
  },

  // Date picker row
  dateRow: { flexDirection: 'row', gap: scale(8) },
  dateSegDay: { width: scale(68) },
  dateSegMonth: { flex: 1 },
  dateSegYear: { width: scale(90) },
  dateSegLabel: {
    fontSize: scale(10),
    color: C.textMuted,
    textAlign: 'center',
    marginTop: 4,
  },

  bottomBar: {
    backgroundColor: C.white,
    paddingHorizontal: scale(20),
    paddingTop: scale(14),
    paddingBottom: Platform.OS === 'ios' ? 32 : scale(24),
    borderTopWidth: 1,
    borderTopColor: '#e0f4f6',
    gap: scale(12),
  },
  progressTrack: { flexDirection: 'row', gap: scale(6) },
  progressSeg: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.border,
  },
  progressSegOn: { backgroundColor: C.primary },
  bottomRow: { flexDirection: 'row', alignItems: 'center' },

  nextBtn: {
    backgroundColor: C.primary,
    borderRadius: scale(10),
    paddingHorizontal: scale(18),
    paddingVertical: scale(10),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 'auto',
  },
  nextBtnOff: { opacity: 0.6 },
  nextBtnTxt: {
    color: C.white,
    fontSize: scale(15),
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  backBtnBottom: {
    borderWidth: 1,
    borderColor: C.primary,
    borderRadius: scale(10),
    paddingHorizontal: scale(16),
    paddingVertical: scale(10),
    marginRight: scale(10),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnTxt: { color: C.primary, fontSize: scale(13), fontWeight: '600' },
  arrow: {
    fontSize: scale(14),
    fontWeight: '900',
    marginLeft: 2,
    marginRight: 2,
  },

  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,25,28,0.52)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: C.white,
    borderTopLeftRadius: scale(24),
    borderTopRightRadius: scale(24),
    paddingTop: 12,
    maxHeight: '75%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 20,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.border,
    alignSelf: 'center',
    marginBottom: 14,
  },
  sheetTitle: {
    fontSize: scale(16),
    fontWeight: '700',
    color: C.text,
    paddingHorizontal: scale(20),
    paddingBottom: scale(12),
    borderBottomWidth: 1,
    borderBottomColor: '#eef6f7',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(20),
    paddingVertical: scale(15),
    borderBottomWidth: 1,
    borderBottomColor: '#f3fafb',
  },
  optionSel: { backgroundColor: C.primaryLight },
  optionTxt: { fontSize: scale(15), color: C.textSub },
  optionTxtSel: { color: C.primary, fontWeight: '700' },
  optionCheck: { fontSize: scale(15), color: C.primary, fontWeight: '800' },

  // ── SUCCESS CARD — smaller & tighter ──
  successBg: {
    flex: 1,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
    padding: scale(20),
  },
  successCard: {
    backgroundColor: C.white,
    borderRadius: scale(24),
    padding: scale(22),
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 14,
  },
  successRing: {
    width: scale(60),
    height: scale(60),
    borderRadius: scale(30),
    backgroundColor: C.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scale(14),
    shadowColor: C.success,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  successTick: { fontSize: scale(28), color: C.white },
  successTitle: {
    fontSize: scale(20),
    fontWeight: '800',
    color: C.text,
    marginBottom: 2,
  },
  successName: {
    fontSize: scale(15),
    fontWeight: '700',
    color: C.primary,
    marginBottom: 8,
  },
  successSub: {
    fontSize: scale(12),
    color: C.textSub,
    textAlign: 'center',
    lineHeight: scale(18),
    marginBottom: 10,
  },
  idBadge: {
    backgroundColor: C.primaryDark,
    borderRadius: scale(10),
    paddingHorizontal: scale(20),
    paddingVertical: scale(8),
    alignItems: 'center',
    marginBottom: scale(10),
  },
  idBadgeLabel: {
    fontSize: scale(8),
    color: 'rgba(255,255,255,0.65)',
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 2,
  },
  idBadgeValue: {
    fontSize: scale(18),
    color: C.white,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  emailNote: {
    fontSize: scale(11),
    color: C.textSub,
    textAlign: 'center',
    lineHeight: scale(16),
    marginBottom: scale(10),
  },
  successPill: {
    backgroundColor: C.primaryLight,
    borderRadius: scale(16),
    paddingHorizontal: scale(14),
    paddingVertical: scale(6),
    marginBottom: scale(14),
  },
  successPillText: { fontSize: scale(12), color: C.primary, fontWeight: '600' },
  successDivider: {
    width: '100%',
    height: 1,
    backgroundColor: '#eef6f7',
    marginBottom: 12,
  },
});

export default RegisterDoctorScreen;
