import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import RegularizeModal, { RegularizeTarget } from '../components/RegularizeModal';
import api from '../services/axiosConfig';

const { width: SW } = Dimensions.get('window');
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
  successLight: '#dcfce7',
  warning: '#f59e0b',
  warningLight: '#fffbeb',
};

const formatTimeAMPM = (timeStr?: string) => {
  if (!timeStr) return 'TBD';
  const parts = timeStr.split(':');
  if (parts.length < 2) return timeStr;
  let hours = parseInt(parts[0], 10);
  const minutes = parts[1];
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  return `${hours < 10 ? `0${hours}` : hours}:${minutes} ${ampm}`;
};

const formatIsoTime = (iso?: string | null) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

const formatDate = (dateStr: string) => {
  if (!dateStr) return '';
  const d = new Date(`${dateStr}T00:00:00`);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const getLocalTodayStr = () => {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
};

const hasShiftEnded = (dateStr: string, fromTime?: string, toTime?: string): boolean => {
  const today = getLocalTodayStr();
  if (dateStr < today) return true; // Past date shifts have ended
  if (dateStr > today) return false; // Future date shifts haven't started

  if (!toTime) return false;
  const parseMins = (t: string) => {
    const parts = t.split(':');
    if (parts.length < 2) return 0;
    return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
  };

  const startMins = fromTime ? parseMins(fromTime) : 0;
  const endMins = parseMins(toTime);

  if (fromTime && endMins <= startMins) {
    return false;
  }

  const now = new Date();
  const currentMins = now.getHours() * 60 + now.getMinutes();
  return currentMins >= endMins;
};

export const DutyShiftsDetailScreen = ({ route, navigation }: any) => {
  const { duty } = route.params || {};

  const [regularizeTarget, setRegularizeTarget] = useState<RegularizeTarget | null>(null);
  const [successToast, setSuccessToast] = useState('');
  const [dailyAttendance, setDailyAttendance] = useState<any[]>(duty?.daily_attendance || []);
  const [requests, setRequests] = useState<any[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const allAssignedDates: string[] =
    duty?.assigned_schedule?.assigned_dates || duty?.assigned_dates || [];

  const assignedDates = useMemo(() => {
    const today = getLocalTodayStr();
    return [...new Set(allAssignedDates)]
      .filter(d => d && d <= today)
      .sort((a, b) => b.localeCompare(a));
  }, [allAssignedDates]);

  const shiftFrom =
    duty?.shift_timings?.duty_from_time ||
    duty?.duty_from_time ||
    duty?.shift_time_from ||
    '09:00';
  const shiftTo =
    duty?.shift_timings?.duty_to_time ||
    duty?.duty_to_time ||
    duty?.shift_time_to ||
    '17:00';
  const requirementId = duty?.requirement_id || duty?.req_id;
  const assignmentId = duty?.assignment_id || duty?.assignment?._id || '';

  useEffect(() => {
    if (!successToast) return;
    const t = setTimeout(() => setSuccessToast(''), 2500);
    return () => clearTimeout(t);
  }, [successToast]);

  const requestFor = useCallback(
    (dateStr: string) => requests.find((r: any) => String(r?.duty_date).slice(0, 10) === dateStr),
    [requests],
  );

  const fetchRequests = useCallback(async () => {
    if (!assignmentId) return;
    try {
      const res = await api.get('/api/doctors/attendance/regularize', {
        params: { assignment_id: assignmentId },
      });
      setRequests(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch (err) {
      console.warn('Failed to fetch regularization requests:', err);
    }
  }, [assignmentId]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const refreshAttendanceData = useCallback(async () => {
    if (!requirementId) return;
    try {
      setIsRefreshing(true);
      const res = await api.get('/api/doctors/duties?tab=all');
      const allTabs = res.data?.tabs || {};
      const combinedDuties = [
        ...(allTabs.today || []),
        ...(allTabs.upcoming || []),
        ...(allTabs.past || []),
        ...(allTabs.assigned || []),
      ];

      const matchedDuty = combinedDuties.find(
        (d: any) => (d.req_id || d.requirement_id) === requirementId,
      );

      if (matchedDuty && Array.isArray(matchedDuty.daily_attendance)) {
        setDailyAttendance(matchedDuty.daily_attendance);
      }
    } catch (err) {
      console.warn('Failed to refresh updated attendance:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, [requirementId]);

  const openRegularize = (dateStr: string, attRow?: any) => {
    const existing = requestFor(dateStr);
    const editable = existing && existing.status === 'Pending' ? existing : null;

    setRegularizeTarget({
      assignmentId,
      dutyDate: dateStr,
      hospitalName: duty?.hospital?.name || duty?.hospital_details?.hospital_name,
      shiftFrom,
      shiftTo,
      sessions: Array.isArray(attRow?.sessions) ? attRow.sessions : [],
      totalHours: attRow?.total_duty_hours ?? null,
      requested: editable
        ? {
            check_in: editable.requested?.check_in,
            check_out: editable.requested?.check_out,
            reason: editable.reason,
            request_type: editable.request_type,
          }
        : null,
    });
  };

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor={C.white} />

      {successToast ? (
        <View pointerEvents="none" style={styles.toastContainer}>
          <Ionicons name="checkmark-circle" size={18} color={C.white} />
          <Text style={styles.toastText}>{successToast}</Text>
        </View>
      ) : null}

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={scale(22)} color={C.ink} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Duty Shifts & History</Text>
        <View style={{ width: scale(22) }}>
          {isRefreshing && <ActivityIndicator size="small" color={C.primary} />}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.dutySummaryCard}>
          <View style={styles.iconBox}>
            <Ionicons name="business" size={scale(24)} color={C.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.specialityText}>{duty?.speciality || 'Duty Details'}</Text>
            <Text style={styles.hospitalText}>
              {duty?.hospital?.name || duty?.hospital_details?.hospital_name || 'Hospital'}
            </Text>
            <Text style={styles.departmentText}>
              {duty?.department || 'Medical Department'}
            </Text>
          </View>
          <View style={styles.rateBadge}>
            <Text style={styles.rateText}>
              ₹{duty?.configured_rate || duty?.offered_rate || '—'}
            </Text>
          </View>
        </View>

        <View style={styles.sectionHeadingRow}>
          <Text style={styles.sectionHeading}>Scheduled Shifts & Attendance</Text>
          <Text style={styles.totalBadge}>{assignedDates.length} Shifts</Text>
        </View>

        {assignedDates.map((dateStr, idx) => {
          const attRow = dailyAttendance.find((att: any) => att.duty_date === dateStr);
          const sessions = Array.isArray(attRow?.sessions) ? attRow.sessions : [];

          const req = requestFor(dateStr);
          const hasReqTimings = !!(req?.requested?.check_in || req?.requested?.check_out);
          const reqPending = req?.status === 'Pending' && hasReqTimings;
          const reqRejected = req?.status === 'Rejected';

          const pendingReqSession = sessions
            .slice()
            .reverse()
            .find(
              (s: any) =>
                s?.manual_check_out_request &&
                (s.manual_check_out_request.requested_time ||
                  s.manual_check_out_request.requested_check_in_time),
            );
          const pendingReq = pendingReqSession?.manual_check_out_request;
          const hasLegacyPending =
            pendingReq?.review_status === 'pending' &&
            !!(pendingReq?.requested_time || pendingReq?.requested_check_in_time);

          const actualInTime =
            sessions[0]?.check_in?.timestamp || attRow?.check_in?.timestamp || null;

          const completedSessions = sessions.filter((s: any) => s?.check_out?.timestamp);
          const actualOutTime =
            completedSessions.length > 0
              ? completedSessions[completedSessions.length - 1].check_out.timestamp
              : attRow?.check_out?.timestamp || null;

          const inTime =
            actualInTime || (hasLegacyPending ? pendingReq?.requested_check_in_time : null);
          const outTime =
            actualOutTime || (hasLegacyPending ? pendingReq?.requested_time : null);

          const lastSession = sessions.length > 0 ? sessions[sessions.length - 1] : null;
          const isSessionCurrentlyOpen = !!(
            lastSession?.check_in?.timestamp && !lastSession?.check_out?.timestamp
          );

          const displayIn = reqPending ? req.requested?.check_in || '—' : formatIsoTime(inTime);
          const displayOut = reqPending ? req.requested?.check_out || '—' : formatIsoTime(outTime);
          const displayHours = reqPending
            ? req.requested?.hours
            : attRow?.total_duty_hours
            ? `${attRow.total_duty_hours}h`
            : '';

          const hasCheckIn = !!inTime;
          const hasCheckOut = !!outTime && !isSessionCurrentlyOpen;

          // Strict Under Review check so empty records don't trigger it
          const isPendingReview =
            reqPending ||
            hasLegacyPending ||
            (attRow?.status === 'pending_review' && (hasCheckIn || hasCheckOut));

          const shiftEnded = hasShiftEnded(dateStr, shiftFrom, shiftTo);
          const isMissed = shiftEnded && !hasCheckIn && !hasCheckOut && !isPendingReview;
          const canRegularize = shiftEnded || hasCheckOut || reqPending;

          const statusLabel = isPendingReview
            ? 'Under Review'
            : hasCheckOut
            ? 'Completed'
            : hasCheckIn
            ? 'In Progress'
            : isMissed
            ? 'Not Logged'
            : 'Upcoming';

          const badgeBg = isPendingReview
            ? C.warningLight
            : hasCheckOut
            ? C.successLight
            : isMissed
            ? '#fee2e2'
            : C.inputBg;

          const badgeColor = isPendingReview
            ? C.warning
            : hasCheckOut
            ? C.success
            : isMissed
            ? C.urgent
            : C.textSub;

          return (
            <View key={dateStr || idx} style={styles.shiftCard}>
              <View style={styles.shiftHeader}>
                <View style={styles.shiftDateWrap}>
                  <Ionicons name="calendar-outline" size={scale(16)} color={C.primary} />
                  <Text style={styles.shiftDateText}>{formatDate(dateStr)}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: badgeBg }]}>
                  <Text style={[styles.statusText, { color: badgeColor }]}>{statusLabel}</Text>
                </View>
              </View>

              <View style={styles.timingScheduleRow}>
                <Text style={styles.subLabel}>Scheduled Shift:</Text>
                <Text style={styles.subValue}>
                  {formatTimeAMPM(shiftFrom)} - {formatTimeAMPM(shiftTo)}
                </Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.historyRow}>
                <View style={styles.historyCol}>
                  <View style={styles.historyLabelWrap}>
                    <Ionicons name="log-in-outline" size={scale(14)} color={C.success} />
                    <Text style={styles.historyLabel}>Check In</Text>
                  </View>
                  <Text style={styles.historyTime}>{displayIn}</Text>
                  {reqPending ||
                  (isPendingReview &&
                    pendingReq?.requested_check_in_time &&
                    !attRow?.check_in?.timestamp) ? (
                    <Text style={styles.pendingHintText}>(Pending Approval)</Text>
                  ) : null}
                </View>

                <View style={styles.historyCol}>
                  <View style={styles.historyLabelWrap}>
                    <Ionicons name="log-out-outline" size={scale(14)} color={C.urgent} />
                    <Text style={styles.historyLabel}>Check Out</Text>
                  </View>
                  <Text style={styles.historyTime}>{displayOut}</Text>
                  {reqPending ||
                  (isPendingReview &&
                    pendingReq?.requested_time &&
                    !attRow?.check_out?.timestamp) ? (
                    <Text style={styles.pendingHintText}>(Pending Approval)</Text>
                  ) : null}
                </View>

                {displayHours ? (
                  <View style={styles.historyCol}>
                    <View style={styles.historyLabelWrap}>
                      <Ionicons name="time-outline" size={scale(14)} color={C.primary} />
                      <Text style={styles.historyLabel}>Total Hrs</Text>
                    </View>
                    <Text style={styles.historyTime}>{displayHours}</Text>
                  </View>
                ) : null}
              </View>

              {reqRejected ? (
                <Text style={styles.rejectedText}>
                  Last request was rejected{req?.decision_note ? `: ${req.decision_note}` : '.'}
                </Text>
              ) : null}

              <View style={styles.cardActionsRow}>
                {canRegularize ? (
                  <TouchableOpacity
                    style={styles.regularizeBtn}
                    onPress={() => openRegularize(dateStr, attRow)}
                  >
                    <Ionicons
                      name={reqPending ? 'create-outline' : 'build-outline'}
                      size={scale(14)}
                      color={C.primary}
                    />
                    <Text style={styles.regularizeBtnText}>
                      {reqPending ? 'Edit Regularization' : 'Regularize Timings'}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.regularizeLockedWrap}>
                    <Ionicons name="time-outline" size={scale(13)} color={C.textMuted} />
                    <Text style={styles.regularizeLockedText}>
                      {hasCheckIn
                        ? 'Shift in progress — use Check Out on Home/Duties'
                        : 'Regularization available after shift ends'}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>

      <RegularizeModal
        visible={!!regularizeTarget}
        target={regularizeTarget}
        onClose={() => setRegularizeTarget(null)}
        onSubmitted={async (msg, request) => {
          setRegularizeTarget(null);
          setSuccessToast(msg);
          if (request?._id) {
            setRequests(prev => [request, ...prev.filter((r: any) => r._id !== request._id)]);
          }
          await Promise.all([fetchRequests(), refreshAttendanceData()]);
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background },
  toastContainer: {
    position: 'absolute',
    top: scale(60),
    alignSelf: 'center',
    backgroundColor: C.ink,
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
    paddingHorizontal: scale(16),
    paddingVertical: scale(10),
    borderRadius: scale(20),
    zIndex: 9999,
  },
  toastText: { color: C.white, fontSize: scale(13), fontWeight: '700' },
  header: {
    height: scale(52),
    backgroundColor: C.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(16),
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  backBtn: { width: scale(36), height: scale(36), justifyContent: 'center' },
  headerTitle: { fontSize: scale(16), fontWeight: '800', color: C.ink },
  scroll: { padding: scale(16), paddingBottom: scale(40) },
  dutySummaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.white,
    padding: scale(16),
    borderRadius: scale(14),
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: scale(20),
    gap: scale(12),
  },
  iconBox: {
    width: scale(46),
    height: scale(46),
    borderRadius: scale(12),
    backgroundColor: C.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  specialityText: { fontSize: scale(15), fontWeight: '800', color: C.ink },
  hospitalText: { fontSize: scale(13), fontWeight: '600', color: C.textSub, marginTop: scale(2) },
  departmentText: { fontSize: scale(12), color: C.textMuted, marginTop: scale(2) },
  rateBadge: {
    backgroundColor: C.primaryLight,
    paddingHorizontal: scale(10),
    paddingVertical: scale(6),
    borderRadius: scale(8),
  },
  rateText: { fontSize: scale(13), fontWeight: '800', color: C.primary },
  sectionHeadingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scale(12),
  },
  sectionHeading: { fontSize: scale(15), fontWeight: '800', color: C.ink },
  totalBadge: { fontSize: scale(12), fontWeight: '700', color: C.textSub },
  shiftCard: {
    backgroundColor: C.white,
    borderRadius: scale(14),
    padding: scale(14),
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: scale(14),
  },
  shiftHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scale(8),
  },
  shiftDateWrap: { flexDirection: 'row', alignItems: 'center', gap: scale(6) },
  shiftDateText: { fontSize: scale(14), fontWeight: '700', color: C.ink },
  statusBadge: { paddingHorizontal: scale(8), paddingVertical: scale(4), borderRadius: scale(6) },
  statusText: { fontSize: scale(11), fontWeight: '700' },
  timingScheduleRow: { flexDirection: 'row', alignItems: 'center', gap: scale(6) },
  subLabel: { fontSize: scale(12), color: C.textMuted, fontWeight: '500' },
  subValue: { fontSize: scale(12), color: C.ink, fontWeight: '700' },
  divider: { height: 1, backgroundColor: C.border, marginVertical: scale(10) },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: scale(10),
  },
  historyCol: { flex: 1 },
  historyLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
    marginBottom: scale(2),
  },
  historyLabel: { fontSize: scale(11), color: C.textSub, fontWeight: '600' },
  historyTime: { fontSize: scale(13), fontWeight: '800', color: C.ink },
  pendingHintText: {
    fontSize: scale(10),
    color: C.warning,
    fontWeight: '600',
    marginTop: scale(2),
  },
  rejectedText: {
    fontSize: scale(11),
    color: C.urgent,
    fontWeight: '600',
    marginBottom: scale(8),
  },
  cardActionsRow: {
    borderTopWidth: 1,
    borderTopColor: C.inputBg,
    paddingTop: scale(10),
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  regularizeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
    paddingVertical: scale(6),
    paddingHorizontal: scale(12),
    borderRadius: scale(8),
    backgroundColor: C.primaryLight,
  },
  regularizeBtnText: { fontSize: scale(12), fontWeight: '700', color: C.primary },
  regularizeLockedWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(5),
    paddingVertical: scale(4),
  },
  regularizeLockedText: {
    fontSize: scale(11),
    fontWeight: '600',
    color: C.textMuted,
    fontStyle: 'italic',
  },
});