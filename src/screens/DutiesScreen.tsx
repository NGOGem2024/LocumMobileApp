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
  PermissionsAndroid
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Geolocation from '@react-native-community/geolocation';
import api from '../services/axiosConfig';
import { ManualCheckOutModal, MissedCheckOutsCard, fetchMissedCheckOuts, MissedCheckOut, ManualTarget } from '../components/ManualCheckOut';

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

// --- Location & Time Helpers ---
const requestLocationPermission = async (): Promise<boolean> => {
  if (Platform.OS === 'android') {
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
    const onSuccess = (position: any) => resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude, accuracy: position.coords.accuracy });
    Geolocation.getCurrentPosition(onSuccess, () => {
      Geolocation.getCurrentPosition(onSuccess, error => reject(error), { enableHighAccuracy: false, timeout: 20000, maximumAge: 10000 });
    }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
  });

const formatTimeAMPM = (timeStr?: string) => {
  if (!timeStr) return 'TBD';
  const parts = timeStr.split(':');
  if (parts.length < 2) return timeStr; 
  let hours = parseInt(parts[0], 10);
  const minutes = parts[1];
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; 
  const formattedHours = hours < 10 ? `0${hours}` : hours;
  return `${formattedHours}:${minutes} ${ampm}`;
};

const formatTimestampTime = (iso?: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
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
  const effectiveStart = startMins - 30;

  if (endMins < startMins) return currentMins >= effectiveStart || currentMins <= endMins;
  return currentMins >= effectiveStart && currentMins <= endMins;
};

