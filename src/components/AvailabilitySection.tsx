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
  Alert,
  Modal,
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
  bg: '#F8FAFC',
  inputBg: '#F1F5F9',
  text: '#0F172A',
  textSub: '#475569',
  textMuted: '#94A3B8',
  border: '#E2E8F0',
  success: '#10b981',
  successLight: '#d1fae5',
  danger: '#ef4444',
  dangerLight: '#fee2e2',
  warning: '#f59e0b',
  warningLight: '#fef3c7',
  purple: '#8b5cf6',
  purpleLight: '#ede9fe',
  blue: '#3b82f6',
  blueLight: '#dbeafe',
  cardShadow: 'rgba(15, 23, 42, 0.06)',
};

// ── Types ──────────────────────────────────────────────────────────────────────
type ShiftType = 'am' | 'afternoon' | 'pm' | 'full' | 'flexible' | 'unavailable';

interface AvailabilityEntry {
  date: string;
  shift_type: ShiftType;
  start_time: string;
  end_time: string;
  slot_duration?: number;
}

interface ScheduledDuty {
  assignment_id: string;
  requirement_id: string;
  date: string;
  status: string;
  hospital_name: string;
  department: string;
  start_time: string;
  end_time: string;
}

interface Props {
  doctorId?: string;
  initialAvailability?: AvailabilityEntry[];
  navigation?: any;
  route?: any;
   apiBaseUrl?: string;
  authToken?: string;
}

// ── Shift Presets (M / A / E / Full Day / Flexible / Unavailable) ──────────────
const PRESETS: Record<
  ShiftType,
  {
    shortCode: string;
    label: string;
    icon: string;
    start: string;
    end: string;
    color: string;
    bg: string;
  }
> = {
  am: {
    shortCode: 'M',
    label: 'Morning',
    icon: 'sunny-outline',
    start: '08:00',
    end: '13:00',
    color: '#d97706',
    bg: '#fef3c7',
  },
  afternoon: {
    shortCode: 'A',
    label: 'Afternoon',
    icon: 'partly-sunny-outline',
    start: '13:00',
    end: '17:00',
    color: '#2563eb',
    bg: '#dbeafe',
  },
  pm: {
    shortCode: 'E',
    label: 'Evening',
    icon: 'moon-outline',
    start: '17:00',
    end: '21:00',
    color: '#007b8e',
    bg: '#e0f5f8',
  },
  full: {
    shortCode: 'FD',
    label: 'Full Day',
    icon: 'calendar-outline',
    start: '08:00',
    end: '20:00',
    color: '#059669',
    bg: '#d1fae5',
  },
  flexible: {
    shortCode: 'F',
    label: 'Flexible',
    icon: 'time-outline',
    start: '09:00',
    end: '18:00',
    color: '#7c3aed',
    bg: '#ede9fe',
  },
  unavailable: {
    shortCode: 'Off',
    label: 'Unavailable',
    icon: 'close-circle-outline',
    start: '00:00',
    end: '00:00',
    color: '#dc2626',
    bg: '#fee2e2',
  },
};

const TIME_SLOTS = [
  '06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00',
  '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00',
  '20:00', '21:00', '22:00', '23:00',
];

const WEEK_DAYS = [
  { label: 'M', val: 1 },
  { label: 'T', val: 2 },
  { label: 'W', val: 3 },
  { label: 'T', val: 4 },
  { label: 'F', val: 5 },
  { label: 'S', val: 6 },
  { label: 'S', val: 0 },
];

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function toISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function normDate(s: string) {
  return s ? s.substring(0, 10) : '';
}

function daysInMonth(y: number, m: number) {
  return new Date(y, m + 1, 0).getDate();
}

function firstDay(y: number, m: number) {
  return new Date(y, m, 1).getDay();
}

function formatFriendlyDate(dateStr: string) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dt.getDay()];
  return `${dayName}, ${d} ${MONTHS[m - 1]} ${y}`;
}

