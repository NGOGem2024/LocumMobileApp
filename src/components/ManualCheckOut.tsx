import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableWithoutFeedback,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import api from '../services/axiosConfig';

// Put this file in: src/components/ManualCheckOut.tsx

const { width: SW, height: SH } = Dimensions.get('window');
const scale = (size: number) => (SW / 390) * size;

const C = {
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
  warning: '#d97706',
  warningLight: '#fffbeb',
  warningBorder: '#fde68a',
};

// ─────────────────────────────────────────────────────────────
// Types + API
// ─────────────────────────────────────────────────────────────
export type MissedCheckOut = {
  assignment_id: string;
  requirement_id: string;
  duty_date: string; // "YYYY-MM-DD"
  hospital_name: string;
  shift_from: string;
  shift_to: string;
  first_check_in_time: string;
  status: 'missed_check_out' | 'pending_review';
  review_status: 'pending' | 'rejected' | null;
  review_remarks: string;
};

export type ManualTarget = {
  requirementId: string;
  dutyDate: string;
  hospitalName?: string;
  checkInTime?: string | null; // first check-in of that day
};

// Earlier days where the doctor checked in but never checked out
export const fetchMissedCheckOuts = async (): Promise<MissedCheckOut[]> => {
  try {
    const { data } = await api.get('/api/doctors/missed-check-outs');
    return data?.success ? data.data || [] : [];
  } catch {
    return [];
  }
};

const fmtTime = (iso?: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
};

const fmtDate = (ymd: string) => {
  const d = new Date(`${ymd}T00:00:00`);
  if (isNaN(d.getTime())) return ymd;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

const fmtDateTime = (iso?: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const date = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  return `${date}, ${fmtTime(iso)}`;
};

const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);

// ─────────────────────────────────────────────────────────────
// Manual check-out modal: End time + Reason (both mandatory). No map, no GPS.
// ─────────────────────────────────────────────────────────────
type ModalProps = {
  visible: boolean;
  target: ManualTarget | null;
  onClose: () => void;
  onSubmitted: (message: string) => void;
};