const DutiesScreen = ({ route, navigation }: any) => {
  const initialTab = route?.params?.defaultTab || 'Today';
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  const tabs: TabType[] = ['Today', 'Invited', 'Interested', 'Assigned', 'Upcoming', 'Past', 'Cancelled'];
  
  const [declineModalVisible, setDeclineModalVisible] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState('');
  
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [missedCheckOuts, setMissedCheckOuts] = useState<MissedCheckOut[]>([]);
  const [manualTarget, setManualTarget] = useState<ManualTarget | null>(null);
  
  const [toastMessage, setToastMessage] = useState('');
  const toastFadeAnim = useRef(new Animated.Value(0)).current;

  const showToast = useCallback((message: string) => {
    setToastMessage(message);
    Animated.sequence([
      Animated.timing(toastFadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(1800),
      Animated.timing(toastFadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start();
  }, [toastFadeAnim]);

  const fetchDuties = useCallback(async () => {
    try {
      const currentTab = activeTab.toLowerCase();
      if (currentTab === 'today') {
        const response = await api.get('/api/doctors/today-duties');
        setJobs(response.data?.success && response.data?.has_today_duty ? response.data.today_duties : []);
        setMissedCheckOuts(await fetchMissedCheckOuts());
      } else {
        const response = await api.get('/api/doctors/duties', { params: { tab: currentTab } });
        setJobs(response.data?.success ? (response.data.duties || response.data.tabs?.[currentTab] || []) : []);
      }
    } catch (error) {
      setJobs([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab]);

  useEffect(() => {
    setLoading(true);
    fetchDuties();
  }, [fetchDuties]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDuties();
  };

  const handleTabChange = (tab: TabType) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setActiveTab(tab);
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

  const handleAttendance = async (duty: any, type: 'check-in' | 'check-out') => {
    if (!duty?.requirement_id || attendanceLoading) return;
    if (type === 'check-in') {
      const activeDuty = jobs.find(d => d.attendance?.is_checked_in && !d.attendance?.is_checked_out);
      if (activeDuty && activeDuty.requirement_id !== duty.requirement_id) {
        showToast("First you have to check out or close the active duty");
        return;
      }
    }
    setAttendanceLoading(true);
    try {
      const hasPermission = await requestLocationPermission();
      if (!hasPermission) {
        showToast('Location permission is required');
        return;
      }
      let coords;
      try {
        coords = await getCurrentPosition();
      } catch (locErr: any) {
        showToast('Unable to get location. Turn on GPS and try again.');
        return;
      }
      const { data } = await api.post(`/api/doctors/${type}`, {
        requirement_id: duty.requirement_id, latitude: coords.latitude, longitude: coords.longitude, accuracy: coords.accuracy,
      });
      showToast(data?.message || (type === 'check-in' ? 'Check-in successful!' : 'Check-out successful!'));
      fetchDuties();
    } catch (error: any) {
      if (error.response?.data?.manual_check_out_required) {
        // Check-out time is over: switch to the manual form (no map)
        showToast(error.response?.data?.message || 'Please add your check-out time.');
        openManualCheckOut(duty);
        fetchDuties();
      } else {
        showToast(error.response?.data?.message || 'Error processing attendance');
      }
    } finally {
      setAttendanceLoading(false);
    }
  };

  const handleUpdateDutyStatus = async (requirementId: string, action: 'Confirmed' | 'Declined', reason?: string) => {
    try {
      setLoading(true);
      const response = await api.post('/api/doctors/duty-status', { requirement_id: requirementId, action: action, decline_reason: reason || '' });
      if (response.data?.success) {
        setDeclineModalVisible(false);
        setDeclineReason('');
        fetchDuties();
      }
    } catch (error) {} finally { setLoading(false); }
  };

  const handleRespondToInvitation = async (invitationId: string, responseStatus: 'Interested' | 'Not Interested') => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setJobs(prev => prev.filter(job => job.invitation_id !== invitationId));
    try {
      const response = await api.post('/api/doctors/invited-jobs/respond', { invitation_id: invitationId, response: responseStatus });
      if (response.data.success) showToast(`Marked as ${responseStatus}`);
    } catch (error) {
      showToast('Failed to record response');
      fetchDuties(); 
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Timing not specified';
    return new Date(dateString).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };
  const formatShortDate = (dateString: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
  };
  const formatAMPM = (timeString: string) => {
    if (!timeString) return '';
    const [hourString, minute] = timeString.split(':');
    if (!hourString || !minute) return timeString;
    let hour = parseInt(hourString, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    hour = hour % 12 || 12;
    return `${hour}:${minute} ${ampm}`;
  };

  const renderItem = ({ item, index }: { item: any; index: number }) => {
    const isToday = activeTab === 'Today';

    const hospitalName = isToday 
      ? (item.hospital?.name || 'Hospital') 
      : (item.hospital_details?.hospital_name || 'Hospital');
    
    const loc = isToday ? item.hospital : item.req_location_details;
    const area = loc?.area || '';
    const city = loc?.district || loc?.dist || loc?.city || '';
    const state = loc?.state || '';
    const pincode = loc?.pincode || loc?.pin || '';
    const locationParts = [area, city, state].filter(Boolean);
    let locationString = locationParts.join(', ');
    if (pincode) locationString = locationString ? `${locationString} - ${pincode}` : pincode;
    if (!locationString) locationString = 'Location unavailable';

    const shiftTimeFrom = isToday ? item.shift_timings?.duty_from_time : item.shift_time_from;
    const shiftTimeTo = isToday ? item.shift_timings?.duty_to_time : item.shift_time_to;
    
    const assignedDates = item.assigned_dates || [];
    const hasIndividualDates = assignedDates.length > 0;
    
    // Today specific dates
    const assignedTodayDates: string[] = isToday ? (item.assigned_schedule?.assigned_dates || []) : [];
    const remainingTodayDates: string[] = isToday ? (item.assigned_schedule?.remaining_dates || []) : [];

    let displayDatesRange = '';
    if (!isToday && !hasIndividualDates) {
      const start = formatDate(item.shift_date_from);
      const end = item.shift_date_to ? formatDate(item.shift_date_to) : start;
      displayDatesRange = start === end ? start : `${start} to ${end}`;
    }
    
    const isExpired = !isToday && item.shift_date_to ? (new Date(item.shift_date_to).setHours(0,0,0,0) < new Date().setHours(0,0,0,0)) : false;
    const isInvitedOrInterested = activeTab === 'Invited' || activeTab === 'Interested';
    const displayRate = isToday ? (item.configured_rate || item.offered_rate || '0') : (isInvitedOrInterested ? (item.offered_rate || '0') : (item.configured_rate || item.offered_rate || '0'));

    // Securely pull attendance object provided by today-duties endpoint for Today tab
    const attendance = isToday ? item.attendance : null;
    const isDutyCompleted = !!attendance?.is_checked_out || item.duty_state === 'COMPLETED';
    const canCheckIn = !!attendance?.can_check_in;
    const canCheckOut = !!attendance?.can_check_out;
    const checkInTimeStr = formatTimestampTime(attendance?.check_in_time);
    const checkOutTimeStr = formatTimestampTime(attendance?.check_out_time);
    const manualRequired = !!attendance?.manual_check_out_required;
    const manualPending = !!attendance?.manual_check_out_pending;
    const showActions = isToday ? isDutyTimeActionable(shiftTimeFrom, shiftTimeTo, attendance?.is_checked_in, attendance?.is_checked_out) : false;

    return (
      <TouchableOpacity
        style={styles.jobCard}
        activeOpacity={activeTab === 'Invited' || isToday ? 1 : 0.85}
        onPress={() => {
          if (activeTab === 'Invited' || isToday) return; 
          navigation.navigate('JobDetails', { jobDetails: item, isAssigned: ['Assigned', 'Upcoming', 'Past'].includes(activeTab as string), jobStatus: activeTab });
        }}
      >
        <View style={styles.cardHeader}>
          <View style={styles.titleRow}>
            <Text style={styles.jobTitle} numberOfLines={1}>{item.speciality || 'General Duty'} {item.department ? `- ${item.department}` : ''}</Text>
            {(item.vacancy_status === 'Urgent' || (isToday && item.duty_state === 'IN_PROGRESS')) && (
                <View style={[styles.badge, isToday && item.duty_state === 'IN_PROGRESS' && {backgroundColor: C.primaryLight}]}>
                    <Text style={[styles.badgeText, isToday && item.duty_state === 'IN_PROGRESS' && {color: C.primary}]}>
                        {isToday && item.duty_state === 'IN_PROGRESS' ? 'In Progress' : 'Urgent'}
                    </Text>
                </View>
            )}
          </View>
          {(activeTab !== 'Invited' && activeTab !== 'Interested') && <Text style={styles.hospitalName}>{hospitalName}</Text>}
          <Text style={styles.locationText} numberOfLines={2}><Ionicons name="location-outline" size={scale(12)} color={C.textMuted} /> {locationString}</Text>
        </View>

        <View style={styles.cardDetails}>
          {/* NON-TODAY DATES */}
          {!isToday && (
            <View style={[styles.detailRow, hasIndividualDates && { alignItems: 'flex-start' }]}>
              <Ionicons name="calendar-outline" size={scale(16)} color={C.textSub} style={hasIndividualDates ? { marginTop: scale(2) } : {}} />
              <View style={{ flex: 1 }}>
                {hasIndividualDates ? (
                  <><View style={styles.dateChipContainer}>{assignedDates.map((d: string) => (<View key={d} style={styles.dateChip}><Text style={styles.dateChipText}>{formatShortDate(d)}</Text></View>))}</View><Text style={styles.subDetailText}>Total {assignedDates.length} days assigned</Text></>
                ) : <Text style={styles.detailText}>{displayDatesRange}</Text>}
              </View>
            </View>
          )}

          {/* DETAILED TODAY DATES (ASSIGNED & REMAINING) */}
          {isToday && (
            <View style={styles.todayDatesBlock}>
              <View style={styles.todayDateRow}>
                <View style={styles.todayDateLabelWrap}>
                  <Ionicons name="calendar-outline" size={scale(12)} color={C.primary} />
                  <Text style={styles.todayDateLabelText}>Assigned ({assignedTodayDates.length}):</Text>
                </View>
                <View style={styles.todayChipsScroll}>
                  {assignedTodayDates.length > 0 ? assignedTodayDates.map((d: string) => (
                    <View key={d} style={styles.todayAssignedChip}><Text style={styles.todayAssignedChipText}>{formatShortDate(d)}</Text></View>
                  )) : <Text style={styles.todayEmptyDateText}>No dates recorded</Text>}
                </View>
              </View>
              <View style={styles.todayDateRow}>
                <View style={styles.todayDateLabelWrap}>
                  <Ionicons name="time-outline" size={scale(12)} color={C.warning} />
                  <Text style={styles.todayDateLabelText}>Upcoming ({remainingTodayDates.length}):</Text>
                </View>
                <View style={styles.todayChipsScroll}>
                  {remainingTodayDates.length > 0 ? remainingTodayDates.map((d: string) => (
                    <View key={d} style={styles.todayRemainingChip}><Text style={styles.todayRemainingChipText}>{formatShortDate(d)}</Text></View>
                  )) : <View style={styles.todayLastDayBadge}><Text style={styles.todayLastDayText}>Final Day Today</Text></View>}
                </View>
              </View>
            </View>
          )}

          <View style={styles.detailRow}>
            <Ionicons name="time-outline" size={scale(16)} color={C.textSub} />
            <Text style={styles.detailText}>{shiftTimeFrom && shiftTimeTo ? `${formatAMPM(shiftTimeFrom)} - ${formatAMPM(shiftTimeTo)}` : 'Timing not specified'}</Text>
          </View>
          
          {isToday && (checkInTimeStr || checkOutTimeStr) && (
            <View style={[styles.detailRow, {marginTop: scale(4)}]}>
                <Ionicons name="finger-print-outline" size={scale(16)} color={C.primary} />
                <Text style={[styles.subDetailText, {marginTop: 0, color: C.ink}]}>
                   {checkInTimeStr && `In: ${checkInTimeStr}`} {checkInTimeStr && checkOutTimeStr && ' | '} {checkOutTimeStr && `Out: ${checkOutTimeStr}`}
                </Text>
            </View>
          )}
        </View>

        <View style={styles.divider} />
        
        <View style={styles.cardFooter}>
          <View>
            <Text style={styles.statusText}>{isToday ? 'Today Duty' : isInvitedOrInterested ? 'Invitation' : `${activeTab} Duty`}</Text>
            <Text style={styles.payText}>₹{displayRate}</Text>
          </View>
          
          <View style={styles.actionButtons}>
              {activeTab === 'Assigned' && (
                <>
                  <TouchableOpacity style={[styles.actionBtn, styles.declineBtn]} onPress={() => { setSelectedJobId(item.req_id); setDeclineModalVisible(true); }}><Text style={styles.declineText}>Decline</Text></TouchableOpacity>
                  <TouchableOpacity style={[styles.actionBtn, styles.confirmBtn]} onPress={() => handleUpdateDutyStatus(item.req_id, 'Confirmed')}><Text style={styles.confirmText}>Confirm</Text></TouchableOpacity>
                </>
              )}
              {activeTab === 'Invited' && (
                isExpired ? <View style={[styles.appliedBadge, { backgroundColor: C.border }]}><Text style={[styles.appliedBadgeText, { color: C.textSub }]}>Expired</Text></View> : item.vacancy_status !== 'Closed' ? (
                  <>
                    <TouchableOpacity style={[styles.actionBtn, styles.declineBtn]} onPress={() => handleRespondToInvitation(item.invitation_id, 'Not Interested')}><Text style={styles.declineText}>Decline</Text></TouchableOpacity>
                    <TouchableOpacity style={[styles.actionBtn, styles.confirmBtn]} onPress={() => handleRespondToInvitation(item.invitation_id, 'Interested')}><Text style={styles.confirmText}>Interested</Text></TouchableOpacity>
                  </>
                ) : null
              )}
              {activeTab === 'Interested' && <View style={[styles.appliedBadge, { backgroundColor: C.primaryLight }]}><Text style={[styles.appliedBadgeText, { color: C.primary }]}>Interested</Text></View>}
              
              {/* TODAY'S ATTENDANCE BUTTONS */}
              {activeTab === 'Today' && (
                  <>
                    {manualRequired && (
                      <TouchableOpacity style={[styles.actionBtn, {backgroundColor: '#d97706', borderColor: '#d97706'}]} onPress={() => openManualCheckOut(item)}>
                        <Text style={styles.confirmText}>Add Check-Out Time</Text>
                      </TouchableOpacity>
                    )}
                    {manualPending && <View style={[styles.appliedBadge, { backgroundColor: '#fffbeb' }]}><Text style={[styles.appliedBadgeText, { color: '#d97706' }]}>Waiting for approval</Text></View>}
                    {showActions ? (
                      <>
                        {canCheckIn && (
                          <TouchableOpacity style={[styles.actionBtn, styles.confirmBtn, attendanceLoading && {opacity: 0.7}]} disabled={attendanceLoading} onPress={() => handleAttendance(item, 'check-in')}>
                            {attendanceLoading ? <ActivityIndicator size="small" color={C.white} /> : <Text style={styles.confirmText}>Check In</Text>}
                          </TouchableOpacity>
                        )}
                        {canCheckOut && (
                          <TouchableOpacity style={[styles.actionBtn, {backgroundColor: C.urgent, borderColor: C.urgent}, attendanceLoading && {opacity: 0.7}]} disabled={attendanceLoading} onPress={() => handleAttendance(item, 'check-out')}>
                            {attendanceLoading ? <ActivityIndicator size="small" color={C.white} /> : <Text style={[styles.confirmText, {color: C.white}]}>Check Out</Text>}
                          </TouchableOpacity>
                        )}
                      </>
                    ) : (
                        !isDutyCompleted && <Text style={{fontSize: scale(11), color: C.warning, fontWeight: '700'}}>Action available at duty time</Text>
                    )}
                    {isDutyCompleted && <View style={[styles.appliedBadge, { backgroundColor: C.successLight }]}><Text style={[styles.appliedBadgeText, { color: C.success }]}>Completed</Text></View>}
                  </>
              )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name={activeTab === 'Invited' ? "mail-open-outline" : "briefcase-outline"} size={scale(48)} color={C.border} />
      <Text style={styles.emptyTitle}>No {activeTab} Data</Text>
      <Text style={styles.emptySubText}>You do not have any {activeTab.toLowerCase()} items right now.</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={C.cardBg} />
      <Animated.View pointerEvents="none" style={[styles.toastContainer, { opacity: toastFadeAnim }]}><Ionicons name="checkmark-circle" size={18} color={C.white} /><Text style={styles.toastText}>{toastMessage}</Text></Animated.View>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation?.goBack()} style={styles.backBtn}><Ionicons name="chevron-back" size={scale(24)} color={C.ink} /></TouchableOpacity>
        <Text style={styles.headerTitle}>Duties</Text>
        <View style={{ width: scale(24) }} />
      </View>
      <View style={styles.tabWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabContainer}>
          {tabs.map(tab => {
            const isActive = activeTab === tab;
            return (
              <TouchableOpacity key={tab} style={[styles.tabBtn, isActive && styles.tabBtnActive]} onPress={() => handleTabChange(tab)} activeOpacity={0.7}>
                <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{tab}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
      {loading && !refreshing ? (
        <View style={styles.centerWrap}><ActivityIndicator size="large" color={C.primary} /></View>
      ) : (
        <FlatList
          data={jobs}
          keyExtractor={(item, index) => item.assignment_id || item.invitation_id || item.req_id || index.toString()}
          renderItem={renderItem}
          ListHeaderComponent={activeTab === 'Today' ? <MissedCheckOutsCard items={missedCheckOuts} onAdd={openManualForMissed} flush /> : null}
          contentContainerStyle={[styles.listContent, jobs.length === 0 && styles.listContentEmpty]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={renderEmptyState}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.primary]} />}
        />
      )}
      <ManualCheckOutModal
        visible={!!manualTarget}
        target={manualTarget}
        onClose={() => setManualTarget(null)}
        onSubmitted={(msg) => {
          setManualTarget(null);
          showToast(msg);
          fetchDuties();
        }}
      />
      <Modal visible={declineModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Decline Duty</Text>
            <Text style={styles.modalSub}>Please provide a reason for declining this assigned duty.</Text>
            <TextInput style={styles.reasonInput} placeholder="E.g., Scheduling conflict, travel issue..." placeholderTextColor={C.textMuted} multiline value={declineReason} onChangeText={setDeclineReason} />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelModalBtn} onPress={() => { setDeclineModalVisible(false); setDeclineReason(''); }}><Text style={styles.cancelModalText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={styles.submitModalBtn} onPress={() => selectedJobId && handleUpdateDutyStatus(selectedJobId, 'Declined', declineReason)}><Text style={styles.submitModalText}>Submit</Text></TouchableOpacity>
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
  toastContainer: { position: 'absolute', top: scale(54), alignSelf: 'center', backgroundColor: C.ink, flexDirection: 'row', alignItems: 'center', gap: scale(8), paddingHorizontal: scale(16), paddingVertical: scale(10), borderRadius: scale(20), zIndex: 9999, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 10, elevation: 8 },
  toastText: { color: C.white, fontSize: scale(13), fontWeight: '700' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: scale(16), paddingVertical: scale(14), backgroundColor: C.cardBg, borderBottomWidth: 1, borderBottomColor: C.border },
  backBtn: { padding: scale(4) },
  headerTitle: { fontSize: scale(17), fontWeight: '800', color: C.ink, letterSpacing: -0.3 },
  tabWrapper: { backgroundColor: C.background },
  tabContainer: { paddingHorizontal: scale(20), paddingTop: scale(16), paddingBottom: scale(12), gap: scale(10) },
  tabBtn: { paddingHorizontal: scale(16), paddingVertical: scale(8), borderRadius: scale(20), backgroundColor: C.cardBg, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border },
  tabBtnActive: { backgroundColor: C.primaryLight, borderColor: C.primary },
  tabText: { fontSize: scale(13), fontWeight: '700', color: C.textSub },
  tabTextActive: { color: C.primary },
  centerWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { paddingHorizontal: scale(20), paddingBottom: scale(100), paddingTop: scale(8) },
  listContentEmpty: { flex: 1, justifyContent: 'center' },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', padding: scale(20), marginTop: scale(-40) },
  emptyTitle: { fontSize: scale(16), fontWeight: '700', color: C.ink, marginTop: scale(12), marginBottom: scale(6) },
  emptySubText: { fontSize: scale(13), color: C.textMuted, textAlign: 'center', lineHeight: scale(18) },
  jobCard: { backgroundColor: C.cardBg, borderRadius: scale(16), marginBottom: scale(16), borderWidth: 1, borderColor: C.border, padding: scale(16), shadowColor: C.ink, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  cardHeader: { marginBottom: scale(12) },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: scale(4) },
  jobTitle: { flex: 1, fontSize: scale(15), fontWeight: '800', color: C.ink, letterSpacing: -0.3, paddingRight: scale(8) },
  badge: { backgroundColor: C.warningLight, paddingHorizontal: scale(8), paddingVertical: scale(2), borderRadius: scale(8) },
  badgeText: { fontSize: scale(10), fontWeight: '700', color: C.warning, textTransform: 'uppercase' },
  hospitalName: { fontSize: scale(14), color: C.ink, fontWeight: '600', marginBottom: scale(4) },
  locationText: { fontSize: scale(12), color: C.textMuted, fontWeight: '500' },
  cardDetails: { backgroundColor: C.inputBg, borderRadius: scale(12), padding: scale(12), gap: scale(8), marginBottom: scale(12) },
  detailRow: { flexDirection: 'row', alignItems: 'flex-start', gap: scale(8) },
  detailText: { fontSize: scale(13), color: C.ink, fontWeight: '600' },
  subDetailText: { fontSize: scale(11), color: C.textSub, fontWeight: '600', marginTop: scale(4) },
  dateChipContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: scale(6), marginBottom: scale(2) },
  dateChip: { backgroundColor: C.white, borderWidth: 1, borderColor: '#D1D5DB', paddingHorizontal: scale(6), paddingVertical: scale(3), borderRadius: scale(6) },
  dateChipText: { fontSize: scale(11), fontWeight: '600', color: C.ink },
  divider: { height: 1, backgroundColor: C.border, marginBottom: scale(12) },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusText: { fontSize: scale(12), fontWeight: '700', color: C.primary, textTransform: 'uppercase', marginBottom: scale(2) },
  payText: { fontSize: scale(15), fontWeight: '800', color: C.ink },
  paySubText: { fontSize: scale(12), fontWeight: '600', color: C.textSub },
  actionButtons: { flexDirection: 'row', gap: scale(8) },
  actionBtn: { paddingVertical: scale(8), paddingHorizontal: scale(14), borderRadius: scale(8), borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  declineBtn: { borderColor: '#EF4444', backgroundColor: '#FEF2F2' },
  confirmBtn: { borderColor: C.primary, backgroundColor: C.primary },
  declineText: { color: '#EF4444', fontWeight: '700', fontSize: scale(12) },
  confirmText: { color: C.white, fontWeight: '700', fontSize: scale(12) },
  appliedBadge: { backgroundColor: C.successLight, paddingVertical: scale(6), paddingHorizontal: scale(12), borderRadius: scale(8) },
  appliedBadgeText: { color: C.success, fontSize: scale(11), fontWeight: '700' },
  declinedBadge: { backgroundColor: C.dangerLight },
  declinedBadgeText: { color: C.danger },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: scale(20) },
  modalContent: { backgroundColor: C.cardBg, borderRadius: scale(16), padding: scale(20), width: '100%' },
  modalTitle: { fontSize: scale(16), fontWeight: '800', color: C.ink, marginBottom: scale(8) },
  modalSub: { fontSize: scale(13), color: C.textSub, marginBottom: scale(16) },
  reasonInput: { backgroundColor: C.inputBg, borderRadius: scale(12), borderWidth: 1, borderColor: C.border, padding: scale(12), minHeight: scale(100), textAlignVertical: 'top', color: C.ink, marginBottom: scale(20) },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: scale(12) },
  cancelModalBtn: { paddingVertical: scale(10), paddingHorizontal: scale(16) },
  cancelModalText: { color: C.textSub, fontWeight: '700', fontSize: scale(14) },
  submitModalBtn: { backgroundColor: '#EF4444', paddingVertical: scale(10), paddingHorizontal: scale(20), borderRadius: scale(8) },
  submitModalText: { color: C.white, fontWeight: '700', fontSize: scale(14) },
  todayDatesBlock: { gap: scale(8), marginBottom: scale(8), paddingBottom: scale(8), borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  todayDateRow: { flexDirection: 'row', alignItems: 'flex-start' },
  todayDateLabelWrap: { flexDirection: 'row', alignItems: 'center', gap: scale(4), width: scale(100), marginTop: scale(2) },
  todayDateLabelText: { fontSize: scale(11), fontWeight: '700', color: C.ink },
  todayChipsScroll: { flexDirection: 'row', flexWrap: 'wrap', gap: scale(6), flex: 1 },
  todayAssignedChip: { backgroundColor: C.white, borderWidth: 1, borderColor: '#C7E4E9', paddingHorizontal: scale(6), paddingVertical: scale(2), borderRadius: scale(5) },
  todayAssignedChipText: { fontSize: scale(10), fontWeight: '700', color: C.primary },
  todayRemainingChip: { backgroundColor: '#fffbeb', borderWidth: 1, borderColor: '#fde68a', paddingHorizontal: scale(6), paddingVertical: scale(2), borderRadius: scale(5) },
  todayRemainingChipText: { fontSize: scale(10), fontWeight: '700', color: '#d97706' },
  todayLastDayBadge: { backgroundColor: '#ecfdf5', paddingHorizontal: scale(6), paddingVertical: scale(2), borderRadius: scale(5), borderWidth: 1, borderColor: '#a7f3d0' },
  todayLastDayText: { fontSize: scale(10), fontWeight: '700', color: '#059669' },
  todayEmptyDateText: { fontSize: scale(10), color: C.textMuted, fontStyle: 'italic', marginTop: scale(2) },
});