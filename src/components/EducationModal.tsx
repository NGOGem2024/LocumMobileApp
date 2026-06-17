import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  FlatList,
} from 'react-native';

// ─── Speciality map (same as your original openEducationEdit) ────────────────

const SPECIALITY_MAP: Record<string, string[]> = {
  'General Medicine': [
    'Internal Medicine',
    'General Practice',
    'Family Medicine',
    'Other',
  ],
  Cardiology: [
    'Interventional Cardiology',
    'Electrophysiology',
    'Heart Failure',
    'Pediatric Cardiology',
    'Other',
  ],
  Dermatology: [
    'Cosmetic Dermatology',
    'Pediatric Dermatology',
    'Dermato-Oncology',
    'Other',
  ],
  Neurology: [
    'Stroke',
    'Epilepsy',
    'Movement Disorders',
    'Neuro-Oncology',
    'Other',
  ],
  Orthopedics: [
    'Spine Surgery',
    'Joint Replacement',
    'Sports Medicine',
    'Trauma',
    'Other',
  ],
  Pediatrics: [
    'Neonatology',
    'Pediatric Cardiology',
    'Pediatric Surgery',
    'Pediatric Neurology',
    'Other',
  ],
  Psychiatry: [
    'Child Psychiatry',
    'Geriatric Psychiatry',
    'Addiction Medicine',
    'Forensic Psychiatry',
    'Other',
  ],
  Radiology: [
    'Interventional Radiology',
    'Neuroradiology',
    'Nuclear Medicine',
    'Musculoskeletal Radiology',
    'Other',
  ],
  Surgery: [
    'General Surgery',
    'Laparoscopic Surgery',
    'Vascular Surgery',
    'Colorectal Surgery',
    'Other',
  ],
  Gynecology: [
    'Obstetrics',
    'Reproductive Medicine',
    'Gynecological Oncology',
    'Maternal-Fetal Medicine',
    'Other',
  ],
  Ophthalmology: ['Retina', 'Cornea', 'Glaucoma', 'Oculoplasty', 'Other'],
  ENT: ['Rhinology', 'Otology', 'Head & Neck Surgery', 'Laryngology', 'Other'],
  Anesthesia: [
    'Pain Medicine',
    'Critical Care',
    'Pediatric Anesthesia',
    'Other',
  ],
  Oncology: [
    'Medical Oncology',
    'Surgical Oncology',
    'Radiation Oncology',
    'Hemato-Oncology',
    'Other',
  ],
  Urology: [
    'Andrology',
    'Uro-Oncology',
    'Pediatric Urology',
    'Endourology',
    'Other',
  ],
  Nephrology: [
    'Transplant Nephrology',
    'Dialysis',
    'Pediatric Nephrology',
    'Other',
  ],
  Gastroenterology: ['Hepatology', 'Therapeutic Endoscopy', 'IBD', 'Other'],
  Pulmonology: [
    'Critical Care',
    'Interventional Pulmonology',
    'Sleep Medicine',
    'Other',
  ],
  Endocrinology: [
    'Diabetes',
    'Thyroid Disorders',
    'Reproductive Endocrinology',
    'Other',
  ],
  Rheumatology: ['Autoimmune Disorders', 'Pediatric Rheumatology', 'Other'],
  Other: ['Other'],
};

const SPECIALITY_OPTIONS = Object.keys(SPECIALITY_MAP);

// ─── Degree options ───────────────────────────────────────────────────────────

const DEGREE_OPTIONS = [
  'MBBS',
  'MD',
  'MS',
  'BDS',
  'MDS',
  'BAMS',
  'BHMS',
  'BUMS',
  'DNB',
  'DM',
  'MCh',
  'MPH',
  'MPhil',
  'PhD',
  'BSc Nursing',
  'MSc Nursing',
  'BPT',
  'MPT',
  'BMLT',
  'DMLT',
  'Other',
];

// ─── Year options (current year down to 50 years ago) ─────────────────────────

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 51 }, (_, i) =>
  String(CURRENT_YEAR - i),
);

// ─── Colour tokens (match your existing C.* values) ──────────────────────────

const C = {
  primary: '#00A8B5',
  primaryDeep: '#003D4A',
  primaryLight: '#E8F8FA',
  text: '#1A2B32',
  textSub: '#4E6672',
  textMuted: '#8FA3AE',
  border: '#D6E9ED',
  white: '#FFFFFF',
  bg: '#F4FAFB',
};

// ─── Tiny reusable Dropdown ───────────────────────────────────────────────────

interface DropdownProps {
  label: string;
  options: string[];
  value: string;
  placeholder?: string;
  onChange: (val: string) => void;
}

