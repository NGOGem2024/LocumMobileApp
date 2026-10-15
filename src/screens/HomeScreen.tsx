import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  PermissionsAndroid,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  ActivityIndicator,
  RefreshControl,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import Geolocation from '@react-native-community/geolocation';
import MapView, { Marker, Circle } from 'react-native-maps';
import { useAuth } from '../context/AuthContext';
import { useJobs } from '../context/JobContext';
import AvailabilitySection from '../components/AvailabilitySection';
import api from '../services/axiosConfig';
import { ManualCheckOutModal, ManualCheckOutMenu, fetchMissedCheckOuts, MissedCheckOut, ManualTarget } from '../components/ManualCheckOut';

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
  successLight: '#dcfce7',
  warning: '#f59e0b',
  warningLight: '#fef3c7',
};

type PaymentTerm = 'Next Day Payout' | 'Weekly Payout' | 'Monthly Payout';
type RateEntry = {
  _id: string;
  duty_type: string;
  rate_type: 'Hourly' | 'Per Shift';
  day_shift_rate?: number;
  night_shift_rate?: number;
  sunday_holiday_rate?: number;
  payment_terms?: PaymentTerm;
};

const formatRate = (val?: number | null) => (val == null ? '—' : `₹${val}`);

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

const formatTimestampTime = (iso?: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

const isDutyTimeActionable = (fromTime?: string, toTime?: string, isCheckedIn?: boolean, isCheckedOut?: boolean) => {
  if (isCheckedOut) return false; 
  if (isCheckedIn) return true; 
  if (!fromTime || !toTime) return true; 

  const now = new Date();
  const currentMins = now.getHours() * 60 + now.getMinutes();

  const parseMins = (t: string) => {
    const parts = t.split(':');
    if (parts.length < 2) return 0;
    return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
  };

  const startMins = parseMins(fromTime);
  const endMins = parseMins(toTime);
  const effectiveStart = startMins - 30; // Allow 30 mins early

  if (endMins < startMins) {
    return currentMins >= effectiveStart || currentMins <= endMins;
  }
  // Not checked in yet: button stays available from 30 min before start, even after the duty end time
  return currentMins >= effectiveStart;
};

const requestLocationPermission = async (): Promise<boolean> => {
  if (Platform.OS === 'android') {
    const already = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
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

Geolocation.setRNConfiguration({ skipPermissionRequests: false, authorizationLevel: 'whenInUse', locationProvider: 'auto' });
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
    // Fast path: recent cached / network fix (returns almost instantly)
    Geolocation.getCurrentPosition(onSuccess, onError, { enableHighAccuracy: false, timeout: 4000, maximumAge: 60000 });
    // Accurate path: fresh GPS fix, runs in parallel; whichever answers first wins
    Geolocation.getCurrentPosition(onSuccess, onError, { enableHighAccuracy: true, timeout: 10000, maximumAge: 10000 });
  });

const GEOFENCE_RADIUS_METERS = 500;
const distanceMetersBetween = (a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) => {
  const R = 6371000;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s)));
};

const getPaymentConfig = (term?: PaymentTerm) => {
  const configs: Record<string, any> = {
    'Next Day Payout': { icon: 'flash-outline', color: '#d97706', bg: '#fffbeb', border: '#fde68a', label: 'Next Day Payout' },
    'Weekly Payout': { icon: 'calendar-outline', color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0', label: 'Weekly Payout' },
    'Monthly Payout': { icon: 'albums-outline', color: '#6d28d9', bg: '#f5f3ff', border: '#ddd6fe', label: 'Monthly Payout' },
  };
  return configs[term ?? ''] || { icon: 'cash-outline', color: C.textMuted, bg: '#F9FAFB', border: C.border, label: term ?? '' };
};

const formatShortDate = (dateString: string) => {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
};

const RateCardBottomSheet = ({ visible, rates, onClose }: { visible: boolean; rates: RateEntry[]; onClose: () => void; }) => {
  const slideAnim = useRef(new Animated.Value(SH)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: visible ? 1 : 0, duration: visible ? 220 : 180, useNativeDriver: true }),
      visible ? Animated.spring(slideAnim, { toValue: 0, damping: 20, stiffness: 200, useNativeDriver: true })
              : Animated.timing(slideAnim, { toValue: SH, duration: 220, useNativeDriver: true }),
    ]).start();
  }, [visible, fadeAnim, slideAnim]);

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]} />
      </TouchableWithoutFeedback>
      <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>
        <View style={styles.handle} />
        <View style={styles.sheetHeader}>
          <View style={styles.sheetIconBubble}><Ionicons name="pricetags" size={scale(18)} color={C.primary} /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.sheetTitle}>Rate Card</Text>
            <Text style={styles.sheetSub}>{rates.length} duty {rates.length === 1 ? 'type' : 'types'} configured</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}><Ionicons name="close" size={scale(18)} color={C.textSub} /></TouchableOpacity>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContentHorizontal} snapToInterval={scale(280) + scale(14)} decelerationRate="fast">
          {rates.length === 0 ? (
            <View style={styles.emptyWrap}>
              <View style={styles.emptyIconCircle}><Ionicons name="pricetag-outline" size={scale(28)} color={C.primary} /></View>
              <Text style={styles.emptyTitle}>No rate card yet</Text>
              <Text style={styles.emptySub}>Your admin will configure your rates</Text>
            </View>
          ) : (
            rates.map((item, idx) => {
              const unit = item.rate_type === 'Hourly' ? '/hr' : '/shift';
              const pc = getPaymentConfig(item.payment_terms);
              return (
                <View key={item._id ?? `${item.duty_type}-${idx}`} style={[styles.rateCard, idx !== rates.length - 1 && { marginRight: scale(14) }]}>
                  <View style={styles.cardHeader}>
                    <View style={styles.dutyIconWrap}><Ionicons name="medkit-outline" size={scale(15)} color={C.primary} /></View>
                    <View style={{ flex: 1 }}><Text style={styles.dutyName}>{item.duty_type}</Text><Text style={styles.dutySubLabel}>Duty Type</Text></View>
                    <View style={styles.rateTypeBadge}><Text style={styles.rateTypeBadgeText}>{item.rate_type}</Text></View>
                  </View>
                  <View style={styles.divider} />
                  <View style={styles.rateRows}>
                    <View style={styles.rateRow}>
                      <View style={styles.rateRowLeft}><View style={[styles.rateIconBox, { backgroundColor: '#fffbeb' }]}><Ionicons name="sunny-outline" size={scale(13)} color="#d97706" /></View><Text style={styles.rateRowLabel}>Day Shift</Text></View>
                      <View style={styles.rateRowRight}><Text style={styles.rateAmt}>{formatRate(item.day_shift_rate)}</Text>{item.day_shift_rate != null && (<Text style={styles.rateUnit}>{unit}</Text>)}</View>
                    </View>
                    {item.night_shift_rate != null && (
                      <View style={styles.rateRow}>
                        <View style={styles.rateRowLeft}><View style={[styles.rateIconBox, { backgroundColor: '#f3e8ff' }]}><Ionicons name="moon-outline" size={scale(13)} color="#7e22ce" /></View><Text style={styles.rateRowLabel}>Night Shift</Text></View>
                        <View style={styles.rateRowRight}><Text style={styles.rateAmt}>{formatRate(item.night_shift_rate)}</Text><Text style={styles.rateUnit}>{unit}</Text></View>
                      </View>
                    )}
                    {item.sunday_holiday_rate != null && (
                      <View style={styles.rateRow}>
                        <View style={styles.rateRowLeft}><View style={[styles.rateIconBox, { backgroundColor: '#fee2e2' }]}><Ionicons name="calendar-clear-outline" size={scale(13)} color="#b91c1c" /></View><Text style={styles.rateRowLabel}>Sunday / Holiday</Text></View>
                        <View style={styles.rateRowRight}><Text style={styles.rateAmt}>{formatRate(item.sunday_holiday_rate)}</Text><Text style={styles.rateUnit}>{unit}</Text></View>
                      </View>
                    )}
                  </View>
                  <View style={styles.divider} />
                  {item.payment_terms && (
                    <View style={styles.cardFooter}>
                      <View style={[styles.paymentChip, { backgroundColor: pc.bg, borderColor: pc.border }]}>
                        <Ionicons name={pc.icon} size={scale(11)} color={pc.color} />
                        <Text style={[styles.paymentChipText, { color: pc.color }]}>{pc.label}</Text>
                      </View>
                    </View>
                  )}
                </View>
              );
            })
          )}
        </ScrollView>
      </Animated.View>
    </Modal>
  );
};

