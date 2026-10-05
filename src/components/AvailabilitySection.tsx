import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  ScrollView,
  StatusBar,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import instance from '../services/axiosConfig';
import { useAuth } from '../context/AuthContext';

const { width: SW } = Dimensions.get('window');
const scale = (n: number) => (SW / 390) * n;

// ── Palette ────────────────────────────────────────────────────────────────────
const C = {
  primary: '#007b8e',
  primaryDeep: '#003d4a',
  primaryLight: '#e0f5f8',
  white: '#ffffff',
  bg: '#F9FAFB', 
  inputBg: '#F3F4F6',
  text: '#111827',
  textSub: '#4B5563',
  textMuted: '#9CA3AF',
  border: '#E5E7EB',
  success: '#10b981',
  successLight: '#d1fae5',
  danger: '#ef4444',
  cardShadow: 'rgba(17, 24, 39, 0.06)',
};

// ── Types ──────────────────────────────────────────────────────────────────────
type ShiftType = 'am' | 'pm' | 'unavailable' | 'full' | 'flexible';

interface ShiftConfig {
  shift_type: ShiftType;
  start_time: string;
  end_time: string;
}

interface AvailabilityEntry extends ShiftConfig {
  date: string; 
}

interface Props {
  doctorId?: string; 
  apiBaseUrl?: string;
  authToken?: string;
  initialAvailability?: AvailabilityEntry[];
  navigation?: any;
  route?: any; 
}

// ── Shift Presets ──────────────────────────────────────────────────────────────
const PRESETS: Record<
  ShiftType,
  {
    label: string;
    icon: string;
    start: string;
    end: string;
  }
> = {
  am: { label: 'Morning', icon: '🌅', start: '08:00', end: '14:00' },
  pm: { label: 'Evening', icon: '🌙', start: '14:00', end: '20:00' }, 
  flexible: { label: 'Flexible', icon: '⏱️', start: '08:00', end: '20:00' },// Changed to Evening per request
  unavailable: { label: 'Unavailable', icon: '🚫', start: '00:00', end: '00:00' },
  full: { label: 'Full Day', icon: '📅', start: '08:00', end: '20:00' },
};

// ── Calendar helpers ───────────────────────────────────────────────────────────
const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function toISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function normDate(s: string) {
  return s.substring(0, 10);
}

function daysInMonth(y: number, m: number) {
  return new Date(y, m + 1, 0).getDate();
}

function firstDay(y: number, m: number) {
  return new Date(y, m, 1).getDay();
}