const Dropdown: React.FC<DropdownProps> = ({
  label,
  options,
  value,
  placeholder,
  onChange,
}) => {
  const [open, setOpen] = useState(false);

  return (
    <View style={field.wrap}>
      <Text style={field.label}>{label}</Text>
      <TouchableOpacity
        style={field.input}
        onPress={() => setOpen(o => !o)}
        activeOpacity={0.8}
      >
        <Text style={[field.inputTxt, !value && field.placeholder]}>
          {value || placeholder || `Select ${label}`}
        </Text>
        <Text style={field.chevron}>{open ? '▲' : '▼'}</Text>
      </TouchableOpacity>

      {open && (
        <View style={field.list}>
          <ScrollView
            nestedScrollEnabled
            showsVerticalScrollIndicator
            style={{ maxHeight: 200 }}
          >
            {options.map(opt => (
              <TouchableOpacity
                key={opt}
                style={[field.option, value === opt && field.optionActive]}
                onPress={() => {
                  onChange(opt);
                  setOpen(false);
                }}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    field.optionTxt,
                    value === opt && field.optionTxtActive,
                  ]}
                >
                  {opt}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
};

// ─── University autocomplete ──────────────────────────────────────────────────

interface Prediction {
  place_id: string;
  structured_formatting: { main_text: string; secondary_text: string };
}

interface UniversityACProps {
  value: string;
  onChange: (val: string) => void;
  onLocationResolved: (location: string) => void;
  apiKey: string;
}

const UniversityAutocomplete: React.FC<UniversityACProps> = ({
  value,
  onChange,
  onLocationResolved,
  apiKey,
}) => {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [showList, setShowList] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = async (q: string) => {
    if (q.length < 3) {
      setPredictions([]);
      return;
    }
    try {
      const resp = await fetch(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json` +
          `?input=${encodeURIComponent(q)}` +
          `&types=university|school` +
          `&key=${apiKey}`,
      );
      const json = await resp.json();
      if (json.status === 'OK') setPredictions(json.predictions || []);
      else setPredictions([]);
    } catch {
      setPredictions([]);
    }
  };

  const resolveLocation = async (placeId: string) => {
    try {
      const resp = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json` +
          `?place_id=${placeId}` +
          `&fields=address_components` +
          `&key=${apiKey}`,
      );
      const json = await resp.json();
      if (json.status !== 'OK') return;
      const comps: any[] = json.result?.address_components || [];
      const get = (type: string) =>
        comps.find((c: any) => c.types.includes(type))?.long_name;
      const city = get('locality') || get('administrative_area_level_2') || '';
      const state = get('administrative_area_level_1') || '';
      const parts = [city, state].filter(Boolean);
      if (parts.length) onLocationResolved(parts.join(', '));
    } catch {
      /* silent */
    }
  };

  const handleChange = (txt: string) => {
    onChange(txt);
    setShowList(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => search(txt), 350);
  };

  const handleSelect = (p: Prediction) => {
    onChange(p.structured_formatting.main_text);
    setPredictions([]);
    setShowList(false);
    resolveLocation(p.place_id);
  };

  return (
    <View style={[field.wrap, { zIndex: 30 }]}>
      <Text style={field.label}>University / Institution</Text>
      <TextInput
        style={[field.input, { paddingRight: 14 }]}
        value={value}
        onChangeText={handleChange}
        placeholder="e.g. Mumbai University"
        placeholderTextColor="#aaa"
        onFocus={() => value.length >= 3 && setShowList(true)}
        onBlur={() => setTimeout(() => setShowList(false), 200)}
        returnKeyType="search"
      />

      {showList && predictions.length > 0 && (
        <View style={[field.list, { maxHeight: 220 }]}>
          <FlatList
            data={predictions}
            keyExtractor={item => item.place_id}
            nestedScrollEnabled
            keyboardShouldPersistTaps="always"
            renderItem={({ item }) => (
              <TouchableOpacity
                style={field.option}
                onPress={() => handleSelect(item)}
                activeOpacity={0.75}
              >
                <Text style={field.optionTxt}>
                  {item.structured_formatting.main_text}
                </Text>
                <Text
                  style={[
                    field.optionTxt,
                    { fontSize: 11, color: C.textMuted, marginTop: 2 },
                  ]}
                >
                  {item.structured_formatting.secondary_text}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}
    </View>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────

interface EduEntry {
  degree?: string;
  speciality?: string;
  super_speciality?: string;
  university?: string;
  location?: string;
  pass_out_year?: string | number;
  [key: string]: any;
}

interface Props {
  visible: boolean;
  initial: EduEntry | null;
  editIndex: number | undefined;
  profile: { education?: EduEntry[] } | null;
  onClose: () => void;
  onSave: (updatedEducation: EduEntry[]) => void;
  loading?: boolean;
  googleApiKey: string;
}

const EducationModal: React.FC<Props> = ({
  visible,
  initial,
  editIndex,
  profile,
  onClose,
  onSave,
  loading,
  googleApiKey,
}) => {
  // ── State (one field per form input) ──────────────────────────────────────
  const [degree, setDegree] = useState('');
  const [speciality, setSpeciality] = useState('');
  const [superSpeciality, setSuperSpeciality] = useState('');
  const [university, setUniversity] = useState('');
  const [location, setLocation] = useState('');
  const [passOutYear, setPassOutYear] = useState('');

  // Seed from initial when modal opens
  useEffect(() => {
    if (!visible) return;
    const e = initial || {};
    setDegree(e.degree || '');
    setSpeciality(e.speciality || '');
    setSuperSpeciality(e.super_speciality || '');
    setUniversity(e.university || '');
    setLocation(e.location || '');
    setPassOutYear(String(e.pass_out_year || ''));
  }, [visible, initial]);

  // ── Save ─────────────────────────────────────────────────────────────────
  const handleSave = () => {
    const entry: EduEntry = {
      degree,
      speciality,
      super_speciality: superSpeciality,
      university,
      location,
      pass_out_year: passOutYear,
    };
    const existing = profile?.education || [];
    const updated =
      editIndex !== undefined
        ? existing.map((ed, i) => (i === editIndex ? { ...ed, ...entry } : ed))
        : [...existing, entry];
    onSave(updated);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={modal.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={modal.sheet}>
          {/* Header */}
          <View style={modal.header}>
            <Text style={modal.title}>
              {editIndex !== undefined ? 'Edit Education' : 'Add Education'}
            </Text>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Text style={modal.closeIcon}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Body */}
          <ScrollView
            contentContainerStyle={modal.body}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="always"
          >
            {/* 1. Degree — DROPDOWN */}
            <Dropdown
              label="Degree"
              options={DEGREE_OPTIONS}
              value={degree}
              placeholder="Select Degree (e.g. MBBS / MD)"
              onChange={setDegree}
            />

            {/* 2. Speciality — DROPDOWN */}
            <Dropdown
              label="Speciality"
              options={SPECIALITY_OPTIONS}
              value={speciality}
              placeholder="Select Speciality"
              onChange={val => {
                setSpeciality(val);
                setSuperSpeciality(''); // reset super when speciality changes
              }}
            />

            {/* 3. Super Speciality — DROPDOWN, options driven by selected Speciality */}
            {speciality ? (
              <Dropdown
                label="Super Speciality"
                options={SPECIALITY_MAP[speciality] || ['Other']}
                value={superSpeciality}
                placeholder="Select Super Speciality"
                onChange={setSuperSpeciality}
              />
            ) : null}

            {/* 4. University — GOOGLE PLACES AUTOCOMPLETE */}
            <UniversityAutocomplete
              value={university}
              onChange={setUniversity}
              onLocationResolved={setLocation}
              apiKey={googleApiKey}
            />

            {/* 5. Location — auto-filled, still editable */}
            <View style={[field.wrap, { zIndex: 1 }]}>
              <Text style={field.label}>Location</Text>
              <TextInput
                style={[field.input, { paddingRight: 14 }]}
                value={location}
                onChangeText={setLocation}
                placeholder="e.g. Mumbai, Maharashtra"
                placeholderTextColor="#aaa"
              />
              {!!location && (
                <Text style={field.autoNote}>
                  📍 Auto-filled from university
                </Text>
              )}
            </View>

            {/* 6. Year of Passing — DROPDOWN */}
            <Dropdown
              label="Year of Passing"
              options={YEAR_OPTIONS}
              value={passOutYear}
              placeholder="Select Year"
              onChange={setPassOutYear}
            />
          </ScrollView>

          {/* Footer */}
          <View style={modal.footer}>
            <TouchableOpacity
              style={modal.cancelBtn}
              onPress={onClose}
              activeOpacity={0.8}
            >
              <Text style={modal.cancelTxt}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[modal.saveBtn, loading && { opacity: 0.6 }]}
              onPress={loading ? undefined : handleSave}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color={C.white} size="small" />
              ) : (
                <Text style={modal.saveTxt}>Save</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const field = StyleSheet.create({
  wrap: { marginBottom: 16 },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: C.textMuted,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  input: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: C.text,
    backgroundColor: C.bg,
  } as any,
  inputTxt: { fontSize: 14, color: C.text, flex: 1 },
  placeholder: { color: '#aaa' },
  chevron: { fontSize: 11, color: C.textMuted },
  list: {
    borderWidth: 1.5,
    borderColor: C.primary,
    borderRadius: 12,
    backgroundColor: C.white,
    marginTop: 4,
    elevation: 8,
    shadowColor: C.primaryDeep,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    overflow: 'hidden',
  },
  option: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  optionActive: { backgroundColor: C.primaryLight },
  optionTxt: { fontSize: 14, color: C.text },
  optionTxtActive: { color: C.primary, fontWeight: '700' },
  autoNote: {
    fontSize: 11,
    color: C.primary,
    marginTop: 4,
    fontWeight: '500',
  },
});

const modal = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,30,40,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: C.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '92%',
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  title: { fontSize: 17, fontWeight: '800', color: C.primaryDeep },
  closeIcon: { fontSize: 18, color: C.textMuted },
  body: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  cancelBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelTxt: { fontSize: 14, fontWeight: '700', color: C.textSub },
  saveBtn: {
    flex: 2,
    backgroundColor: C.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveTxt: { fontSize: 14, fontWeight: '800', color: C.white },
});

export default EducationModal;
