import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Dimensions,
  StatusBar,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  Animated,
  LayoutAnimation,
  Platform,
  UIManager,
  PermissionsAndroid,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Geolocation from '@react-native-community/geolocation';
import MapView, { Marker, Circle } from 'react-native-maps';
import api from '../services/axiosConfig';
import {
  ManualCheckOutModal,
  MissedCheckOutsCard,
  fetchMissedCheckOuts,
  MissedCheckOut,
  ManualTarget,
} from '../components/ManualCheckOut';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

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
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  success: '#10b981',
  successLight: '#d1fae5',
  dangerLight: '#fee2e2',
  danger: '#ef4444',
  white: '#ffffff',
  urgent: '#ef4444',
};

type TabType = 'Today' | 'Invited' | 'Interested' | 'Assigned' | 'Upcoming' | 'Past' | 'Cancelled';

const requestLocationPermission = async (): Promise<boolean> => {
  if (Platform.OS === 'android') {
    const already = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    );
    if (already) return true;
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      {
        title: 'Location Permission',
        message: 'We need your location to verify you are at the hospital.',
        buttonPositive: 'Allow',
        buttonNegative: 'Deny',
      },
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  }
  return true;
};

Geolocation.setRNConfiguration({
  skipPermissionRequests: false,
  authorizationLevel: 'whenInUse',
  locationProvider: 'auto',
});

type Coords = { latitude: number; longitude: number; accuracy: number };

const getCurrentPosition = (): Promise<Coords> =>
  new Promise((resolve, reject) => {
    let done = false;
    let failures = 0;
    const onSuccess = (position: any) => {
      if (done) return;
      done = true;
      resolve({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
      });
    };
    const onError = (error: any) => {
      failures += 1;
      if (!done && failures >= 2) reject(error);
    };
    Geolocation.getCurrentPosition(onSuccess, onError, {
      enableHighAccuracy: false,
      timeout: 4000,
      maximumAge: 60000,
    });
    Geolocation.getCurrentPosition(onSuccess, onError, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 10000,
    });
  });

const GEOFENCE_RADIUS_METERS = 500;
const distanceMetersBetween = (
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
) => {
  const R = 6371000;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s)));
};

const formatTimestampTime = (iso?: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
};

const isDutyTimeActionable = (
  _fromTime?: string,
  _toTime?: string,
  _isCheckedIn?: boolean,
  isPermanentlyCheckedOut?: boolean,
) => {
  return !isPermanentlyCheckedOut;
};

