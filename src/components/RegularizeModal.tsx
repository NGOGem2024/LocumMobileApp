import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import DateTimePicker from '@react-native-community/datetimepicker';
import api from '../services/axiosConfig';

const { width: SW, height: SH } = Dimensions.get('window');
const scale = (size: number) => (SW / 390) * size;

const C = {
  background: '#F9FAFB',
  cardBg: '#FFFFFF',
  border: '#E5E7EB',
  inputBg: '#F3F4F6',
  primary: '#007b8e',
  primaryLight: '#e0f5f8',
  ink: '#111827',
  textSub: '#4B5563',
  textMuted: '#9CA3AF',
  white: '#ffffff',
  urgent: '#ef4444',
  success: '#10b981',
  warning: '#f59e0b',
  warningLight: '#fffbeb',
};

export type RegularizeTarget = {
  assignmentId: string;
  dutyDate: string; // YYYY-MM-DD
  hospitalName?: string;
  shiftFrom?: string; // "HH:mm"
  shiftTo?: string; // "HH:mm"
  sessions?: any[]; // daily_attendance[].sessions
  totalHours?: number | null;
  // Existing pending request (for re-editing)
  requested?: {
    check_in?: string; // "9:00 AM"
    check_out?: string; // "6:00 PM"
    reason?: string;
    request_type?: string;
  } | null;
};

const REQUEST_TYPES = [
  'Missed check-out',
  'Late check-in correction',
  'Hours correction',
  'Absent dispute',
] as const;
type RequestType = (typeof REQUEST_TYPES)[number];

type T = { h: number; m: number; pm: boolean };

const pad = (n: number) => String(n).padStart(2, '0');

const fmtT = (t: T) => `${t.h}:${pad(t.m)} ${t.pm ? 'PM' : 'AM'}`;

const toMinutes = (t: T) => (t.h % 12) * 60 + t.m + (t.pm ? 720 : 0);

const from24 = (s?: string, fallback: T = { h: 9, m: 0, pm: false }): T => {
  if (!s) return fallback;
  const [hs, ms] = s.split(':');
  const h24 = parseInt(hs, 10);
  const m = parseInt(ms, 10) || 0;
  if (isNaN(h24)) return fallback;
  return { h: h24 % 12 === 0 ? 12 : h24 % 12, m, pm: h24 >= 12 };
};

const from12 = (s?: string | null): T | null => {
  if (!s) return null;
  const match = s.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return null;
  return { h: parseInt(match[1], 10), m: parseInt(match[2], 10), pm: match[3].toUpperCase() === 'PM' };
};

const fromDate = (d: Date): T => {
  const h24 = d.getHours();
  return { h: h24 % 12 === 0 ? 12 : h24 % 12, m: d.getMinutes(), pm: h24 >= 12 };
};

const fromIso = (iso?: string | null): T | null => {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return fromDate(d);
};

const toDate = (t: T): Date => {
  const d = new Date();
  d.setHours((t.h % 12) + (t.pm ? 12 : 0), t.m, 0, 0);
  return d;
};

const fmtHoursMins = (mins: number) => `${Math.floor(mins / 60)}h ${pad(mins % 60)}m`;

const fmtIsoTime = (iso?: string | null) => {
  const t = fromIso(iso);
  return t ? fmtT(t) : '—';
};

const formatDateLong = (dateStr: string) => {
  const d = new Date(`${dateStr}T00:00:00`);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
};

const TimeField = ({
  title,
  value,
  active,
  onPress,
}: {
  title: string;
  value: T;
  active: boolean;
  onPress: () => void;
}) => (
  <TouchableOpacity activeOpacity={0.8} onPress={onPress} style={[styles.timeField, active && styles.timeFieldActive]}>
    <Text style={styles.timeFieldTitle}>{title}</Text>
    <Text style={styles.timeFieldValue}>{fmtT(value)}</Text>
  </TouchableOpacity>
);

type Props = {
  visible: boolean;
  target: RegularizeTarget | null;
  onClose: () => void;
  onSubmitted: (msg: string, request?: any) => void;
};