function format12Hr(time24: string) {
  if (!time24 || time24 === '00:00') return '';
  const [hStr, mStr] = time24.split(':');
  let h = parseInt(hStr, 10);
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${mStr || '00'} ${ampm}`;
}

function calculateDuration(start: string, end: string) {
  const [sh] = start.split(':').map(Number);
  const [eh] = end.split(':').map(Number);
  const diff = eh - sh;
  return diff > 0 ? diff : 8;
}

// Daily availability colors: green = available, red = not available
const AVAIL_GREEN = { color: '#059669', bg: '#d1fae5', border: '#6ee7b7' };
const AVAIL_RED = { color: '#dc2626', bg: '#fee2e2', border: '#fca5a5' };
const getAvailColor = (t: ShiftType) => (t === 'unavailable' ? AVAIL_RED : AVAIL_GREEN);

// ══════════════════════════════════════════════════════════════════════════════
// ── AvailabilitySection Component ─────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
const AvailabilitySection: React.FC<Props> = ({
  doctorId: propDoctorId,
  initialAvailability,
  navigation,
  apiBaseUrl,
  authToken
}) => {
  const { doctor } = useAuth();
  const doctorId = propDoctorId || doctor?._id;
  const today = new Date();
  const todayStr = toISO(today);

  // ── Calendar & Selection States ──
  const [viewY, setViewY] = useState(today.getFullYear());
  const [viewM, setViewM] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [showCalendar, setShowCalendar] = useState<boolean>(false); // calendar hidden until the doctor taps the calendar icon

  // ── Data States ──
  const [avail, setAvail] = useState<AvailabilityEntry[]>(initialAvailability || []);
  const [duties, setDuties] = useState<ScheduledDuty[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);

  // ── Bottom Sheet Modal States (For Daily Availability Configuration) ──
  const [sheetVisible, setSheetVisible] = useState<boolean>(false);
  const [modalShift, setModalShift] = useState<ShiftType>('full');
  const [customStart, setCustomStart] = useState<string>('09:00');
  const [customEnd, setCustomEnd] = useState<string>('17:00');
  const [showStartDrop, setShowStartDrop] = useState<boolean>(false);
  const [showEndDrop, setShowEndDrop] = useState<boolean>(false);

  // ── General Availability (Bulk) States ──
  const [showRoutineCard, setShowRoutineCard] = useState<boolean>(true);
  const [selectedWeekDays, setSelectedWeekDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [bulkShift, setBulkShift] = useState<ShiftType>('full');
  const [repeatValue, setRepeatValue] = useState<number>(1);
  const [repeatUnit, setRepeatUnit] = useState<'Weeks' | 'Months'>('Months');
  const [showValDropdown, setShowValDropdown] = useState<boolean>(false);
  const [showUnitDropdown, setShowUnitDropdown] = useState<boolean>(false);

  const hasFetched = useRef(false);

  // 1. Fetch Availability + Hospital Duties
  useEffect(() => {
    const fetchCalendarData = async () => {
      if (!doctorId || hasFetched.current) return;
      setLoading(true);
      try {
        const res = await instance.get(`/api/doctors/${doctorId}/availability`);
        if (res.data?.availability) {
          setAvail(res.data.availability);
        }
        if (res.data?.scheduled_duties) {
          setDuties(res.data.scheduled_duties);
        }
      } catch (error) {
        console.log('Error fetching availability:', error);
      } finally {
        setLoading(false);
        hasFetched.current = true;
      }
    };
    fetchCalendarData();
  }, [doctorId]);

  const getEntry = (dateStr: string) => avail.find(a => normDate(a.date) === dateStr);
  const getDutiesForDate = (dateStr: string) => duties.filter(d => normDate(d.date) === dateStr);

  const prevM = () => (viewM === 0 ? (setViewM(11), setViewY(y => y - 1)) : setViewM(m => m - 1));
  const nextM = () => (viewM === 11 ? (setViewM(0), setViewY(y => y + 1)) : setViewM(m => m + 1));

  // 2. When User Taps a Date on Calendar
  const handleDatePress = (dateStr: string) => {
    setSelectedDate(dateStr);
    const existing = getEntry(dateStr);
    if (existing) {
      const mappedType = PRESETS[existing.shift_type] ? existing.shift_type : 'flexible';
      setModalShift(mappedType);
      setCustomStart(existing.start_time || PRESETS[mappedType].start);
      setCustomEnd(existing.end_time || PRESETS[mappedType].end);
    } else {
      setModalShift('am');
      setCustomStart(PRESETS.am.start);
      setCustomEnd(PRESETS.am.end);
    }
  };

  // Open Configuration Modal for Selected Date
  const openConfigSheet = (dateStr: string = selectedDate) => {
    if (dateStr < todayStr) {
      Alert.alert('Past Date', 'You cannot modify availability for past dates.');
      return;
    }
    handleDatePress(dateStr);
    setShowStartDrop(false);
    setShowEndDrop(false);
    setSheetVisible(true);
  };

  // Handle Preset Selection inside Modal
  const handleSelectModalPreset = (type: ShiftType) => {
    setModalShift(type);
    if (type !== 'flexible') {
      setCustomStart(PRESETS[type].start);
      setCustomEnd(PRESETS[type].end);
    }
  };

  // 3. Save Single Date from Modal
  const saveModalAvailability = async () => {
    if (modalShift === 'flexible' && customStart >= customEnd) {
      Alert.alert('Invalid Time', 'End time must be after start time.');
      return;
    }

    setSaving(true);
    const startTime = modalShift === 'unavailable' ? '00:00' : customStart;
    const endTime = modalShift === 'unavailable' ? '00:00' : customEnd;
    const duration = modalShift === 'unavailable' ? 0 : calculateDuration(startTime, endTime);

    const newEntry: AvailabilityEntry = {
      date: selectedDate,
      shift_type: modalShift,
      start_time: startTime,
      end_time: endTime,
      slot_duration: duration,
    };

    try {
      if (doctorId) {
        await instance.patch(`/api/doctors/${doctorId}/availability`, {
          availability: [newEntry],
        });
      }
      setAvail(prev => [...prev.filter(a => normDate(a.date) !== selectedDate), newEntry]);
      setSheetVisible(false);
    } catch (error: any) {
      Alert.alert('Error', error?.response?.data?.message || 'Failed to update availability.');
    } finally {
      setSaving(false);
    }
  };

  // 4. Delete Availability for a Date
  const deleteAvailability = async (dateStr: string) => {
    setSaving(true);
    try {
      if (doctorId) {
        await instance.delete(`/api/doctors/${doctorId}/availability/${dateStr}`);
      }
      setAvail(prev => prev.filter(a => normDate(a.date) !== dateStr));
      setSheetVisible(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to remove availability.');
    } finally {
      setSaving(false);
    }
  };

  // 5. Apply General Availability (Bulk)
  const toggleWeekDay = (val: number) => {
    setSelectedWeekDays(prev =>
      prev.includes(val) ? prev.filter(d => d !== val) : [...prev, val]
    );
  };

  const applyBulkRoutine = async () => {
    if (selectedWeekDays.length === 0) {
      Alert.alert('Notice', 'Please select at least one day of the week.');
      return;
    }

    setShowValDropdown(false);
    setShowUnitDropdown(false);

    const totalDays = repeatUnit === 'Weeks' ? repeatValue * 7 : repeatValue * 30;
    const updates: AvailabilityEntry[] = [];
    const now = new Date();

    for (let i = 0; i < totalDays; i++) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
      if (selectedWeekDays.includes(d.getDay())) {
        const ds = toISO(d);
        const preset = PRESETS[bulkShift];
        updates.push({
          date: ds,
          shift_type: bulkShift,
          start_time: preset.start,
          end_time: preset.end,
          slot_duration: calculateDuration(preset.start, preset.end),
        });
      }
    }

    setSaving(true);
    try {
      if (doctorId) {
        await instance.patch(`/api/doctors/${doctorId}/availability`, {
          availability: updates,
        });
      }
      setAvail(prev => {
        const updateMap = new Map(updates.map(u => [u.date, u]));
        const filtered = prev.filter(a => !updateMap.has(normDate(a.date)));
        return [...filtered, ...updates];
      });
      setShowRoutineCard(false);
      Alert.alert(
        'General Availability Saved',
        `Applied ${PRESETS[bulkShift].label} shift for the next ${repeatValue} ${repeatUnit.toLowerCase()}.`
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to apply general availability.');
    } finally {
      setSaving(false);
    }
  };

  // ── Calendar Grid Generation ──
  const dim = daysInMonth(viewY, viewM);
  const fd = firstDay(viewY, viewM);
  const cells: (number | null)[] = [
    ...Array(fd).fill(null),
    ...Array.from({ length: dim }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const selectedEntry = getEntry(selectedDate);
  const selectedDuties = getDutiesForDate(selectedDate);
  const isSelectedPast = selectedDate < todayStr;

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={C.white} />

     <View style={styles.header}>
             <TouchableOpacity onPress={() => navigation?.goBack()} style={styles.backBtn}><Ionicons name="chevron-back" size={scale(24)} /></TouchableOpacity>
             <Text style={styles.headerTitle}>Manage Availability</Text>
             <TouchableOpacity onPress={() => setShowCalendar(v => !v)} style={styles.backBtn} accessibilityLabel="Toggle calendar">
               <Ionicons name={showCalendar ? 'calendar' : 'calendar-outline'} size={scale(24)} color={C.primary} />
             </TouchableOpacity>
           </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* ── 1. GENERAL AVAILABILITY CARD ── */}
        <View style={[styles.card, { zIndex: 20 }]}>
          <TouchableOpacity
            style={styles.routineBanner}
            onPress={() => setShowRoutineCard(!showRoutineCard)}
            activeOpacity={0.8}
          >
            <View style={styles.routineBannerLeft}>
              <View style={styles.routineIconBox}>
                <Ionicons name="repeat-outline" size={scale(18)} color={C.primary} />
              </View>
              <Text style={styles.sectionTitle}>General Availability</Text>
            </View>
            <Ionicons
              name={showRoutineCard ? 'chevron-up' : 'chevron-down'}
              size={scale(18)}
              color={C.textSub}
            />
          </TouchableOpacity>

          {showRoutineCard && (
            <View style={styles.routineBody}>
              <Text style={styles.fieldLabel}>Select Days</Text>
              <View style={styles.daysRow}>
                {WEEK_DAYS.map((d, i) => {
                  const active = selectedWeekDays.includes(d.val);
                  return (
                    <TouchableOpacity
                      key={i}
                      style={[styles.dayCircle, active && styles.dayCircleActive]}
                      onPress={() => toggleWeekDay(d.val)}
                    >
                      <Text style={[styles.dayText, active && styles.dayTextActive]}>{d.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Default Shift: Morning, Evening, Flexible */}
              <Text style={styles.fieldLabel}>Default Shift</Text>
              <View style={styles.QuickChipRow}>
                {(['am', 'pm', 'flexible'] as ShiftType[]).map(t => {
                  const p = PRESETS[t];
                  const active = bulkShift === t;
                  return (
                    <TouchableOpacity
                      key={t}
                      style={[styles.quickChip, active && { backgroundColor: p.bg, borderColor: p.color }]}
                      onPress={() => setBulkShift(t)}
                    >
                      <Text style={[styles.quickChipTxt, active && { color: p.color }]}>
                        {p.shortCode} • {p.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* 2 DROPDOWNS FOR REPEAT DURATION */}
              <Text style={styles.fieldLabel}>Repeat for the next:</Text>
              <View style={styles.dropdownsRow}>
                {/* Value Dropdown (1 to 5) */}
                <View style={styles.dropdownCol}>
                  <TouchableOpacity
                    style={styles.dropdownBtn}
                    onPress={() => {
                      setShowValDropdown(!showValDropdown);
                      setShowUnitDropdown(false);
                    }}
                  >
                    <Text style={styles.dropdownBtnTxt}>{repeatValue}</Text>
                    <Ionicons name="chevron-down" size={scale(16)} color={C.textMuted} />
                  </TouchableOpacity>
                  {showValDropdown && (
                    <View style={styles.dropdownList}>
                      {[1, 2, 3, 4, 5].map(v => (
                        <TouchableOpacity
                          key={v}
                          style={styles.dropdownItem}
                          onPress={() => {
                            setRepeatValue(v);
                            setShowValDropdown(false);
                          }}
                        >
                          <Text style={styles.dropdownItemTxt}>{v}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>

                {/* Unit Dropdown (Weeks / Months) */}
                <View style={styles.dropdownCol}>
                  <TouchableOpacity
                    style={styles.dropdownBtn}
                    onPress={() => {
                      setShowUnitDropdown(!showUnitDropdown);
                      setShowValDropdown(false);
                    }}
                  >
                    <Text style={styles.dropdownBtnTxt}>{repeatUnit}</Text>
                    <Ionicons name="chevron-down" size={scale(16)} color={C.textMuted} />
                  </TouchableOpacity>
                  {showUnitDropdown && (
                    <View style={styles.dropdownList}>
                      {['Weeks', 'Months'].map(u => (
                        <TouchableOpacity
                          key={u}
                          style={styles.dropdownItem}
                          onPress={() => {
                            setRepeatUnit(u as 'Weeks' | 'Months');
                            setShowUnitDropdown(false);
                          }}
                        >
                          <Text style={styles.dropdownItemTxt}>{u}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              </View>

              <TouchableOpacity
                style={[styles.applyRoutineBtn, { marginTop: scale(16) }]}
                onPress={applyBulkRoutine}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color={C.white} size="small" />
                ) : (
                  <Text style={styles.applyRoutineBtnTxt}>Apply General Availability</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* ── 2. DAILY AVAILABILITY CALENDAR CARD (shown only when calendar icon is tapped) ── */}
        {showCalendar && (
        <View style={[styles.card, { zIndex: 1 }]}>
          <View style={styles.dailyCardHeader}>
            <Text style={styles.sectionTitle}>Daily Availability</Text>

            {/* Month Navigation */}
            <View style={styles.monthNavRow}>
              <TouchableOpacity onPress={prevM} style={styles.navIconBtn}>
                <Ionicons name="chevron-back" size={scale(15)} color={C.text} />
              </TouchableOpacity>
              <Text style={styles.monthTitle}>
                {MONTHS[viewM].slice(0, 3)} {viewY}
              </Text>
              <TouchableOpacity onPress={nextM} style={styles.navIconBtn}>
                <Ionicons name="chevron-forward" size={scale(15)} color={C.text} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Weekday Headers */}
          <View style={styles.weekHeaderRow}>
            {DAYS.map(d => (
              <Text key={d} style={styles.weekHeaderTxt}>{d}</Text>
            ))}
          </View>

          {/* Calendar Grid */}
          {loading ? (
            <View style={styles.loaderBox}>
              <ActivityIndicator size="large" color={C.primary} />
            </View>
          ) : (
            <View style={styles.grid}>
              {cells.map((day, idx) => {
                if (!day) return <View key={`empty-${idx}`} style={styles.cellWrap} />;

                const ds = toISO(new Date(viewY, viewM, day));
                const isSelected = ds === selectedDate;
                const isToday = ds === todayStr;
                const isPast = ds < todayStr;
                const entry = getEntry(ds);
                const dayDuties = getDutiesForDate(ds);
                const preset = entry ? PRESETS[entry.shift_type] || PRESETS.flexible : null;
                const tone = entry ? getAvailColor(entry.shift_type) : null;

                return (
                  <TouchableOpacity
                    key={ds}
                    style={styles.cellWrap}
                    activeOpacity={0.7}
                    onPress={() => handleDatePress(ds)}
                  >
                    <View
                      style={[
                        styles.cell,
                        isToday && !isSelected && styles.cellToday,
                        tone && { borderWidth: 1.5, borderColor: tone.border },
                        isSelected && styles.cellSelected,
                        isPast && styles.cellPast,
                      ]}
                    >
                      <Text
                        style={[
                          styles.cellDayTxt,
                          tone && { color: tone.color },
                          isSelected && styles.cellDayTxtSelected,
                        ]}
                      >
                        {day}
                      </Text>

                      {/* Badges Row: Shift Shortcode (M/A/E/FD/F) + Duty Dot */}
                      <View style={styles.cellBadgeRow}>
                        {preset && tone && (
                          <Text
                            style={[
                              styles.cellShiftCode,
                              { color: isSelected ? C.white : tone.color },
                            ]}
                          >
                            {preset.shortCode}
                          </Text>
                        )}
                        {dayDuties.length > 0 && (
                          <View
                            style={[
                              styles.dutyDot,
                              isSelected && { backgroundColor: C.white },
                            ]}
                          />
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Legend */}
          <View style={styles.legendWrap}>
            {(['am', 'pm', 'flexible', 'unavailable'] as ShiftType[]).map(t => {
              const p = PRESETS[t];
              const tone = getAvailColor(t);
              return (
                <View key={t} style={styles.legendItem}>
                  <View style={[styles.legendBadge, { backgroundColor: tone.bg }]}>
                    <Text style={[styles.legendBadgeTxt, { color: tone.color }]}>{p.shortCode}</Text>
                  </View>
                  <Text style={styles.legendLabel}>{p.label}</Text>
                </View>
              );
            })}
            <View style={styles.legendItem}>
              <View style={styles.dutyDot} />
              <Text style={styles.legendLabel}>Assigned Duty</Text>
            </View>
          </View>
        </View>
        )}

        {/* ── 3. DAILY SCHEDULE & ACTIVITY PANEL ── */}
        <View style={styles.agendaCard}>
          <View style={styles.agendaHeader}>
            <Text style={styles.agendaDateTitle}>{formatFriendlyDate(selectedDate)}</Text>
            {!isSelectedPast && (
              <TouchableOpacity
                style={styles.setAvailBtn}
                onPress={() => openConfigSheet(selectedDate)}
              >
                <Ionicons
                  name={selectedEntry ? 'create-outline' : 'add-circle-outline'}
                  size={scale(16)}
                  color={C.white}
                />
                <Text style={styles.setAvailBtnTxt}>
                  {selectedEntry ? 'Edit Slot' : 'Set Shift'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Assigned Hospital Duties */}
          {selectedDuties.length > 0 && (
            <View style={styles.eventsSection}>
              <Text style={styles.agendaSectionHeader}>HOSPITAL DUTIES</Text>
              {selectedDuties.map((duty, i) => (
                <View key={i} style={styles.dutyEventCard}>
                  <View style={styles.dutyEventStripe} />
                  <View style={styles.dutyEventBody}>
                    <View style={styles.dutyEventTop}>
                      <Text style={styles.dutyHospName}>{duty.hospital_name}</Text>
                      <View style={styles.dutyStatusBadge}>
                        <Text style={styles.dutyStatusTxt}>{duty.status}</Text>
                      </View>
                    </View>
                    <Text style={styles.dutyDeptTxt}>{duty.department}</Text>
                    <View style={styles.dutyTimeRow}>
                      <Ionicons name="time-outline" size={scale(13)} color={C.primary} />
                      <Text style={styles.dutyTimeTxt}>
                        {duty.start_time} – {duty.end_time}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Configured Daily Availability Slot */}
          <View style={styles.eventsSection}>
            <Text style={styles.agendaSectionHeader}>DAILY AVAILABILITY</Text>
            {selectedEntry ? (
              (() => {
                const p = PRESETS[selectedEntry.shift_type] || PRESETS.flexible;
                const tone = getAvailColor(selectedEntry.shift_type);
                return (
                  <View style={[styles.availEventCard, { backgroundColor: tone.bg, borderColor: tone.color }]}>
                    <View style={styles.availEventLeft}>
                      <View style={[styles.availCodeCircle, { backgroundColor: tone.color }]}>
                        <Text style={styles.availCodeCircleTxt}>{p.shortCode}</Text>
                      </View>
                      <View>
                        <Text style={[styles.availEventTitle, { color: tone.color }]}>
                          {p.label} Shift
                        </Text>
                        <Text style={styles.availEventTime}>
                          {selectedEntry.shift_type === 'unavailable'
                            ? 'Marked Unavailable All Day'
                            : `${format12Hr(selectedEntry.start_time)} – ${format12Hr(selectedEntry.end_time)} (${selectedEntry.slot_duration || calculateDuration(selectedEntry.start_time, selectedEntry.end_time)} hrs)`}
                        </Text>
                      </View>
                    </View>

                    {!isSelectedPast && (
                      <View style={styles.availActions}>
                        <TouchableOpacity
                          style={styles.iconActionBtn}
                          onPress={() => openConfigSheet(selectedDate)}
                        >
                          <Ionicons name="options-outline" size={scale(18)} color={C.text} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.iconActionBtn}
                          onPress={() => deleteAvailability(selectedDate)}
                        >
                          <Ionicons name="trash-outline" size={scale(18)} color={C.danger} />
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                );
              })()
            ) : (
              <TouchableOpacity
                style={styles.emptySlotBox}
                disabled={isSelectedPast}
                onPress={() => openConfigSheet(selectedDate)}
              >
                <Ionicons name="calendar-clear-outline" size={scale(20)} color={C.textMuted} />
                <Text style={[styles.emptySlotTitle, { flex: 1 }]}>No Daily Availability Set</Text>
                {!isSelectedPast && (
                  <Ionicons name="chevron-forward" size={scale(18)} color={C.primary} />
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ScrollView>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* ── BOTTOM SHEET MODAL: SET DAILY AVAILABILITY TIMINGS ─────────────── */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <Modal
        visible={sheetVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setSheetVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Set Daily Availability</Text>
                <Text style={styles.modalSub}>{formatFriendlyDate(selectedDate)}</Text>
              </View>
              <TouchableOpacity onPress={() => setSheetVisible(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={scale(20)} color={C.textSub} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Shift Type: 4 options in one row */}
              <Text style={styles.modalSectionLbl}>Shift Type</Text>
              <View style={styles.shiftRow}>
                {(['am', 'pm', 'flexible', 'unavailable'] as ShiftType[]).map(type => {
                  const p = PRESETS[type];
                  const tone = getAvailColor(type);
                  const active = modalShift === type;
                  return (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.shiftChip,
                        active && { backgroundColor: tone.bg, borderColor: tone.color },
                      ]}
                      onPress={() => handleSelectModalPreset(type)}
                    >
                      <Ionicons name={p.icon as any} size={scale(20)} color={active ? tone.color : C.textSub} />
                      <Text
                        numberOfLines={1}
                        style={[styles.shiftChipTxt, active && { color: tone.color }]}
                      >
                        {p.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Time Window (hidden when 'Unavailable') */}
              {modalShift !== 'unavailable' && (
                <>
                  <Text style={styles.modalSectionLbl}>Time Window</Text>
                  <View style={styles.timeRow}>
                    <View style={styles.timeCol}>
                      <Text style={styles.timeSubLbl}>Start Time</Text>
                      <TouchableOpacity
                        style={styles.timeBox}
                        onPress={() => {
                          setShowStartDrop(!showStartDrop);
                          setShowEndDrop(false);
                        }}
                      >
                        <Ionicons name="time-outline" size={scale(16)} color={C.primary} />
                        <Text style={styles.timeBoxTxt}>{customStart}</Text>
                        <Ionicons name="chevron-down" size={scale(16)} color={C.textMuted} />
                      </TouchableOpacity>
                      {showStartDrop && (
                        <ScrollView nestedScrollEnabled style={styles.timeList}>
                          {TIME_SLOTS.map(t => (
                            <TouchableOpacity
                              key={`start-${t}`}
                              style={[styles.timeListItem, customStart === t && styles.timeListItemActive]}
                              onPress={() => {
                                setCustomStart(t);
                                setModalShift('flexible');
                                setShowStartDrop(false);
                              }}
                            >
                              <Text style={styles.timeListTxt}>{t}</Text>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      )}
                    </View>

                    <Ionicons name="arrow-forward" size={scale(16)} color={C.textMuted} style={styles.timeArrow} />

                    <View style={styles.timeCol}>
                      <Text style={styles.timeSubLbl}>End Time</Text>
                      <TouchableOpacity
                        style={styles.timeBox}
                        onPress={() => {
                          setShowEndDrop(!showEndDrop);
                          setShowStartDrop(false);
                        }}
                      >
                        <Ionicons name="time-outline" size={scale(16)} color={C.primary} />
                        <Text style={styles.timeBoxTxt}>{customEnd}</Text>
                        <Ionicons name="chevron-down" size={scale(16)} color={C.textMuted} />
                      </TouchableOpacity>
                      {showEndDrop && (
                        <ScrollView nestedScrollEnabled style={styles.timeList}>
                          {TIME_SLOTS.map(t => (
                            <TouchableOpacity
                              key={`end-${t}`}
                              style={[styles.timeListItem, customEnd === t && styles.timeListItemActive]}
                              onPress={() => {
                                setCustomEnd(t);
                                setModalShift('flexible');
                                setShowEndDrop(false);
                              }}
                            >
                              <Text style={styles.timeListTxt}>{t}</Text>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      )}
                    </View>
                  </View>
                </>
              )}
            </ScrollView>

            {/* Modal Footer Buttons */}
            <View style={styles.modalFooter}>
              {selectedEntry && (
                <TouchableOpacity
                  style={styles.clearDateBtn}
                  onPress={() => deleteAvailability(selectedDate)}
                  disabled={saving}
                >
                  <Ionicons name="trash-outline" size={scale(18)} color={C.danger} />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.saveModalBtn}
                onPress={saveModalAvailability}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color={C.white} />
                ) : (
                  <Text style={styles.saveModalBtnTxt}>Save Daily Availability</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default AvailabilitySection;

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(16),
    paddingVertical: scale(12),
    backgroundColor: C.white,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  backBtn: { padding: scale(6) },
  headerTitle: { fontSize: scale(16), fontWeight: '800', color: C.text },
  todayChip: {
    backgroundColor: C.primaryLight,
    paddingHorizontal: scale(12),
    paddingVertical: scale(6),
    borderRadius: scale(20),
  },
  todayChipTxt: { fontSize: scale(12), fontWeight: '700', color: C.primary },

  scrollContent: { padding: scale(16), paddingBottom: scale(40), gap: scale(14) },

  card: {
    backgroundColor: C.white,
    borderRadius: scale(18),
    padding: scale(14),
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: C.cardShadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 2,
  },

  // General Availability Collapsible
  routineBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  routineBannerLeft: { flexDirection: 'row', alignItems: 'center', gap: scale(10) },
  routineIconBox: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(10),
    backgroundColor: C.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: { fontSize: scale(14), fontWeight: '800', color: C.text },
  routineBody: { marginTop: scale(14), paddingTop: scale(14), borderTopWidth: 1, borderTopColor: C.border },
  fieldLabel: { fontSize: scale(12), fontWeight: '700', color: C.text, marginBottom: scale(8), marginTop: scale(8) },
  daysRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: scale(8) },
  dayCircle: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(18),
    backgroundColor: C.inputBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCircleActive: { backgroundColor: C.primary },
  dayText: { fontSize: scale(12), fontWeight: '700', color: C.textSub },
  dayTextActive: { color: C.white },
  QuickChipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: scale(8), marginBottom: scale(8) },
  quickChip: {
    paddingHorizontal: scale(12),
    paddingVertical: scale(8),
    borderRadius: scale(10),
    backgroundColor: C.inputBg,
    borderWidth: 1,
    borderColor: C.border,
  },
  quickChipTxt: { fontSize: scale(12), fontWeight: '700', color: C.textSub },

  // 2 Dropdowns Styles
  dropdownsRow: { flexDirection: 'row', gap: scale(12), zIndex: 99 },
  dropdownCol: { flex: 1, position: 'relative' },
  dropdownBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: C.inputBg,
    paddingHorizontal: scale(14),
    paddingVertical: scale(12),
    borderRadius: scale(10),
    borderWidth: 1,
    borderColor: C.border,
  },
  dropdownBtnTxt: { fontSize: scale(13), fontWeight: '600', color: C.text },
  dropdownList: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: scale(10),
    marginTop: scale(4),
    shadowColor: C.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 100,
  },
  dropdownItem: {
    paddingVertical: scale(12),
    paddingHorizontal: scale(14),
    borderBottomWidth: 1,
    borderBottomColor: C.inputBg,
  },
  dropdownItemTxt: { fontSize: scale(13), color: C.text },

  applyRoutineBtn: {
    backgroundColor: C.primary,
    paddingVertical: scale(12),
    borderRadius: scale(12),
    alignItems: 'center',
  },
  applyRoutineBtnTxt: { color: C.white, fontSize: scale(13), fontWeight: '800' },

  // Daily Availability Calendar Styles
  dailyCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: scale(14),
  },
  monthTitle: { fontSize: scale(14), fontWeight: '900', color: C.text },
  monthNavRow: { flexDirection: 'row', alignItems: 'center', gap: scale(8) },
  navIconBtn: {
    width: scale(28),
    height: scale(28),
    borderRadius: scale(8),
    backgroundColor: C.inputBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekHeaderRow: { flexDirection: 'row', marginBottom: scale(6) },
  weekHeaderTxt: {
    flex: 1,
    textAlign: 'center',
    fontSize: scale(11),
    fontWeight: '700',
    color: C.textMuted,
  },
  loaderBox: { paddingVertical: scale(40), alignItems: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cellWrap: { width: `${100 / 7}%`, aspectRatio: 0.95, padding: scale(2.5) },
  cell: {
    flex: 1,
    borderRadius: scale(10),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.bg,
  },
  cellToday: { borderWidth: 1.5, borderColor: C.primary },
  cellSelected: {
    backgroundColor: C.primary,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 3,
  },
  cellPast: { opacity: 0.45 },
  cellDayTxt: { fontSize: scale(13), fontWeight: '800', color: C.text },
  cellDayTxtSelected: { color: C.white },
  cellBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(3),
    marginTop: scale(2),
    minHeight: scale(12),
  },
  cellShiftCode: { fontSize: scale(9), fontWeight: '900' },
  dutyDot: {
    width: scale(6),
    height: scale(6),
    borderRadius: scale(3),
    backgroundColor: C.primaryDeep,
  },

  legendWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scale(10),
    marginTop: scale(12),
    paddingTop: scale(12),
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: scale(4) },
  legendBadge: { paddingHorizontal: scale(5), paddingVertical: scale(1), borderRadius: scale(4) },
  legendBadgeTxt: { fontSize: scale(9), fontWeight: '900' },
  legendLabel: { fontSize: scale(10), fontWeight: '600', color: C.textSub },

  // Daily Activity / Agenda Card
  agendaCard: {
    backgroundColor: C.white,
    borderRadius: scale(18),
    padding: scale(16),
    borderWidth: 1,
    borderColor: C.border,
  },
  agendaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: scale(12),
  },
  agendaDateTitle: { fontSize: scale(15), fontWeight: '900', color: C.text },
  setAvailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
    backgroundColor: C.primary,
    paddingHorizontal: scale(12),
    paddingVertical: scale(8),
    borderRadius: scale(10),
  },
  setAvailBtnTxt: { color: C.white, fontSize: scale(12), fontWeight: '800' },

  eventsSection: { marginTop: scale(8), gap: scale(8) },
  agendaSectionHeader: {
    fontSize: scale(10),
    fontWeight: '800',
    color: C.textMuted,
    letterSpacing: 0.6,
  },
  dutyEventCard: {
    flexDirection: 'row',
    backgroundColor: '#F0F9FF',
    borderRadius: scale(12),
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  dutyEventStripe: { width: scale(5), backgroundColor: C.primary },
  dutyEventBody: { flex: 1, padding: scale(12) },
  dutyEventTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dutyHospName: { fontSize: scale(13), fontWeight: '800', color: C.text },
  dutyStatusBadge: {
    backgroundColor: C.primaryLight,
    paddingHorizontal: scale(8),
    paddingVertical: scale(2),
    borderRadius: scale(6),
  },
  dutyStatusTxt: { fontSize: scale(10), fontWeight: '800', color: C.primary },
  dutyDeptTxt: { fontSize: scale(12), color: C.textSub, marginTop: scale(2) },
  dutyTimeRow: { flexDirection: 'row', alignItems: 'center', gap: scale(4), marginTop: scale(6) },
  dutyTimeTxt: { fontSize: scale(11), fontWeight: '700', color: C.primary },

  availEventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: scale(12),
    borderRadius: scale(12),
    borderWidth: 1,
  },
  availEventLeft: { flexDirection: 'row', alignItems: 'center', gap: scale(10), flex: 1 },
  availCodeCircle: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(10),
    alignItems: 'center',
    justifyContent: 'center',
  },
  availCodeCircleTxt: { color: C.white, fontSize: scale(13), fontWeight: '900' },
  availEventTitle: { fontSize: scale(13), fontWeight: '800' },
  availEventTime: { fontSize: scale(11), color: C.textSub, fontWeight: '600', marginTop: scale(2) },
  availActions: { flexDirection: 'row', gap: scale(6) },
  iconActionBtn: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(8),
    backgroundColor: C.white,
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptySlotBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
    padding: scale(14),
    borderRadius: scale(12),
    backgroundColor: C.bg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: C.border,
  },
  emptySlotTitle: { fontSize: scale(13), fontWeight: '700', color: C.text },

  // Modal Bottom Sheet
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: C.white,
    borderTopLeftRadius: scale(24),
    borderTopRightRadius: scale(24),
    padding: scale(20),
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scale(16),
  },
  modalTitle: { fontSize: scale(17), fontWeight: '900', color: C.text },
  modalSub: { fontSize: scale(12), color: C.primary, fontWeight: '700', marginTop: scale(2) },
  closeBtn: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(16),
    backgroundColor: C.inputBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSectionLbl: {
    fontSize: scale(12),
    fontWeight: '800',
    color: C.textSub,
    marginBottom: scale(8),
    marginTop: scale(4),
  },
  maeGrid: { flexDirection: 'row', gap: scale(10), marginBottom: scale(14) },
  maeCard: {
    flex: 1,
    backgroundColor: C.bg,
    borderRadius: scale(14),
    padding: scale(12),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
  },
  maeBadge: {
    width: scale(34),
    height: scale(34),
    borderRadius: scale(17),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scale(6),
  },
  maeBadgeTxt: { fontSize: scale(14), fontWeight: '900' },
  maeTitle: { fontSize: scale(12), fontWeight: '800', color: C.text },
  maeTime: { fontSize: scale(10), color: C.textSub, marginTop: scale(2) },

  otherOptionsCol: { gap: scale(8), marginBottom: scale(14) },
  optionRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(12),
    padding: scale(12),
    borderRadius: scale(14),
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
  },
  optionIconBox: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(10),
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionTitle: { fontSize: scale(13), fontWeight: '800', color: C.text },

  timePickerBox: {
    backgroundColor: C.bg,
    padding: scale(14),
    borderRadius: scale(14),
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: scale(10),
  },
  timePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scale(6),
  },
  durationPill: {
    fontSize: scale(11),
    fontWeight: '800',
    color: C.primary,
    backgroundColor: C.primaryLight,
    paddingHorizontal: scale(8),
    paddingVertical: scale(3),
    borderRadius: scale(6),
  },
  timeSubLbl: { fontSize: scale(11), fontWeight: '700', color: C.text, marginBottom: scale(6) },
  timePillsRow: { gap: scale(8), paddingVertical: scale(2) },
  timePill: {
    paddingHorizontal: scale(12),
    paddingVertical: scale(8),
    borderRadius: scale(10),
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
  },
  timePillActive: { backgroundColor: C.primary, borderColor: C.primary },
  timePillTxt: { fontSize: scale(12), fontWeight: '700', color: C.textSub },
  timePillTxtActive: { color: C.white },

  shiftRow: { flexDirection: 'row', gap: scale(8), marginBottom: scale(14) },
  shiftChip: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(6),
    paddingVertical: scale(12),
    borderRadius: scale(14),
    backgroundColor: C.white,
    borderWidth: 1.5,
    borderColor: C.border,
  },
  shiftChipTxt: { fontSize: scale(10.5), fontWeight: '700', color: C.textSub },
  timeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: scale(8), marginBottom: scale(10) },
  timeCol: { flex: 1 },
  timeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
    backgroundColor: C.primaryLight,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: scale(12),
    paddingHorizontal: scale(12),
    paddingVertical: scale(12),
  },
  timeBoxTxt: { flex: 1, fontSize: scale(14), fontWeight: '800', color: C.primary },
  timeArrow: { marginTop: scale(36) },
  timeList: {
    maxHeight: scale(150),
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: scale(10),
    marginTop: scale(4),
  },
  timeListItem: {
    paddingVertical: scale(10),
    paddingHorizontal: scale(12),
    borderBottomWidth: 1,
    borderBottomColor: C.inputBg,
  },
  timeListItemActive: { backgroundColor: C.primaryLight },
  timeListTxt: { fontSize: scale(13), color: C.text },

  modalFooter: {
    flexDirection: 'row',
    gap: scale(10),
    marginTop: scale(12),
    paddingTop: scale(12),
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  clearDateBtn: {
    width: scale(48),
    height: scale(48),
    borderRadius: scale(12),
    backgroundColor: C.dangerLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveModalBtn: {
    flex: 1,
    height: scale(48),
    borderRadius: scale(12),
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveModalBtnTxt: { color: C.white, fontSize: scale(14), fontWeight: '800' },
});