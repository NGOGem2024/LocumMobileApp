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
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

const { width: SW } = Dimensions.get('window');
const scale = (n: number) => (SW / 390) * n;

const BASE_URL =
  'https://locumbackenduat-ewcbfyghbvb2h0ez.centralindia-01.azurewebsites.net';
// ── Palette ────────────────────────────────────────────────────────────────────
const C = {
  primary: '#007b8e',
  primaryDeep: '#003d4a',
  primaryLight: '#e0f5f8',
  white: '#ffffff',
  bg: '#f0fbfc',
  text: '#0d2b30',
  textSub: '#3d6b75',
  textMuted: '#7aa8b0',
  border: '#c2e6ed',
  success: '#00b894',
  successLight: '#e8faf6',
  danger: '#e74c3c',
  cardShadow: 'rgba(0,123,142,0.10)',
};

// ── Types ──────────────────────────────────────────────────────────────────────
type ShiftType = 'am' | 'pm' | 'unavailable' | 'full';

interface ShiftConfig {
  shift_type: ShiftType;
  start_time: string; // "HH:mm"
  end_time: string; // "HH:mm"
  slot_duration: number;
}
interface AvailabilityEntry extends ShiftConfig {
  date: string; // may be "YYYY-MM-DD" or "YYYY-MM-DDTHH:mm:ss.sssZ"
}
interface Props {
  doctorId: string;
  apiBaseUrl: string;
  authToken: string; // JWT / bearer token
  initialAvailability?: AvailabilityEntry[];
}

// ── Shift Presets ──────────────────────────────────────────────────────────────
const PRESETS: Record<
  ShiftType,
  {
    label: string;
    icon: string;
    start: string;
    end: string;
    color: string;
    bg: string;
  }
> = {
  am: {
    label: 'Morning',
    icon: '🌅',
    start: '08:00',
    end: '14:00',
    color: '#f39c12',
    bg: '#fef9ec',
  },
  pm: {
    label: 'Afternoon',
    icon: '☀️',
    start: '14:00',
    end: '20:00',
    color: '#007b8e',
    bg: '#e0f5f8',
  },
  unavailable: {
    // was: night
    label: 'Unavailable', // was: 'Night'
    icon: '🚫', // was: '🌙'
    start: '00:00',
    end: '00:00',
    color: '#6c5ce7',
    bg: '#f0eeff',
  },
  full: {
    label: 'Full Day',
    icon: '📅',
    start: '08:00',
    end: '20:00',
    color: '#00b894',
    bg: '#e8faf6',
  },
};
const SLOT_DURATIONS = [1, 2, 3, 4, 6, 8];

