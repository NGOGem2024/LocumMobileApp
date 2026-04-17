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
import AppHeader from '../components/AppHeader';
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

interface FormData {
  first_name: string;
  middle_name: string;
  last_name: string;
  mobile_number: string;
  email: string;
  specialization: string;
  qualification: string;
  experience: string;
  registration_number: string;
  clinic_name: string;
  clinic_address: string;
  city: string;
  state: string;
  pincode: string;
  job_type: string[];
  preferred_km: string;
}
interface FormErrors {
  [key: string]: string | undefined;
}

const STEPS = [
  { id: 1, title: 'Personal', icon: '👤' },
  { id: 2, title: 'Professional', icon: '🩺' },
  { id: 3, title: 'Practice', icon: '🏥' },
];

const RegisterDoctorScreen: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [pincodeLoading, setPincodeLoading] = useState(false);
  const [pincodeFetched, setPincodeFetched] = useState(false);

  const [dropdownConfig, setDropdownConfig] = useState<{
    visible: boolean;
    field: keyof FormData | null;
    options: string[];
    title: string;
  }>({ visible: false, field: null, options: [], title: '' });

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const successScale = useRef(new Animated.Value(0)).current;
  const pincodeBounce = useRef(new Animated.Value(1)).current;

  const [form, setForm] = useState<FormData>({
    first_name: '',
    middle_name: '',
    last_name: '',
    mobile_number: '',
    email: '',
    specialization: '',
    qualification: '',
    experience: '',
    registration_number: '',
    clinic_name: '',
    clinic_address: '',
    city: '',
    state: '',
    pincode: '',
    job_type: [],
    preferred_km: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});

  const setField = (field: keyof FormData, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: undefined }));
  };

  const openDropdown = (
    field: keyof FormData,
    options: string[],
    title: string,
  ) => setDropdownConfig({ visible: true, field, options, title });

  const selectDropdown = (value: string) => {
    if (dropdownConfig.field) setField(dropdownConfig.field, value);
    setDropdownConfig(p => ({ ...p, visible: false }));
  };

  const fetchLocationByPincode = async (pincode: string) => {
    if (pincode.length !== 6) return;
    setPincodeLoading(true);
    setPincodeFetched(false);
    setErrors(prev => ({ ...prev, pincode: undefined }));
    try {
      let city = '',
        state = '',
        backendSuccess = false;
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        const res = await fetch(`${BASE_URL}/api/doctors/pincode/${pincode}`, {
          signal: controller.signal,
        });
        clearTimeout(timeout);
        if (res.ok) {
          const data = await res.json();
          if (data.city && data.state) {
            city = data.city;
            state = data.state;
            backendSuccess = true;
          }
        }
      } catch (_) {}
      if (!backendSuccess) {
        const fallbackRes = await fetch(
          `https://api.postalpincode.in/pincode/${pincode}`,
        );
        const fallbackJson = await fallbackRes.json();
        if (
          fallbackJson?.[0]?.Status === 'Success' &&
          fallbackJson[0].PostOffice?.length > 0
        ) {
          const po = fallbackJson[0].PostOffice[0];
          city = po.District || '';
          state = po.State || '';
        } else {
          throw new Error('Invalid pincode or no data found');
        }
      }
      if (!city || !state) throw new Error('Could not determine city/state');
      setForm(prev => ({ ...prev, city, state }));
      setPincodeFetched(true);
      Animated.sequence([
        Animated.timing(pincodeBounce, {
          toValue: 1.04,
          duration: 120,
          useNativeDriver: true,
        }),
        Animated.timing(pincodeBounce, {
          toValue: 1,
          duration: 120,
          useNativeDriver: true,
        }),
      ]).start();
    } catch (error: any) {
      setForm(prev => ({ ...prev, city: '', state: '' }));
      setErrors(prev => ({
        ...prev,
        pincode: error.message || 'Could not fetch location for this pincode',
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
      if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
        e.email = 'Enter a valid email address';
    }
    if (step === 2) {
      if (!form.specialization)
        e.specialization = 'Please select a specialization';
      if (!form.qualification)
        e.qualification = 'Please select a qualification';
      if (!form.experience) e.experience = 'Please select experience range';
      if (!form.registration_number.trim())
        e.registration_number = 'Registration number is required';
    }
    if (step === 3) {
      if (!form.pincode.trim()) e.pincode = 'Pincode is required';
      else if (!/^\d{6}$/.test(form.pincode))
        e.pincode = 'Enter a valid 6-digit pincode';
      if (!form.city.trim())
        e.city = 'City could not be fetched — check pincode';
      if (!form.state.trim())
        e.state = 'State could not be fetched — check pincode';
      if (!form.clinic_address.trim())
        e.clinic_address = 'Clinic address is required';
      if (step === 3) {
        if (!form.job_type.length) e.job_type = 'Select at least one option';
        if (!form.preferred_km) e.preferred_km = 'Select preferred distance';
      }
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
    if (currentStep < 3)
      animateTransition('forward', () => setCurrentStep(s => s + 1));
    else handleSubmit();
  };
  const goBack = () => {
    if (currentStep > 1)
      animateTransition('back', () => setCurrentStep(s => s - 1));
  };

  const parseExperienceYears = (exp: string): number => {
    const match = exp.match(/\d+/);
    return match ? parseInt(match[0], 10) : 0;
  };

  const handleSubmit = async () => {
    if (!validateStep(3)) return;
    setLoading(true);
    try {
      const payload = {
        first_name: form.first_name,
        middle_name: form.middle_name,
        last_name: form.last_name,
        mobile_number: `+91${form.mobile_number}`,
        email: form.email,

        current_location_pincode: form.pincode,
        city_district: form.city,
        state: form.state,
        address_line1: form.clinic_address,

        doctor_license_no: form.registration_number,

        experience: [
          {
            years_of_experience: parseExperienceYears(form.experience),
            clinic_hospital_name: form.clinic_name || '',
            designation: 'Doctor',
            is_current: true,
          },
        ],

        // ✅ FIXED
        interested_in: form.job_type,
        preferred_distance_km: Number(form.preferred_km),
      };
      console.log('📤 Submitting payload:', JSON.stringify(payload, null, 2));
      console.log('Registration Number:', form.registration_number);
      const res = await fetch(`${BASE_URL}/api/doctors/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      console.log('📥 Status:', res.status);
      console.log('📥 Status Text:', res.statusText);
      const rawText = await res.text();
      console.log('📥 Raw response:', rawText);
      if (!rawText || rawText.trim() === '') {
        throw new Error(
          `Server returned empty response (HTTP ${res.status}). Check your backend route and middleware.`,
        );
      }
      let data: any;
      try {
        data = JSON.parse(rawText);
      } catch {
        throw new Error(
          `Server returned non-JSON response: ${rawText.slice(0, 200)}`,
        );
      }
      if (!res.ok)
        throw new Error(data.message || `Server error: ${res.status}`);
      setSubmitted(true);
      Animated.spring(successScale, {
        toValue: 1,
        tension: 55,
        friction: 7,
        useNativeDriver: true,
      }).start();
    } catch (err: any) {
      console.error('❌ Submit error:', err);
      Alert.alert(
        'Registration Failed',
        err.message || 'Something went wrong.',
      );
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSubmitted(false);
    setCurrentStep(1);
    successScale.setValue(0);
    setPincodeFetched(false);
    setForm({
      first_name: '',
      middle_name: '',
      last_name: '',
      mobile_number: '',
      email: '',
      specialization: '',
      qualification: '',
      experience: '',
      registration_number: '',
      clinic_name: '',
      clinic_address: '',
      city: '',
      state: '',
      pincode: '',
      job_type: [],
      preferred_km: '',
    });
    setErrors({});
  };

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
            <View style={styles.successRing}>
              <Text style={styles.successTick}>✓</Text>
            </View>
            <Text style={styles.successTitle}>Welcome aboard!</Text>
            <Text style={styles.successName}>
              Dr. {form.first_name} {form.middle_name} {form.last_name}
            </Text>
            <Text style={styles.successSub}>
              Your registration is submitted.{'\n'}Our team will verify your
              profile shortly.
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
            <TouchableOpacity style={styles.successBtn} onPress={resetForm}>
              <Text style={styles.successBtnText}>Register Another Doctor</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor={C.primaryDark} />
      <View>
        {/* ─── PROFESSIONAL HEADER ─────────────────────────────────────── */}
        <View style={styles.headerTop}>
          {/* LEFT: Logo + Locum */}
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <Image
              source={require('../assets/HT_icon.png')}
              style={styles.headerLogoImg}
              resizeMode="contain"
            />
            <Text style={[styles.headerBrandName, { marginLeft: 6 }]}>
              Locum
            </Text>
          </View>

          {/* RIGHT: Doctor Onboarding */}
          <Text
            style={[
              styles.headerBrandSub,
              { flexShrink: 1, textAlign: 'right' },
            ]}
            numberOfLines={1}
          >
            DOCTOR ONBOARDING
          </Text>
        </View>
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
                  icon="✉️"
                  placeholder="Optional"
                  value={form.email}
                  onChangeText={v => setField('email', v)}
                />
                <Field
                  label="Pincode"
                  required
                  icon="📮"
                  placeholder="Enter pincode"
                  value={form.pincode}
                  onChangeText={handlePincodeChange}
                  error={errors.pincode}
                  keyboardType="numeric"
                  maxLength={6}
                />
                <Field
                  label="City"
                  icon="🏙️"
                  value={form.city}
                  onChangeText={() => {}}
                  placeholder="Autofill from pincode"
                />
                <Field
                  label="State"
                  icon="🗺️"
                  value={form.state}
                  onChangeText={() => {}}
                  placeholder="Autofill from pincode"
                />
                <Field
                  label="Address"
                  required
                  icon="📍"
                  placeholder="Full address"
                  value={form.clinic_address}
                  onChangeText={v => setField('clinic_address', v)}
                  error={errors.clinic_address}
                  multiline
                />
              </View>
            )}

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
                <InfoBox text="Your registration number will be verified with the Medical Council of India." />
              </View>
            )}

            {currentStep === 3 && (
              <View style={styles.card}>
                <SectionHeader
                  icon="⚙️"
                  title="Work Preferences"
                  step="Step 3 of 3"
                />

                <View style={{ marginBottom: 20 }}>
                  <Text style={{ marginBottom: 12, fontWeight: '600' }}>
                    Interested In *
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                    {['full_time', 'locum_shifts', 'teleconsultation'].map(
                      type => {
                        const selected = form.job_type.includes(type);
                        return (
                          <TouchableOpacity
                            key={type}
                            onPress={() => {
                              let updated = [...form.job_type];
                              if (selected) {
                                updated = updated.filter(t => t !== type);
                              } else {
                                updated.push(type);
                              }
                              setField('job_type', updated);
                            }}
                            style={{
                              paddingHorizontal: scale(16),
                              paddingVertical: scale(10),
                              borderRadius: scale(20),
                              borderWidth: 1,
                              borderColor: selected ? '#007b8e' : '#ccc',
                              backgroundColor: selected ? '#e0f5f8' : '#fff',
                              marginRight: scale(10),
                              marginBottom: scale(10),
                            }}
                          >
                            <Text
                              style={{
                                color: selected ? '#007b8e' : '#333',
                                fontSize: scale(14),
                              }}
                            >
                              {type === 'full_time'
                                ? 'Full-time'
                                : type === 'locum_shifts'
                                ? 'Locum-Shifts'
                                : 'teleconsultation'}
                            </Text>
                          </TouchableOpacity>
                        );
                      },
                    )}
                  </View>
                </View>

                <View style={{ marginBottom: 10 }}>
                  <Text style={{ marginBottom: 12, fontWeight: '600' }}>
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
                            borderColor: selected ? '#007b8e' : '#ccc',
                            backgroundColor: selected ? '#e0f5f8' : '#fff',
                            marginRight: scale(10),
                            marginBottom: scale(10),
                          }}
                        >
                          <Text
                            style={{
                              color: selected ? '#007b8e' : '#333',
                              fontSize: scale(14),
                            }}
                          >
                            {km} km
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              </View>
            )}
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

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
          <Text style={styles.stepCounter}>
            Step {currentStep} of {STEPS.length}
          </Text>
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
                {currentStep === 3 ? 'Submit  ✓' : 'Continue  →'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

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
                const sel =
                  dropdownConfig.field && form[dropdownConfig.field] === item;
                return (
                  <TouchableOpacity
                    style={[styles.option, sel && styles.optionSel]}
                    onPress={() => selectDropdown(item)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[styles.optionTxt, sel && styles.optionTxtSel]}
                    >
                      {item}
                    </Text>
                    {sel && <Text style={styles.optionCheck}>✓</Text>}
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
  },
  icon: { fontSize: scale(15) },
  lbl: {
    fontSize: scale(13),
    color: C.textSub,
    fontWeight: '600',
    width: scale(72),
  },
  val: { fontSize: scale(13), color: C.text, flex: 1, fontWeight: '500' },
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
    minHeight: scale(52),
  },
  inputRowErr: { borderColor: C.error, backgroundColor: '#fff8f8' },
  inputRowFilled: { borderColor: C.primary, backgroundColor: '#f0fafb' },
  inputRowSuccess: { borderColor: C.success, backgroundColor: '#f0fef8' },
  inputRowMulti: { alignItems: 'flex-start', paddingVertical: scale(12) },
  icon: { fontSize: scale(16), marginRight: scale(10) },
  prefix: {
    fontSize: scale(14),
    color: C.primary,
    fontWeight: '700',
    marginRight: scale(8),
  },
  input: { flex: 1, fontSize: scale(15), color: C.text, paddingVertical: 0 },
  error: { color: C.error, fontSize: scale(12), marginTop: 5, marginLeft: 2 },
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  flex: { flex: 1 },

  // ─── HEADER ───────────────────────────────────────────────────────
  header: {
    backgroundColor: C.white,
    paddingTop: Platform.OS === 'ios' ? 52 : StatusBar.currentHeight ?? 24,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 4,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(16),
    paddingTop: scale(10),
    paddingBottom: scale(14),
  },
  headerBackBtn: {
    width: scale(38),
    height: scale(38),
    borderRadius: scale(10),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.primaryLight,
  },
  headerBackIcon: {
    fontSize: scale(30),
    color: C.primary,
    fontWeight: '600',
  },
  headerBrand: {
    alignItems: 'center',
  },
  headerLogoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(7),
  },
  headerLogoDot: {
    width: scale(8),
    height: scale(8),
    borderRadius: scale(4),
    backgroundColor: C.primary,
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
    fontSize: scale(9),
    color: C.primary,
    letterSpacing: 2,
    fontWeight: '700',
    marginTop: 2,
  },
  headerDivider: {
    height: 1,
    backgroundColor: C.border,
    marginHorizontal: scale(16),
  },
  headerStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(24),
    paddingVertical: scale(14),
  },
  headerStepItem: {
    alignItems: 'center',
    gap: scale(5),
  },
  headerStepBubble: {
    width: scale(30),
    height: scale(30),
    borderRadius: scale(15),
    backgroundColor: C.bg,
    borderWidth: 1.5,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerStepBubbleActive: {
    backgroundColor: C.primary,
    borderColor: C.primary,
  },
  headerStepBubbleDone: {
    backgroundColor: C.success,
    borderColor: C.success,
  },
  headerStepNum: {
    fontSize: scale(12),
    fontWeight: '700',
    color: C.textMuted,
  },
  headerStepNumActive: {
    color: C.white,
  },
  headerStepCheck: {
    fontSize: scale(13),
    color: C.white,
    fontWeight: '800',
  },
  headerStepLabel: {
    fontSize: scale(10),
    fontWeight: '600',
    color: C.textMuted,
    letterSpacing: 0.3,
  },
  headerStepLabelActive: {
    color: C.primary,
  },
  headerConnectorWrap: {
    flex: 1,
    paddingHorizontal: scale(6),
    paddingBottom: scale(18), // aligns with bubble center
  },
  headerConnector: {
    height: 1.5,
    backgroundColor: C.border,
    borderRadius: 1,
  },
  headerConnectorDone: {
    backgroundColor: C.success,
  },

  backBtn: {
    width: scale(38),
    height: scale(38),
    borderRadius: scale(19),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)', // ✅ glass effect
  },

  backIcon: {
    fontSize: scale(28),
    color: '#ffffff', // ✅ visible
  },
  brandBlock: { alignItems: 'center' },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  brandDot: {
    width: scale(9),
    height: scale(9),
    borderRadius: scale(5),
    backgroundColor: C.white,
  },
  brandName: {
    fontSize: scale(20),
    fontWeight: '800',
    color: C.white,
    letterSpacing: 0.4,
  },
  brandTagline: {
    fontSize: scale(9),
    color: 'rgba(255,255,255,0.65)',
    letterSpacing: 1.5,
    marginTop: 4,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(30),
    paddingBottom: scale(20),
    marginTop: 4,
  },
  stepCol: { alignItems: 'center', gap: 5 },
  stepBubble: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(16),
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBubbleActive: { backgroundColor: C.white, borderColor: C.white },
  stepBubbleDone: { backgroundColor: C.success, borderColor: C.success },
  stepNum: {
    fontSize: scale(13),
    fontWeight: '700',
    color: 'rgba(255,255,255,0.7)', // brighter
  },

  stepLabel: {
    fontSize: scale(10),
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)', // visible
  },

  connector: {
    flex: 1,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.3)', // better contrast
  },
  stepNumActive: { color: C.primary },
  stepCheck: { fontSize: scale(14), color: C.white, fontWeight: '800' },

  stepLabelActive: { color: C.white },

  connectorDone: { backgroundColor: C.success },
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
  row: { flexDirection: 'row', gap: scale(12) },
  half: { flex: 1 },
  pinFetching: {
    fontSize: scale(12),
    color: C.primary,
    marginTop: 5,
    marginLeft: 2,
  },
  pinBadge: {
    width: scale(24),
    height: scale(24),
    borderRadius: scale(12),
    backgroundColor: C.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinBadgeTxt: { color: C.white, fontSize: scale(13), fontWeight: '700' },
  autoRow: { borderColor: C.primaryMid, backgroundColor: '#f0fbfc' },
  autoRowEmpty: { borderColor: C.border, backgroundColor: C.inputBg },
  autoVal: { flex: 1, fontSize: scale(14), color: C.text, fontWeight: '600' },
  autoPlaceholder: {
    color: C.textMuted,
    fontWeight: '400',
    fontSize: scale(13),
  },
  autoTag: {
    fontSize: scale(9),
    fontWeight: '800',
    color: C.primary,
    backgroundColor: C.primaryLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    letterSpacing: 0.5,
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
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepCounter: { fontSize: scale(13), color: C.textMuted, fontWeight: '600' },
  nextBtn: {
    backgroundColor: C.primary,
    borderRadius: scale(14),
    paddingHorizontal: scale(28),
    paddingVertical: scale(14),
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.38,
    shadowRadius: 10,
    elevation: 7,
  },
  nextBtnOff: { opacity: 0.6 },
  nextBtnTxt: {
    color: C.white,
    fontSize: scale(15),
    fontWeight: '700',
    letterSpacing: 0.3,
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
  successBg: {
    flex: 1,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
    padding: scale(20),
  },
  successCard: {
    backgroundColor: C.white,
    borderRadius: scale(28),
    padding: scale(28),
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 16,
  },
  successRing: {
    width: scale(80),
    height: scale(80),
    borderRadius: scale(40),
    backgroundColor: C.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scale(20),
    shadowColor: C.success,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  successTick: { fontSize: scale(38), color: C.white },
  successTitle: {
    fontSize: scale(22),
    fontWeight: '800',
    color: C.text,
    marginBottom: 4,
  },
  successName: {
    fontSize: scale(18),
    fontWeight: '700',
    color: C.primary,
    marginBottom: 10,
  },
  successSub: {
    fontSize: scale(13),
    color: C.textSub,
    textAlign: 'center',
    lineHeight: scale(20),
    marginBottom: 16,
  },
  successPill: {
    backgroundColor: C.primaryLight,
    borderRadius: scale(20),
    paddingHorizontal: scale(16),
    paddingVertical: scale(8),
    marginBottom: scale(20),
  },
  successPillText: { fontSize: scale(14), color: C.primary, fontWeight: '600' },
  successDivider: {
    width: '100%',
    height: 1,
    backgroundColor: '#eef6f7',
    marginBottom: 16,
  },
  successBtn: {
    marginTop: scale(20),
    backgroundColor: C.primary,
    borderRadius: scale(14),
    paddingHorizontal: scale(24),
    paddingVertical: scale(14),
    width: '100%',
    alignItems: 'center',
  },
  topHeader: {
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',

    paddingTop: Platform.OS === 'ios' ? 52 : StatusBar.currentHeight ?? 24,
    paddingHorizontal: scale(16),
    paddingBottom: scale(12),

    borderBottomWidth: 1,
    borderBottomColor: '#eef6f7',

    // subtle shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
  },
  backBtnWhite: {
    width: scale(38),
    height: scale(38),
    borderRadius: scale(22),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e0f5f8', // light bg
  },

  backIconDark: {
    fontSize: scale(26),
    color: '#007b8e', // visible now
    fontWeight: '600',
  },
  headerBackBtnHidden: {
    width: scale(38),
    height: scale(38),
    // no background, no border — completely invisible
    // but keeps the layout balanced (brand stays centered)
  },

  stepperHeader: {
    backgroundColor: C.primary,
    paddingBottom: scale(5),
    paddingTop: scale(12),
    borderBottomLeftRadius: scale(24),
    borderBottomRightRadius: scale(24),

    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 5,
  },
  successBtnText: { color: C.white, fontWeight: '700', fontSize: scale(15) },
});

export default RegisterDoctorScreen;