const RegularizeModal = ({ visible, target, onClose, onSubmitted }: Props) => {
  const [requestType, setRequestType] = useState<RequestType>('Hours correction');
  const [checkIn, setCheckIn] = useState<T>({ h: 9, m: 0, pm: false });
  const [checkOut, setCheckOut] = useState<T>({ h: 5, m: 0, pm: true });
  const [picking, setPicking] = useState<'in' | 'out' | null>(null);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const sessions = useMemo(
    () => (Array.isArray(target?.sessions) ? target!.sessions!.filter((s: any) => s?.check_in?.timestamp) : []),
    [target],
  );

  useEffect(() => {
    if (!visible || !target) return;

    const prevIn = from12(target.requested?.check_in);
    const prevOut = from12(target.requested?.check_out);

    const firstIn = fromIso(sessions[0]?.check_in?.timestamp);
    const doneSessions = sessions.filter((s: any) => s?.check_out?.timestamp);
    const lastOut = fromIso(doneSessions[doneSessions.length - 1]?.check_out?.timestamp);

    // Prefer previously requested timings (re-edit), else recorded, else shift timings
    setCheckIn(prevIn || firstIn || from24(target.shiftFrom, { h: 9, m: 0, pm: false }));
    setCheckOut(prevOut || lastOut || from24(target.shiftTo, { h: 5, m: 0, pm: true }));

    // Request type is picked automatically (no manual choice needed)
    const prevType = target.requested?.request_type as RequestType | undefined;
    setRequestType(
      prevType && REQUEST_TYPES.includes(prevType)
        ? prevType
        : sessions.length === 0
        ? 'Absent dispute'
        : !lastOut
        ? 'Missed check-out'
        : 'Hours correction',
    );
    setReason(target.requested?.reason || '');
    setError('');
    setPicking(null);
  }, [visible, target, sessions]);

  const requestedMinutes = useMemo(() => {
    let diff = toMinutes(checkOut) - toMinutes(checkIn);
    if (diff <= 0) diff += 24 * 60; // overnight shift
    return diff;
  }, [checkIn, checkOut]);

  // One-line summary of what is already recorded
  const recordedSummary = useMemo(() => {
    if (sessions.length === 0) return 'No attendance recorded for this day';
    const firstIn = sessions[0]?.check_in?.timestamp;
    const done = sessions.filter((s: any) => s?.check_out?.timestamp);
    const lastOut = done[done.length - 1]?.check_out?.timestamp;
    return `${fmtIsoTime(firstIn)} → ${lastOut ? fmtIsoTime(lastOut) : 'Not checked out'}`;
  }, [sessions]);

  const handlePickerChange = (event: any, selected?: Date) => {
    if (Platform.OS === 'android') {
      const which = picking;
      setPicking(null);
      if (event?.type !== 'set' || !selected || !which) return;
      if (which === 'in') setCheckIn(fromDate(selected));
      else setCheckOut(fromDate(selected));
      return;
    }
    // iOS: update live while spinning, closed via Done button
    if (!selected || !picking) return;
    if (picking === 'in') setCheckIn(fromDate(selected));
    else setCheckOut(fromDate(selected));
  };

  const handleSubmit = async () => {
    if (!target || submitting) return;
    if (!target.assignmentId) {
      setError('Assignment not found for this duty. Please refresh and try again.');
      return;
    }
    if (reason.trim().length < 5) {
      setError('Please enter a reason (at least 5 characters).');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const { data } = await api.post('/api/doctors/attendance/regularize', {
        assignment_id: target.assignmentId,
        duty_date: target.dutyDate,
        request_type: requestType,
        requested: {
          check_in: fmtT(checkIn),
          check_out: fmtT(checkOut),
          hours: fmtHoursMins(requestedMinutes),
        },
        reason: reason.trim(),
      });
      onSubmitted(data?.message || 'Regularization request submitted.', data?.data);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to submit request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const closeIfIdle = () => {
    if (!submitting) onClose();
  };

  const isEditing = !!target?.requested;

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={closeIfIdle}>
      <TouchableWithoutFeedback onPress={closeIfIdle}>
        <View style={styles.backdrop} />
      </TouchableWithoutFeedback>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.kav}
        pointerEvents="box-none"
      >
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.sheetHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.sheetTitle}>{isEditing ? 'Edit Timings' : 'Correct Timings'}</Text>
              <Text style={styles.sheetSub} numberOfLines={1}>
                {target ? `${formatDateLong(target.dutyDate)}${target.hospitalName ? ` · ${target.hospitalName}` : ''}` : ''}
              </Text>
            </View>
            <TouchableOpacity onPress={closeIfIdle} style={styles.closeBtn}>
              <Ionicons name="close" size={scale(18)} color={C.textSub} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {/* Currently recorded (one line) */}
            <View style={styles.recordedRow}>
              <Text style={styles.recordedLabel}>Recorded</Text>
              <Text style={styles.recordedValue}>{recordedSummary}</Text>
            </View>

            {/* Requested timings */}
            <Text style={styles.sectionLabel}>Correct timings</Text>
            <View style={styles.timeRow}>
              <TimeField title="Check In" value={checkIn} active={picking === 'in'} onPress={() => setPicking('in')} />
              <TimeField title="Check Out" value={checkOut} active={picking === 'out'} onPress={() => setPicking('out')} />
            </View>
            <Text style={styles.hoursText}>Total: {fmtHoursMins(requestedMinutes)}</Text>

            {/* iOS inline spinner */}
            {Platform.OS === 'ios' && picking ? (
              <View style={styles.iosPickerWrap}>
                <DateTimePicker
                  value={toDate(picking === 'in' ? checkIn : checkOut)}
                  mode="time"
                  display="spinner"
                  onChange={handlePickerChange}
                />
                <TouchableOpacity style={styles.iosDoneBtn} onPress={() => setPicking(null)}>
                  <Text style={styles.iosDoneText}>Done</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {/* Reason */}
            <Text style={styles.sectionLabel}>Reason</Text>
            <TextInput
              style={styles.reasonInput}
              placeholder="Why do the timings need correction?"
              placeholderTextColor={C.textMuted}
              multiline
              value={reason}
              onChangeText={setReason}
              textAlignVertical="top"
              maxLength={300}
            />

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <TouchableOpacity style={[styles.submitBtn, submitting && { opacity: 0.7 }]} disabled={submitting} onPress={handleSubmit}>
              {submitting ? (
                <ActivityIndicator size="small" color={C.white} />
              ) : (
                <Text style={styles.submitText}>{isEditing ? 'Update' : 'Submit'}</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>

      {/* Android clock dial dialog */}
      {Platform.OS === 'android' && picking ? (
        <DateTimePicker
          value={toDate(picking === 'in' ? checkIn : checkOut)}
          mode="time"
          is24Hour={false}
          display="clock"
          onChange={handlePickerChange}
        />
      ) : null}
    </Modal>
  );
};

export default RegularizeModal;

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(17, 24, 39, 0.4)' },
  kav: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: C.background,
    borderTopLeftRadius: scale(28),
    borderTopRightRadius: scale(28),
    maxHeight: SH * 0.92,
    paddingBottom: scale(20),
  },
  handle: { width: scale(40), height: scale(5), borderRadius: scale(2.5), backgroundColor: C.border, alignSelf: 'center', marginTop: scale(12), marginBottom: scale(4) },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', gap: scale(14), paddingHorizontal: scale(20), paddingVertical: scale(14) },
  sheetTitle: { fontSize: scale(18), fontWeight: '900', color: C.ink },
  sheetSub: { fontSize: scale(12), color: C.textSub, marginTop: scale(2), fontWeight: '500' },
  closeBtn: { width: scale(32), height: scale(32), borderRadius: scale(16), backgroundColor: C.inputBg, alignItems: 'center', justifyContent: 'center' },
  body: { paddingHorizontal: scale(20), paddingBottom: scale(30) },
  sectionLabel: { fontSize: scale(13), fontWeight: '800', color: C.ink, marginBottom: scale(8), marginTop: scale(16) },

  recordedRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: C.inputBg, borderRadius: scale(10), paddingHorizontal: scale(12), paddingVertical: scale(10) },
  recordedLabel: { fontSize: scale(12), color: C.textSub, fontWeight: '600' },
  recordedValue: { fontSize: scale(12), color: C.ink, fontWeight: '700' },

  timeRow: { flexDirection: 'row', gap: scale(10) },
  timeField: { flex: 1, backgroundColor: C.cardBg, borderRadius: scale(12), borderWidth: 1, borderColor: C.border, paddingVertical: scale(12), paddingHorizontal: scale(14) },
  timeFieldActive: { borderColor: C.primary, backgroundColor: C.primaryLight },
  timeFieldTitle: { fontSize: scale(11), fontWeight: '600', color: C.textSub, marginBottom: scale(4) },
  timeFieldValue: { fontSize: scale(17), fontWeight: '900', color: C.primary },
  hoursText: { fontSize: scale(12), fontWeight: '700', color: C.textSub, marginTop: scale(8) },

  iosPickerWrap: { backgroundColor: C.cardBg, borderRadius: scale(12), borderWidth: 1, borderColor: C.border, marginTop: scale(10), paddingBottom: scale(8) },
  iosDoneBtn: { alignSelf: 'flex-end', marginRight: scale(12), paddingHorizontal: scale(14), paddingVertical: scale(6), borderRadius: scale(8), backgroundColor: C.primaryLight },
  iosDoneText: { fontSize: scale(12), fontWeight: '700', color: C.primary },

  reasonInput: { minHeight: scale(84), backgroundColor: C.cardBg, borderRadius: scale(12), borderWidth: 1, borderColor: C.border, padding: scale(12), fontSize: scale(13), color: C.ink, marginBottom: scale(12) },
  errorText: { fontSize: scale(12), color: C.urgent, fontWeight: '600', marginBottom: scale(10) },
  submitBtn: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#006C7C', paddingVertical: scale(14), borderRadius: scale(12) },
  submitText: { color: C.white, fontSize: scale(14), fontWeight: '700' },
});