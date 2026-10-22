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

export type MissedCheckOut = {
  assignment_id: string;
  requirement_id: string;
  duty_date: string;
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
  checkInTime?: string | null;
  checkOutTime?: string | null;
  shiftFrom?: string | null;
  shiftTo?: string | null;
};

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
  if (!ymd) return '';
  const d = new Date(`${ymd}T00:00:00`);
  if (isNaN(d.getTime())) return ymd;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);

type ModalProps = {
  visible: boolean;
  target: ManualTarget | null;
  onClose: () => void;
  onSubmitted: (message: string) => void;
};

export const ManualCheckOutModal = ({ visible, target, onClose, onSubmitted }: ModalProps) => {
  const [startHour, setStartHour] = useState('');
  const [startMin, setStartMin] = useState('');
  const [startAmpm, setStartAmpm] = useState<'AM' | 'PM'>('AM');

  const [endHour, setEndHour] = useState('');
  const [endMin, setEndMin] = useState('');
  const [endAmpm, setEndAmpm] = useState<'AM' | 'PM'>('PM');

  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (visible && target) {
      if (target.checkInTime) {
        const d = new Date(target.checkInTime);
        if (!isNaN(d.getTime())) {
          let h = d.getHours();
          const m = d.getMinutes();
          const ampmVal = h >= 12 ? 'PM' : 'AM';
          h = h % 12 || 12;
          setStartHour(String(h));
          setStartMin(pad(m));
          setStartAmpm(ampmVal);
        }
      } else {
        setStartHour('');
        setStartMin('');
        setStartAmpm('AM');
      }

      if (target.checkOutTime) {
        const d = new Date(target.checkOutTime);
        if (!isNaN(d.getTime())) {
          let h = d.getHours();
          const m = d.getMinutes();
          const ampmVal = h >= 12 ? 'PM' : 'AM';
          h = h % 12 || 12;
          setEndHour(String(h));
          setEndMin(pad(m));
          setEndAmpm(ampmVal);
        }
      } else {
        setEndHour('');
        setEndMin('');
        setEndAmpm('PM');
      }

      setReason('');
      setError('');
      setLoading(false);
    }
  }, [visible, target]);

  const submit = async () => {
    if (!target || loading) return;

    const sh = parseInt(startHour, 10);
    const sm = parseInt(startMin, 10);
    const eh = parseInt(endHour, 10);
    const em = parseInt(endMin, 10);

    if (isNaN(sh) || sh < 1 || sh > 12 || isNaN(sm) || sm < 0 || sm > 59) {
      setError('Please provide a valid start time (Check-in).');
      return;
    }

    if (isNaN(eh) || eh < 1 || eh > 12 || isNaN(em) || em < 0 || em > 59) {
      setError('Please provide a valid end time (Check-out).');
      return;
    }

    if (!reason.trim()) {
      setError('Reason for regularization is required.');
      return;
    }

    const startH24 = (sh % 12) + (startAmpm === 'PM' ? 12 : 0);
    const endH24 = (eh % 12) + (endAmpm === 'PM' ? 12 : 0);

    setLoading(true);
    setError('');

    try {
      const { data } = await api.post('/api/doctors/regularize-shift', {
        requirement_id: target.requirementId,
        duty_date: target.dutyDate,
        check_in_time: `${pad(startH24)}:${pad(sm)}`,
        check_out_time: `${pad(endH24)}:${pad(em)}`,
        reason: reason.trim(),
      });
      onSubmitted(data?.message || 'Regularization request submitted for approval.');
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Could not submit regularization request.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.overlay}>
        <View style={styles.box}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.title}>Shift Regularization</Text>
              <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close" size={scale(20)} color={C.ink} />
              </TouchableOpacity>
            </View>
            <Text style={styles.sub}>
              {target?.hospitalName ? `${target.hospitalName} · ` : ''}
              {target?.dutyDate ? fmtDate(target.dutyDate) : ''}
            </Text>

            {/* Check-In / Start Time Input */}
            <Text style={styles.label}>Start Time (Check-In)</Text>
            <View style={styles.timeRow}>
              <TextInput
                style={[styles.input, styles.timeInput]}
                placeholder="HH"
                placeholderTextColor={C.textMuted}
                keyboardType="number-pad"
                maxLength={2}
                value={startHour}
                onChangeText={setStartHour}
              />
              <Text style={styles.colon}>:</Text>
              <TextInput
                style={[styles.input, styles.timeInput]}
                placeholder="MM"
                placeholderTextColor={C.textMuted}
                keyboardType="number-pad"
                maxLength={2}
                value={startMin}
                onChangeText={setStartMin}
              />
              <View style={styles.ampmWrap}>
                {(['AM', 'PM'] as const).map(v => (
                  <TouchableOpacity
                    key={v}
                    style={[styles.ampmBtn, startAmpm === v && styles.ampmBtnActive]}
                    onPress={() => setStartAmpm(v)}
                  >
                    <Text style={[styles.ampmText, startAmpm === v && styles.ampmTextActive]}>{v}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Check-Out / End Time Input */}
            <Text style={styles.label}>End Time (Check-Out)</Text>
            <View style={styles.timeRow}>
              <TextInput
                style={[styles.input, styles.timeInput]}
                placeholder="HH"
                placeholderTextColor={C.textMuted}
                keyboardType="number-pad"
                maxLength={2}
                value={endHour}
                onChangeText={setEndHour}
              />
              <Text style={styles.colon}>:</Text>
              <TextInput
                style={[styles.input, styles.timeInput]}
                placeholder="MM"
                placeholderTextColor={C.textMuted}
                keyboardType="number-pad"
                maxLength={2}
                value={endMin}
                onChangeText={setEndMin}
              />
              <View style={styles.ampmWrap}>
                {(['AM', 'PM'] as const).map(v => (
                  <TouchableOpacity
                    key={v}
                    style={[styles.ampmBtn, endAmpm === v && styles.ampmBtnActive]}
                    onPress={() => setEndAmpm(v)}
                  >
                    <Text style={[styles.ampmText, endAmpm === v && styles.ampmTextActive]}>{v}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Reason Input */}
            <Text style={styles.label}>Reason</Text>
            <TextInput
              style={[styles.input, styles.reasonInput]}
              placeholder="E.g., Emergency OT overtime, biometrics network delay"
              placeholderTextColor={C.textMuted}
              multiline
              value={reason}
              onChangeText={setReason}
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Text style={styles.note}>Back office will review your submitted shift regularization times.</Text>

            <View style={styles.actions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={loading}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.submitBtn, loading && { opacity: 0.7 }]} onPress={submit} disabled={loading}>
                {loading ? <ActivityIndicator size="small" color={C.white} /> : <Text style={styles.submitText}>Submit</Text>}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export const MissedCheckOutsCard = ({
  items,
  onAdd,
  flush,
}: {
  items: MissedCheckOut[];
  onAdd: (item: MissedCheckOut) => void;
  flush?: boolean;
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
              <Text style={styles.missedBtnText}>Regularize Timings</Text>
            </TouchableOpacity>
          )}
        </View>
      ))}
    </View>
  );
};

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
                  <Text style={styles.menuTitle}>Missed Shifts & Attendance</Text>
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
                      <Text style={styles.menuEmptyText}>All shifts checked out properly</Text>
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
  box: { backgroundColor: C.cardBg, borderRadius: scale(16), padding: scale(20), width: '100%', maxHeight: SH * 0.85 },
  modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: scale(16), fontWeight: '800', color: C.ink, marginBottom: scale(4) },
  sub: { fontSize: scale(12), color: C.textSub, marginBottom: scale(16) },
  label: { fontSize: scale(12), fontWeight: '700', color: C.ink, marginBottom: scale(6) },
  input: { backgroundColor: C.inputBg, borderRadius: scale(10), borderWidth: 1, borderColor: C.border, paddingHorizontal: scale(12), paddingVertical: scale(10), color: C.ink, fontSize: scale(14) },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: scale(8), marginBottom: scale(14) },
  timeInput: { width: scale(58), textAlign: 'center' },
  colon: { fontSize: scale(16), fontWeight: '800', color: C.ink },
  ampmWrap: { flexDirection: 'row', marginLeft: scale(6), borderRadius: scale(10), borderWidth: 1, borderColor: C.border, overflow: 'hidden' },
  ampmBtn: { paddingVertical: scale(10), paddingHorizontal: scale(14), backgroundColor: C.inputBg },
  ampmBtnActive: { backgroundColor: C.primary },
  ampmText: { fontSize: scale(13), fontWeight: '700', color: C.textSub },
  ampmTextActive: { color: C.white },
  reasonInput: { minHeight: scale(80), textAlignVertical: 'top', marginBottom: scale(8) },
  error: { color: C.urgent, fontSize: scale(12), fontWeight: '600', marginBottom: scale(6) },
  note: { fontSize: scale(11), color: C.textMuted, marginBottom: scale(16) },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: scale(12), marginTop: scale(8) },
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