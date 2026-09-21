import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Dimensions,
  Platform,
  Alert,
  PanResponder,
  TextInput,
  KeyboardAvoidingView,
  ScrollView,
  StatusBar,
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
type ShiftType = 'am' | 'pm' | 'unavailable' | 'full';

interface ShiftConfig {
  shift_type: ShiftType;
  start_time: string;
  end_time: string;
  slot_duration: number;
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
  pm: { label: 'Afternoon', icon: '☀️', start: '14:00', end: '20:00' },
  unavailable: { label: 'Unavailable', icon: '🚫', start: '00:00', end: '00:00' },
  full: { label: 'Full Day', icon: '📅', start: '08:00', end: '20:00' },
};

const SLOT_DURATIONS = [1, 2, 3, 4, 6, 8];

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
// ── CLOCK PICKER ──────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
const CS = scale(200);
const CR = CS / 2;
const NR = CR - scale(22);
const HR = CR - scale(26);

function degToXY(r: number, deg: number) {
  const rad = (deg - 90) * (Math.PI / 180);
  return { x: CR + r * Math.cos(rad), y: CR + r * Math.sin(rad) };
}

function touchToDeg(px: number, py: number, cx: number, cy: number) {
  const dx = px - cx, dy = py - cy;
  let d = Math.atan2(dx, -dy) * (180 / Math.PI);
  return d < 0 ? d + 360 : d;
}

type ClockMode = 'hour' | 'minute';