// ══════════════════════════════════════════════════════════════════════════════
// ── AvailabilitySection (Instant Tap-to-Save) ─────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
const AvailabilitySection: React.FC<Props> = ({
  doctorId: propDoctorId,
  initialAvailability,
  navigation,
}) => {
  const { doctor } = useAuth();
  const doctorId = propDoctorId || doctor?._id;
  const today = new Date();
  const todayStr = toISO(today);

  const [viewY, setViewY] = useState(today.getFullYear());
  const [viewM, setViewM] = useState(today.getMonth());
  const [avail, setAvail] = useState<AvailabilityEntry[]>(initialAvailability || []);
  
  // ── New States for One-Tap Mode ──
  const [activeMode, setActiveMode] = useState<ShiftType>('am'); 
  const [savingDate, setSavingDate] = useState<string | null>(null); 
  
  const hasFetched = useRef(false);

  useEffect(() => {
    if (initialAvailability && initialAvailability.length > 0) {
      setAvail(initialAvailability);
      hasFetched.current = true;
    }
  }, [initialAvailability]);

  // 1. Fetch Availability 
  useEffect(() => {
    const fetchAvail = async () => {
      if (doctorId && !hasFetched.current && (!initialAvailability || initialAvailability.length === 0)) {
        try {
          const res = await instance.get(`/api/doctors/${doctorId}/availability`);
          if (res.data?.availability) {
            setAvail(res.data.availability);
          }
        } catch (error) {
          console.log("Backend API not ready yet, loading empty calendar.");
        } finally {
          hasFetched.current = true;
        }
      }
    };
    fetchAvail();
  }, [doctorId]);

  const getEntry = (dateStr: string) => avail.find(a => normDate(a.date) === dateStr);

  const prevM = () => viewM === 0 ? (setViewM(11), setViewY(y => y - 1)) : setViewM(m => m - 1);
  const nextM = () => viewM === 11 ? (setViewM(0), setViewY(y => y + 1)) : setViewM(m => m + 1);

  // 2. Direct Tap Handler
  const handleDateTap = async (dateStr: string) => {
    const existingEntry = getEntry(dateStr);

    if (existingEntry && existingEntry.shift_type === activeMode) {
      // If tapping an already set shift of the same type, toggle it off (Delete)
      await deleteAvailability(dateStr);
    } else {
      // Otherwise, save/overwrite with the active mode shift type (Patch)
      await saveAvailability(dateStr, activeMode);
    }
  };


// Save Availability to Backend
  const saveAvailability = async (dateStr: string, mode: ShiftType) => {
    setSavingDate(dateStr);
    
    const cfg = {
      shift_type: mode,
      start_time: PRESETS[mode].start,
      end_time: PRESETS[mode].end
    };

    const newEntry: AvailabilityEntry = { date: dateStr, ...cfg };
    const updatedArray = [...avail.filter(a => normDate(a.date) !== dateStr), newEntry];
    
    try {
      if (doctorId) {
        await instance.patch(`/api/doctors/${doctorId}/availability`, {
          availability: [
            {
              date: normDate(newEntry.date),
              shift_type: newEntry.shift_type,
              start_time: newEntry.start_time,
              end_time: newEntry.end_time
            }
          ]
        });
      }
      // Only update UI if the API call succeeds
      setAvail(updatedArray);
    } catch (e: any) {
      console.log("Save API failed:", e);
      // REMOVED: setAvail(updatedArray); <-- Do not update UI on failure
      Alert.alert("Error", "Failed to save availability. Please try again.");
    } finally {
      setSavingDate(null);
    }
  };

  // Delete Availability from Backend
  const deleteAvailability = async (dateStr: string) => {
    setSavingDate(dateStr);
    const updatedArray = avail.filter(a => normDate(a.date) !== dateStr);
    
    try {
      if (doctorId) {
        await instance.delete(`/api/doctors/${doctorId}/availability/${dateStr}`);
      }
      setAvail(updatedArray); 
    } catch (e: any) {
      console.log("Delete API failed, removing from UI locally.");
      Alert.alert("Error", "Failed to delete availability. Please try again.");
    } finally {
      setSavingDate(null);
    }
  };

  const getPresetStyles = (t: ShiftType) => {
    switch (t) {
      case 'am': return { bg: styles.preset_am_bg, border: styles.preset_am_border, text: styles.preset_am_text };
      case 'pm': return { bg: styles.preset_pm_bg, border: styles.preset_pm_border, text: styles.preset_pm_text };
      case 'flexible': return { bg: styles.preset_flexible_bg, border: styles.preset_flexible_border, text: styles.preset_flexible_text }; // <-- Add this line
      case 'unavailable': return { bg: styles.preset_unavailable_bg, border: styles.preset_unavailable_border, text: styles.preset_unavailable_text };
      case 'full': return { bg: styles.preset_full_bg, border: styles.preset_full_border, text: styles.preset_full_text };
      default: return { bg: null, border: null, text: null };
    }
  };

  const dim = daysInMonth(viewY, viewM);
  const fd = firstDay(viewY, viewM);
  const cells: (number | null)[] = [ ...Array(fd).fill(null), ...Array.from({ length: dim }, (_, i) => i + 1) ];
  while (cells.length % 7 !== 0) cells.push(null);

  const upcoming = [...avail].sort((a, b) => normDate(a.date).localeCompare(normDate(b.date)));
  
  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
      
      {/* SCREEN HEADER */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation?.goBack()}>
          <Ionicons name="arrow-back" size={scale(22)} color={C.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manage Availability</Text>
        <View style={{ width: scale(22) }} />
      </View>

      <ScrollView contentContainerStyle={styles.av_wrap} showsVerticalScrollIndicator={false}>
        <View style={styles.av_card}>
          
          {/* HEADER: Calendar Navigation & Radio Buttons */}
          <View style={styles.av_topHeader}>
            <View style={styles.av_monthNav}>
              <TouchableOpacity onPress={prevM} style={styles.av_navBtn}>
                <Ionicons name="chevron-back" size={scale(14)} color={C.primary} />
              </TouchableOpacity>
              <Text style={styles.av_monthLabel}>{MONTHS[viewM]} {viewY}</Text>
              <TouchableOpacity onPress={nextM} style={styles.av_navBtn}>
                <Ionicons name="chevron-forward" size={scale(14)} color={C.primary} />
              </TouchableOpacity>
            </View>

           {/* Radio Button Toggle */}
            <View style={styles.radioGroup}>
              <TouchableOpacity onPress={() => setActiveMode('am')} style={styles.radioBtn} activeOpacity={0.8}>
                <View style={[styles.radioCircle, activeMode === 'am' && styles.radioCircleActive]} />
                <Text style={styles.radioTxt}>Morning</Text>
              </TouchableOpacity>
              
              <TouchableOpacity onPress={() => setActiveMode('pm')} style={styles.radioBtn} activeOpacity={0.8}>
                <View style={[styles.radioCircle, activeMode === 'pm' && styles.radioCircleActive]} />
                <Text style={styles.radioTxt}>Evening</Text>
              </TouchableOpacity>

              {/* Add Flexible Button here */}
              <TouchableOpacity onPress={() => setActiveMode('flexible')} style={styles.radioBtn} activeOpacity={0.8}>
                <View style={[styles.radioCircle, activeMode === 'flexible' && styles.radioCircleActive]} />
                <Text style={styles.radioTxt}>Flexible</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.av_dayRow}>
            {DAYS.map(d => <Text key={d} style={styles.av_dayHdr}>{d}</Text>)}
          </View>

          {/* CALENDAR GRID */}
          <View style={styles.av_grid}>
            {cells.map((day, idx) => {
              if (!day) return <View key={`e${idx}`} style={styles.av_cellWrap} />;
              const ds = toISO(new Date(viewY, viewM, day));
              const past = ds < todayStr;
              const today = ds === todayStr;
              const entry = getEntry(ds);
              const pStyles = entry ? getPresetStyles(entry.shift_type) : null;
              const isSavingThis = savingDate === ds;

              return (
                <TouchableOpacity
                  key={`d${day}`}
                  style={styles.av_cellWrap}
                  onPress={() => !past && !isSavingThis && handleDateTap(ds)}
                  activeOpacity={past ? 1 : 0.6}
                >
                  <View
                    style={[
                      styles.av_cell,
                      today && styles.av_cellToday,
                      entry && styles.av_cellConfigured,
                      entry && pStyles?.bg,
                      entry && pStyles?.border,
                      past && styles.av_cellPast,
                    ]}
                  >
                    {isSavingThis ? (
                      <ActivityIndicator size="small" color={C.primary} />
                    ) : (
                      <>
                        <Text
                          style={[
                            styles.av_cellTxt,
                            today && !entry && styles.av_cellTxtToday,
                            entry && pStyles?.text,
                            past && styles.av_cellTxtPast,
                          ]}
                        >
                          {day}
                        </Text>
                        {entry && <Text style={styles.av_cellDot}>{PRESETS[entry.shift_type].icon}</Text>}
                      </>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* LEGEND */}
          <View style={styles.av_legend}>
            {(Object.keys(PRESETS) as ShiftType[]).map(t => (
              <View key={t} style={styles.av_lgItem}>
                <View style={[styles.av_lgDot, getPresetStyles(t).bg]} />
                <Text style={styles.av_lgTxt}>{PRESETS[t].label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* UPCOMING AVAILABILITY LIST */}
        {upcoming.length > 0 && (
          <View style={styles.av_upWrap}>
            <Text style={styles.av_upTitle}>Configured Shifts</Text>
            {upcoming.map((entry, index) => {
              const pStyles = getPresetStyles(entry.shift_type);
              const ds = normDate(entry.date);
              const [, em, ed] = ds.split('-').map(Number);
              
              return (
                <View key={`${entry.date}-${index}`} style={styles.av_upCard}>
                  <View style={[styles.av_upIcon, pStyles.bg]}>
                    <Text style={styles.fs14}>{PRESETS[entry.shift_type].icon}</Text>
                  </View>
                  <View style={styles.flex1}>
                    <Text style={styles.av_upDate}>{ed} {MONTHS[em - 1]}</Text>
                    <Text style={styles.av_upShift}>{PRESETS[entry.shift_type].label} · {entry.start_time} – {entry.end_time}</Text>
                  </View>
                  <TouchableOpacity onPress={() => deleteAvailability(ds)} style={styles.p4}>
                    <Ionicons name="trash-outline" size={scale(16)} color={C.danger} />
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default AvailabilitySection;

// ── Unified Styles ────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(20),
    paddingVertical: scale(14),
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    backgroundColor: C.white,
    marginBottom: scale(10),
  },
  backBtn: { padding: scale(4), marginLeft: scale(-4) },
  headerTitle: { fontSize: scale(16), fontWeight: '800', color: C.text },

  flex1: { flex: 1 },
  p4: { padding: scale(4) },
  ml6: { marginLeft: scale(6) },
  fs14: { fontSize: scale(14) },

  preset_am_bg: { backgroundColor: '#fef3c7' },
  preset_am_border: { borderColor: '#f59e0b' },
  preset_am_text: { color: '#f59e0b' },

  preset_pm_bg: { backgroundColor: '#e0f5f8' },
  preset_pm_border: { borderColor: '#007b8e' },
  preset_pm_text: { color: '#007b8e' },

  preset_unavailable_bg: { backgroundColor: '#f0eeff' },
  preset_unavailable_border: { borderColor: '#6c5ce7' },
  preset_unavailable_text: { color: '#6c5ce7' },

  preset_full_bg: { backgroundColor: '#d1fae5' },
  preset_full_border: { borderColor: '#10b981' },
  preset_full_text: { color: '#10b981' },

  av_wrap: { paddingHorizontal: scale(20), paddingBottom: scale(40), gap: scale(12) },
  av_card: { backgroundColor: C.white, borderRadius: scale(20), padding: scale(14), borderWidth: 1, borderColor: C.border, shadowColor: C.cardShadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 12, elevation: 2 },
  
  av_topHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: scale(16) },
  av_monthNav: { flexDirection: 'row', alignItems: 'center', gap: scale(8) },
  av_navBtn: { width: scale(28), height: scale(28), borderRadius: scale(8), backgroundColor: C.primaryLight, alignItems: 'center', justifyContent: 'center' },
  av_monthLabel: { fontSize: scale(13), fontWeight: '900', color: C.text, letterSpacing: -0.3 },
  
  // Radio Buttons
  radioGroup: { flexDirection: 'row', gap: scale(10) },
  radioBtn: { flexDirection: 'row', alignItems: 'center', gap: scale(4) },
  radioCircle: { width: scale(14), height: scale(14), borderRadius: scale(7), borderWidth: 1.5, borderColor: C.textMuted, alignItems: 'center', justifyContent: 'center' },
  radioCircleActive: { borderColor: C.primary, borderWidth: scale(4) },
  radioTxt: { fontSize: scale(11), fontWeight: '700', color: C.text },
  preset_flexible_bg: { backgroundColor: '#f3e8ff' },
  preset_flexible_border: { borderColor: '#a855f7' },
  preset_flexible_text: { color: '#a855f7' },
  av_dayRow: { flexDirection: 'row', marginBottom: scale(6) },
  av_dayHdr: { flex: 1, textAlign: 'center', fontSize: scale(10), fontWeight: '800', color: C.textMuted, textTransform: 'uppercase' },
  av_grid: { flexDirection: 'row', flexWrap: 'wrap' },
  av_cellWrap: { width: `${100 / 7}%`, aspectRatio: 1, padding: scale(3) },
  av_cell: { flex: 1, borderRadius: scale(8), alignItems: 'center', justifyContent: 'center' },
  av_cellConfigured: { borderWidth: 1, borderRadius: scale(8) },
  av_cellToday: { borderWidth: 2, borderColor: C.primary },
  av_cellPast: { opacity: 0.35 },
  av_cellTxt: { fontSize: scale(12), fontWeight: '800', color: C.text, lineHeight: scale(14) },
  av_cellTxtToday: { color: C.primary },
  av_cellTxtPast: { color: C.textMuted },
  av_cellDot: { fontSize: scale(8), lineHeight: scale(10), marginTop: scale(2) },
  av_legend: { flexDirection: 'row', flexWrap: 'wrap', gap: scale(10), marginTop: scale(12), paddingTop: scale(12), borderTopWidth: 1, borderTopColor: C.border },
  av_lgItem: { flexDirection: 'row', alignItems: 'center', gap: scale(4) },
  av_lgDot: { width: scale(8), height: scale(8), borderRadius: scale(4) },
  av_lgTxt: { fontSize: scale(10), color: C.textSub, fontWeight: '700' },
  av_upWrap: { gap: scale(10), marginTop: scale(4) },
  av_upTitle: { fontSize: scale(13), fontWeight: '900', color: C.text, letterSpacing: -0.3 },
  av_upCard: { flexDirection: 'row', alignItems: 'center', gap: scale(10), backgroundColor: C.white, borderRadius: scale(14), padding: scale(12), borderWidth: 1, borderColor: C.border, shadowColor: C.cardShadow, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 1, shadowRadius: 8, elevation: 1 },
  av_upIcon: { width: scale(36), height: scale(36), borderRadius: scale(10), alignItems: 'center', justifyContent: 'center' },
  av_upDate: { fontSize: scale(13), fontWeight: '900', color: C.text, marginBottom: scale(2) },
  av_upShift: { fontSize: scale(11), color: C.textSub, fontWeight: '600' },
});