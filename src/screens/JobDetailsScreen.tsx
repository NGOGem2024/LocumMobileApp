import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Animated,
  RefreshControl,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
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
  success: '#10b981',
  successLight: '#d1fae5',
  warningLight: '#ffedd5',
  warning: '#fb923c',
  errorLight: '#fee2e2',
  error: '#f87171',
};

const getMatchStyle = (match: number) => {
  if (match >= 75) return { color: '#007b8e', bg: '#dcfce7' };
  if (match >= 50) return { color: '#fb923c', bg: '#ffedd5' };
  return { color: '#f87171', bg: '#fee2e2' };
};

// Time conversion function for AM/PM
const formatTimeAMPM = (timeStr?: string) => {
  if (!timeStr) return 'N/A';
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

const JobDetailsScreen = ({ route, navigation }: any) => {
  const jobParam = route.params?.job;
  const jobDetailsParam = route.params?.jobDetails;
  
  const isAssignedRoute = route.params?.isAssigned || false;
  const jobStatus = route.params?.jobStatus; 
  
  const details = jobParam?.rawDetails || jobDetailsParam || {};
  const pipelineStatus = details.pipeline_status;
  const doctorResponse = details.doctor_response;

  // Status mapping
  const isCancelled = jobStatus === 'Cancelled' || details.status === 'Cancelled' || details.status === 'Declined';
  const isPast = jobStatus === 'Past' || details.status === 'Completed' || details.status === 'Duty Completed';
  const isAssignedPending = jobStatus === 'Assigned' || (isAssignedRoute && details.status === 'Assigned');
  const isConfirmed = jobStatus === 'Upcoming' || details.status === 'Confirmed' || details.status === 'Reported';
  
  // Logic: Strictly check if already interested
  const isInterested = doctorResponse === 'Interested' || pipelineStatus === 'Interested' || jobStatus === 'Interested';
  const isNotInterested = doctorResponse === 'Not Interested' || pipelineStatus === 'Drop';
  
  // Is Invited ONLY if not already interested/declined
  const isInvited = (jobStatus === 'Invited' || (!isAssignedRoute && pipelineStatus === 'Invited')) && !isInterested && !isNotInterested;
  
  // Hide Hospital Name for Invited and Interested tabs
  const hideHospitalName = isInterested || isInvited;

  const shiftStartDate = details.assignment_info?.assigned_from || details.shift_start_date || details.shift_date_from;
  const shiftEndDate = details.assignment_info?.assigned_to || details.shift_end_date || details.shift_date_to || shiftStartDate;
  
  const isDateExpired = shiftEndDate ? (new Date(shiftEndDate).setHours(0,0,0,0) < new Date().setHours(0,0,0,0)) : false;
  const isInvitationExpired = pipelineStatus === 'Expired' || details.vacancy_status === 'Closed' || isDateExpired;

  const jobId = details.req_id || details.requirement_id || details._id;
  const invitationId = details.invitation_id;
  
  const declineReasonText = details.assignment_info?.decline_reason || details.decline_reason || '';

  const [refreshing, setRefreshing] = useState(false);
  const [declineModalVisible, setDeclineModalVisible] = useState(false);
  const [declineReason, setDeclineReason] = useState('');

  const slideAnim = useRef(new Animated.Value(20)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const matchPercentage = jobParam?.matchPercentage || details.matchPercentage || 100;
  const matchStyle = getMatchStyle(matchPercentage);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { 
        toValue: 1, 
        duration: 400, 
        useNativeDriver: true 
      }),
      Animated.timing(slideAnim, { 
        toValue: 0, 
        duration: 400, 
        useNativeDriver: true 
      })
    ]).start();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 1200);
  }, []);

  // Action: Assigned Job Update Status (Confirm / Decline)
  const handleUpdateDutyStatus = async (action: 'Confirmed' | 'Declined') => {
    try {
      const response = await api.post('/api/doctors/duty-status', {
        requirement_id: jobId,
        action: action,
        decline_reason: declineReason || '', 
      });

      if (response.data?.success) {
        setDeclineModalVisible(false);
        setDeclineReason('');
        navigation.goBack();
      }
    } catch (error) {
      console.error(`Error updating duty to ${action}:`, error);
    }
  };

  // Action: Invited Job Respond (Interested / Not Interested)
  const handleRespondToInvitation = async (responseStatus: 'Interested' | 'Not Interested') => {
    if (!invitationId) return;
    try {
      const response = await api.post('/api/doctors/invited-jobs/respond', {
        invitation_id: invitationId,
        response: responseStatus
      });
      if (response.data.success) {
         navigation.goBack();
      }
    } catch (error) {
      console.error('Error responding to invitation:', error);
    }
  };

  const formatDateString = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatShortDate = (dateString: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
    });
  };

  // --- LOCATION FORMATTING LOGIC ---
  const area = details.req_location_details?.area || details.area || '';
  const city = details.req_location_details?.district || details.req_location_details?.dist || details.city || '';
  const state = details.req_location_details?.state || details.state || '';
  const pincode = details.req_location_details?.pincode || details.req_location_details?.pin || details.pincode || '';

  const locationParts = [area, city, state].filter(Boolean);
  let locationString = locationParts.join(', ');
  
  if (pincode) {
    locationString = locationString ? `${locationString} - ${pincode}` : pincode;
  }
  
  if (!locationString) {
    locationString = 'Location unavailable';
  }
  // ---------------------------------

  const assignedDates = details.assignment_info?.assigned_dates || details.assigned_dates || [];
  const hasIndividualDates = assignedDates.length > 0;
  
  const displayRate = details.rates || details.offered_rate || '0';
  const shiftTimeFrom = details.shift_time_from || details.duty_from_time;
  const shiftTimeTo = details.shift_time_to || details.duty_to_time;

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor={C.cardBg} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={scale(24)} color={C.ink} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isAssignedRoute || isInvited || isInterested ? 'Duty Details' : 'Shift Details'}
        </Text>
        <View style={{ width: scale(32) }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView 
          contentContainerStyle={styles.scrollContent} 
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh} 
              colors={[C.primary]} 
              tintColor={C.primary}
            />
          }
        >
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            
            <View style={styles.jobCard}>
              <View style={[styles.jobIconBox, { marginRight: scale(16) }]}>
                <Ionicons name="medical-outline" size={scale(24)} color={matchStyle.color} />
              </View>
              
              <View style={styles.jobMeta}>
                <Text style={styles.jobTitle}>
                  {details.speciality || jobParam?.specialization || 'Speciality Not Specified'}
                </Text>
                
                <Text style={styles.jobDepartment}>
                  {details.department || 'Department Not Specified'}
                </Text>

                {/* Area, City, State - Pincode */}
                {locationString ? (
                  <Text style={[styles.jobLocation, { marginTop: scale(2) }]}>
                    {locationString}
                  </Text>
                ) : null}

                {/* Show Hospital Name ONLY if it is not hidden (e.g. not in Invited/Interested state) */}
                {!hideHospitalName && (details.hospital_details?.hospital_name || details.hospital_name || jobParam?.hospital || details.assignment_info?.hospital?.name || details.assignment_info?.hospital_name) && (
                  <Text style={[styles.jobHospital, { marginTop: scale(4) }]}>
                    {details.hospital_details?.hospital_name ||
                      details.hospital_name ||
                      jobParam?.hospital ||
                      details.assignment_info?.hospital?.name ||
                      details.assignment_info?.hospital_name ||
                      'Hospital Name Pending'}
                  </Text>
                )}
              </View>
            </View>

            <Text style={styles.sectionTitle}>
              {isAssignedRoute ? 'Confirmed Schedule' : isInvited || isInterested ? 'Proposed Schedule' : 'Schedule & Timings'}
            </Text>
            <View style={styles.infoCard}>
              <View style={[styles.infoRow, (isAssignedRoute || isInvited || isInterested) && hasIndividualDates && { alignItems: 'flex-start' }]}>
                <Ionicons name="calendar-outline" size={scale(18)} color={C.primary} style={styles.infoIcon} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.infoLabel}>Duty Dates</Text>

                  {(isAssignedRoute || isInvited || isInterested) && hasIndividualDates ? (
                    <View style={styles.dateChipContainer}>
                      {assignedDates.map((d: string) => (
                        <View key={d} style={styles.dateChip}>
                          <Text style={styles.dateChipText}>{formatShortDate(d)}</Text>
                        </View>
                      ))}
                    </View>
                  ) : (
                    <Text style={styles.infoValue}>
                      {isAssignedRoute || isInvited || isInterested
                        ? `${formatDateString(shiftStartDate)} - ${formatDateString(shiftEndDate)}`
                        : `${formatDateString(shiftStartDate)} - ${formatDateString(shiftEndDate)}`}
                    </Text>
                  )}
                </View>
              </View>
              <View style={styles.divider} />
              <View style={styles.infoRow}>
                <Ionicons name="time-outline" size={scale(18)} color={C.primary} style={styles.infoIcon} />
                <View>
                  <Text style={styles.infoLabel}>Shift Timing</Text>
                  <Text style={styles.infoValue}>
                    {formatTimeAMPM(shiftTimeFrom)} to {formatTimeAMPM(shiftTimeTo)}
                  </Text>
                </View>
              </View>
            </View>

            <Text style={styles.sectionTitle}>Compensation</Text>
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Ionicons name="cash-outline" size={scale(18)} color={C.success} style={styles.infoIcon} />
                <View>
                  <Text style={styles.infoLabel}>Offered Rate</Text>
                  <Text style={[styles.infoValue, { color: C.success, fontWeight: '800' }]}>
                    ₹{displayRate} <Text style={{ fontWeight: '500', fontSize: scale(12) }}>
                      {details.billing_shift_type || 'Per Shift'}
                    </Text>
                  </Text>
                </View>
              </View>
            </View>

          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.footer}>
        {isCancelled ? (
          <View style={{ gap: scale(8) }}>
            <View style={[styles.primaryBtn, { backgroundColor: C.errorLight, flexDirection: 'row', justifyContent: 'center' }]}>
              <Ionicons name="close-circle" size={scale(18)} color={C.error} style={{ marginRight: scale(8) }} />
              <Text style={[styles.primaryBtnText, { color: C.error }]}>Duty Cancelled</Text>
            </View>
            {!!declineReasonText && (
              <Text style={{ textAlign: 'center', color: '#b91c1c', fontSize: scale(13), fontWeight: '600' }}>
                Reason: {declineReasonText}
              </Text>
            )}
          </View>
        ) : isPast ? (
          <View style={[styles.primaryBtn, { backgroundColor: '#d1fae5', flexDirection: 'row', justifyContent: 'center' }]}>
            <Ionicons name="checkmark-done-circle" size={scale(18)} color={C.success} style={{ marginRight: scale(8) }} />
            <Text style={[styles.primaryBtnText, { color: C.success }]}>Duty Completed</Text>
          </View>
        ) : isConfirmed ? (
          <View style={[styles.primaryBtn, { backgroundColor: '#d1fae5', flexDirection: 'row', justifyContent: 'center' }]}>
            <Ionicons name="checkmark-done-circle" size={scale(18)} color={C.success} style={{ marginRight: scale(8) }} />
            <Text style={[styles.primaryBtnText, { color: C.success }]}>Duty Confirmed</Text>
          </View>
        ) : isAssignedPending ? (
          <View style={{ flexDirection: 'row', gap: scale(12) }}>
            <TouchableOpacity
              style={[styles.primaryBtn, { flex: 1, backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#EF4444' }]}
              activeOpacity={0.8}
              onPress={() => setDeclineModalVisible(true)}
            >
              <Text style={[styles.primaryBtnText, { color: '#EF4444' }]}>Decline</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.primaryBtn, { flex: 1, backgroundColor: C.primary, borderWidth: 1, borderColor: C.primary }]}
              activeOpacity={0.8}
              onPress={() => handleUpdateDutyStatus('Confirmed')}
            >
              <Text style={styles.primaryBtnText}>Confirm</Text>
            </TouchableOpacity>
          </View>
        ) : isNotInterested ? (
          <View style={[styles.primaryBtn, { backgroundColor: C.errorLight, flexDirection: 'row', justifyContent: 'center' }]}>
            <Ionicons name="close-circle" size={scale(18)} color={C.error} style={{ marginRight: scale(8) }} />
            <Text style={[styles.primaryBtnText, { color: C.error }]}>Not Interested</Text>
          </View>
        ) : isInvitationExpired ? (
          <View style={[styles.primaryBtn, { backgroundColor: C.inputBg, flexDirection: 'row', justifyContent: 'center' }]}>
            <Ionicons name="time-outline" size={scale(18)} color={C.textMuted} style={{ marginRight: scale(8) }} />
            <Text style={[styles.primaryBtnText, { color: C.textSub }]}>Expired</Text>
          </View>
        ) : isInterested ? (
          <View style={[styles.primaryBtn, { backgroundColor: C.primaryLight, flexDirection: 'row', justifyContent: 'center' }]}>
            <Ionicons name="checkmark-circle" size={scale(18)} color={C.primary} style={{ marginRight: scale(8) }} />
            <Text style={[styles.primaryBtnText, { color: C.primary }]}>Interested</Text>
          </View>
        ) : isInvited ? (
          <View style={{ flexDirection: 'row', gap: scale(12) }}>
            <TouchableOpacity
              style={[styles.primaryBtn, { flex: 1, backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#EF4444' }]}
              activeOpacity={0.8}
              onPress={() => handleRespondToInvitation('Not Interested')}
            >
              <Text style={[styles.primaryBtnText, { color: '#EF4444' }]}>Decline</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.primaryBtn, { flex: 1, backgroundColor: C.primary, borderWidth: 1, borderColor: C.primary }]}
              activeOpacity={0.8}
              onPress={() => handleRespondToInvitation('Interested')}
            >
              <Text style={styles.primaryBtnText}>Interested</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity 
            style={[styles.primaryBtn, { backgroundColor: C.primary }]} 
            activeOpacity={0.85} 
            onPress={() => console.log('Handle generic apply if needed')}
          >
            <Text style={styles.primaryBtnText}>Confirm Application</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Decline Reason Modal */}
      <Modal visible={declineModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Decline Duty</Text>
            <Text style={styles.modalSub}>
              Please provide a reason for declining this duty.
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
                onPress={() => handleUpdateDutyStatus('Declined')}
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

export default JobDetailsScreen;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background },
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
  iconBtn: { padding: scale(4) },
  headerTitle: { fontSize: scale(16), fontWeight: '800', color: C.ink },
  scrollContent: { padding: scale(16), paddingBottom: scale(40) },

  jobCard: {
    flexDirection: 'row',
    backgroundColor: C.cardBg,
    padding: scale(14),
    borderRadius: scale(14),
    marginBottom: scale(20),
    alignItems: 'center',
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },

  jobIconBox: {
    width: scale(48),
    height: scale(48),
    borderRadius: scale(24),
    backgroundColor: C.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  jobMeta: { flex: 1, gap: scale(2) },
  jobTitle: { fontSize: scale(16), fontWeight: '800', color: C.ink },
  jobDepartment: { fontSize: scale(14), color: C.textSub, fontWeight: '600' },
  jobLocation: { fontSize: scale(12), color: C.textMuted, fontWeight: '500' },
  jobHospital: { fontSize: scale(13), color: C.primary, fontWeight: '700' },

  sectionTitle: {
    fontSize: scale(14),
    fontWeight: '800',
    color: C.ink,
    marginBottom: scale(12),
    marginTop: scale(8),
  },

  infoCard: {
    backgroundColor: C.cardBg,
    borderRadius: scale(14),
    marginBottom: scale(16),
    overflow: 'hidden',
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },

  infoRow: { flexDirection: 'row', alignItems: 'center', padding: scale(14) },
  infoIcon: {
    marginRight: scale(12),
    backgroundColor: C.primaryLight,
    padding: scale(8),
    borderRadius: scale(10),
    overflow: 'hidden',
  },
  infoLabel: {
    fontSize: scale(12),
    color: C.textMuted,
    fontWeight: '600',
    marginBottom: scale(2),
  },
  infoValue: { fontSize: scale(14), color: C.ink, fontWeight: '700' },
  divider: { height: 1, backgroundColor: C.inputBg, marginLeft: scale(52) },

  footer: {
    backgroundColor: C.cardBg,
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingHorizontal: scale(20),
    paddingVertical: scale(14),
  },
  primaryBtn: {
    paddingVertical: scale(14),
    alignItems: 'center',
    borderRadius: scale(12),
  },
  primaryBtnText: { color: C.white, fontSize: scale(15), fontWeight: '800' },

  // Modal Styles
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
  modalTitle: {
    fontSize: scale(16),
    fontWeight: '800',
    color: C.ink,
    marginBottom: scale(8),
  },
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
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: scale(12),
  },
  cancelModalBtn: { paddingVertical: scale(10), paddingHorizontal: scale(16) },
  cancelModalText: { color: C.textSub, fontWeight: '700', fontSize: scale(14) },
  submitModalBtn: {
    backgroundColor: '#EF4444',
    paddingVertical: scale(10),
    paddingHorizontal: scale(20),
    borderRadius: scale(8),
  },
  submitModalText: { color: C.white, fontWeight: '700', fontSize: scale(14) },
  
  dateChipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scale(6),
    marginTop: scale(4),
  },
  dateChip: {
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingHorizontal: scale(8),
    paddingVertical: scale(4),
    borderRadius: scale(6),
  },
  dateChipText: { fontSize: scale(12), fontWeight: '600', color: C.ink },
});