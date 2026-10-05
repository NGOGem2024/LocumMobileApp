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
  UIManager
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import api from '../services/axiosConfig';

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
};

type TabType = 'Invited' | 'Interested' | 'Assigned' | 'Upcoming' | 'Past' | 'Cancelled';

const DutiesScreen = ({ route, navigation }: any) => {
  const initialTab = route?.params?.defaultTab || 'Invited';

  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  const tabs: TabType[] = ['Invited', 'Interested', 'Assigned', 'Upcoming', 'Past', 'Cancelled'];
  
  // Assigned Duties Modals
  const [declineModalVisible, setDeclineModalVisible] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState('');

  // Data States
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Toast States
  const [toastMessage, setToastMessage] = useState('');
  const toastFadeAnim = useRef(new Animated.Value(0)).current;

  const showToast = (message: string) => {
    setToastMessage(message);
    Animated.sequence([
      Animated.timing(toastFadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(1800),
      Animated.timing(toastFadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start();
  };

  // Fetch Logic
  const fetchDuties = useCallback(async () => {
    try {
      if (activeTab === 'Invited' || activeTab === 'Interested') {
        const response = await api.get('/api/doctors/invited-jobs?limit=50');
        if (response.data?.success) {
          const allInvites = response.data.jobs || [];
          if (activeTab === 'Invited') {
            setJobs(allInvites.filter((j: any) => j.pipeline_status === 'Invited' && j.doctor_response !== 'Interested' && j.doctor_response !== 'Not Interested'));
          } else {
            setJobs(allInvites.filter((j: any) => j.pipeline_status === 'Interested' || j.doctor_response === 'Interested'));
          }
        } else {
          setJobs([]);
        }
      } else {
        const response = await api.get('/api/doctors/assigned-jobs', {
          params: { status: activeTab },
        });
        if (response.data?.success) {
          setJobs(response.data.jobs || response.data.data || []);
        } else {
          setJobs([]);
        }
      }
    } catch (error) {
      console.error('Error fetching duties:', error);
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

  // Formatting Helpers
  const formatDate = (dateString: string) => {
    if (!dateString) return 'TBD';
    const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-GB', options);
  };

  const formatShortDate = (dateString: string) => {
    if (!dateString) return '';
    const options: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short' };
    return new Date(dateString).toLocaleDateString('en-GB', options);
  };

  // Action: Assigned Job Update Status
  const handleUpdateDutyStatus = async (requirementId: string, action: 'Confirmed' | 'Declined', reason?: string) => {
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
        fetchDuties();
      }
    } catch (error) {
      console.error(`Error updating duty to ${action}:`, error);
    } finally {
      setLoading(false);
    }
  };

  // Action: Invited Job Respond
  const handleRespondToInvitation = async (invitationId: string, responseStatus: 'Interested' | 'Not Interested') => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    
    // Optimistic UI Update: Remove from current tab instantly
    setJobs(prev => prev.filter(job => job.invitation_id !== invitationId));

    try {
      const response = await api.post('/api/doctors/invited-jobs/respond', {
        invitation_id: invitationId,
        response: responseStatus
      });
      if (response.data.success) {
        showToast(`Marked as ${responseStatus}`);
      }
    } catch (error) {
      showToast('Failed to record response');
      fetchDuties(); // Revert on failure
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    const hospitalName = item.hospital_details?.hospital_name || item.hospital_name || 'Hospital';
    const city = item.city || item.hospital_details?.city || 'Location unavailable';
    const state = item.state || item.hospital_details?.state || '';

    const assignedDates = item.assignment_info?.assigned_dates || [];
    const hasIndividualDates = assignedDates.length > 0;

    let displayDatesRange = '';

    if (!hasIndividualDates) {
      if (item.assignment_info?.assigned_from) {
        const start = formatDate(item.assignment_info.assigned_from);
        const end = item.assignment_info.assigned_to ? formatDate(item.assignment_info.assigned_to) : start;
        displayDatesRange = start === end ? start : `${start} to ${end}`;
      } else {
        const start = formatDate(item.shift_start_date);
        const end = item.shift_end_date ? formatDate(item.shift_end_date) : start;
        displayDatesRange = start === end ? start : `${start} to ${end}`;
      }
    }

    const displayRate = item.assignment_info?.doctor_rate || item.offered_rate || '0';
    
    const shiftStartDate = item.assignment_info?.assigned_from || item.shift_start_date;
    const shiftEndDate = item.assignment_info?.assigned_to || item.shift_end_date || item.assignment_info?.assigned_from || item.shift_start_date;
    const isExpired = shiftEndDate ? (new Date(shiftEndDate).setHours(0,0,0,0) < new Date().setHours(0,0,0,0)) : false;

    return (
      <TouchableOpacity
        style={styles.jobCard}
        activeOpacity={activeTab === 'Invited' ? 1 : 0.85}
        onPress={() => {
          if (activeTab === 'Invited') {
            return;
          }
          
          navigation.navigate('JobDetails', {
            jobDetails: item,
            isAssigned: ['Assigned', 'Upcoming', 'Past'].includes(activeTab as string), 
            jobStatus: activeTab === 'Interested' ? 'Invited' : activeTab,
          });
        }}
      >
        <View style={styles.cardHeader}>
          <View style={styles.titleRow}>
            <Text style={styles.jobTitle} numberOfLines={1}>
              {item.speciality} {item.department ? `- ${item.department}` : ''}
            </Text>
            {item.vacancy_status === 'Urgent' && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>Urgent</Text>
              </View>
            )}
          </View>

          {(activeTab !== 'Invited' && activeTab !== 'Interested') && (
             <Text style={styles.hospitalName}>{hospitalName}</Text>
          )}

          <Text style={styles.locationText}>
            <Ionicons name="location-outline" size={scale(12)} color={C.textMuted} />{' '}
            {city} {state ? `, ${state}` : ''}
          </Text>
        </View>

        <View style={styles.cardDetails}>
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
                  <Text style={styles.subDetailText}>Total {assignedDates.length} days assigned</Text>
                </>
              ) : (
                <Text style={styles.detailText}>{displayDatesRange}</Text>
              )}
            </View>
          </View>

          <View style={styles.detailRow}>
            <Ionicons name="time-outline" size={scale(16)} color={C.textSub} />
            <Text style={styles.detailText}>
              {item.duty_from_time || 'TBD'} - {item.duty_to_time || 'TBD'}
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.cardFooter}>
          <View>
            <Text style={styles.statusText}>
              {activeTab === 'Invited' || activeTab === 'Interested' ? 'Invitation' : `${activeTab} Duty`}
            </Text>
            <Text style={styles.payText}>
              ₹{displayRate} <Text style={styles.paySubText}>/ {item.billing_shift_type || 'Shift'}</Text>
            </Text>
          </View>

          {activeTab === 'Assigned' && (
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.actionBtn, styles.declineBtn]}
                onPress={() => {
                  setSelectedJobId(item._id);
                  setDeclineModalVisible(true);
                }}
              >
                <Text style={styles.declineText}>Decline</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, styles.confirmBtn]}
                onPress={() => handleUpdateDutyStatus(item._id, 'Confirmed')}
              >
                <Text style={styles.confirmText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          )}

          {activeTab === 'Invited' && (
            isExpired ? (
              <View style={[styles.appliedBadge, { backgroundColor: C.border }]}>
                <Text style={[styles.appliedBadgeText, { color: C.textSub }]}>Expired</Text>
              </View>
            ) : item.pipeline_status === 'Invited' ? (
              <View style={styles.actionButtons}>
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
              </View>
            ) : null
          )}
          
          {activeTab === 'Interested' && (
            <View style={[styles.appliedBadge, { backgroundColor: C.primaryLight }]}>
              <Text style={[styles.appliedBadgeText, { color: C.primary }]}>Interested</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name={activeTab === 'Invited' ? "mail-open-outline" : "briefcase-outline"} size={scale(48)} color={C.border} />
      <Text style={styles.emptyTitle}>No {activeTab} Data</Text>
      <Text style={styles.emptySubText}>
        You do not have any {activeTab.toLowerCase()} items right now.
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={C.cardBg} />

      <Animated.View pointerEvents="none" style={[styles.toastContainer, { opacity: toastFadeAnim }]}>
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
                <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                  {tab}
                </Text>
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
          keyExtractor={(item, index) => item.invitation_id || item._id || index.toString()}
          renderItem={renderItem}
          contentContainerStyle={[
            styles.listContent,
            jobs.length === 0 && styles.listContentEmpty,
          ]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={renderEmptyState}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.primary]} />
          }
        />
      )}

      {/* Decline Reason Modal (For Assigned Jobs Only) */}
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
  toastContainer: { position: 'absolute', top: scale(54), alignSelf: 'center', backgroundColor: C.ink, flexDirection: 'row', alignItems: 'center', gap: scale(8), paddingHorizontal: scale(16), paddingVertical: scale(10), borderRadius: scale(20), zIndex: 9999, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 10, elevation: 8 },
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
  headerTitle: {
    fontSize: scale(17),
    fontWeight: '800',
    color: C.ink,
    letterSpacing: -0.3,
  },
  
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
  listContent: {
    paddingHorizontal: scale(20),
    paddingBottom: scale(100),
    paddingTop: scale(8),
  },
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
  hospitalName: {
    fontSize: scale(14),
    color: C.ink,
    fontWeight: '600',
    marginBottom: scale(4),
  },
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
  subDetailText: {
    fontSize: scale(11),
    color: C.textSub,
    fontWeight: '600',
    marginTop: scale(4),
  },

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
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusText: {
    fontSize: scale(12),
    fontWeight: '700',
    color: C.primary,
    textTransform: 'uppercase',
    marginBottom: scale(2),
  },
  payText: { fontSize: scale(15), fontWeight: '800', color: C.ink },
  paySubText: { fontSize: scale(12), fontWeight: '600', color: C.textSub },
  
  actionButtons: { flexDirection: 'row', gap: scale(8) },
  actionBtn: {
    paddingVertical: scale(8),
    paddingHorizontal: scale(14),
    borderRadius: scale(8),
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  declineBtn: { borderColor: '#EF4444', backgroundColor: '#FEF2F2' },
  confirmBtn: { borderColor: C.primary, backgroundColor: C.primary },
  declineText: { color: '#EF4444', fontWeight: '700', fontSize: scale(12) },
  confirmText: { color: C.white, fontWeight: '700', fontSize: scale(12) },
  
  appliedBadge: { backgroundColor: C.successLight, paddingVertical: scale(6), paddingHorizontal: scale(12), borderRadius: scale(8) },
  appliedBadgeText: { color: C.success, fontSize: scale(11), fontWeight: '700' },
  declinedBadge: { backgroundColor: C.dangerLight },
  declinedBadgeText: { color: C.danger },

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
});