// ── Calendar helpers ───────────────────────────────────────────────────────────
const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/** Always returns YYYY-MM-DD */
function toISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
    2,
    '0',
  )}-${String(d.getDate()).padStart(2, '0')}`;
}
/** Normalize any date string to YYYY-MM-DD */
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
const CS = scale(220); // face diameter
const CR = CS / 2; // face radius
const NR = CR - scale(26); // number ring radius
const HR = CR - scale(30); // hand length

/**
 * Convert clock-degrees (0=12-o'clock, CW) to SVG-style x/y on the face.
 * Used for both number placement AND tip-dot position — so they always match.
 */
function degToXY(r: number, deg: number) {
  const rad = (deg - 90) * (Math.PI / 180);
  return { x: CR + r * Math.cos(rad), y: CR + r * Math.sin(rad) };
}

/**
 * Touch page coords + clock center → clock-degrees (0=12, CW).
 * atan2(dx, -dy) gives the correct clock bearing directly.
 */
function touchToDeg(px: number, py: number, cx: number, cy: number) {
  const dx = px - cx,
    dy = py - cy;
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

  // All values that PanResponder touches live in refs — never stale closures
  const modeR = useRef<ClockMode>('hour');
  const hourR = useRef(initH12); // 1-12
  const minR = useRef(initM); // 0-59
  const periodR = useRef<'AM' | 'PM'>(initP);

  // State mirrors for re-render only
  const [mode, setMode] = useState<ClockMode>('hour');
  const [hour, setHour] = useState(initH12);
  const [minute, setMinute] = useState(initM);
  const [period, setPeriod] = useState<'AM' | 'PM'>(initP);
  const [hrTxt, setHrTxt] = useState(String(initH12));
  const [minTxt, setMinTxt] = useState(String(initM).padStart(2, '0'));

  const faceRef = useRef<View>(null);
  const centerR = useRef<{ cx: number; cy: number } | null>(null);

  /** Build "HH:mm" in 24h and call onChange */
  const emit = (h12: number, m: number, p: 'AM' | 'PM') => {
    let h24 = h12 % 12; // 12 → 0
    if (p === 'PM') h24 += 12; // PM: add 12 (12 PM → 12, 1 PM → 13…)
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
        applyDeg(
          touchToDeg(e.nativeEvent.pageX, e.nativeEvent.pageY, c.cx, c.cy),
        );
      },
      onPanResponderMove: e => {
        const c = centerR.current;
        if (!c) return;
        applyDeg(
          touchToDeg(e.nativeEvent.pageX, e.nativeEvent.pageY, c.cx, c.cy),
        );
      },
      onPanResponderRelease: () => {
        // auto-advance to minute mode after picking hour
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

  // Visual hand angle
  const handDeg = mode === 'hour' ? (hour / 12) * 360 : (minute / 60) * 360;
  const tip = degToXY(HR, handDeg);

  // Hand: midpoint-based rotated rectangle — pivot is always its own centre (midpoint of segment)
  const mx = (CR + tip.x) / 2;
  const my = (CR + tip.y) / 2;
  const ang = Math.atan2(tip.y - CR, tip.x - CR) * (180 / Math.PI); // standard angle from horizontal

  const nums =
    mode === 'hour'
      ? [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
      : [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
  const activeNum = mode === 'hour' ? hour : (Math.round(minute / 5) * 5) % 60;

  return (
    <View style={ck.wrap}>
      {/* Digital row */}
      <View style={ck.row}>
        <TouchableOpacity
          style={[ck.box, mode === 'hour' && ck.boxOn]}
          onPress={() => switchMode('hour')}
          activeOpacity={0.8}
        >
          <TextInput
            style={[ck.boxTxt, mode === 'hour' && ck.boxTxtOn]}
            value={hrTxt}
            onChangeText={onHrCommit}
            onBlur={() => setHrTxt(String(hourR.current))}
            keyboardType="number-pad"
            maxLength={2}
            selectTextOnFocus
          />
          <Text
            style={[
              ck.boxSub,
              mode === 'hour' && { color: 'rgba(255,255,255,0.7)' },
            ]}
          >
            HR
          </Text>
        </TouchableOpacity>

        <Text style={ck.colon}>:</Text>

        <TouchableOpacity
          style={[ck.box, mode === 'minute' && ck.boxOn]}
          onPress={() => switchMode('minute')}
          activeOpacity={0.8}
        >
          <TextInput
            style={[ck.boxTxt, mode === 'minute' && ck.boxTxtOn]}
            value={minTxt}
            onChangeText={onMinCommit}
            onBlur={() => setMinTxt(String(minR.current).padStart(2, '0'))}
            keyboardType="number-pad"
            maxLength={2}
            selectTextOnFocus
          />
          <Text
            style={[
              ck.boxSub,
              mode === 'minute' && { color: 'rgba(255,255,255,0.7)' },
            ]}
          >
            MIN
          </Text>
        </TouchableOpacity>

        <View style={ck.period}>
          {(['AM', 'PM'] as const).map(p => (
            <TouchableOpacity
              key={p}
              style={[ck.pBtn, period === p && ck.pOn]}
              onPress={() => switchPeriod(p)}
            >
              <Text style={[ck.pTxt, period === p && ck.pTxtOn]}>{p}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Clock face */}
      <View
        ref={faceRef}
        style={ck.face}
        onLayout={() => {
          faceRef.current?.measureInWindow((x, y, w, h) => {
            centerR.current = { cx: x + w / 2, cy: y + h / 2 };
          });
        }}
        {...pan.panHandlers}
      >
        <View style={ck.ring} />

        {/* Numbers — each placed at its true clock position */}
        {nums.map(num => {
          const d = mode === 'hour' ? (num % 12) * 30 : (num / 60) * 360;
          const pos = degToXY(NR, d);
          const on = num === activeNum;
          return (
            <View
              key={num}
              style={[
                ck.numWrap,
                {
                  left: pos.x - scale(13),
                  top: pos.y - scale(13),
                  backgroundColor: on ? C.primary : 'transparent',
                },
              ]}
            >
              <Text style={[ck.numTxt, { color: on ? C.white : C.textSub }]}>
                {num}
              </Text>
            </View>
          );
        })}

        {/*
          Hand: rendered as a midpoint-centred rotated rectangle.
          RN rotates around the view's own centre.
          We place the rectangle so its centre = midpoint(clock-centre, tip).
          Length = HR, so it spans exactly from clock centre to tip.
        */}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            width: HR,
            height: scale(3),
            left: mx - HR / 2,
            top: my - scale(1.5),
            backgroundColor: C.primary,
            borderRadius: scale(2),
            transform: [{ rotate: `${ang}deg` }],
          }}
        />

        {/* Tip dot */}
        <View
          style={[ck.tip, { left: tip.x - scale(9), top: tip.y - scale(9) }]}
        />
        {/* Centre dot (on top of hand base) */}
        <View style={[ck.dot, { left: CR - scale(5), top: CR - scale(5) }]} />
      </View>

      <Text style={ck.hint}>
        {mode === 'hour'
          ? 'Tap to select hour, then minutes'
          : 'Tap to select minutes'}
      </Text>
    </View>
  );
};

const ck = StyleSheet.create({
  wrap: { alignItems: 'center', gap: scale(12) },
  row: { flexDirection: 'row', alignItems: 'center', gap: scale(6) },
  box: {
    alignItems: 'center',
    paddingHorizontal: scale(14),
    paddingVertical: scale(8),
    borderRadius: scale(12),
    backgroundColor: C.primaryLight,
    borderWidth: 1.5,
    borderColor: C.border,
    minWidth: scale(60),
  },
  boxOn: { backgroundColor: C.primary, borderColor: C.primary },
  boxTxt: {
    fontSize: scale(26),
    fontWeight: '900',
    color: C.textSub,
    letterSpacing: 1,
    textAlign: 'center',
    width: scale(40),
    padding: 0,
  },
  boxTxtOn: { color: C.white },
  boxSub: {
    fontSize: scale(9),
    fontWeight: '800',
    color: C.textMuted,
    letterSpacing: 1,
    marginTop: scale(2),
  },
  colon: {
    fontSize: scale(28),
    fontWeight: '900',
    color: C.textMuted,
    marginBottom: scale(10),
  },
  period: {
    borderRadius: scale(10),
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: C.border,
    marginLeft: scale(4),
  },
  pBtn: {
    paddingHorizontal: scale(10),
    paddingVertical: scale(7),
    backgroundColor: C.white,
  },
  pOn: { backgroundColor: C.primary },
  pTxt: { fontSize: scale(11), fontWeight: '800', color: C.textSub },
  pTxtOn: { color: C.white },
  face: { width: CS, height: CS, position: 'relative' },
  ring: {
    position: 'absolute',
    width: CS,
    height: CS,
    borderRadius: CR,
    backgroundColor: C.primaryLight,
    borderWidth: 2,
    borderColor: C.border,
  },
  numWrap: {
    position: 'absolute',
    width: scale(26),
    height: scale(26),
    borderRadius: scale(13),
    alignItems: 'center',
    justifyContent: 'center',
  },
  numTxt: { fontSize: scale(11), fontWeight: '700' },
  tip: {
    position: 'absolute',
    width: scale(18),
    height: scale(18),
    borderRadius: scale(9),
    backgroundColor: C.primary,
  },
  dot: {
    position: 'absolute',
    width: scale(10),
    height: scale(10),
    borderRadius: scale(5),
    backgroundColor: C.primary,
    zIndex: 3,
  },
  hint: { fontSize: scale(11), color: C.textMuted, fontWeight: '600' },
});

// ══════════════════════════════════════════════════════════════════════════════
// ── Time Picker Modal ─────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
const TimePickerModal: React.FC<{
  visible: boolean;
  label: string;
  value: string;
  onConfirm: (v: string) => void;
  onClose: () => void;
}> = ({ visible, label, value, onConfirm, onClose }) => {
  const [draft, setDraft] = useState(value);
  useEffect(() => {
    if (visible) setDraft(value);
  }, [visible, value]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={tp.overlay}
      >
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={tp.card}>
          <Text style={tp.title}>{label}</Text>
          <ClockPicker value={draft} onChange={setDraft} />
          <View style={tp.row}>
            <TouchableOpacity style={tp.cancel} onPress={onClose}>
              <Text style={tp.cancelTxt}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={tp.confirm}
              onPress={() => {
                onConfirm(draft);
                onClose();
              }}
            >
              <Text style={tp.confirmTxt}>Set Time</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};
const tp = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,30,40,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: scale(20),
  },
  card: {
    backgroundColor: C.white,
    borderRadius: scale(24),
    padding: scale(20),
    width: '100%',
    alignItems: 'center',
    gap: scale(16),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 16,
  },
  title: {
    fontSize: scale(15),
    fontWeight: '900',
    color: C.text,
    alignSelf: 'flex-start',
  },
  row: { flexDirection: 'row', gap: scale(10), width: '100%' },
  cancel: {
    flex: 1,
    paddingVertical: scale(12),
    borderRadius: scale(12),
    borderWidth: 1.5,
    borderColor: C.border,
    alignItems: 'center',
  },
  cancelTxt: { fontSize: scale(13), fontWeight: '700', color: C.textSub },
  confirm: {
    flex: 1,
    paddingVertical: scale(12),
    borderRadius: scale(12),
    backgroundColor: C.primary,
    alignItems: 'center',
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  confirmTxt: { fontSize: scale(13), fontWeight: '800', color: C.white },
});

// ══════════════════════════════════════════════════════════════════════════════
// ── Shift Config Modal ────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
const ShiftModal: React.FC<{
  visible: boolean;
  date: string;
  existing?: ShiftConfig;
  onSave: (cfg: ShiftConfig) => void;
  onDelete: () => void;
  onClose: () => void;
  saving: boolean;
}> = ({ visible, date, existing, onSave, onDelete, onClose, saving }) => {
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

  const [y, m, d] = date.split('-').map(Number);
  const dateLabel = `${d} ${MONTHS[m - 1]} ${y}`;

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={onClose}
      >
        <TouchableOpacity
          style={sh.overlay}
          activeOpacity={1}
          onPress={onClose}
        >
          <TouchableOpacity activeOpacity={1} style={sh.sheet}>
            <View style={sh.handle} />

            {/* Header */}
            <View style={sh.header}>
              <View>
                <Text style={sh.title}>Configure Shift</Text>
                <Text style={sh.sub}>{dateLabel}</Text>
              </View>
              <TouchableOpacity onPress={onClose} style={sh.close}>
                <Ionicons name="close" size={scale(18)} color={C.textSub} />
              </TouchableOpacity>
            </View>

            {/* Shift type */}
            <Text style={sh.lbl}>Shift Type</Text>
            <View style={sh.chipRow}>
              {(Object.keys(PRESETS) as ShiftType[]).map(t => {
                const p = PRESETS[t];
                const on = type === t;
                return (
                  <TouchableOpacity
                    key={t}
                    style={[
                      sh.chip,
                      on
                        ? { backgroundColor: p.color, borderColor: p.color }
                        : { borderColor: C.border, backgroundColor: C.white },
                    ]}
                    onPress={() => pickShift(t)}
                    activeOpacity={0.8}
                  >
                    <Text style={sh.chipIcon}>{p.icon}</Text>
                    <Text
                      style={[
                        sh.chipLabel,
                        { color: on ? C.white : C.textSub },
                      ]}
                    >
                      {p.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Time window */}
            <Text style={sh.lbl}>Time Window</Text>
            <View style={sh.timeRow}>
              <TouchableOpacity
                style={[sh.timeBox, { flex: 1 }]}
                onPress={() => setPickerFor('start')}
                activeOpacity={0.8}
              >
                <Text style={sh.timeLabel}>Start Time</Text>
                <View style={sh.timePill}>
                  <Ionicons
                    name="time-outline"
                    size={scale(13)}
                    color={C.primary}
                  />
                  <Text style={sh.timeVal}>{start}</Text>
                  <Ionicons
                    name="chevron-down"
                    size={scale(12)}
                    color={C.textMuted}
                    style={{ marginLeft: 'auto' }}
                  />
                </View>
              </TouchableOpacity>
              <View style={{ paddingBottom: scale(10) }}>
                <Ionicons
                  name="arrow-forward"
                  size={scale(14)}
                  color={C.textMuted}
                />
              </View>
              <TouchableOpacity
                style={[sh.timeBox, { flex: 1 }]}
                onPress={() => setPickerFor('end')}
                activeOpacity={0.8}
              >
                <Text style={sh.timeLabel}>End Time</Text>
                <View style={sh.timePill}>
                  <Ionicons
                    name="time-outline"
                    size={scale(13)}
                    color={C.primary}
                  />
                  <Text style={sh.timeVal}>{end}</Text>
                  <Ionicons
                    name="chevron-down"
                    size={scale(12)}
                    color={C.textMuted}
                    style={{ marginLeft: 'auto' }}
                  />
                </View>
              </TouchableOpacity>
            </View>

            {/* Slot duration */}
            <Text style={sh.lbl}>Slot Duration (hours)</Text>
            <View style={sh.slotRow}>
              {SLOT_DURATIONS.map(n => (
                <TouchableOpacity
                  key={n}
                  style={[
                    sh.slotChip,
                    slot === n && {
                      backgroundColor: C.primary,
                      borderColor: C.primary,
                    },
                  ]}
                  onPress={() => setSlot(n)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      sh.slotTxt,
                      { color: slot === n ? C.white : C.textSub },
                    ]}
                  >
                    {n}h
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Actions */}
            <View style={sh.actions}>
              {existing && (
                <TouchableOpacity
                  style={sh.del}
                  onPress={onDelete}
                  activeOpacity={0.85}
                >
                  <Ionicons
                    name="trash-outline"
                    size={scale(14)}
                    color={C.danger}
                  />
                  <Text style={sh.delTxt}>Remove</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[
                  sh.save,
                  saving && { opacity: 0.7 },
                  !existing && { flex: 1 },
                ]}
                onPress={() =>
                  onSave({
                    shift_type: type,
                    start_time: start,
                    end_time: end,
                    slot_duration: slot,
                  })
                }
                disabled={saving}
                activeOpacity={0.85}
              >
                {saving ? (
                  <ActivityIndicator size="small" color={C.white} />
                ) : (
                  <>
                    <Ionicons
                      name="checkmark"
                      size={scale(14)}
                      color={C.white}
                    />
                    <Text style={sh.saveTxt}>
                      {existing ? 'Update' : 'Save'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <TimePickerModal
        visible={pickerFor === 'start'}
        label="Set Start Time"
        value={start}
        onConfirm={setStart}
        onClose={() => setPickerFor(null)}
      />
      <TimePickerModal
        visible={pickerFor === 'end'}
        label="Set End Time"
        value={end}
        onConfirm={setEnd}
        onClose={() => setPickerFor(null)}
      />
    </>
  );
};

const sh = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,30,40,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: C.white,
    borderTopLeftRadius: scale(24),
    borderTopRightRadius: scale(24),
    paddingHorizontal: scale(20),
    paddingBottom: Platform.OS === 'ios' ? scale(36) : scale(24),
    paddingTop: scale(8),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 16,
  },
  handle: {
    width: scale(36),
    height: scale(4),
    borderRadius: scale(2),
    backgroundColor: C.border,
    alignSelf: 'center',
    marginBottom: scale(16),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: scale(16),
  },
  title: { fontSize: scale(17), fontWeight: '900', color: C.text },
  sub: {
    fontSize: scale(12),
    color: C.textMuted,
    marginTop: scale(2),
    fontWeight: '500',
  },
  close: {
    width: scale(30),
    height: scale(30),
    borderRadius: scale(15),
    backgroundColor: C.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lbl: {
    fontSize: scale(11),
    fontWeight: '800',
    color: C.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: scale(8),
  },
  chipRow: { flexDirection: 'row', gap: scale(8), marginBottom: scale(16) },
  chip: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scale(9),
    borderRadius: scale(12),
    borderWidth: 1.5,
    gap: scale(3),
  },
  chipIcon: { fontSize: scale(14) },
  chipLabel: { fontSize: scale(10), fontWeight: '700' },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: scale(6),
    marginBottom: scale(16),
  },
  timeBox: { gap: scale(5) },
  timeLabel: { fontSize: scale(11), fontWeight: '700', color: C.textSub },
  timePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(5),
    backgroundColor: C.primaryLight,
    borderRadius: scale(10),
    paddingHorizontal: scale(10),
    paddingVertical: scale(10),
    borderWidth: 1,
    borderColor: C.border,
  },
  timeVal: { fontSize: scale(14), fontWeight: '800', color: C.primary },
  slotRow: {
    flexDirection: 'row',
    gap: scale(8),
    marginBottom: scale(20),
    flexWrap: 'wrap',
  },
  slotChip: {
    paddingHorizontal: scale(14),
    paddingVertical: scale(8),
    borderRadius: scale(10),
    borderWidth: 1.5,
    borderColor: C.border,
    backgroundColor: C.white,
    minWidth: scale(44),
    alignItems: 'center',
  },
  slotTxt: { fontSize: scale(12), fontWeight: '700' },
  actions: { flexDirection: 'row', gap: scale(10) },
  del: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(5),
    borderWidth: 1.5,
    borderColor: C.danger,
    borderRadius: scale(12),
    paddingHorizontal: scale(16),
    paddingVertical: scale(12),
  },
  delTxt: { fontSize: scale(13), fontWeight: '700', color: C.danger },
  save: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(6),
    backgroundColor: C.primary,
    borderRadius: scale(12),
    paddingVertical: scale(13),
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveTxt: { fontSize: scale(14), fontWeight: '800', color: C.white },
});

// ══════════════════════════════════════════════════════════════════════════════
// ── AvailabilitySection ───────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
const AvailabilitySection: React.FC<Props> = ({
  doctorId,
  apiBaseUrl,
  authToken,
  initialAvailability = [],
}) => {
  const today = new Date();
  const todayStr = toISO(today);

  console.log('Availability doctorId =>', doctorId);

  const [viewY, setViewY] = useState(today.getFullYear());
  const [viewM, setViewM] = useState(today.getMonth());
  const [avail, setAvail] = useState<AvailabilityEntry[]>(initialAvailability);
  const [selDate, setSelDate] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Re-sync when parent fetches fresh data
  useEffect(() => {
    if (initialAvailability.length > 0) setAvail(initialAvailability);
  }, [initialAvailability]);

  /** Find entry — handles both "YYYY-MM-DD" and "YYYY-MM-DDTHH:…" */
  const getEntry = (dateStr: string) =>
    avail.find(a => normDate(a.date) === dateStr);

  const prevM = () =>
    viewM === 0 ? (setViewM(11), setViewY(y => y - 1)) : setViewM(m => m - 1);
  const nextM = () =>
    viewM === 11 ? (setViewM(0), setViewY(y => y + 1)) : setViewM(m => m + 1);

  const patchAvailability = async (entries: AvailabilityEntry[]) => {
    if (!doctorId) {
      throw new Error('Doctor ID is missing');
    }

    console.log('=== PATCH AVAILABILITY CALLED ===');
    console.log('doctorId:', doctorId);
    console.log('typeof doctorId:', typeof doctorId);
    console.log(
      'full URL will be:',
      `${apiBaseUrl}/api/doctors/${doctorId}/availability`,
    );
    const url = `${BASE_URL}/api/doctors/${doctorId}/availability`;
    const payload = {
      availability: entries.map(a => ({
        date: normDate(a.date),
        shift_type: a.shift_type,
        start_time: a.start_time,
        end_time: a.end_time,
        slot_duration: Number(a.slot_duration),
      })),
    };

    console.log('[Availability] ── SAVE ATTEMPT ──────────────────');
    console.log('[Availability] URL:', url);
    console.log('[Availability] doctorId:', doctorId);
    console.log('[Availability] apiBaseUrl:', apiBaseUrl);
    console.log(
      '[Availability] authToken present:',
      !!authToken,
      '| length:',
      authToken?.length,
    );
    console.log('[Availability] payload:', JSON.stringify(payload, null, 2));

    let res: Response;
    try {
      res = await fetch(url, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(payload),
      });
    } catch (networkErr: any) {
      console.log(
        '[Availability] ❌ NETWORK ERROR (fetch threw):',
        networkErr?.message,
      );
      throw networkErr;
    }

    console.log('[Availability] Response status:', res.status);
    console.log('[Availability] Response ok:', res.ok);

    const rawText = await res.text();
    console.log('[Availability] Raw response body:', rawText);

    if (!res.ok) {
      let errMsg = `HTTP ${res.status}`;
      try {
        const j = JSON.parse(rawText);
        errMsg = j.message ?? j.error ?? errMsg;
      } catch {}
      console.log('[Availability] ❌ SAVE FAILED:', errMsg);
      throw new Error(errMsg);
    }

    console.log('[Availability] ✅ SAVE SUCCESS');
    return JSON.parse(rawText);
  };
  const handleSave = async (cfg: ShiftConfig) => {
    if (!selDate) return;
    setSaving(true);
    const newEntry: AvailabilityEntry = { date: selDate, ...cfg };
    const updated = [
      ...avail.filter(a => normDate(a.date) !== selDate),
      newEntry,
    ];
    try {
      await patchAvailability(updated);
      setAvail(updated);
      setSelDate(null);
    } catch (e: any) {
      Alert.alert(
        'Save Failed',
        e?.message ?? 'Unable to save availability. Please try again.',
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selDate) return;
    setSaving(true);
    const updated = avail.filter(a => normDate(a.date) !== selDate);
    try {
      await patchAvailability(updated);
      setAvail(updated);
      setSelDate(null);
    } catch (e: any) {
      Alert.alert(
        'Delete Failed',
        e?.message ?? 'Unable to remove slot. Please try again.',
      );
    } finally {
      setSaving(false);
    }
  };

  // Calendar grid
  const dim = daysInMonth(viewY, viewM);
  const fd = firstDay(viewY, viewM);
  const cells: (number | null)[] = [
    ...Array(fd).fill(null),
    ...Array.from({ length: dim }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const upcoming = [...avail]
    .filter(a => normDate(a.date) >= todayStr)
    .sort((a, b) => normDate(a.date).localeCompare(normDate(b.date)))
    .slice(0, 3);

  return (
    <View style={av.wrap}>
      {/* ── Calendar card ── */}
      <View style={av.card}>
        {/* Month nav */}
        <View style={av.monthNav}>
          <TouchableOpacity onPress={prevM} style={av.navBtn}>
            <Ionicons name="chevron-back" size={scale(16)} color={C.primary} />
          </TouchableOpacity>
          <Text style={av.monthLabel}>
            {MONTHS[viewM]} {viewY}
          </Text>
          <TouchableOpacity onPress={nextM} style={av.navBtn}>
            <Ionicons
              name="chevron-forward"
              size={scale(16)}
              color={C.primary}
            />
          </TouchableOpacity>
        </View>

        {/* Day headers */}
        <View style={av.dayRow}>
          {DAYS.map(d => (
            <Text key={d} style={av.dayHdr}>
              {d}
            </Text>
          ))}
        </View>

        {/* Date grid */}
        <View style={av.grid}>
          {cells.map((day, idx) => {
            if (!day) return <View key={`e${idx}`} style={av.cellWrap} />;
            const ds = toISO(new Date(viewY, viewM, day));
            const past = ds < todayStr;
            const today = ds === todayStr;
            const entry = getEntry(ds);
            const pre = entry ? PRESETS[entry.shift_type] : null;
            return (
              <TouchableOpacity
                key={`d${day}`}
                style={av.cellWrap}
                onPress={() => !past && setSelDate(ds)}
                activeOpacity={past ? 1 : 0.75}
              >
                <View
                  style={[
                    av.cell,
                    today && av.cellToday,
                    entry && { backgroundColor: pre!.color },
                    past && av.cellPast,
                  ]}
                >
                  <Text
                    style={[
                      av.cellTxt,
                      today && !entry && av.cellTxtToday,
                      entry && { color: C.white },
                      past && av.cellTxtPast,
                    ]}
                  >
                    {day}
                  </Text>
                  {entry && <Text style={av.cellDot}>{pre!.icon}</Text>}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Legend */}
        <View style={av.legend}>
          {(Object.keys(PRESETS) as ShiftType[]).map(t => (
            <View key={t} style={av.lgItem}>
              <View style={[av.lgDot, { backgroundColor: PRESETS[t].color }]} />
              <Text style={av.lgTxt}>{PRESETS[t].label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* ── Upcoming slots ── */}
      {upcoming.length > 0 && (
        <View style={av.upWrap}>
          <Text style={av.upTitle}>Upcoming Availability</Text>
          {upcoming.map(entry => {
            const pre = PRESETS[entry.shift_type];
            const ds = normDate(entry.date);
            const [, em, ed] = ds.split('-').map(Number);
            return (
              <TouchableOpacity
                key={entry.date}
                style={av.upCard}
                onPress={() => setSelDate(ds)}
                activeOpacity={0.8}
              >
                <View style={[av.upIcon, { backgroundColor: pre.bg }]}>
                  <Text style={{ fontSize: scale(16) }}>{pre.icon}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={av.upDate}>
                    {ed} {MONTHS[em - 1]}
                  </Text>
                  <Text style={av.upShift}>
                    {pre.label} · {entry.start_time} – {entry.end_time}
                  </Text>
                </View>
                <View style={[av.upBadge, { backgroundColor: pre.bg }]}>
                  <Text style={[av.upBadgeTxt, { color: pre.color }]}>
                    {entry.slot_duration}h slots
                  </Text>
                </View>
                <Ionicons
                  name="pencil-outline"
                  size={scale(14)}
                  color={C.textMuted}
                  style={{ marginLeft: scale(6) }}
                />
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* ── Shift config modal ── */}
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
    </View>
  );
};

export default AvailabilitySection;

// ── Calendar Styles ────────────────────────────────────────────────────────────
const av = StyleSheet.create({
  wrap: { gap: scale(12) },
  card: {
    backgroundColor: C.white,
    borderRadius: scale(18),
    padding: scale(14),
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: C.cardShadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 3,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: scale(10),
  },
  navBtn: {
    width: scale(30),
    height: scale(30),
    borderRadius: scale(10),
    backgroundColor: C.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthLabel: { fontSize: scale(14), fontWeight: '800', color: C.text },
  dayRow: { flexDirection: 'row', marginBottom: scale(4) },
  dayHdr: {
    flex: 1,
    textAlign: 'center',
    fontSize: scale(10),
    fontWeight: '700',
    color: C.textMuted,
    textTransform: 'uppercase',
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cellWrap: { width: `${100 / 7}%`, aspectRatio: 1, padding: scale(2) },
  cell: {
    flex: 1,
    borderRadius: scale(8),
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellToday: { borderWidth: 2, borderColor: C.primary },
  cellPast: { opacity: 0.35 },
  cellTxt: {
    fontSize: scale(11),
    fontWeight: '700',
    color: C.text,
    lineHeight: scale(13),
  },
  cellTxtToday: { color: C.primary },
  cellTxtPast: { color: C.textMuted },
  cellDot: { fontSize: scale(7), lineHeight: scale(9) },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scale(8),
    marginTop: scale(10),
    paddingTop: scale(10),
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  lgItem: { flexDirection: 'row', alignItems: 'center', gap: scale(4) },
  lgDot: { width: scale(8), height: scale(8), borderRadius: scale(4) },
  lgTxt: { fontSize: scale(10), color: C.textSub, fontWeight: '600' },
  upWrap: { gap: scale(8) },
  upTitle: { fontSize: scale(13), fontWeight: '800', color: C.text },
  upCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
    backgroundColor: C.white,
    borderRadius: scale(14),
    padding: scale(12),
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: C.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 2,
  },
  upIcon: {
    width: scale(38),
    height: scale(38),
    borderRadius: scale(10),
    alignItems: 'center',
    justifyContent: 'center',
  },
  upDate: {
    fontSize: scale(13),
    fontWeight: '800',
    color: C.text,
    marginBottom: scale(2),
  },
  upShift: { fontSize: scale(11), color: C.textSub, fontWeight: '500' },
  upBadge: {
    borderRadius: scale(20),
    paddingHorizontal: scale(8),
    paddingVertical: scale(4),
  },
  upBadgeTxt: { fontSize: scale(10), fontWeight: '700' },
});