const DutiesScreen = ({ route, navigation }: any) => {
  const initialTab = route?.params?.defaultTab || 'Today';
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  const tabs: TabType[] = [
    'Today',
    'Invited',
    'Interested',
    'Assigned',
    'Upcoming',
    'Past',
    'Cancelled',
  ];

  const [declineModalVisible, setDeclineModalVisible] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState('');

  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [missedCheckOuts, setMissedCheckOuts] = useState<MissedCheckOut[]>([]);
  const [manualTarget, setManualTarget] = useState<ManualTarget | null>(null);

  const [mapVisible, setMapVisible] = useState(false);
  const [mapDuty, setMapDuty] = useState<any>(null);
  const [mapType, setMapType] = useState<'check-in' | 'check-out'>('check-in');
  const [mapCoords, setMapCoords] = useState<Coords | null>(null);
  const [mapLocating, setMapLocating] = useState(false);
  const mapRef = useRef<MapView>(null);

  const [toastMessage, setToastMessage] = useState('');
  const toastFadeAnim = useRef(new Animated.Value(0)).current;

  const requestIdRef = useRef(0);

  useEffect(() => {
    if (route?.params?.defaultTab && route.params.defaultTab !== activeTab) {
      setJobs([]);
      setLoading(true);
      setActiveTab(route.params.defaultTab);
    }
  }, [route?.params?.defaultTab]);

  useEffect(() => {
    if (!mapVisible || !mapCoords || !mapRef.current) return;
    const hc = mapDuty?.hospital?.coordinates;
    const points = [{ latitude: mapCoords.latitude, longitude: mapCoords.longitude }];
    if (hc?.latitude && hc?.longitude) {
      points.push({ latitude: hc.latitude, longitude: hc.longitude });
    }
    const t = setTimeout(() => {
      if (points.length > 1) {
        mapRef.current?.fitToCoordinates(points, {
          edgePadding: { top: 80, right: 60, bottom: 80, left: 60 },
          animated: true,
        });
      } else {
        mapRef.current?.animateToRegion(
          { ...points[0], latitudeDelta: 0.005, longitudeDelta: 0.005 },
          400,
        );
      }
    }, 300);
    return () => clearTimeout(t);
  }, [mapVisible, mapCoords, mapDuty]);

  const showToast = useCallback(
    (message: string) => {
      setToastMessage(message);
      Animated.sequence([
        Animated.timing(toastFadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.delay(1800),
        Animated.timing(toastFadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    },
    [toastFadeAnim],
  );

  const fetchDuties = useCallback(
    async (isRefresh = false) => {
      const reqId = ++requestIdRef.current;
      const isStale = () => reqId !== requestIdRef.current;

      if (!isRefresh) setLoading(true);
      try {
        const currentTab = activeTab.toLowerCase();

        if (currentTab === 'today') {
          const response = await api.get('/api/doctors/today-duties');
          if (isStale()) return;
          const todayList =
            response.data?.success && response.data?.has_today_duty
              ? response.data.today_duties
              : [];
          setJobs(Array.isArray(todayList) ? todayList : []);
          const missed = await fetchMissedCheckOuts();
          if (isStale()) return;
          setMissedCheckOuts(missed);
          return;
        }

        const response = await api.get('/api/doctors/duties', { params: { tab: 'all' } });
        if (isStale()) return;

        if (response.data?.success) {
          // Robust fallback supporting both camelCase and exact tab keys
          const tabsData = response.data.tabs || {};
          const tabList =
            tabsData[currentTab] ||
            tabsData[activeTab] ||
            response.data[currentTab] ||
            [];
          setJobs(Array.isArray(tabList) ? tabList : []);
        } else {
          setJobs([]);
        }
      } catch (error) {
        if (isStale()) return;
        console.error('[DutiesScreen] fetchDuties error:', error);
        setJobs([]);
      } finally {
        if (!isStale()) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [activeTab],
  );

  useEffect(() => {
    fetchDuties();
  }, [fetchDuties]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDuties(true);
  };

  const handleTabChange = (tab: TabType) => {
    if (tab === activeTab) return;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setJobs([]);
    setLoading(true);
    setActiveTab(tab);
  };

  const openManualCheckOut = (duty: any) => {
    setManualTarget({
      requirementId: duty.requirement_id || duty.req_id || duty._id,
      dutyDate: duty.attendance?.duty_date || new Date().toISOString().split('T')[0],
      hospitalName:
        duty.hospital?.name || duty.hospital_details?.hospital_name || duty.hospital_name,
      checkInTime: duty.attendance?.check_in_time,
      checkOutTime: duty.attendance?.check_out_time,
      shiftFrom: duty.shift_timings?.duty_from_time || duty.shift_time_from || duty.duty_from_time,
      shiftTo: duty.shift_timings?.duty_to_time || duty.shift_time_to || duty.duty_to_time,
    });
  };

  const openManualForMissed = (item: MissedCheckOut) => {
    setManualTarget({
      requirementId: item.requirement_id,
      dutyDate: item.duty_date,
      hospitalName: item.hospital_name,
      checkInTime: item.first_check_in_time,
      shiftFrom: item.shift_from,
      shiftTo: item.shift_to,
    });
  };

  const openAttendanceMap = async (duty: any, type: 'check-in' | 'check-out') => {
    const reqId = duty?.requirement_id || duty?.req_id || duty?._id;
    if (!reqId || attendanceLoading) return;

    if (type === 'check-in') {
      const activeDuty = jobs.find(
        d => d?.attendance?.is_checked_in && !d?.attendance?.is_checked_out,
      );
      const activeReqId = activeDuty?.requirement_id || activeDuty?.req_id || activeDuty?._id;
      if (activeDuty && activeReqId !== reqId) {
        showToast('First you have to check out or close the active duty.');
        return;
      }
    }

    setMapDuty(duty);
    setMapType(type);
    setMapCoords(null);
    setMapVisible(true);
    setMapLocating(true);

    const hasPermission = await requestLocationPermission();
    if (!hasPermission) {
      setMapLocating(false);
      setMapVisible(false);
      showToast('Location permission is required');
      return;
    }
    try {
      setMapCoords(await getCurrentPosition());
    } catch (locErr: any) {
      showToast('Unable to get location. Turn on GPS and try again.');
    } finally {
      setMapLocating(false);
    }
  };

  const closeAttendanceMap = () => {
    if (attendanceLoading) return;
    setMapVisible(false);
  };

  const handleAttendance = async (duty: any, type: 'check-in' | 'check-out', coords: Coords) => {
    const reqId = duty?.requirement_id || duty?.req_id || duty?._id;
    if (!reqId || attendanceLoading) return;

    setAttendanceLoading(true);
    try {
      const { data } = await api.post(`/api/doctors/${type}`, {
        requirement_id: reqId,
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracy: coords.accuracy,
      });

      setJobs(prev =>
        prev.map(d => {
          const dReqId = d?.requirement_id || d?.req_id || d?._id;
          if (dReqId !== reqId) return d;
          const att = d.attendance || {};
          const existingSessions = Array.isArray(att.sessions) ? att.sessions : [];

          if (type === 'check-in') {
            const newCheckInIso =
              data?.data?.latest_check_in?.timestamp ||
              data?.data?.check_in?.timestamp ||
              new Date().toISOString();
            const updatedSessions = data?.data?.sessions || [
              ...existingSessions,
              { check_in: { timestamp: newCheckInIso }, check_out: null },
            ];
            const oldestCheckInTime =
              updatedSessions[0]?.check_in?.timestamp || att.check_in_time || newCheckInIso;

            return {
              ...d,
              attendance: {
                ...att,
                is_checked_in: true,
                is_checked_out: false,
                can_check_in: false,
                can_check_out: true,
                check_in_status: 'Checked In',
                check_in_time: oldestCheckInTime,
                check_out_time: att.check_out_time || null,
                sessions: updatedSessions,
              },
            };
          } else {
            const newestCheckOutIso =
              data?.data?.check_out?.timestamp || new Date().toISOString();
            const updatedSessions =
              data?.data?.sessions ||
              existingSessions.map((s: any, idx: number) =>
                idx === existingSessions.length - 1
                  ? { ...s, check_out: { timestamp: newestCheckOutIso } }
                  : s,
              );
            const oldestCheckInTime =
              updatedSessions[0]?.check_in?.timestamp || att.check_in_time;

            return {
              ...d,
              attendance: {
                ...att,
                is_checked_in: false,
                is_checked_out: true,
                can_check_out: false,
                can_check_in: !!data?.data?.can_check_in_again,
                check_in_status: data?.data?.can_check_in_again
                  ? 'Checked Out Early'
                  : 'Completed',
                check_in_time: oldestCheckInTime,
                check_out_time: newestCheckOutIso,
                sessions: updatedSessions,
              },
            };
          }
        }),
      );

      setMapVisible(false);
      showToast(
        data?.message || (type === 'check-in' ? 'Check-in successful!' : 'Check-out successful!'),
      );
      fetchDuties(true);
    } catch (error: any) {
      if (error.response?.data?.manual_check_out_required) {
        setMapVisible(false);
        showToast(error.response?.data?.message || 'Please submit your timings.');
        openManualCheckOut(duty);
        fetchDuties(true);
      } else {
        showToast(error.response?.data?.message || `Error during ${type}`);
      }
    } finally {
      setAttendanceLoading(false);
    }
  };

  const handleUpdateDutyStatus = async (
    requirementId: string,
    action: 'Confirmed' | 'Declined',
    reason?: string,
  ) => {
    if (!requirementId) {
      showToast('Invalid requirement ID');
      return;
    }
    try {
      setLoading(true);
      const response = await api.post('/api/doctors/duty-status', {
        requirement_id: requirementId,
        action: action,
        decline_reason: reason || '',
      });
      if (response.data?.success) {
        setDeclineModalVisible(false);
        setDeclineReason('');
        showToast(action === 'Confirmed' ? 'Duty confirmed!' : 'Duty declined');
        fetchDuties(true);
      }
    } catch (error: any) {
      showToast(error.response?.data?.message || 'Failed to update duty status');
    } finally {
      setLoading(false);
    }
  };

  const handleRespondToInvitation = async (
    invitationId: string,
    responseStatus: 'Interested' | 'Not Interested',
  ) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setJobs(prev => prev.filter(job => job?.invitation_id !== invitationId));
    try {
      const response = await api.post('/api/doctors/invited-jobs/respond', {
        invitation_id: invitationId,
        response: responseStatus,
      });
      if (response.data.success) showToast(`Marked as ${responseStatus}`);
    } catch (error) {
      showToast('Failed to record response');
      fetchDuties(true);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Timing not specified';
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatShortDate = (dateString?: string) => {
    if (!dateString) return '';
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
  };

  const formatAMPM = (timeString?: string) => {
    if (!timeString) return '';
    if (/(am|pm)/i.test(timeString)) return timeString;
    const [hourString, minute] = timeString.split(':');
    if (!hourString || !minute) return timeString;
    let hour = parseInt(hourString, 10);
    if (isNaN(hour)) return timeString;
    const ampm = hour >= 12 ? 'PM' : 'AM';
    hour = hour % 12 || 12;
    return `${hour}:${minute} ${ampm}`;
  };

  const renderItem = ({ item }: { item: any }) => {
    if (!item) return null;

    const isToday = activeTab === 'Today';
    const jobReqId = item.req_id || item.requirement_id || item._id || '';

    const hospitalName =
      item.hospital?.name ||
      item.hospital_details?.hospital_name ||
      item.hospital_name ||
      'Hospital';

    const loc = isToday
      ? item.hospital || {}
      : item.req_location_details || item.hospital || item;

    const area = loc?.area || '';
    const city = loc?.district || loc?.dist || loc?.city || item.city || '';
    const state = loc?.state || item.state || '';
    const pincode = loc?.pincode || loc?.pin || item.pincode || '';

    const locationParts = [area, city, state].filter(Boolean);
    const uniqueLocationParts = [...new Set(locationParts)];
    let locationString = uniqueLocationParts.join(', ');
    if (pincode) locationString = locationString ? `${locationString} - ${pincode}` : pincode;
    if (!locationString) locationString = 'Location unavailable';

    const shiftTimeFrom = isToday
      ? item.shift_timings?.duty_from_time || item.shift_time_from || item.duty_from_time
      : item.shift_time_from || item.duty_from_time || item.shift_timings?.duty_from_time;

    const shiftTimeTo = isToday
      ? item.shift_timings?.duty_to_time || item.shift_time_to || item.duty_to_time
      : item.shift_time_to || item.duty_to_time || item.shift_timings?.duty_to_time;

    const assignedDates: string[] =
      item.assigned_dates ||
      item.assignment_info?.assigned_dates ||
      item.assigned_schedule?.assigned_dates ||
      [];
    const hasIndividualDates = assignedDates.length > 0;

    const assignedTodayDates: string[] = isToday
      ? item.assigned_schedule?.assigned_dates || assignedDates
      : [];
    const remainingTodayDates: string[] = isToday
      ? item.assigned_schedule?.remaining_dates || []
      : [];

    const rawStartDate =
      item.shift_date_from ||
      item.shift_start_date ||
      item.assigned_schedule?.start_date ||
      assignedDates[0];
    const rawEndDate =
      item.shift_date_to ||
      item.shift_end_date ||
      item.assigned_schedule?.end_date ||
      assignedDates[assignedDates.length - 1];

    let displayDatesRange = '';
    if (!isToday && !hasIndividualDates) {
      const start = formatDate(rawStartDate);
      const end = rawEndDate ? formatDate(rawEndDate) : start;
      displayDatesRange = start === end ? start : `${start} to ${end}`;
    }

    const isExpired =
      !isToday && rawEndDate
        ? new Date(rawEndDate).setHours(0, 0, 0, 0) < new Date().setHours(0, 0, 0, 0)
        : false;
    const isInvitedOrInterested = activeTab === 'Invited' || activeTab === 'Interested';
    const displayRate = isToday
      ? item.configured_rate || item.offered_rate || '0'
      : isInvitedOrInterested
      ? item.offered_rate || '0'
      : item.configured_rate || item.offered_rate || '0';

    const attendance = isToday ? item.attendance : null;
    const sessions = Array.isArray(attendance?.sessions) ? attendance.sessions : [];

    const oldestCheckInIso =
      sessions[0]?.check_in?.timestamp || attendance?.check_in_time || null;

    const completedSessions = sessions.filter((s: any) => s?.check_out?.timestamp);
    const newestCheckOutIso =
      completedSessions.length > 0
        ? completedSessions[completedSessions.length - 1].check_out.timestamp
        : attendance?.check_out_time || null;

    const isDutyCompleted =
      (!!attendance?.is_checked_out && !attendance?.can_check_in) ||
      item.duty_state === 'COMPLETED';
    const canCheckIn = !!attendance?.can_check_in;
    const canCheckOut = !!attendance?.can_check_out;
    const checkInTimeStr = formatTimestampTime(oldestCheckInIso);
    const checkOutTimeStr = formatTimestampTime(newestCheckOutIso);
    const manualRequired = !!attendance?.manual_check_out_required;
    const manualPending = !!attendance?.manual_check_out_pending;

    const showActions = isToday
      ? isDutyTimeActionable(
          shiftTimeFrom,
          shiftTimeTo,
          attendance?.is_checked_in,
          attendance?.is_checked_out && !attendance?.can_check_in,
        )
      : false;

    return (
      <TouchableOpacity
        style={styles.jobCard}
        activeOpacity={isInvitedOrInterested ? 1 : 0.85}
        onPress={() => {
          if (isInvitedOrInterested) return; // Prevent navigation on Invited/Interested tabs to avoid errors
          if (isToday) {
            navigation.navigate('DutyShiftsDetailScreen', { duty: item });
            return;
          }
          navigation.navigate('JobDetails', {
            jobDetails: item,
            isAssigned: ['Assigned', 'Upcoming', 'Past'].includes(activeTab as string),
            jobStatus: activeTab,
          });
        }}
      >
        <View style={styles.cardHeader}>
          <View style={styles.titleRow}>
            <Text style={styles.jobTitle} numberOfLines={1}>
              {item.speciality || 'General Duty'} {item.department ? `- ${item.department}` : ''}
            </Text>
            {(item.vacancy_status === 'Urgent' ||
              (isToday && item.duty_state === 'IN_PROGRESS')) && (
              <View
                style={[
                  styles.badge,
                  isToday &&
                    item.duty_state === 'IN_PROGRESS' && { backgroundColor: C.primaryLight },
                ]}
              >
                <Text
                  style={[
                    styles.badgeText,
                    isToday && item.duty_state === 'IN_PROGRESS' && { color: C.primary },
                  ]}
                >
                  {isToday && item.duty_state === 'IN_PROGRESS' ? 'In Progress' : 'Urgent'}
                </Text>
              </View>
            )}
          </View>
          {activeTab !== 'Invited' && activeTab !== 'Interested' && (
            <Text style={styles.hospitalName}>{hospitalName}</Text>
          )}
          <Text style={styles.locationText} numberOfLines={2}>
            <Ionicons name="location-outline" size={scale(12)} color={C.textMuted} />{' '}
            {locationString}
          </Text>
        </View>

        <View style={styles.cardDetails}>
          {!isToday && (
            <View style={[styles.detailRow, hasIndividualDates && { alignItems: 'flex-start' }]}>
              <Ionicons
                name="calendar-outline"
                size={scale(16)}
                color={C.textSub}
                style={hasIndividualDates ? { marginTop: scale(2) } : {}}
              />
              <View style={{ flex: 1 }}>
                {hasIndividualDates ? (
                  <>
                    <View style={styles.dateChipContainer}>
                      {assignedDates.map((d: string) => (
                        <View key={d} style={styles.dateChip}>
                          <Text style={styles.dateChipText}>{formatShortDate(d)}</Text>
                        </View>
                      ))}
                    </View>
                    <Text style={styles.subDetailText}>
                      Total {assignedDates.length} days assigned
                    </Text>
                  </>
                ) : (
                  <Text style={styles.detailText}>{displayDatesRange}</Text>
                )}
              </View>
            </View>
          )}

          {isToday && (
            <View style={styles.todayDatesBlock}>
              <View style={styles.todayDateRow}>
                <View style={styles.todayDateLabelWrap}>
                  <Ionicons name="calendar-outline" size={scale(12)} color={C.primary} />
                  <Text style={styles.todayDateLabelText}>
                    Assigned ({assignedTodayDates.length}):
                  </Text>
                </View>
                <View style={styles.todayChipsScroll}>
                  {assignedTodayDates.length > 0 ? (
                    assignedTodayDates.map((d: string) => (
                      <View key={d} style={styles.todayAssignedChip}>
                        <Text style={styles.todayAssignedChipText}>{formatShortDate(d)}</Text>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.todayEmptyDateText}>No dates recorded</Text>
                  )}
                </View>
              </View>
              <View style={styles.todayDateRow}>
                <View style={styles.todayDateLabelWrap}>
                  <Ionicons name="time-outline" size={scale(12)} color={C.warning} />
                  <Text style={styles.todayDateLabelText}>
                    Upcoming ({remainingTodayDates.length}):
                  </Text>
                </View>
                <View style={styles.todayChipsScroll}>
                  {remainingTodayDates.length > 0 ? (
                    remainingTodayDates.map((d: string) => (
                      <View key={d} style={styles.todayRemainingChip}>
                        <Text style={styles.todayRemainingChipText}>{formatShortDate(d)}</Text>
                      </View>
                    ))
                  ) : (
                    <View style={styles.todayLastDayBadge}>
                      <Text style={styles.todayLastDayText}>Final Day Today</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          )}

          <View style={styles.detailRow}>
            <Ionicons name="time-outline" size={scale(16)} color={C.textSub} />
            <Text style={styles.detailText}>
              {shiftTimeFrom && shiftTimeTo
                ? `${formatAMPM(shiftTimeFrom)} - ${formatAMPM(shiftTimeTo)}`
                : 'Timing not specified'}
            </Text>
          </View>

          {isToday && (checkInTimeStr || checkOutTimeStr) && (
            <View style={[styles.detailRow, { marginTop: scale(4) }]}>
              <Ionicons name="finger-print-outline" size={scale(16)} color={C.primary} />
              <Text style={[styles.subDetailText, { marginTop: 0, color: C.ink }]}>
                {checkInTimeStr && `In: ${checkInTimeStr}`}
                {checkInTimeStr && checkOutTimeStr && '  |  '}
                {checkOutTimeStr && `Out: ${checkOutTimeStr}`}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.divider} />

        <View style={styles.cardFooter}>
          <View>
            <Text style={styles.statusText}>
              {isToday ? 'Today Duty' : isInvitedOrInterested ? 'Invitation' : `${activeTab} Duty`}
            </Text>
            <Text style={styles.payText}>₹{displayRate}</Text>
          </View>

          <View style={styles.actionButtons}>
            {activeTab === 'Assigned' && (
              <>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.declineBtn]}
                  onPress={() => {
                    setSelectedJobId(jobReqId);
                    setDeclineModalVisible(true);
                  }}
                >
                  <Text style={styles.declineText}>Decline</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.confirmBtn]}
                  onPress={() => handleUpdateDutyStatus(jobReqId, 'Confirmed')}
                >
                  <Text style={styles.confirmText}>Confirm</Text>
                </TouchableOpacity>
              </>
            )}
            {activeTab === 'Invited' &&
              (isExpired ? (
                <View style={[styles.appliedBadge, { backgroundColor: C.border }]}>
                  <Text style={[styles.appliedBadgeText, { color: C.textSub }]}>Expired</Text>
                </View>
              ) : item.vacancy_status !== 'Closed' ? (
                <>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.declineBtn]}
                    onPress={() => handleRespondToInvitation(item.invitation_id, 'Not Interested')}
                  >
                    <Text style={styles.declineText}>Decline</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.confirmBtn]}
                    onPress={() => handleRespondToInvitation(item.invitation_id, 'Interested')}
                  >
                    <Text style={styles.confirmText}>Interested</Text>
                  </TouchableOpacity>
                </>
              ) : null)}
            {activeTab === 'Interested' && (
              <View style={[styles.appliedBadge, { backgroundColor: C.primaryLight }]}>
                <Text style={[styles.appliedBadgeText, { color: C.primary }]}>Interested</Text>
              </View>
            )}

            {activeTab === 'Today' && (
              <>
                {manualRequired && (
                  <TouchableOpacity
                    style={[
                      styles.actionBtn,
                      { backgroundColor: '#d97706', borderColor: '#d97706' },
                    ]}
                    onPress={() => openManualCheckOut(item)}
                  >
                    <Text style={styles.confirmText}>Add Check-Out Time</Text>
                  </TouchableOpacity>
                )}
                {manualPending && (
                  <View style={[styles.appliedBadge, { backgroundColor: '#fffbeb' }]}>
                    <Text style={[styles.appliedBadgeText, { color: '#d97706' }]}>
                      Waiting for approval
                    </Text>
                  </View>
                )}
                {showActions ? (
                  <>
                    {canCheckIn && (
                      <TouchableOpacity
                        style={[
                          styles.actionBtn,
                          styles.confirmBtn,
                          attendanceLoading && { opacity: 0.7 },
                        ]}
                        disabled={attendanceLoading}
                        onPress={() => openAttendanceMap(item, 'check-in')}
                      >
                        <View style={styles.btnContentRow}>
                          <Ionicons name="log-in-outline" size={scale(14)} color={C.white} />
                          <Text style={styles.confirmText}>Check In</Text>
                        </View>
                      </TouchableOpacity>
                    )}
                    {canCheckOut && (
                      <TouchableOpacity
                        style={[
                          styles.actionBtn,
                          { backgroundColor: C.urgent, borderColor: C.urgent },
                          attendanceLoading && { opacity: 0.7 },
                        ]}
                        disabled={attendanceLoading}
                        onPress={() => openAttendanceMap(item, 'check-out')}
                      >
                        <View style={styles.btnContentRow}>
                          <Ionicons name="log-out-outline" size={scale(14)} color={C.white} />
                          <Text style={[styles.confirmText, { color: C.white }]}>Check Out</Text>
                        </View>
                      </TouchableOpacity>
                    )}
                  </>
                ) : (
                  !isDutyCompleted && (
                    <Text style={{ fontSize: scale(11), color: C.warning, fontWeight: '700' }}>
                      Action available at duty time
                    </Text>
                  )
                )}
                {isDutyCompleted && (
                  <View style={[styles.appliedBadge, { backgroundColor: C.successLight }]}>
                    <Text style={[styles.appliedBadgeText, { color: C.success }]}>Completed</Text>
                  </View>
                )}
              </>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons
        name={activeTab === 'Invited' || activeTab === 'Interested' ? 'mail-open-outline' : 'briefcase-outline'}
        size={scale(48)}
        color={C.border}
      />
      <Text style={styles.emptyTitle}>No {activeTab} Data</Text>
      <Text style={styles.emptySubText}>
        You do not have any {activeTab.toLowerCase()} items right now.
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={C.cardBg} />
      <Animated.View
        pointerEvents="none"
        style={[styles.toastContainer, { opacity: toastFadeAnim }]}
      >
        <Ionicons name="checkmark-circle" size={18} color={C.white} />
        <Text style={styles.toastText}>{toastMessage}</Text>
      </Animated.View>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation?.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={scale(24)} color={C.ink} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Duties</Text>
        <View style={{ width: scale(24) }} />
      </View>
      <View style={styles.tabWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabContainer}
        >
          {tabs.map(tab => {
            const isActive = activeTab === tab;
            return (
              <TouchableOpacity
                key={tab}
                style={[styles.tabBtn, isActive && styles.tabBtnActive]}
                onPress={() => handleTabChange(tab)}
                activeOpacity={0.7}
              >
                <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{tab}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
      {loading && !refreshing ? (
        <View style={styles.centerWrap}>
          <ActivityIndicator size="large" color={C.primary} />
        </View>
      ) : (
        <FlatList
          data={jobs}
          style={{ flex: 1 }}
          keyExtractor={(item, index) =>
            (
              item?.assignment_id ||
              item?.invitation_id ||
              item?.req_id ||
              item?.requirement_id ||
              item?._id ||
              index
            ).toString()
          }
          renderItem={renderItem}
          ListHeaderComponent={
            activeTab === 'Today' ? (
              <MissedCheckOutsCard
                items={missedCheckOuts}
                onAdd={openManualForMissed}
                flush
              />
            ) : null
          }
          contentContainerStyle={[
            styles.listContent,
            jobs.length === 0 && styles.listContentEmpty,
          ]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={renderEmptyState}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[C.primary]}
            />
          }
        />
      )}

      {/* ATTENDANCE MAP MODAL */}
      <Modal visible={mapVisible} animationType="slide" onRequestClose={closeAttendanceMap}>
        {(() => {
          const hc = mapDuty?.hospital?.coordinates;
          const hasHosp = !!(hc && hc.latitude && hc.longitude);
          const dist = hasHosp && mapCoords ? distanceMetersBetween(mapCoords, hc) : null;
          const outside = dist !== null && dist > GEOFENCE_RADIUS_METERS;
          const isIn = mapType === 'check-in';
          const deadlineIso = mapDuty?.attendance?.check_out_allowed_until;
          const pastCheckOutGrace = !!deadlineIso && Date.now() > new Date(deadlineIso).getTime();
          const needsManualCheckOut = !isIn && outside && pastCheckOutGrace;
          const focus = mapCoords || (hasHosp ? hc : null);
          const mapHospitalName =
            mapDuty?.hospital?.name ||
            mapDuty?.hospital_details?.hospital_name ||
            mapDuty?.hospital_name ||
            'Hospital';

          return (
            <SafeAreaView style={styles.mapRoot} edges={['top', 'bottom']}>
              <View style={styles.mapHeader}>
                <TouchableOpacity
                  onPress={closeAttendanceMap}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="close" size={scale(24)} color={C.ink} />
                </TouchableOpacity>
                <Text style={styles.mapTitle}>{isIn ? 'Check In' : 'Check Out'}</Text>
                <View style={{ width: scale(24) }} />
              </View>

              <View style={styles.mapWrap}>
                <MapView
                  ref={mapRef}
                  style={StyleSheet.absoluteFill}
                  initialRegion={
                    focus
                      ? {
                          latitude: focus.latitude,
                          longitude: focus.longitude,
                          latitudeDelta: 0.008,
                          longitudeDelta: 0.008,
                        }
                      : {
                          latitude: 20.5937,
                          longitude: 78.9629,
                          latitudeDelta: 25,
                          longitudeDelta: 25,
                        }
                  }
                  showsUserLocation
                  showsMyLocationButton
                >
                  {mapCoords && (
                    <Marker
                      coordinate={{
                        latitude: mapCoords.latitude,
                        longitude: mapCoords.longitude,
                      }}
                      title="You are here"
                      pinColor="red"
                    />
                  )}
                  {hasHosp && (
                    <>
                      <Marker
                        coordinate={hc}
                        title={mapHospitalName}
                        pinColor={C.primary}
                      />
                      <Circle
                        center={hc}
                        radius={GEOFENCE_RADIUS_METERS}
                        strokeColor={C.primary}
                        fillColor="rgba(0,123,142,0.12)"
                      />
                    </>
                  )}
                </MapView>
                {mapLocating && (
                  <View style={styles.mapLocatingBadge}>
                    <ActivityIndicator size="small" color={C.primary} />
                    <Text style={styles.mapLoaderText}>Getting your location...</Text>
                  </View>
                )}
              </View>

              <View style={styles.mapFooter}>
                <Text style={styles.mapHospital} numberOfLines={1}>
                  {mapHospitalName}
                </Text>
                <Text
                  style={[
                    styles.mapStatus,
                    outside && { color: C.urgent },
                    dist !== null && !outside && { color: C.success },
                  ]}
                >
                  {mapLocating
                    ? 'Getting your location...'
                    : !mapCoords
                    ? 'Location not available. Turn on GPS and reopen.'
                    : dist === null
                    ? 'Location found.'
                    : outside
                    ? `You are ${dist} m away. Move within ${GEOFENCE_RADIUS_METERS} m of the hospital.`
                    : `You are at the hospital (${dist} m away).`}
                </Text>
                <TouchableOpacity
                  style={[
                    styles.cdActionBtn,
                    !isIn && styles.cdActionBtnOut,
                    (!mapCoords || outside || attendanceLoading) && styles.cdActionBtnDisabled,
                  ]}
                  disabled={!mapCoords || outside || attendanceLoading}
                  onPress={() => mapCoords && handleAttendance(mapDuty, mapType, mapCoords)}
                >
                  {attendanceLoading ? (
                    <ActivityIndicator size="small" color={C.white} />
                  ) : (
                    <>
                      <Ionicons
                        name={isIn ? 'log-in-outline' : 'log-out-outline'}
                        size={scale(16)}
                        color={C.white}
                      />
                      <Text style={styles.cdBtnText}>
                        {isIn ? 'Confirm Check In' : 'Confirm Check Out'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
                {needsManualCheckOut && (
                  <TouchableOpacity
                    style={[
                      styles.cdActionBtn,
                      { backgroundColor: '#d97706', marginTop: scale(10) },
                    ]}
                    disabled={attendanceLoading}
                    onPress={() => {
                      setMapVisible(false);
                      openManualCheckOut(mapDuty);
                    }}
                  >
                    <>
                      <Ionicons name="time-outline" size={scale(16)} color={C.white} />
                      <Text style={styles.cdBtnText}>Regularize Timings</Text>
                    </>
                  </TouchableOpacity>
                )}
              </View>
            </SafeAreaView>
          );
        })()}
      </Modal>

      <ManualCheckOutModal
        visible={!!manualTarget}
        target={manualTarget}
        onClose={() => setManualTarget(null)}
        onSubmitted={msg => {
          setManualTarget(null);
          showToast(msg);
          fetchDuties(true);
        }}
      />
      <Modal visible={declineModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Decline Duty</Text>
            <Text style={styles.modalSub}>
              Please provide a reason for declining this assigned duty.
            </Text>
            <TextInput
              style={styles.reasonInput}
              placeholder="E.g., Scheduling conflict, travel issue..."
              placeholderTextColor={C.textMuted}
              multiline
              value={declineReason}
              onChangeText={setDeclineReason}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelModalBtn}
                onPress={() => {
                  setDeclineModalVisible(false);
                  setDeclineReason('');
                }}
              >
                <Text style={styles.cancelModalText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.submitModalBtn}
                onPress={() =>
                  selectedJobId && handleUpdateDutyStatus(selectedJobId, 'Declined', declineReason)
                }
              >
                <Text style={styles.submitModalText}>Submit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default DutiesScreen;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background },
  toastContainer: {
    position: 'absolute',
    top: scale(54),
    alignSelf: 'center',
    backgroundColor: C.ink,
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
    paddingHorizontal: scale(16),
    paddingVertical: scale(10),
    borderRadius: scale(20),
    zIndex: 9999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  toastText: { color: C.white, fontSize: scale(13), fontWeight: '700' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(16),
    paddingVertical: scale(14),
    backgroundColor: C.cardBg,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  backBtn: { padding: scale(4) },
  headerTitle: { fontSize: scale(17), fontWeight: '800', color: C.ink, letterSpacing: -0.3 },
  tabWrapper: { backgroundColor: C.background },
  tabContainer: {
    paddingHorizontal: scale(20),
    paddingTop: scale(16),
    paddingBottom: scale(12),
    gap: scale(10),
  },
  tabBtn: {
    paddingHorizontal: scale(16),
    paddingVertical: scale(8),
    borderRadius: scale(20),
    backgroundColor: C.cardBg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.border,
  },
  tabBtnActive: { backgroundColor: C.primaryLight, borderColor: C.primary },
  tabText: { fontSize: scale(13), fontWeight: '700', color: C.textSub },
  tabTextActive: { color: C.primary },
  centerWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { paddingHorizontal: scale(20), paddingBottom: scale(100), paddingTop: scale(8) },
  listContentEmpty: { flex: 1, justifyContent: 'center' },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: scale(20),
    marginTop: scale(-40),
  },
  emptyTitle: {
    fontSize: scale(16),
    fontWeight: '700',
    color: C.ink,
    marginTop: scale(12),
    marginBottom: scale(6),
  },
  emptySubText: {
    fontSize: scale(13),
    color: C.textMuted,
    textAlign: 'center',
    lineHeight: scale(18),
  },
  jobCard: {
    backgroundColor: C.cardBg,
    borderRadius: scale(16),
    marginBottom: scale(16),
    borderWidth: 1,
    borderColor: C.border,
    padding: scale(16),
    shadowColor: C.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: { marginBottom: scale(12) },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scale(4),
  },
  jobTitle: {
    flex: 1,
    fontSize: scale(15),
    fontWeight: '800',
    color: C.ink,
    letterSpacing: -0.3,
    paddingRight: scale(8),
  },
  badge: {
    backgroundColor: C.warningLight,
    paddingHorizontal: scale(8),
    paddingVertical: scale(2),
    borderRadius: scale(8),
  },
  badgeText: {
    fontSize: scale(10),
    fontWeight: '700',
    color: C.warning,
    textTransform: 'uppercase',
  },
  hospitalName: { fontSize: scale(14), color: C.ink, fontWeight: '600', marginBottom: scale(4) },
  locationText: { fontSize: scale(12), color: C.textMuted, fontWeight: '500' },
  cardDetails: {
    backgroundColor: C.inputBg,
    borderRadius: scale(12),
    padding: scale(12),
    gap: scale(8),
    marginBottom: scale(12),
  },
  detailRow: { flexDirection: 'row', alignItems: 'flex-start', gap: scale(8) },
  detailText: { fontSize: scale(13), color: C.ink, fontWeight: '600' },
  subDetailText: { fontSize: scale(11), color: C.textSub, fontWeight: '600', marginTop: scale(4) },
  dateChipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scale(6),
    marginBottom: scale(2),
  },
  dateChip: {
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingHorizontal: scale(6),
    paddingVertical: scale(3),
    borderRadius: scale(6),
  },
  dateChipText: { fontSize: scale(11), fontWeight: '600', color: C.ink },
  divider: { height: 1, backgroundColor: C.border, marginBottom: scale(12) },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusText: {
    fontSize: scale(12),
    fontWeight: '700',
    color: C.primary,
    textTransform: 'uppercase',
    marginBottom: scale(2),
  },
  payText: { fontSize: scale(15), fontWeight: '800', color: C.ink },
  actionButtons: { flexDirection: 'row', gap: scale(8) },
  actionBtn: {
    paddingVertical: scale(8),
    paddingHorizontal: scale(14),
    borderRadius: scale(8),
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(5),
  },
  declineBtn: { borderColor: '#EF4444', backgroundColor: '#FEF2F2' },
  confirmBtn: { borderColor: C.primary, backgroundColor: C.primary },
  declineText: { color: '#EF4444', fontWeight: '700', fontSize: scale(12) },
  confirmText: { color: C.white, fontWeight: '700', fontSize: scale(12) },
  appliedBadge: {
    backgroundColor: C.successLight,
    paddingVertical: scale(6),
    paddingHorizontal: scale(12),
    borderRadius: scale(8),
  },
  appliedBadgeText: { color: C.success, fontSize: scale(11), fontWeight: '700' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: scale(20),
  },
  modalContent: {
    backgroundColor: C.cardBg,
    borderRadius: scale(16),
    padding: scale(20),
    width: '100%',
  },
  modalTitle: { fontSize: scale(16), fontWeight: '800', color: C.ink, marginBottom: scale(8) },
  modalSub: { fontSize: scale(13), color: C.textSub, marginBottom: scale(16) },
  reasonInput: {
    backgroundColor: C.inputBg,
    borderRadius: scale(12),
    borderWidth: 1,
    borderColor: C.border,
    padding: scale(12),
    minHeight: scale(100),
    textAlignVertical: 'top',
    color: C.ink,
    marginBottom: scale(20),
  },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: scale(12) },
  cancelModalBtn: { paddingVertical: scale(10), paddingHorizontal: scale(16) },
  cancelModalText: { color: C.textSub, fontWeight: '700', fontSize: scale(14) },
  submitModalBtn: {
    backgroundColor: '#EF4444',
    paddingVertical: scale(10),
    paddingHorizontal: scale(20),
    borderRadius: scale(8),
  },
  submitModalText: { color: C.white, fontWeight: '700', fontSize: scale(14) },
  todayDatesBlock: {
    gap: scale(8),
    marginBottom: scale(8),
    paddingBottom: scale(8),
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  todayDateRow: { flexDirection: 'row', alignItems: 'flex-start' },
  todayDateLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
    width: scale(100),
    marginTop: scale(2),
  },
  todayDateLabelText: { fontSize: scale(11), fontWeight: '700', color: C.ink },
  todayChipsScroll: { flexDirection: 'row', flexWrap: 'wrap', gap: scale(6), flex: 1 },
  todayAssignedChip: {
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: '#C7E4E9',
    paddingHorizontal: scale(6),
    paddingVertical: scale(2),
    borderRadius: scale(5),
  },
  todayAssignedChipText: { fontSize: scale(10), fontWeight: '700', color: C.primary },
  todayRemainingChip: {
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
    paddingHorizontal: scale(6),
    paddingVertical: scale(2),
    borderRadius: scale(5),
  },
  todayRemainingChipText: { fontSize: scale(10), fontWeight: '700', color: '#d97706' },
  todayLastDayBadge: {
    backgroundColor: '#ecfdf5',
    paddingHorizontal: scale(6),
    paddingVertical: scale(2),
    borderRadius: scale(5),
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  todayLastDayText: { fontSize: scale(10), fontWeight: '700', color: '#059669' },
  todayEmptyDateText: {
    fontSize: scale(10),
    color: C.textMuted,
    fontStyle: 'italic',
    marginTop: scale(2),
  },
  mapRoot: { flex: 1, backgroundColor: C.cardBg },
  mapHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(16),
    paddingVertical: scale(12),
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  mapTitle: { fontSize: scale(16), fontWeight: '800', color: C.ink },
  mapWrap: { flex: 1, backgroundColor: C.inputBg },
  mapLocatingBadge: {
    position: 'absolute',
    top: scale(12),
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
    backgroundColor: C.cardBg,
    paddingHorizontal: scale(14),
    paddingVertical: scale(8),
    borderRadius: scale(20),
    borderWidth: 1,
    borderColor: C.border,
  },
  mapLoaderText: { fontSize: scale(13), color: C.textSub, fontWeight: '600' },
  mapFooter: { padding: scale(16), gap: scale(8), borderTopWidth: 1, borderTopColor: C.border },
  mapHospital: { fontSize: scale(15), fontWeight: '800', color: C.ink },
  mapStatus: { fontSize: scale(12), color: C.textSub, fontWeight: '600', marginBottom: scale(4) },
  cdActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#006C7C',
    paddingVertical: scale(10),
    borderRadius: scale(10),
    gap: scale(6),
  },
  cdActionBtnOut: { backgroundColor: C.urgent },
  cdActionBtnDisabled: { opacity: 0.7 },
  cdBtnText: { color: C.white, fontSize: scale(12), fontWeight: '700' },
});