const ClockPicker: React.FC<{
  value: string;
  onChange: (v: string) => void;
}> = ({ value, onChange }) => {
  const initH = parseInt(value.split(':')[0], 10) || 0;
  const initM = parseInt(value.split(':')[1], 10) || 0;
  const initP: 'AM' | 'PM' = initH >= 12 ? 'PM' : 'AM';
  const initH12 = initH % 12 === 0 ? 12 : initH % 12;

  const modeR = useRef<ClockMode>('hour');
  const hourR = useRef(initH12);
  const minR = useRef(initM);
  const periodR = useRef<'AM' | 'PM'>(initP);

  const [mode, setMode] = useState<ClockMode>('hour');
  const [hour, setHour] = useState(initH12);
  const [minute, setMinute] = useState(initM);
  const [period, setPeriod] = useState<'AM' | 'PM'>(initP);
  const [hrTxt, setHrTxt] = useState(String(initH12));
  const [minTxt, setMinTxt] = useState(String(initM).padStart(2, '0'));

  const faceRef = useRef<View>(null);
  const centerR = useRef<{ cx: number; cy: number } | null>(null);

  const emit = (h12: number, m: number, p: 'AM' | 'PM') => {
    let h24 = h12 % 12;
    if (p === 'PM') h24 += 12;
    onChange(`${String(h24).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
  };

  const applyDeg = (deg: number) => {
    if (modeR.current === 'hour') {
      let h = Math.round(deg / 30) % 12;
      if (h === 0) h = 12;
      hourR.current = h;
      setHour(h);
      setHrTxt(String(h));
      emit(h, minR.current, periodR.current);
    } else {
      const m = Math.round(deg / 6) % 60;
      minR.current = m;
      setMinute(m);
      setMinTxt(String(m).padStart(2, '0'));
      emit(hourR.current, m, periodR.current);
    }
  };

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: e => {
        const c = centerR.current;
        if (!c) return;
        applyDeg(touchToDeg(e.nativeEvent.pageX, e.nativeEvent.pageY, c.cx, c.cy));
      },
      onPanResponderMove: e => {
        const c = centerR.current;
        if (!c) return;
        applyDeg(touchToDeg(e.nativeEvent.pageX, e.nativeEvent.pageY, c.cx, c.cy));
      },
      onPanResponderRelease: () => {
        if (modeR.current === 'hour') {
          modeR.current = 'minute';
          setMode('minute');
        }
      },
    }),
  ).current;

  const switchMode = (m: ClockMode) => {
    modeR.current = m;
    setMode(m);
  };

  const switchPeriod = (p: 'AM' | 'PM') => {
    periodR.current = p;
    setPeriod(p);
    emit(hourR.current, minR.current, p);
  };

  const onHrCommit = (txt: string) => {
    setHrTxt(txt);
    const n = parseInt(txt, 10);
    if (!isNaN(n) && n >= 1 && n <= 12) {
      hourR.current = n;
      setHour(n);
      emit(n, minR.current, periodR.current);
    }
  };

  const onMinCommit = (txt: string) => {
    setMinTxt(txt);
    const n = parseInt(txt, 10);
    if (!isNaN(n) && n >= 0 && n <= 59) {
      minR.current = n;
      setMinute(n);
      emit(hourR.current, n, periodR.current);
    }
  };

  const handDeg = mode === 'hour' ? (hour / 12) * 360 : (minute / 60) * 360;
  const tip = degToXY(HR, handDeg);

  const mx = (CR + tip.x) / 2;
  const my = (CR + tip.y) / 2;
  const ang = Math.atan2(tip.y - CR, tip.x - CR) * (180 / Math.PI);

  const nums =
    mode === 'hour'
      ? [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
      : [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
  const activeNum = mode === 'hour' ? hour : (Math.round(minute / 5) * 5) % 60;

  return (
    <View style={styles.clock_wrap}>
      <View style={styles.clock_row}>
        <TouchableOpacity style={[styles.clock_box, mode === 'hour' && styles.clock_boxOn]} onPress={() => switchMode('hour')} activeOpacity={0.8}>
          <TextInput style={[styles.clock_boxTxt, mode === 'hour' && styles.clock_boxTxtOn]} value={hrTxt} onChangeText={onHrCommit} onBlur={() => setHrTxt(String(hourR.current))} keyboardType="number-pad" maxLength={2} selectTextOnFocus />
          <Text style={[styles.clock_boxSub, mode === 'hour' && styles.clock_boxSubOn]}>HR</Text>
        </TouchableOpacity>
        <Text style={styles.clock_colon}>:</Text>
        <TouchableOpacity style={[styles.clock_box, mode === 'minute' && styles.clock_boxOn]} onPress={() => switchMode('minute')} activeOpacity={0.8}>
          <TextInput style={[styles.clock_boxTxt, mode === 'minute' && styles.clock_boxTxtOn]} value={minTxt} onChangeText={onMinCommit} onBlur={() => setMinTxt(String(minR.current).padStart(2, '0'))} keyboardType="number-pad" maxLength={2} selectTextOnFocus />
          <Text style={[styles.clock_boxSub, mode === 'minute' && styles.clock_boxSubOn]}>MIN</Text>
        </TouchableOpacity>
        <View style={styles.clock_period}>
          {(['AM', 'PM'] as const).map(p => (
            <TouchableOpacity key={p} style={[styles.clock_pBtn, period === p && styles.clock_pOn]} onPress={() => switchPeriod(p)}>
              <Text style={[styles.clock_pTxt, period === p && styles.clock_pTxtOn]}>{p}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View ref={faceRef} style={styles.clock_face} onLayout={() => { faceRef.current?.measureInWindow((x, y, w, h) => { centerR.current = { cx: x + w / 2, cy: y + h / 2 }; }); }} {...pan.panHandlers}>
        <View style={styles.clock_ring} />
        {nums.map(num => {
          const d = mode === 'hour' ? (num % 12) * 30 : (num / 60) * 360;
          const pos = degToXY(NR, d);
          const on = num === activeNum;
          return (
            <View key={num} style={[styles.clock_numWrap, on ? styles.bgPrimary : styles.bgTransparent, { left: pos.x - scale(11), top: pos.y - scale(11) }]}>
              <Text style={[styles.clock_numTxt, on ? styles.clock_numTxtOn : styles.clock_numTxtOff]}>{num}</Text>
            </View>
          );
        })}
        <View pointerEvents="none" style={[styles.clock_hand, { left: mx - HR / 2, top: my - scale(1.5), transform: [{ rotate: `${ang}deg` }] }]} />
        <View style={[styles.clock_tip, { left: tip.x - scale(7), top: tip.y - scale(7) }]} />
        <View style={styles.clock_dot} />
      </View>
      <Text style={styles.clock_hint}>{mode === 'hour' ? 'Tap to select hour, then minutes' : 'Tap to select minutes'}</Text>
    </View>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// ── Time Picker Modal ─────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
const TimePickerModal: React.FC<{ visible: boolean; label: string; value: string; onConfirm: (v: string) => void; onClose: () => void; }> = ({ visible, label, value, onConfirm, onClose }) => {
  const [draft, setDraft] = useState(value);
  useEffect(() => { if (visible) setDraft(value); }, [visible, value]);
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.tp_overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
        <View style={styles.tp_card}>
          <Text style={styles.tp_title}>{label}</Text>
          <ClockPicker value={draft} onChange={setDraft} />
          <View style={styles.tp_row}>
            <TouchableOpacity style={styles.tp_cancel} onPress={onClose}><Text style={styles.tp_cancelTxt}>Cancel</Text></TouchableOpacity>
            <TouchableOpacity style={styles.tp_confirm} onPress={() => { onConfirm(draft); onClose(); }}><Text style={styles.tp_confirmTxt}>Set Time</Text></TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// ── Shift Config Modal ────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
const ShiftModal: React.FC<{ visible: boolean; date: string; existing?: ShiftConfig; onSave: (cfg: ShiftConfig) => void; onDelete: () => void; onClose: () => void; saving: boolean; }> = ({ visible, date, existing, onSave, onDelete, onClose, saving }) => {
  const [type, setType] = useState<ShiftType>(existing?.shift_type ?? 'am');
  const [start, setStart] = useState(existing?.start_time ?? PRESETS.am.start);
  const [end, setEnd] = useState(existing?.end_time ?? PRESETS.am.end);
  const [slot, setSlot] = useState(existing?.slot_duration ?? 4);
  const [pickerFor, setPickerFor] = useState<'start' | 'end' | null>(null);

  useEffect(() => {
    if (visible) {
      const t = existing?.shift_type ?? 'am';
      setType(t);
      setStart(existing?.start_time ?? PRESETS[t].start);
      setEnd(existing?.end_time ?? PRESETS[t].end);
      setSlot(existing?.slot_duration ?? 4);
      setPickerFor(null);
    }
  }, [visible, existing]);

  const pickShift = (t: ShiftType) => {
    setType(t);
    setStart(PRESETS[t].start);
    setEnd(PRESETS[t].end);
  };

  const getPresetStyles = (t: ShiftType) => {
    switch (t) {
      case 'am': return { bg: styles.preset_am_bg, border: styles.preset_am_border, text: styles.preset_am_text };
      case 'pm': return { bg: styles.preset_pm_bg, border: styles.preset_pm_border, text: styles.preset_pm_text };
      case 'unavailable': return { bg: styles.preset_unavailable_bg, border: styles.preset_unavailable_border, text: styles.preset_unavailable_text };
      case 'full': return { bg: styles.preset_full_bg, border: styles.preset_full_border, text: styles.preset_full_text };
      default: return { bg: null, border: null, text: null };
    }
  };

  const [y, m, d] = date.split('-').map(Number);
  const dateLabel = `${d} ${MONTHS[m - 1]} ${y}`;

  return (
    <>
      <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
        <TouchableOpacity style={styles.sh_overlay} activeOpacity={1} onPress={onClose}>
          <TouchableOpacity activeOpacity={1} style={styles.sh_sheet}>
            <View style={styles.sh_handle} />
            <View style={styles.sh_header}>
              <View>
                <Text style={styles.sh_title}>Configure Shift</Text>
                <Text style={styles.sh_sub}>{dateLabel}</Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.sh_close}><Ionicons name="close" size={scale(16)} color={C.textSub} /></TouchableOpacity>
            </View>

            <Text style={styles.sh_lbl}>Shift Type</Text>
            <View style={styles.sh_chipRow}>
              {(Object.keys(PRESETS) as ShiftType[]).map(t => {
                const on = type === t;
                const pStyles = getPresetStyles(t);
                return (
                  <TouchableOpacity key={t} style={[styles.sh_chip, on ? styles.sh_chipOn : styles.sh_chipOff, on ? pStyles.bg : null, on ? pStyles.border : null]} onPress={() => pickShift(t)} activeOpacity={0.8}>
                    <Text style={styles.sh_chipIcon}>{PRESETS[t].icon}</Text>
                    <Text style={[styles.sh_chipLabel, on ? pStyles.text : styles.sh_chipLabelOff]}>{PRESETS[t].label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.sh_lbl}>Time Window</Text>
            <View style={styles.sh_timeRow}>
              <TouchableOpacity style={[styles.sh_timeBox, styles.flex1]} onPress={() => setPickerFor('start')} activeOpacity={0.8}>
                <Text style={styles.sh_timeLabel}>Start Time</Text>
                <View style={styles.sh_timePill}>
                  <Ionicons name="time-outline" size={scale(12)} color={C.primary} />
                  <Text style={styles.sh_timeVal}>{start}</Text>
                  <Ionicons name="chevron-down" size={scale(12)} color={C.textMuted} style={styles.mlAuto} />
                </View>
              </TouchableOpacity>
              <View style={styles.pb6}><Ionicons name="arrow-forward" size={scale(12)} color={C.textMuted} /></View>
              <TouchableOpacity style={[styles.sh_timeBox, styles.flex1]} onPress={() => setPickerFor('end')} activeOpacity={0.8}>
                <Text style={styles.sh_timeLabel}>End Time</Text>
                <View style={styles.sh_timePill}>
                  <Ionicons name="time-outline" size={scale(12)} color={C.primary} />
                  <Text style={styles.sh_timeVal}>{end}</Text>
                  <Ionicons name="chevron-down" size={scale(12)} color={C.textMuted} style={styles.mlAuto} />
                </View>
              </TouchableOpacity>
            </View>

            <Text style={styles.sh_lbl}>Slot Duration (hours)</Text>
            <View style={styles.sh_slotRow}>
              {SLOT_DURATIONS.map(n => (
                <TouchableOpacity key={n} style={[styles.sh_slotChip, slot === n ? styles.sh_slotChipOn : null]} onPress={() => setSlot(n)} activeOpacity={0.8}>
                  <Text style={[styles.sh_slotTxt, slot === n ? styles.sh_slotTxtOn : styles.sh_slotTxtOff]}>{n}h</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.sh_actions}>
              {existing && (
                <TouchableOpacity style={styles.sh_del} onPress={onDelete} activeOpacity={0.85}>
                  <Ionicons name="trash-outline" size={scale(12)} color={C.danger} />
                  <Text style={styles.sh_delTxt}>Remove</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={[styles.sh_save, saving ? styles.opacity70 : null, !existing ? styles.flex1 : null]} onPress={() => onSave({ shift_type: type, start_time: start, end_time: end, slot_duration: slot })} disabled={saving} activeOpacity={0.85}>
                {saving ? <ActivityIndicator size="small" color={C.white} /> : <><Ionicons name="checkmark" size={scale(13)} color={C.white} /><Text style={styles.sh_saveTxt}>{existing ? 'Update' : 'Save'}</Text></>}
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <TimePickerModal visible={pickerFor === 'start'} label="Set Start Time" value={start} onConfirm={setStart} onClose={() => setPickerFor(null)} />
      <TimePickerModal visible={pickerFor === 'end'} label="Set End Time" value={end} onConfirm={setEnd} onClose={() => setPickerFor(null)} />
    </>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// ── AvailabilitySection (Now works as a Screen) ───────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
const AvailabilitySection: React.FC<Props> = ({
 doctorId: propDoctorId,
  initialAvailability = [],
  navigation,
}) => {
  const { doctor } = useAuth();
  const doctorId = propDoctorId || doctor?._id;
  const today = new Date();
  const todayStr = toISO(today);

  const [viewY, setViewY] = useState(today.getFullYear());
  const [viewM, setViewM] = useState(today.getMonth());
  const [avail, setAvail] = useState<AvailabilityEntry[]>(initialAvailability);
  const [selDate, setSelDate] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initialAvailability.length > 0) setAvail(initialAvailability);
  }, [initialAvailability]);

  // 1. Fetch Availability - Silent fail if API is not ready
  useEffect(() => {
    const fetchAvail = async () => {
      if (doctorId && initialAvailability.length === 0) {
        try {
          const res = await instance.get(`/api/doctors/${doctorId}/availability`);
          if (res.data?.availability) {
            setAvail(res.data.availability);
          }
        } catch (error) {
          // Backend ready naslyamule error ignore karat ahot
          console.log("Backend API not ready yet, loading empty calendar.");
        }
      }
    };
    fetchAvail();
  }, [doctorId, initialAvailability]);

  const getEntry = (dateStr: string) => avail.find(a => normDate(a.date) === dateStr);

  const prevM = () => viewM === 0 ? (setViewM(11), setViewY(y => y - 1)) : setViewM(m => m - 1);
  const nextM = () => viewM === 11 ? (setViewM(0), setViewY(y => y + 1)) : setViewM(m => m + 1);

  const patchAvailability = async (entries: AvailabilityEntry[]) => {
    if (!doctorId) throw new Error('Doctor ID is missing');
    const payload = {
      availability: entries.map(a => ({
        date: normDate(a.date),
        shift_type: a.shift_type,
        start_time: a.start_time,
        end_time: a.end_time,
        slot_duration: Number(a.slot_duration),
      })),
    };
    const res = await instance.patch(`/api/doctors/${doctorId}/availability`, payload);
    return res.data;
  };

  // 2. Save Availability - Update UI directly without waiting for backend
  const handleSave = async (cfg: ShiftConfig) => {
    if (!selDate) return;
    setSaving(true);
    const newEntry: AvailabilityEntry = { date: selDate, ...cfg };
    const updated = [...avail.filter(a => normDate(a.date) !== selDate), newEntry];
    
    try {
      // Temporary API call handle, backend zalyavar uncomment kar
      // await patchAvailability(updated);
      
      setAvail(updated); // Update UI locally
      setSelDate(null);
    } catch (e: any) {
      console.log("Save API not ready, updated UI locally.");
      setAvail(updated); 
      setSelDate(null);
    } finally {
      setSaving(false);
    }
  };

  // 3. Delete Availability - Update UI directly without waiting for backend
  const handleDelete = async () => {
    if (!selDate) return;
    setSaving(true);
    const updated = avail.filter(a => normDate(a.date) !== selDate);
    
    try {
      // Temporary API call handle, backend zalyavar uncomment kar
      // await patchAvailability(updated);
      
      setAvail(updated); // Update UI locally
      setSelDate(null);
    } catch (e: any) {
      console.log("Delete API not ready, updated UI locally.");
      setAvail(updated); 
      setSelDate(null);
    } finally {
      setSaving(false);
    }
  };

  const getPresetStyles = (t: ShiftType) => {
    switch (t) {
      case 'am': return { bg: styles.preset_am_bg, border: styles.preset_am_border, text: styles.preset_am_text };
      case 'pm': return { bg: styles.preset_pm_bg, border: styles.preset_pm_border, text: styles.preset_pm_text };
      case 'unavailable': return { bg: styles.preset_unavailable_bg, border: styles.preset_unavailable_border, text: styles.preset_unavailable_text };
      case 'full': return { bg: styles.preset_full_bg, border: styles.preset_full_border, text: styles.preset_full_text };
      default: return { bg: null, border: null, text: null };
    }
  };

  const dim = daysInMonth(viewY, viewM);
  const fd = firstDay(viewY, viewM);
  const cells: (number | null)[] = [ ...Array(fd).fill(null), ...Array.from({ length: dim }, (_, i) => i + 1) ];
  while (cells.length % 7 !== 0) cells.push(null);

  const upcoming = [...avail].filter(a => normDate(a.date) >= todayStr).sort((a, b) => normDate(a.date).localeCompare(normDate(b.date)));

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
          <View style={styles.av_monthNav}>
            <TouchableOpacity onPress={prevM} style={styles.av_navBtn}>
              <Ionicons name="chevron-back" size={scale(14)} color={C.primary} />
            </TouchableOpacity>
            <Text style={styles.av_monthLabel}>{MONTHS[viewM]} {viewY}</Text>
            <TouchableOpacity onPress={nextM} style={styles.av_navBtn}>
              <Ionicons name="chevron-forward" size={scale(14)} color={C.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.av_dayRow}>
            {DAYS.map(d => <Text key={d} style={styles.av_dayHdr}>{d}</Text>)}
          </View>

          <View style={styles.av_grid}>
            {cells.map((day, idx) => {
              if (!day) return <View key={`e${idx}`} style={styles.av_cellWrap} />;
              const ds = toISO(new Date(viewY, viewM, day));
              const past = ds < todayStr;
              const today = ds === todayStr;
              const isSelected = selDate === ds; 
              const entry = getEntry(ds);
              const pStyles = entry ? getPresetStyles(entry.shift_type) : null;

              return (
                <TouchableOpacity
                  key={`d${day}`}
                  style={styles.av_cellWrap}
                  onPress={() => !past && setSelDate(ds)}
                  activeOpacity={past ? 1 : 0.75}
                >
                  <View
                    style={[
                      styles.av_cell,
                      today && styles.av_cellToday,
                      isSelected && styles.av_cellActive,
                      entry && styles.av_cellConfigured,
                      entry && pStyles?.bg,
                      entry && pStyles?.border,
                      past && styles.av_cellPast,
                    ]}
                  >
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
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.av_legend}>
            {(Object.keys(PRESETS) as ShiftType[]).map(t => (
              <View key={t} style={styles.av_lgItem}>
                <View style={[styles.av_lgDot, getPresetStyles(t).bg]} />
                <Text style={styles.av_lgTxt}>{PRESETS[t].label}</Text>
              </View>
            ))}
          </View>
        </View>

        {upcoming.length > 0 && (
          <View style={styles.av_upWrap}>
            <Text style={styles.av_upTitle}>Upcoming Availability</Text>
            {upcoming.map(entry => {
              const pStyles = getPresetStyles(entry.shift_type);
              const ds = normDate(entry.date);
              const [, em, ed] = ds.split('-').map(Number);
              return (
                <TouchableOpacity key={entry.date} style={styles.av_upCard} onPress={() => setSelDate(ds)} activeOpacity={0.8}>
                  <View style={[styles.av_upIcon, pStyles.bg]}>
                    <Text style={styles.fs14}>{PRESETS[entry.shift_type].icon}</Text>
                  </View>
                  <View style={styles.flex1}>
                    <Text style={styles.av_upDate}>{ed} {MONTHS[em - 1]}</Text>
                    <Text style={styles.av_upShift}>{PRESETS[entry.shift_type].label} · {entry.start_time} – {entry.end_time}</Text>
                  </View>
                  <View style={[styles.av_upBadge, pStyles.bg]}>
                    <Text style={[styles.av_upBadgeTxt, pStyles.text]}>{entry.slot_duration}h slots</Text>
                  </View>
                  <Ionicons name="pencil-outline" size={scale(12)} color={C.textMuted} style={styles.ml6} />
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {selDate && (
          <ShiftModal
            visible={!!selDate}
            date={selDate}
            existing={getEntry(selDate) as ShiftConfig | undefined}
            onSave={handleSave}
            onDelete={handleDelete}
            onClose={() => setSelDate(null)}
            saving={saving}
          />
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
  mlAuto: { marginLeft: 'auto' },
  opacity70: { opacity: 0.7 },
  pb6: { paddingBottom: scale(6) },
  ml6: { marginLeft: scale(6) },
  fs14: { fontSize: scale(14) },
  bgPrimary: { backgroundColor: C.primary },
  bgTransparent: { backgroundColor: 'transparent' },

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

  clock_wrap: { alignItems: 'center', gap: scale(10) },
  clock_row: { flexDirection: 'row', alignItems: 'center', gap: scale(6) },
  clock_box: { alignItems: 'center', paddingHorizontal: scale(12), paddingVertical: scale(6), borderRadius: scale(10), backgroundColor: C.primaryLight, borderWidth: 1.5, borderColor: C.border, minWidth: scale(52) },
  clock_boxOn: { backgroundColor: C.primary, borderColor: C.primary },
  clock_boxTxt: { fontSize: scale(22), fontWeight: '900', color: C.textSub, letterSpacing: 1, textAlign: 'center', width: scale(36), padding: 0 },
  clock_boxTxtOn: { color: C.white },
  clock_boxSub: { fontSize: scale(8), fontWeight: '800', color: C.textMuted, letterSpacing: 1, marginTop: scale(2) },
  clock_boxSubOn: { color: 'rgba(255,255,255,0.7)' },
  clock_colon: { fontSize: scale(24), fontWeight: '900', color: C.textMuted, marginBottom: scale(8) },
  clock_period: { borderRadius: scale(8), overflow: 'hidden', borderWidth: 1.5, borderColor: C.border, marginLeft: scale(4) },
  clock_pBtn: { paddingHorizontal: scale(8), paddingVertical: scale(6), backgroundColor: C.white },
  clock_pOn: { backgroundColor: C.primary },
  clock_pTxt: { fontSize: scale(10), fontWeight: '800', color: C.textSub },
  clock_pTxtOn: { color: C.white },
  clock_face: { width: CS, height: CS, position: 'relative' },
  clock_ring: { position: 'absolute', width: CS, height: CS, borderRadius: CR, backgroundColor: C.primaryLight, borderWidth: 1.5, borderColor: C.border },
  clock_numWrap: { position: 'absolute', width: scale(22), height: scale(22), borderRadius: scale(11), alignItems: 'center', justifyContent: 'center' },
  clock_numTxt: { fontSize: scale(10), fontWeight: '700' },
  clock_numTxtOn: { color: C.white },
  clock_numTxtOff: { color: C.textSub },
  clock_hand: { position: 'absolute', width: HR, height: scale(2), backgroundColor: C.primary, borderRadius: scale(1.5) },
  clock_tip: { position: 'absolute', width: scale(14), height: scale(14), borderRadius: scale(7), backgroundColor: C.primary },
  clock_dot: { position: 'absolute', width: scale(8), height: scale(8), borderRadius: scale(4), backgroundColor: C.primary, zIndex: 3, left: CR - scale(4), top: CR - scale(4) },
  clock_hint: { fontSize: scale(10), color: C.textMuted, fontWeight: '600' },

  tp_overlay: { flex: 1, backgroundColor: 'rgba(0,30,40,0.5)', justifyContent: 'center', alignItems: 'center', padding: scale(16) },
  tp_card: { backgroundColor: C.white, borderRadius: scale(20), padding: scale(16), width: '100%', alignItems: 'center', gap: scale(14), shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.15, shadowRadius: 16, elevation: 10 },
  tp_title: { fontSize: scale(14), fontWeight: '900', color: C.text, alignSelf: 'flex-start' },
  tp_row: { flexDirection: 'row', gap: scale(8), width: '100%' },
  tp_cancel: { flex: 1, paddingVertical: scale(10), borderRadius: scale(10), borderWidth: 1.5, borderColor: C.border, alignItems: 'center' },
  tp_cancelTxt: { fontSize: scale(12), fontWeight: '700', color: C.textSub },
  tp_confirm: { flex: 1, paddingVertical: scale(10), borderRadius: scale(10), backgroundColor: C.primary, alignItems: 'center', shadowColor: C.primary, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 6, elevation: 3 },
  tp_confirmTxt: { fontSize: scale(12), fontWeight: '800', color: C.white },

  sh_overlay: { flex: 1, backgroundColor: 'rgba(17, 24, 39, 0.4)', justifyContent: 'flex-end' },
  sh_sheet: { backgroundColor: C.white, borderTopLeftRadius: scale(24), borderTopRightRadius: scale(24), paddingHorizontal: scale(20), paddingBottom: Platform.OS === 'ios' ? scale(30) : scale(20), paddingTop: scale(8) },
  sh_handle: { width: scale(36), height: scale(4), borderRadius: scale(2), backgroundColor: C.border, alignSelf: 'center', marginBottom: scale(14) },
  sh_header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: scale(14) },
  sh_title: { fontSize: scale(15), fontWeight: '900', color: C.text, letterSpacing: -0.3 },
  sh_sub: { fontSize: scale(11), color: C.textMuted, marginTop: scale(2), fontWeight: '500' },
  sh_close: { width: scale(28), height: scale(28), borderRadius: scale(14), backgroundColor: C.inputBg, alignItems: 'center', justifyContent: 'center' },
  sh_lbl: { fontSize: scale(10), fontWeight: '800', color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: scale(6) },
  sh_chipRow: { flexDirection: 'row', gap: scale(6), marginBottom: scale(14) },
  sh_chip: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: scale(8), borderRadius: scale(10), borderWidth: 1.5, gap: scale(2) },
  sh_chipOn: { borderWidth: 1.5 },
  sh_chipOff: { borderColor: C.border, backgroundColor: C.white },
  sh_chipIcon: { fontSize: scale(12) },
  sh_chipLabel: { fontSize: scale(9), fontWeight: '700' },
  sh_chipLabelOff: { color: C.textSub },
  sh_timeRow: { flexDirection: 'row', alignItems: 'flex-end', gap: scale(6), marginBottom: scale(14) },
  sh_timeBox: { gap: scale(4) },
  sh_timeLabel: { fontSize: scale(10), fontWeight: '700', color: C.textSub },
  sh_timePill: { flexDirection: 'row', alignItems: 'center', gap: scale(4), backgroundColor: C.primaryLight, borderRadius: scale(8), paddingHorizontal: scale(8), paddingVertical: scale(8), borderWidth: 1, borderColor: C.border },
  sh_timeVal: { fontSize: scale(13), fontWeight: '800', color: C.primary },
  sh_slotRow: { flexDirection: 'row', gap: scale(6), marginBottom: scale(16), flexWrap: 'wrap' },
  sh_slotChip: { paddingHorizontal: scale(12), paddingVertical: scale(6), borderRadius: scale(8), borderWidth: 1.5, borderColor: C.border, backgroundColor: C.white, minWidth: scale(38), alignItems: 'center' },
  sh_slotChipOn: { backgroundColor: C.primaryLight, borderColor: C.primary },
  sh_slotTxt: { fontSize: scale(11), fontWeight: '700' },
  sh_slotTxtOn: { color: C.primary },
  sh_slotTxtOff: { color: C.textSub },
  sh_actions: { flexDirection: 'row', gap: scale(8) },
  sh_del: { flexDirection: 'row', alignItems: 'center', gap: scale(4), borderWidth: 1.5, borderColor: C.danger, borderRadius: scale(10), paddingHorizontal: scale(12), paddingVertical: scale(10) },
  sh_delTxt: { fontSize: scale(12), fontWeight: '700', color: C.danger },
  sh_save: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: scale(5), backgroundColor: C.primary, borderRadius: scale(10), paddingVertical: scale(10), shadowColor: C.primary, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 6, elevation: 3 },
  sh_saveTxt: { fontSize: scale(13), fontWeight: '800', color: C.white },

  av_wrap: { paddingHorizontal: scale(20), paddingBottom: scale(40), gap: scale(12) },
  av_card: { backgroundColor: C.white, borderRadius: scale(20), padding: scale(14), borderWidth: 1, borderColor: C.border, shadowColor: C.cardShadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 12, elevation: 2 },
  av_monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: scale(12) },
  av_navBtn: { width: scale(30), height: scale(30), borderRadius: scale(10), backgroundColor: C.primaryLight, alignItems: 'center', justifyContent: 'center' },
  av_monthLabel: { fontSize: scale(14), fontWeight: '900', color: C.text, letterSpacing: -0.3 },
  av_dayRow: { flexDirection: 'row', marginBottom: scale(6) },
  av_dayHdr: { flex: 1, textAlign: 'center', fontSize: scale(10), fontWeight: '800', color: C.textMuted, textTransform: 'uppercase' },
  av_grid: { flexDirection: 'row', flexWrap: 'wrap' },
  av_cellWrap: { width: `${100 / 7}%`, aspectRatio: 1, padding: scale(2) },
  av_cell: { flex: 1, borderRadius: scale(8), alignItems: 'center', justifyContent: 'center' },
  av_cellActive: { borderWidth: 1.5, borderColor: C.primary, backgroundColor: C.primaryLight, borderRadius: scale(8) },
  av_cellConfigured: { borderWidth: 1, borderRadius: scale(8) },
  av_cellToday: { borderWidth: 2, borderColor: C.primary },
  av_cellPast: { opacity: 0.35 },
  av_cellTxt: { fontSize: scale(11), fontWeight: '800', color: C.text, lineHeight: scale(13) },
  av_cellTxtToday: { color: C.primary },
  av_cellTxtPast: { color: C.textMuted },
  av_cellDot: { fontSize: scale(6), lineHeight: scale(8) },
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
  av_upBadge: { borderRadius: scale(6), paddingHorizontal: scale(8), paddingVertical: scale(4) },
  av_upBadgeTxt: { fontSize: scale(10), fontWeight: '800' },
});