const HomeScreen = ({ navigation }: any) => {
  const { doctor, token } = useAuth();
  
  const [upcomingDuties, setUpcomingDuties] = useState<any[]>([]);
  const [todayDuties, setTodayDuties] = useState<any[]>([]); 
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [fetchedAvailability, setFetchedAvailability] = useState<any[]>([]);
  const [rateCard, setRateCard] = useState<RateEntry[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string>('');
  const [showRateSheet, setShowRateSheet] = useState(false);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [mapVisible, setMapVisible] = useState(false);
  const [mapDuty, setMapDuty] = useState<any>(null);
  const [mapType, setMapType] = useState<'check-in' | 'check-out'>('check-in');
  const [mapCoords, setMapCoords] = useState<Coords | null>(null);
  const [mapLocating, setMapLocating] = useState(false);
  const [missedCheckOuts, setMissedCheckOuts] = useState<MissedCheckOut[]>([]);
  const [manualTarget, setManualTarget] = useState<ManualTarget | null>(null);
  const mapRef = useRef<MapView>(null);

  // Once location arrives, zoom the map to show your pin (and the hospital, if known)
  useEffect(() => {
    if (!mapVisible || !mapCoords || !mapRef.current) return;
    const hc = mapDuty?.hospital?.coordinates;
    const points = [{ latitude: mapCoords.latitude, longitude: mapCoords.longitude }];
    if (hc?.latitude && hc?.longitude) points.push({ latitude: hc.latitude, longitude: hc.longitude });
    const t = setTimeout(() => {
      if (points.length > 1) {
        mapRef.current?.fitToCoordinates(points, { edgePadding: { top: 80, right: 60, bottom: 80, left: 60 }, animated: true });
      } else {
        mapRef.current?.animateToRegion({ ...points[0], latitudeDelta: 0.005, longitudeDelta: 0.005 }, 400);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [mapVisible, mapCoords, mapDuty]);
  const [activeSection] = useState<'jobs' | 'availability'>('jobs');

  const toastFadeAnim = useRef(new Animated.Value(0)).current;

  const quickActions = [
    { id: 'jobs', title: 'Duties & Jobs', sub: 'Explore opportunities', icon: 'briefcase-outline', color: '#4A90E2', lightBg: '#F4F8FF', borderColor: '#E6F0FA', onPress: () => navigation.navigate('DutiesScreen', { defaultTab: 'Today' }) },
    { id: 'availability', title: 'Availability', sub: 'Set preferences', icon: 'time-outline', color: '#F39C12', lightBg: '#FFF7F0', borderColor: '#FCEADA', onPress: () => navigation.navigate('AvailabilitySection') },
    { id: 'rate', title: 'Rate Card', sub: 'View your rates', icon: 'pricetags-outline', color: '#9B59B6', lightBg: '#F8F5FF', borderColor: '#EFE8FA', onPress: () => setShowRateSheet(true) },
  ];

  const showToast = useCallback((message: string) => {
    setToastMessage(message);
    Animated.sequence([
      Animated.timing(toastFadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(2000),
      Animated.timing(toastFadeAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start();
  }, [toastFadeAnim]);

  const loadAllData = useCallback(async () => {
    if (!doctor?._id) return;
    try {
      const [availRes, rateRes, todayDutiesRes, upcomingDutiesRes, missedRes] = await Promise.all([
        api.get(`/api/doctors/${doctor._id}/availability`).catch(() => ({ data: { availability: [] } })),
        api.get(`/api/doctors/rate-card/${doctor._id}`).catch(() => ({ data: { data: [] } })),
        api.get('/api/doctors/today-duties').catch(() => ({ data: { success: false } })),
        api.get('/api/doctors/upcoming-duties').catch(() => ({ data: { success: false } })),
        fetchMissedCheckOuts(),
      ]);

      if (todayDutiesRes.data?.success && todayDutiesRes.data.has_today_duty) {
        setTodayDuties(todayDutiesRes.data.today_duties || []);
      } else {
        setTodayDuties([]);
      }

      if (upcomingDutiesRes.data?.success) {
        setUpcomingDuties(upcomingDutiesRes.data.upcoming_duties || []);
      } else {
        setUpcomingDuties([]);
      }

      setMissedCheckOuts(missedRes);
      setFetchedAvailability(availRes.data?.availability ?? []);
      setRateCard(rateRes.data?.data ?? []);
    } catch (error) {
      showToast('Failed to load dashboard data');
    }
  }, [doctor?._id, showToast]);

  useEffect(() => {
    setLoadingJobs(true);
    loadAllData().finally(() => setLoadingJobs(false));
  }, [loadAllData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadAllData();
    setRefreshing(false);
  }, [loadAllData]);

  // Opens the map first; location is fetched while the map is already on screen
  const openAttendanceMap = async (duty: any, type: 'check-in' | 'check-out') => {
    if (!duty?.requirement_id || attendanceLoading) return;

    if (type === 'check-in') {
      const activeDuty = todayDuties.find(d => d.attendance?.is_checked_in && !d.attendance?.is_checked_out);
      if (activeDuty && activeDuty.requirement_id !== duty.requirement_id) {
        showToast("First you have to check out or close the active duty.");
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

  // Manual check-out (late / missed): end time + reason, no map, no GPS
  const openManualCheckOut = (duty: any) => {
    setManualTarget({
      requirementId: duty.requirement_id,
      dutyDate: duty.attendance?.duty_date,
      hospitalName: duty.hospital?.name,
      checkInTime: duty.attendance?.check_in_time,
    });
  };

  const openManualForMissed = (item: MissedCheckOut) => {
    setManualTarget({
      requirementId: item.requirement_id,
      dutyDate: item.duty_date,
      hospitalName: item.hospital_name,
      checkInTime: item.first_check_in_time,
    });
  };

  const closeAttendanceMap = () => {
    if (attendanceLoading) return;
    setMapVisible(false);
  };

  // Called from the map's confirm button, reuses the location already fetched
  const handleAttendance = async (duty: any, type: 'check-in' | 'check-out', coords: Coords) => {
    if (!duty?.requirement_id || attendanceLoading) return;

    setAttendanceLoading(true);

    try {
      // Sends accurate geo payload matching updated backend check-in/out structures
      const { data } = await api.post(`/api/doctors/${type}`, {
        requirement_id: duty.requirement_id,
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracy: coords.accuracy,
      });

      // Update the card instantly instead of waiting for 4 API calls
      setTodayDuties(prev => prev.map(d => {
        if (d.requirement_id !== duty.requirement_id) return d;
        const att = d.attendance || {};
        const existingSessions = Array.isArray(att.sessions) ? att.sessions : [];

        if (type === 'check-in') {
          const newCheckInIso = data?.data?.latest_check_in?.timestamp || data?.data?.check_in?.timestamp || new Date().toISOString();
          const updatedSessions = data?.data?.sessions || [
            ...existingSessions,
            { check_in: { timestamp: newCheckInIso }, check_out: null },
          ];
          // Oldest check-in is ALWAYS the first session's timestamp (or existing att.check_in_time)
          const oldestCheckInTime =
            updatedSessions[0]?.check_in?.timestamp ||
            att.check_in_time ||
            newCheckInIso;

          return {
            ...d,
            attendance: {
              ...att,
              is_checked_in: true,
              is_checked_out: false,
              can_check_in: false,
              can_check_out: true,
              check_in_status: 'Checked In',
              check_in_time: oldestCheckInTime, // Keep oldest check-in
              // Keep previous newest check_out_time visible if they checked out earlier
              check_out_time: att.check_out_time || null,
              sessions: updatedSessions,
            },
          };
        } else {
          const newestCheckOutIso = data?.data?.check_out?.timestamp || new Date().toISOString();
          const updatedSessions = data?.data?.sessions || existingSessions.map((s: any, idx: number) =>
            idx === existingSessions.length - 1
              ? { ...s, check_out: { timestamp: newestCheckOutIso } }
              : s
          );
          const oldestCheckInTime =
            updatedSessions[0]?.check_in?.timestamp ||
            att.check_in_time;

          return {
            ...d,
            attendance: {
              ...att,
              is_checked_in: false,
              is_checked_out: true,
              can_check_out: false,
              can_check_in: !!data?.data?.can_check_in_again,
              check_in_status: data?.data?.can_check_in_again ? 'Checked Out Early' : 'Completed',
              check_in_time: oldestCheckInTime,   // Oldest check-in
              check_out_time: newestCheckOutIso,  // Newest check-out
              sessions: updatedSessions,
            },
          };
        }
      }));

      setMapVisible(false);
      showToast(data?.message || (type === 'check-in' ? 'Check-in successful!' : 'Check-out successful!'));
      loadAllData(); // background refresh, not awaited
    } catch (error: any) {
      if (error.response?.data?.manual_check_out_required) {
        // Check-out time is over: switch to the manual form (no map)
        setMapVisible(false);
        showToast(error.response?.data?.message || 'Please add your check-out time.');
        openManualCheckOut(duty);
        loadAllData();
      } else {
        showToast(error.response?.data?.message || `Error during ${type}`);
      }
    } finally {
      setAttendanceLoading(false);
    }
  };

  const currentHour = new Date().getHours();
  const isMorning = currentHour < 12;
  const isAfternoon = currentHour >= 12 && currentHour < 17;
  const greeting = isMorning ? 'Good morning' : isAfternoon ? 'Good afternoon' : 'Good evening';
  const greetingIcon = isMorning ? 'partly-sunny' : isAfternoon ? 'sunny' : 'moon';
  const greetingColor = isMorning ? '#f59e0b' : isAfternoon ? '#d97706' : '#6366f1';
  const userName = [doctor?.prefix, doctor?.first_name].filter(Boolean).join(' ') || 'Doctor';
  const todayRequirementIds = todayDuties.map(d => d.requirement_id);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={C.background} />

      <Animated.View pointerEvents="none" style={[styles.toastContainer, { opacity: toastFadeAnim }]}>
        <Ionicons name="checkmark-circle" size={18} color={C.white} />
        <Text style={styles.toastText}>{toastMessage}</Text>
      </Animated.View>

      <View style={styles.topBarContainer}>
        <TouchableOpacity style={styles.logoContainer} activeOpacity={0.8}>
          <Image source={require('../assets/image.png')} style={styles.logoImage} resizeMode="contain" />
        </TouchableOpacity>
        <ManualCheckOutMenu items={missedCheckOuts} onAdd={openManualForMissed} />
      </View>

      <View style={styles.headerContainer}>
        <View style={styles.greetingRow}>
          <View style={styles.greetingTextWrap}>
            <Ionicons name={greetingIcon} size={scale(14)} color={greetingColor} />
            <Text style={styles.greetingText}>{greeting},</Text>
          </View>
          <Text style={styles.userNameText}>{userName}</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.primary]} />}
      >
        {activeSection === 'availability' ? (
          <View style={styles.availabilityWrapper}>
            <View style={styles.availabilityHeader}>
              <Text style={styles.availabilityTitle}>Manage Availability</Text>
              <Ionicons name="ellipsis-horizontal" size={scale(20)} color={C.textMuted} />
            </View>
            <AvailabilitySection
              doctorId={doctor?._id || ''}
              apiBaseUrl={api.defaults.baseURL ?? ''}
              authToken={token ?? ''}
              initialAvailability={fetchedAvailability}
            />
          </View>
        ) : (
          <>
            {/* 1. TODAY'S DUTIES SECTION (COMPACT WITH NAVIGATION & RATES) */}
            {todayDuties.length > 0 && (
              <View style={styles.sectionContainerNoMargin}>
                <View style={styles.sectionHeaderPad}>
                  <Text style={styles.sectionTitle}>Today's Duties</Text>
                </View>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.todayDutiesScrollContainer}
                  snapToInterval={SW * 0.85 + scale(14)}
                  decelerationRate="fast"
                >
                  {todayDuties.map((duty, index) => {
                    const cdArea = duty.hospital?.area || '';
                    const cdCity = duty.hospital?.district || duty.hospital?.city || '';
                    const cdState = duty.hospital?.state || '';
                    const cdPincode = duty.hospital?.pincode || '';
                    
                    const cdLocationParts = [cdArea, cdCity, cdState].filter(Boolean);
                    let cdLocationString = cdLocationParts.join(', ');
                    if (cdPincode) cdLocationString = cdLocationString ? `${cdLocationString} - ${cdPincode}` : cdPincode;

                    // Relies entirely on the safely-processed attendance object injected by the backend
                    const attendance = duty.attendance;
                    const sessions = Array.isArray(attendance?.sessions) ? attendance.sessions : [];

                    // Oldest Check-In: 1st element in sessions array (fallback to attendance.check_in_time)
                    const oldestCheckInIso =
                      sessions[0]?.check_in?.timestamp || attendance?.check_in_time || null;

                    // Newest Check-Out: last session that has a check_out timestamp (fallback to attendance.check_out_time)
                    const completedSessions = sessions.filter((s: any) => s?.check_out?.timestamp);
                    const newestCheckOutIso =
                      completedSessions.length > 0
                        ? completedSessions[completedSessions.length - 1].check_out.timestamp
                        : attendance?.check_out_time || null;

                    const isDutyCompleted =
                      (!!attendance?.is_checked_out && !attendance?.can_check_in) ||
                      duty.duty_state === 'COMPLETED';
                    const canCheckIn = !!attendance?.can_check_in;
                    const canCheckOut = !!attendance?.can_check_out;
                    const checkInTimeStr = formatTimestampTime(oldestCheckInIso);
                    const checkOutTimeStr = formatTimestampTime(newestCheckOutIso);
                    const manualRequired = !!attendance?.manual_check_out_required;
                    const manualPending = !!attendance?.manual_check_out_pending;
                    const checkOutUntilStr = formatTimestampTime(attendance?.check_out_allowed_until);

                    const showActions = isDutyTimeActionable(
                      duty.shift_timings?.duty_from_time, 
                      duty.shift_timings?.duty_to_time,
                      attendance?.is_checked_in,
                      attendance?.is_checked_out && !attendance?.can_check_in
                    );

                    const todayFormatted = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
                    const displayRate = duty.configured_rate || duty.offered_rate || '0';

                    return (
                      <TouchableOpacity
                        key={duty.assignment_id || index}
                        activeOpacity={0.95}
                        onPress={() => navigation.navigate('DutiesScreen', { defaultTab: 'Today' })}
                        style={{ width: SW * 0.85, marginRight: scale(14) }}
                      >
                        <LinearGradient colors={['#E5F8FA', '#F3FCFD']} style={[styles.currentDutyCard, { width: '100%', marginRight: 0 }]}>
                          <View style={styles.cdHeader}>
                            <View style={styles.cdHeaderLeft}>
                              <View style={styles.cdDot} />
                              <Text style={styles.cdHeaderText}>{todayDuties.length > 1 ? `DUTY ${index + 1} OF ${todayDuties.length}` : 'CURRENT DUTY'}</Text>
                            </View>
                            <Text style={styles.cdInProgress}>{duty.duty_state === 'IN_PROGRESS' ? 'In Progress' : (duty.duty_state === 'COMPLETED' ? 'Completed' : duty.status || 'Active')}</Text>
                          </View>

                          <View style={styles.cdBody}>
                            <View style={styles.cdIconBox}>
                              <Ionicons name="business-outline" size={scale(20)} color={C.primary} />
                            </View>
                            <View style={styles.cdInfo}>
                              <Text style={styles.cdTitle} numberOfLines={1}>{duty.speciality || 'General Duty'}</Text>
                              <Text style={styles.cdHospital} numberOfLines={1}>{duty.hospital?.name || 'Hospital'}</Text>
                              {cdLocationString ? (
                                <View style={styles.cdLocationRow}>
                                  <Ionicons name="location-outline" size={scale(12)} color={C.textSub} />
                                  <Text style={styles.cdLocationText} numberOfLines={2}>{cdLocationString}</Text>
                                </View>
                              ) : null}
                            </View>
                          </View>

                          <View style={styles.cdDivider} />

                          <View style={styles.cdFooter}>
                            <View style={styles.cdFooterItem}>
                              <Ionicons name="calendar-outline" size={scale(14)} color={C.textSub} />
                              <Text style={styles.cdFooterText}>{todayFormatted}</Text>
                            </View>
                            <View style={styles.cdFooterItem}>
                              <Ionicons name="time-outline" size={scale(14)} color={C.textSub} />
                              <Text style={styles.cdFooterText}>
                                {formatTimeAMPM(duty.shift_timings?.duty_from_time)} - {formatTimeAMPM(duty.shift_timings?.duty_to_time)}
                              </Text>
                            </View>
                            <View style={styles.cdFooterItem}>
                              <Ionicons name="cash-outline" size={scale(14)} color={C.success} />
                              <Text style={[styles.cdFooterText, { color: C.ink, fontWeight: '800' }]}>₹{displayRate}</Text>
                            </View>
                          </View>

                          <View style={styles.cdAttendanceWrap}>
                            {(checkInTimeStr || checkOutTimeStr) ? (
                              <View style={styles.cdAttendanceInfoRow}>
                                {checkInTimeStr ? <Text style={styles.cdAttendanceInfoText}>Checked in: {checkInTimeStr}</Text> : null}
                                {checkOutTimeStr ? <Text style={styles.cdAttendanceInfoText}>Checked out: {checkOutTimeStr}</Text> : null}
                              </View>
                            ) : null}

                            {manualRequired && (
                              <TouchableOpacity style={[styles.cdActionBtn, { backgroundColor: '#d97706' }]} onPress={() => openManualCheckOut(duty)}>
                                <><Ionicons name="time-outline" size={scale(16)} color={C.white} /><Text style={styles.cdBtnText}>Add Check-Out Time</Text></>
                              </TouchableOpacity>
                            )}
                            {manualPending && (
                              <View style={styles.cdTimeWaitBadge}>
                                <Ionicons name="hourglass-outline" size={scale(14)} color={C.warning} />
                                <Text style={styles.cdTimeWaitText}>Check-out waiting for approval</Text>
                              </View>
                            )}
                            {canCheckOut && checkOutUntilStr ? (
                              <Text style={styles.cdAttendanceInfoText}>Check out before {checkOutUntilStr}</Text>
                            ) : null}

                            {showActions ? (
                              <>
                                {canCheckIn && (
                                  <TouchableOpacity style={styles.cdActionBtn} disabled={attendanceLoading} onPress={() => openAttendanceMap(duty, 'check-in')}>
                                    <><Ionicons name="log-in-outline" size={scale(16)} color={C.white} /><Text style={styles.cdBtnText}>Check In</Text></>
                                  </TouchableOpacity>
                                )}
                                {canCheckOut && (
                                  <TouchableOpacity style={[styles.cdActionBtn, styles.cdActionBtnOut]} disabled={attendanceLoading} onPress={() => openAttendanceMap(duty, 'check-out')}>
                                    <><Ionicons name="log-out-outline" size={scale(16)} color={C.white} /><Text style={styles.cdBtnText}>Check Out</Text></>
                                  </TouchableOpacity>
                                )}
                              </>
                            ) : (
                              !isDutyCompleted && (
                                <View style={styles.cdTimeWaitBadge}>
                                  <Ionicons name="time-outline" size={scale(14)} color={C.warning} />
                                  <Text style={styles.cdTimeWaitText}>Buttons appear at duty time</Text>
                                </View>
                              )
                            )}
                            {isDutyCompleted && (
                              <View style={styles.cdCompletedBadge}>
                                <Ionicons name="checkmark-circle-outline" size={scale(16)} color="#059669" />
                                <Text style={styles.cdLastDayText}>Shift Completed</Text>
                              </View>
                            )}
                          </View>
                        </LinearGradient>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {/* 2. REAL UPCOMING DUTIES SECTION */}
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Upcoming Duties</Text>
              </View>
              {loadingJobs && !refreshing ? (
                <ActivityIndicator size="small" color={C.primary} style={{ marginVertical: 10 }} />
              ) : upcomingDuties.length === 0 ? (
                <View style={styles.emptyUpcomingBox}>
                  <Ionicons name="calendar-outline" size={scale(24)} color={C.textMuted} />
                  <Text style={styles.emptyUpcomingText}>No upcoming duties scheduled.</Text>
                </View>
              ) : (
                upcomingDuties
                  .filter(duty => !todayRequirementIds.includes(duty.requirement_id))
                  .slice(0, 3)
                  .map(duty => {
                  const hospitalName = duty.hospital?.name || 'Hospital Name Pending';
                  const area = duty.hospital?.area || '';
                  const city = duty.hospital?.city || '';
                  const state = duty.hospital?.state || '';
                  const pincode = duty.hospital?.pincode || '';

                  const locationParts = [area, city, state].filter(Boolean);
                  let locationString = locationParts.join(', ');
                  if (pincode) locationString = locationString ? `${locationString} - ${pincode}` : pincode;
                  if (!locationString) locationString = 'Location unavailable';

                  const dutyAssignedDates = duty.assigned_dates || [];
                  const hasIndividualDates = dutyAssignedDates.length > 0;
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);

                  const futureDates = dutyAssignedDates.filter((dateStr: string) => {
                    const d = new Date(dateStr);
                    d.setHours(0, 0, 0, 0);
                    return d.getTime() >= today.getTime();
                  }).sort((a: string, b: string) => new Date(a).getTime() - new Date(b).getTime());

                  const nextShiftDate = futureDates.length > 0 ? futureDates[0] : null;
                  let displayDatesRange = '';
                  if (!hasIndividualDates) displayDatesRange = 'Dates pending';

                  const displayRate = duty.configured_rate || duty.offered_rate || duty.rates || '0';

                  return (
                    <TouchableOpacity
                      key={duty.requirement_id || duty._id}
                      style={styles.upcomingCard}
                      activeOpacity={0.9}
                      onPress={() => navigation.navigate('JobDetails', { jobDetails: duty, isAssigned: true, jobStatus: 'Upcoming' })}
                    >
                      <View style={styles.ucTop}>
                        <View style={styles.ucIconBox}>
                          <Ionicons name="medical-outline" size={scale(22)} color={C.primary} />
                        </View>
                        <View style={styles.ucInfo}>
                          <Text style={styles.ucTitle}>{duty.speciality || 'Speciality Not Specified'}</Text>
                          <Text style={styles.ucDepartment}>{duty.department || 'Department Not Specified'}</Text>
                          <Text style={styles.ucHospital}>{hospitalName}</Text>
                          {area ? <Text style={styles.ucArea} numberOfLines={1}>{area}</Text> : null}
                          {locationString ? (
                            <View style={styles.ucLocationRowMain}>
                              <Ionicons name="location-outline" size={scale(12)} color={C.textMuted} />
                              <Text style={styles.ucLocation} numberOfLines={2}>{locationString}</Text>
                            </View>
                          ) : null}
                        </View>
                        <View style={[styles.ucBadge, { backgroundColor: '#d1fae5' }]}>
                          <Text style={[styles.ucBadgeText, { color: '#10b981' }]}>Confirmed</Text>
                        </View>
                      </View>

                      <View style={styles.ucBottom}>
                        <View style={{ gap: scale(8) }}>
                          <View style={styles.ucDateSection}>
                            <Ionicons name="calendar-outline" size={scale(13)} color={C.textSub} />
                            {nextShiftDate ? (
                              <View style={styles.ucDateChipsWrap}>
                                <View style={styles.ucDateChip}>
                                  <Text style={styles.ucDateChipText}>Next Shift: {formatShortDate(nextShiftDate)}</Text>
                                </View>
                              </View>
                            ) : hasIndividualDates ? (
                              <Text style={styles.ucDetailText}>Shifts completed</Text>
                            ) : (
                              <Text style={styles.ucDetailText}>{displayDatesRange}</Text>
                            )}
                          </View>
                          <View style={styles.ucDetailRow}>
                            <Ionicons name="time-outline" size={scale(13)} color={C.textSub} />
                            <Text style={styles.ucDetailText}>
                              {duty.duty_from_time && duty.duty_to_time
                                ? `${formatTimeAMPM(duty.duty_from_time)} - ${formatTimeAMPM(duty.duty_to_time)}`
                                : 'Timing not specified'}
                            </Text>
                          </View>
                        </View>
                        <View style={styles.ucPayBadge}>
                          <Text style={styles.ucPayAmt}>₹{displayRate}</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </View>

            {/* 3. QUICK ACTIONS SECTION */}
            <View style={styles.quickActionsContainer}>
              <Text style={styles.sectionTitlePad}>Quick Actions</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.actionsScroll} decelerationRate="fast" snapToInterval={scale(145) + scale(12)}>
                {quickActions.map(action => (
                  <TouchableOpacity key={action.id} style={[styles.qaCard, { backgroundColor: action.lightBg, borderColor: action.borderColor }]} activeOpacity={0.8} onPress={action.onPress}>
                    <View style={styles.qaTopRow}>
                      <View style={[styles.qaIconBox, { backgroundColor: action.color }]}>
                        <Ionicons name={action.icon} size={scale(16)} color={C.white} />
                      </View>
                      <Ionicons name="chevron-forward" size={scale(14)} color={action.color} />
                    </View>
                    <Text style={styles.qaTitle} numberOfLines={1}>{action.title}</Text>
                    <Text style={styles.qaSub} numberOfLines={1}>{action.sub}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </>
        )}
      </ScrollView>

      <RateCardBottomSheet visible={showRateSheet} rates={rateCard} onClose={() => setShowRateSheet(false)} />

      {/* ATTENDANCE MAP */}
      <Modal visible={mapVisible} animationType="slide" onRequestClose={closeAttendanceMap}>
        {(() => {
          const hc = mapDuty?.hospital?.coordinates;
          const hasHosp = !!(hc && hc.latitude && hc.longitude);
          const dist = hasHosp && mapCoords ? distanceMetersBetween(mapCoords, hc) : null;
          const outside = dist !== null && dist > GEOFENCE_RADIUS_METERS;
          const isIn = mapType === 'check-in';
          const focus = mapCoords || (hasHosp ? hc : null);
          return (
            <SafeAreaView style={styles.mapRoot} edges={['top', 'bottom']}>
              <View style={styles.mapHeader}>
                <TouchableOpacity onPress={closeAttendanceMap} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Ionicons name="close" size={scale(24)} color={C.ink} />
                </TouchableOpacity>
                <Text style={styles.mapTitle}>{isIn ? 'Check In' : 'Check Out'}</Text>
                <View style={{ width: scale(24) }} />
              </View>

              <View style={styles.mapWrap}>
                <MapView
                  ref={mapRef}
                  style={StyleSheet.absoluteFill}
                  initialRegion={focus
                    ? { latitude: focus.latitude, longitude: focus.longitude, latitudeDelta: 0.008, longitudeDelta: 0.008 }
                    : { latitude: 20.5937, longitude: 78.9629, latitudeDelta: 25, longitudeDelta: 25 }}
                  showsUserLocation
                  showsMyLocationButton
                >
                  {mapCoords && (
                    <Marker coordinate={{ latitude: mapCoords.latitude, longitude: mapCoords.longitude }} title="You are here" pinColor="red" />
                  )}
                  {hasHosp && (
                    <>
                      <Marker coordinate={hc} title={mapDuty?.hospital?.name || 'Hospital'} pinColor={C.primary} />
                      <Circle center={hc} radius={GEOFENCE_RADIUS_METERS} strokeColor={C.primary} fillColor="rgba(0,123,142,0.12)" />
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
                <Text style={styles.mapHospital} numberOfLines={1}>{mapDuty?.hospital?.name || 'Hospital'}</Text>
                <Text style={[styles.mapStatus, outside && { color: C.urgent }, dist !== null && !outside && { color: C.success }]}>
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
                  style={[styles.cdActionBtn, !isIn && styles.cdActionBtnOut, (!mapCoords || outside || attendanceLoading) && styles.cdActionBtnDisabled]}
                  disabled={!mapCoords || outside || attendanceLoading}
                  onPress={() => mapCoords && handleAttendance(mapDuty, mapType, mapCoords)}
                >
                  {attendanceLoading
                    ? <ActivityIndicator size="small" color={C.white} />
                    : <><Ionicons name={isIn ? 'log-in-outline' : 'log-out-outline'} size={scale(16)} color={C.white} /><Text style={styles.cdBtnText}>{isIn ? 'Confirm Check In' : 'Confirm Check Out'}</Text></>}
                </TouchableOpacity>
              </View>
            </SafeAreaView>
          );
        })()}
      </Modal>

      {/* MANUAL CHECK-OUT (end time + reason, no map) */}
      <ManualCheckOutModal
        visible={!!manualTarget}
        target={manualTarget}
        onClose={() => setManualTarget(null)}
        onSubmitted={(msg) => {
          setManualTarget(null);
          showToast(msg);
          loadAllData();
        }}
      />
    </SafeAreaView>
  );
};

export default HomeScreen;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background },
  scroll: { paddingBottom: scale(30) },
  toastContainer: { position: 'absolute', top: scale(54), alignSelf: 'center', backgroundColor: C.ink, flexDirection: 'row', alignItems: 'center', gap: scale(8), paddingHorizontal: scale(16), paddingVertical: scale(10), borderRadius: scale(20), zIndex: 9999 },
  toastText: { color: C.white, fontSize: scale(13), fontWeight: '700' },
  topBarContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: scale(20), paddingTop: scale(4), paddingBottom: scale(2) },
  logoContainer: { width: scale(95), height: scale(42), justifyContent: 'center', alignItems: 'flex-start' },
  logoImage: { width: '100%', height: '100%' },
  headerContainer: { paddingHorizontal: scale(20), paddingTop: scale(2), paddingBottom: scale(10), gap: scale(12) },
  greetingRow: { flexDirection: 'row', alignItems: 'center' },
  greetingTextWrap: { flexDirection: 'row', alignItems: 'center' },
  greetingText: { fontSize: scale(13), color: C.textSub, fontWeight: '700', marginLeft: scale(4) },
  userNameText: { fontSize: scale(16), color: C.ink, fontWeight: '900', marginLeft: scale(4) },
  sectionContainer: { marginHorizontal: scale(20), marginBottom: scale(20) },
  sectionContainerNoMargin: { marginBottom: scale(20) },
  sectionHeaderPad: { paddingHorizontal: scale(20), marginBottom: scale(10) },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: scale(10) },
  sectionTitle: { fontSize: scale(16), fontWeight: '800', color: C.ink },
  sectionTitlePad: { fontSize: scale(16), fontWeight: '800', color: C.ink, marginLeft: scale(20) },

  // TODAY DUTY CARDS
  todayDutiesScrollContainer: { paddingHorizontal: scale(20), paddingBottom: scale(6) },
  currentDutyCard: { borderRadius: scale(14), padding: scale(14), borderWidth: 1, borderColor: '#D4EBEB', width: SW * 0.85, marginRight: scale(14) },
  cdHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: scale(12) },
  cdHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: scale(6) },
  cdDot: { width: scale(6), height: scale(6), borderRadius: scale(3), backgroundColor: C.success },
  cdHeaderText: { fontSize: scale(11), fontWeight: '800', color: C.primary, letterSpacing: 0.5 },
  cdInProgress: { fontSize: scale(12), fontWeight: '700', color: C.primary },
  cdBody: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: scale(12) },
  cdIconBox: { width: scale(42), height: scale(42), borderRadius: scale(10), backgroundColor: C.white, alignItems: 'center', justifyContent: 'center', marginRight: scale(12) },
  cdInfo: { flex: 1, justifyContent: 'center' },
  cdTitle: { fontSize: scale(15), fontWeight: '700', color: C.ink, marginBottom: scale(2) },
  cdHospital: { fontSize: scale(13), color: C.textSub, marginBottom: scale(3), fontWeight: '600' },
  cdLocationRow: { flexDirection: 'row', alignItems: 'flex-start', gap: scale(4) },
  cdLocationText: { fontSize: scale(12), color: C.textSub, fontWeight: '500', flex: 1, lineHeight: scale(16) },
  cdDivider: { height: 1, backgroundColor: '#d8eef0', marginBottom: scale(10) },
  cdFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cdFooterItem: { flexDirection: 'row', gap: scale(6), alignItems: 'center' },
  cdFooterText: { fontSize: scale(12), color: C.textSub, fontWeight: '700' },
  cdBtnText: { color: C.white, fontSize: scale(12), fontWeight: '700' },
  cdAttendanceWrap: { marginTop: scale(12), gap: scale(8) },
  cdAttendanceInfoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cdAttendanceInfoText: { fontSize: scale(11), color: C.textSub, fontWeight: '600' },
  cdActionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#006C7C', paddingVertical: scale(10), borderRadius: scale(10), gap: scale(6) },
  cdActionBtnOut: { backgroundColor: C.urgent },
  cdActionBtnDisabled: { opacity: 0.7 },
  cdTimeWaitBadge: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: scale(6), backgroundColor: '#fffbeb', paddingVertical: scale(8), borderRadius: scale(10), borderWidth: 1, borderColor: '#fde68a' },
  cdTimeWaitText: { fontSize: scale(11), fontWeight: '600', color: '#d97706' },
  cdCompletedBadge: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: scale(6), backgroundColor: '#ecfdf5', paddingVertical: scale(8), borderRadius: scale(10), borderWidth: 1, borderColor: '#a7f3d0' },
  cdLastDayText: { fontSize: scale(10), fontWeight: '700', color: '#059669' },

  // UPCOMING DUTIES
  emptyUpcomingBox: { alignItems: 'center', paddingVertical: scale(16), backgroundColor: C.cardBg, borderRadius: scale(12), borderWidth: 1, borderColor: C.border, borderStyle: 'dashed' },
  emptyUpcomingText: { fontSize: scale(12), color: C.textMuted, fontWeight: '500', marginTop: scale(8) },
  upcomingCard: { backgroundColor: C.cardBg, borderRadius: scale(14), borderWidth: 1, borderColor: C.border, padding: scale(16), marginBottom: scale(14) },
  ucTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: scale(8) },
  ucIconBox: { width: scale(44), height: scale(44), borderRadius: scale(22), backgroundColor: C.primaryLight, alignItems: 'center', justifyContent: 'center', marginRight: scale(12) },
  ucInfo: { flex: 1, paddingRight: scale(8) },
  ucTitle: { fontSize: scale(15), fontWeight: '800', color: C.ink, marginBottom: scale(2) },
  ucDepartment: { fontSize: scale(13), color: C.textSub, fontWeight: '600', marginBottom: scale(4) },
  ucHospital: { fontSize: scale(13), color: C.primary, fontWeight: '700' },
  ucArea: { fontSize: scale(12), color: C.textSub, fontWeight: '500', marginTop: scale(2) },
  ucBadge: { paddingHorizontal: scale(6), paddingVertical: scale(3), borderRadius: scale(6), alignSelf: 'flex-start' },
  ucBadgeText: { fontSize: scale(10), fontWeight: '700' },
  ucLocationRowMain: { flexDirection: 'row', alignItems: 'center', gap: scale(4), marginTop: scale(4) },
  ucLocation: { fontSize: scale(12), color: C.textMuted, fontWeight: '500', flex: 1 },
  ucBottom: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingTop: scale(12), marginTop: scale(8), borderTopWidth: 1, borderTopColor: C.border },
  ucDateSection: { flexDirection: 'row', alignItems: 'center', gap: scale(6) },
  ucDateChipsWrap: { flexDirection: 'row', gap: scale(4) },
  ucDateChip: { backgroundColor: C.inputBg, borderWidth: 1, borderColor: C.border, paddingHorizontal: scale(6), paddingVertical: scale(2), borderRadius: scale(4) },
  ucDateChipText: { fontSize: scale(10), fontWeight: '600', color: C.ink },
  ucDetailRow: { flexDirection: 'row', alignItems: 'center', gap: scale(6) },
  ucDetailText: { fontSize: scale(12), color: C.textSub, fontWeight: '700' },
  ucPayBadge: { backgroundColor: C.primaryLight, paddingHorizontal: scale(12), paddingVertical: scale(6), borderRadius: scale(8), alignItems: 'flex-end' },
  ucPayAmt: { fontSize: scale(13), fontWeight: '800', color: C.primary },

  // QUICK ACTIONS
  quickActionsContainer: { marginBottom: scale(20) },
  actionsScroll: { paddingHorizontal: scale(20), paddingTop: scale(6), gap: scale(10), paddingBottom: scale(4) },
  qaCard: { width: scale(145), borderRadius: scale(12), padding: scale(14), borderWidth: 1 },
  qaTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: scale(10) },
  qaIconBox: { width: scale(36), height: scale(36), borderRadius: scale(10), alignItems: 'center', justifyContent: 'center' },
  qaTitle: { fontSize: scale(14), fontWeight: '800', color: C.ink, marginBottom: scale(2) },
  qaSub: { fontSize: scale(11), color: C.textSub, fontWeight: '500' },

  availabilityWrapper: { marginHorizontal: scale(20), marginBottom: scale(24), marginTop: scale(8) },
  availabilityHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: scale(12), paddingHorizontal: scale(4) },
  availabilityTitle: { fontSize: scale(16), fontWeight: '900', color: C.ink, letterSpacing: -0.5 },

  // BOTTOM SHEET
  backdrop: { flex: 1, backgroundColor: 'rgba(17, 24, 39, 0.4)' },
  sheet: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: C.background, borderTopLeftRadius: scale(28), borderTopRightRadius: scale(28), maxHeight: SH * 0.85, paddingBottom: scale(34) },
  handle: { width: scale(40), height: scale(5), borderRadius: scale(2.5), backgroundColor: C.border, alignSelf: 'center', marginTop: scale(12), marginBottom: scale(4) },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', gap: scale(14), paddingHorizontal: scale(24), paddingVertical: scale(16), borderBottomWidth: 1, borderBottomColor: C.cardBg },
  sheetIconBubble: { width: scale(40), height: scale(40), borderRadius: scale(14), backgroundColor: C.primaryLight, alignItems: 'center', justifyContent: 'center' },
  sheetTitle: { fontSize: scale(16), fontWeight: '900', color: C.ink, letterSpacing: -0.3 },
  sheetSub: { fontSize: scale(12), color: C.textSub, marginTop: scale(2), fontWeight: '500' },
  closeBtn: { width: scale(32), height: scale(32), borderRadius: scale(16), backgroundColor: C.inputBg, alignItems: 'center', justifyContent: 'center' },
  emptyWrap: { alignItems: 'center', paddingVertical: scale(48), gap: scale(12), width: SW - scale(40) },
  emptyIconCircle: { width: scale(64), height: scale(64), borderRadius: scale(32), backgroundColor: C.primaryLight, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: scale(16), fontWeight: '900', color: C.ink },
  emptySub: { fontSize: scale(13), color: C.textSub, fontWeight: '500' },
  scrollContentHorizontal: { paddingHorizontal: scale(20), paddingTop: scale(20), paddingBottom: scale(20), flexGrow: 1 },
  rateCard: { backgroundColor: C.cardBg, borderRadius: scale(16), borderWidth: 1, borderColor: C.border, overflow: 'hidden', width: scale(280) },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: scale(12), paddingHorizontal: scale(16), paddingVertical: scale(16) },
  dutyIconWrap: { width: scale(40), height: scale(40), borderRadius: scale(10), backgroundColor: C.inputBg, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  dutyName: { fontSize: scale(14), fontWeight: '800', color: C.ink },
  dutySubLabel: { fontSize: scale(12), color: C.textMuted, marginTop: scale(2), fontWeight: '500' },
  rateTypeBadge: { backgroundColor: C.background, borderRadius: scale(8), paddingHorizontal: scale(10), paddingVertical: scale(6), borderWidth: 1, borderColor: C.border },
  rateTypeBadgeText: { fontSize: scale(11), fontWeight: '700', color: C.textSub },
  divider: { height: 1, backgroundColor: C.border },
  rateRows: { paddingHorizontal: scale(16), paddingVertical: scale(8) },
  rateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: scale(10) },
  rateRowLeft: { flexDirection: 'row', alignItems: 'center', gap: scale(10) },
  rateIconBox: { width: scale(28), height: scale(28), borderRadius: scale(8), alignItems: 'center', justifyContent: 'center' },
  rateRowLabel: { fontSize: scale(13), color: C.textSub, fontWeight: '700' },
  rateRowRight: { flexDirection: 'row', alignItems: 'baseline', gap: scale(4) },
  rateAmt: { fontSize: scale(15), fontWeight: '900', color: C.ink },
  rateUnit: { fontSize: scale(11), fontWeight: '600', color: C.textMuted },
  cardFooter: { paddingHorizontal: scale(16), paddingVertical: scale(14) },
  paymentChip: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: scale(6), borderRadius: scale(8), borderWidth: 1, paddingHorizontal: scale(10), paddingVertical: scale(6) },
  paymentChipText: { fontSize: scale(12), fontWeight: '700' },
  mapRoot: { flex: 1, backgroundColor: C.cardBg },
  mapHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: scale(16), paddingVertical: scale(12), borderBottomWidth: 1, borderBottomColor: C.border },
  mapTitle: { fontSize: scale(16), fontWeight: '800', color: C.ink },
  mapWrap: { flex: 1, backgroundColor: C.inputBg },
  mapLocatingBadge: { position: 'absolute', top: scale(12), alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: scale(8), backgroundColor: C.cardBg, paddingHorizontal: scale(14), paddingVertical: scale(8), borderRadius: scale(20), borderWidth: 1, borderColor: C.border },
  mapLoader: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: scale(10) },
  mapLoaderText: { fontSize: scale(13), color: C.textSub, fontWeight: '600' },
  mapFooter: { padding: scale(16), gap: scale(8), borderTopWidth: 1, borderTopColor: C.border },
  mapHospital: { fontSize: scale(15), fontWeight: '800', color: C.ink },
  mapStatus: { fontSize: scale(12), color: C.textSub, fontWeight: '600', marginBottom: scale(4) },
});