export const ManualCheckOutModal = ({ visible, target, onClose, onSubmitted }: ModalProps) => {
  const [hour, setHour] = useState('');
  const [minute, setMinute] = useState('');
  const [ampm, setAmpm] = useState<'AM' | 'PM'>('PM');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (visible) {
      setHour('');
      setMinute('');
      setAmpm('PM');
      setReason('');
      setError('');
      setLoading(false);
    }
  }, [visible]);

  const submit = async () => {
    if (!target || loading) return;
    const h = parseInt(hour, 10);
    const m = parseInt(minute, 10);
    if (isNaN(h) || h < 1 || h > 12 || isNaN(m) || m < 0 || m > 59) {
      setError('Enter a valid end time.');
      return;
    }
    if (!reason.trim()) {
      setError('Reason is required.');
      return;
    }
    const h24 = (h % 12) + (ampm === 'PM' ? 12 : 0);
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/api/doctors/manual-check-out', {
        requirement_id: target.requirementId,
        duty_date: target.dutyDate,
        check_out_time: `${pad(h24)}:${pad(m)}`,
        reason: reason.trim(),
      });
      onSubmitted(data?.message || 'Check-out time submitted for approval.');
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Could not submit. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.overlay}>
        <View style={styles.box}>
          <Text style={styles.title}>Add Check-Out Time</Text>
          <Text style={styles.sub}>
            {target?.hospitalName ? `${target.hospitalName} · ` : ''}
            {target?.dutyDate ? fmtDate(target.dutyDate) : ''}
          </Text>

          {target?.checkInTime ? (
            <View style={styles.startBox}>
              <Text style={styles.startLabel}>Start (first check-in)</Text>
              <Text style={styles.startValue}>{fmtDateTime(target.checkInTime)}</Text>
            </View>
          ) : null}

          <Text style={styles.label}>End time</Text>
          <View style={styles.timeRow}>
            <TextInput
              style={[styles.input, styles.timeInput]}
              placeholder="HH"
              placeholderTextColor={C.textMuted}
              keyboardType="number-pad"
              maxLength={2}
              value={hour}
              onChangeText={setHour}
            />
            <Text style={styles.colon}>:</Text>
            <TextInput
              style={[styles.input, styles.timeInput]}
              placeholder="MM"
              placeholderTextColor={C.textMuted}
              keyboardType="number-pad"
              maxLength={2}
              value={minute}
              onChangeText={setMinute}
            />
            <View style={styles.ampmWrap}>
              {(['AM', 'PM'] as const).map(v => (
                <TouchableOpacity
                  key={v}
                  style={[styles.ampmBtn, ampm === v && styles.ampmBtnActive]}
                  onPress={() => setAmpm(v)}
                >
                  <Text style={[styles.ampmText, ampm === v && styles.ampmTextActive]}>{v}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <Text style={styles.label}>Reason</Text>
          <TextInput
            style={[styles.input, styles.reasonInput]}
            placeholder="E.g., Forgot to check out after handover"
            placeholderTextColor={C.textMuted}
            multiline
            value={reason}
            onChangeText={setReason}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Text style={styles.note}>Back office will review this time before it is final.</Text>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={loading}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.submitBtn, loading && { opacity: 0.7 }]} onPress={submit} disabled={loading}>
              {loading ? <ActivityIndicator size="small" color={C.white} /> : <Text style={styles.submitText}>Submit</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

// ─────────────────────────────────────────────────────────────
// Card listing earlier days with a missed check-out
// ─────────────────────────────────────────────────────────────
export const MissedCheckOutsCard = ({
  items,
  onAdd,
  flush,
}: {
  items: MissedCheckOut[];
  onAdd: (item: MissedCheckOut) => void;
  flush?: boolean; // true when the parent already has horizontal padding
}) => {
  if (!items || items.length === 0) return null;
  return (
    <View style={[styles.missedWrap, flush && { marginHorizontal: 0 }]}>
      <View style={styles.missedHeader}>
        <Ionicons name="alert-circle-outline" size={scale(18)} color={C.warning} />
        <Text style={styles.missedTitle}>Missed check-out</Text>
      </View>
      {items.map(it => (
        <View key={`${it.assignment_id}-${it.duty_date}`} style={styles.missedItem}>
          <Text style={styles.missedHospital} numberOfLines={1}>
            {it.hospital_name || 'Duty'} · {fmtDate(it.duty_date)}
          </Text>
          <Text style={styles.missedInfo}>Checked in: {fmtTime(it.first_check_in_time)}</Text>
          {it.review_status === 'rejected' ? (
            <Text style={styles.missedRejected}>
              Request rejected{it.review_remarks ? `: ${it.review_remarks}` : '.'} Submit a new time.
            </Text>
          ) : null}
          {it.status === 'pending_review' ? (
            <View style={styles.pendingBadge}>
              <Ionicons name="hourglass-outline" size={scale(14)} color={C.warning} />
              <Text style={styles.pendingText}>Waiting for approval</Text>
            </View>
          ) : (
            <TouchableOpacity style={styles.missedBtn} onPress={() => onAdd(it)}>
              <Ionicons name="time-outline" size={scale(16)} color={C.white} />
              <Text style={styles.missedBtnText}>Add Check-Out Time</Text>
            </TouchableOpacity>
          )}
        </View>
      ))}
    </View>
  );
};

// ─────────────────────────────────────────────────────────────
// Hamburger button (top-left). Panel opens only when tapped, X closes it.
// ─────────────────────────────────────────────────────────────
export const ManualCheckOutMenu = ({
  items,
  onAdd,
}: {
  items: MissedCheckOut[];
  onAdd: (item: MissedCheckOut) => void;
}) => {
  const [open, setOpen] = useState(false);
  const insets = useSafeAreaInsets();
  const count = items?.length || 0;

  const handleAdd = (item: MissedCheckOut) => {
    setOpen(false);
    // iOS can't present a modal while another one is still dismissing
    setTimeout(() => onAdd(item), Platform.OS === 'ios' ? 350 : 50);
  };

  return (
    <>
      <TouchableOpacity style={styles.menuBtn} activeOpacity={0.8} onPress={() => setOpen(true)}>
        <Ionicons name="menu" size={scale(26)} color={C.ink} />
        {count > 0 ? (
          <View style={styles.menuBadge}>
            <Text style={styles.menuBadgeText}>{count > 9 ? '9+' : count}</Text>
          </View>
        ) : null}
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableWithoutFeedback onPress={() => setOpen(false)}>
          <View style={styles.menuBackdrop}>
            <TouchableWithoutFeedback>
              <View style={[styles.menuPanel, { marginTop: insets.top + scale(52) }]}>
                <View style={styles.menuHeader}>
                  <Text style={styles.menuTitle}>Manual Check-Out</Text>
                  <TouchableOpacity style={styles.menuClose} onPress={() => setOpen(false)} hitSlop={8}>
                    <Ionicons name="close" size={scale(20)} color={C.ink} />
                  </TouchableOpacity>
                </View>
                <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: SH * 0.65 }}>
                  {count > 0 ? (
                    <MissedCheckOutsCard items={items} onAdd={handleAdd} flush />
                  ) : (
                    <View style={styles.menuEmpty}>
                      <Ionicons name="checkmark-circle-outline" size={scale(32)} color={C.textMuted} />
                      <Text style={styles.menuEmptyText}>No missed check-outs</Text>
                    </View>
                  )}
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: scale(20) },
  box: { backgroundColor: C.cardBg, borderRadius: scale(16), padding: scale(20), width: '100%' },
  title: { fontSize: scale(16), fontWeight: '800', color: C.ink, marginBottom: scale(4) },
  sub: { fontSize: scale(12), color: C.textSub, marginBottom: scale(16) },
  startBox: { backgroundColor: C.primaryLight, borderRadius: scale(10), paddingVertical: scale(10), paddingHorizontal: scale(12), marginBottom: scale(16) },
  startLabel: { fontSize: scale(11), fontWeight: '600', color: C.textSub },
  startValue: { fontSize: scale(14), fontWeight: '800', color: C.primary, marginTop: scale(2) },
  label: { fontSize: scale(12), fontWeight: '700', color: C.ink, marginBottom: scale(6) },
  input: { backgroundColor: C.inputBg, borderRadius: scale(10), borderWidth: 1, borderColor: C.border, paddingHorizontal: scale(12), paddingVertical: scale(10), color: C.ink, fontSize: scale(14) },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: scale(8), marginBottom: scale(16) },
  timeInput: { width: scale(58), textAlign: 'center' },
  colon: { fontSize: scale(16), fontWeight: '800', color: C.ink },
  ampmWrap: { flexDirection: 'row', marginLeft: scale(6), borderRadius: scale(10), borderWidth: 1, borderColor: C.border, overflow: 'hidden' },
  ampmBtn: { paddingVertical: scale(10), paddingHorizontal: scale(14), backgroundColor: C.inputBg },
  ampmBtnActive: { backgroundColor: C.primary },
  ampmText: { fontSize: scale(13), fontWeight: '700', color: C.textSub },
  ampmTextActive: { color: C.white },
  reasonInput: { minHeight: scale(90), textAlignVertical: 'top', marginBottom: scale(8) },
  error: { color: C.urgent, fontSize: scale(12), fontWeight: '600', marginBottom: scale(6) },
  note: { fontSize: scale(11), color: C.textMuted, marginBottom: scale(16) },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: scale(12) },
  cancelBtn: { paddingVertical: scale(10), paddingHorizontal: scale(16) },
  cancelText: { color: C.textSub, fontWeight: '700', fontSize: scale(14) },
  submitBtn: { backgroundColor: C.primary, paddingVertical: scale(10), paddingHorizontal: scale(20), borderRadius: scale(8), minWidth: scale(90), alignItems: 'center' },
  submitText: { color: C.white, fontWeight: '700', fontSize: scale(14) },

  missedWrap: { marginHorizontal: scale(20), marginBottom: scale(16), padding: scale(14), borderRadius: scale(14), backgroundColor: C.warningLight, borderWidth: 1, borderColor: C.warningBorder, gap: scale(10) },
  missedHeader: { flexDirection: 'row', alignItems: 'center', gap: scale(6) },
  missedTitle: { fontSize: scale(14), fontWeight: '800', color: C.ink },
  missedItem: { backgroundColor: C.white, borderRadius: scale(10), padding: scale(12), gap: scale(4), borderWidth: 1, borderColor: C.warningBorder },
  missedHospital: { fontSize: scale(13), fontWeight: '700', color: C.ink },
  missedInfo: { fontSize: scale(12), color: C.textSub, fontWeight: '600' },
  missedRejected: { fontSize: scale(12), color: C.urgent, fontWeight: '600' },
  missedBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: scale(6), backgroundColor: C.warning, paddingVertical: scale(10), borderRadius: scale(10), marginTop: scale(6) },
  missedBtnText: { color: C.white, fontSize: scale(12), fontWeight: '700' },
  pendingBadge: { flexDirection: 'row', alignItems: 'center', gap: scale(6), marginTop: scale(6) },
  pendingText: { fontSize: scale(12), fontWeight: '700', color: C.warning },

  menuBtn: { width: scale(42), height: scale(42), borderRadius: scale(12), backgroundColor: C.inputBg, alignItems: 'center', justifyContent: 'center' },
  menuBadge: { position: 'absolute', top: scale(-4), right: scale(-4), minWidth: scale(18), height: scale(18), borderRadius: scale(9), backgroundColor: C.urgent, alignItems: 'center', justifyContent: 'center', paddingHorizontal: scale(4) },
  menuBadgeText: { color: C.white, fontSize: scale(10), fontWeight: '800' },
  menuBackdrop: { flex: 1, backgroundColor: 'rgba(17,24,39,0.4)', alignItems: 'flex-start' },
  menuPanel: { marginLeft: scale(16), width: SW - scale(32), backgroundColor: C.cardBg, borderRadius: scale(16), padding: scale(14) },
  menuHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: scale(12) },
  menuTitle: { fontSize: scale(16), fontWeight: '800', color: C.ink },
  menuClose: { width: scale(32), height: scale(32), borderRadius: scale(16), backgroundColor: C.inputBg, alignItems: 'center', justifyContent: 'center' },
  menuEmpty: { alignItems: 'center', paddingVertical: scale(28), gap: scale(8) },
  menuEmptyText: { fontSize: scale(13), color: C.textMuted, fontWeight: '600' },
});