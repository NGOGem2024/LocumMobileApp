import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LinearGradient from 'react-native-linear-gradient';
import { useAuth } from '../context/AuthContext';
import { useJobs, Job } from '../context/JobContext';
import AvailabilitySection from '../components/AvailabilitySection';
import api from '../services/axiosConfig';

const { width: SW, height: SH } = Dimensions.get('window');
const scale = (size: number) => (SW / 390) * size;

// ── UNIFIED CLEAN LIGHT THEME ──
const C = {
  background: '#F9FAFB',
  cardBg: '#FFFFFF',
  border: '#E5E7EB',
  inputBg: '#F3F4F6',
  primary: '#007b8e',
  primaryLight: '#e0f5f8',
  accentCyan: '#00a8c2',
  ink: '#111827',
  textSub: '#4B5563',
  textMuted: '#9CA3AF',
  white: '#ffffff',
  urgent: '#ef4444',
  urgentLight: '#FEF2F2',
  success: '#10b981',
  successLight: '#d1fae5',
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
  effective_from?: string;
  payment_terms?: PaymentTerm;
};

// ── Helpers ──
const formatRate = (val?: number | null) => (val == null ? '—' : `₹${val}`);

const getPaymentConfig = (term?: PaymentTerm) => {
  if (term === 'Next Day Payout')
    return { icon: 'flash-outline', color: '#d97706', bg: '#fffbeb', border: '#fde68a', label: 'Next Day Payout' };
  if (term === 'Weekly Payout')
    return { icon: 'calendar-outline', color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0', label: 'Weekly Payout' };
  if (term === 'Monthly Payout')
    return { icon: 'albums-outline', color: '#6d28d9', bg: '#f5f3ff', border: '#ddd6fe', label: 'Monthly Payout' };
  return { icon: 'cash-outline', color: C.textMuted, bg: '#F9FAFB', border: C.border, label: term ?? '' };
};


// ── Job Board Style UrgencyBadge ──
const UrgencyBadge = ({ urgency }: { urgency: string }) => {
  const config =
    urgency === 'urgent'
      ? { color: C.urgent, label: 'Actively hiring' }
      : urgency === 'high'
      ? { color: C.warning, label: 'High Priority' }
      : { color: C.success, label: 'Open' };

  return (
    <View style={styles.badgeWrap}>
      <Ionicons name="flash" size={12} color={config.color} />
      <Text style={[styles.badgeText, { color: C.textSub }]}>{config.label}</Text>
    </View>
  );
};

// ── RateCardBottomSheet ──
const RateCardBottomSheet = ({
  visible,
  rates,
  onClose,
}: {
  visible: boolean;
  rates: RateEntry[];
  onClose: () => void;
}) => {
  const slideAnim = useRef(new Animated.Value(SH)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, damping: 20, stiffness: 200, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: SH, duration: 220, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]} />
      </TouchableWithoutFeedback>

      <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>
        <View style={styles.handle} />
        <View style={styles.sheetHeader}>
          <View style={styles.sheetIconBubble}>
            <Ionicons name="pricetags" size={scale(18)} color={C.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.sheetTitle}>Rate Card</Text>
            <Text style={styles.sheetSub}>
              {rates.length} duty {rates.length === 1 ? 'type' : 'types'} configured
            </Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={scale(18)} color={C.textSub} />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {rates.length === 0 ? (
            <View style={styles.emptyWrap}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="pricetag-outline" size={scale(28)} color={C.primary} />
              </View>
              <Text style={styles.emptyTitle}>No rate card yet</Text>
              <Text style={styles.emptySub}>Your admin will configure your rates</Text>
            </View>
          ) : (
            rates.map((item, idx) => {
              const unit = item.rate_type === 'Hourly' ? '/hr' : '/shift';
              const pc = getPaymentConfig(item.payment_terms);

              return (
                <View key={item._id ?? `${item.duty_type}-${idx}`} style={[styles.rateCard, idx !== rates.length - 1 && { marginBottom: scale(14) }]}>
                  <View style={styles.cardHeader}>
                    <View style={styles.dutyIconWrap}>
                      <Ionicons name="medkit-outline" size={scale(15)} color={C.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.dutyName}>{item.duty_type}</Text>
                      <Text style={styles.dutySubLabel}>Duty Type</Text>
                    </View>
                    <View style={styles.rateTypeBadge}>
                      <Text style={styles.rateTypeBadgeText}>{item.rate_type}</Text>
                    </View>
                  </View>
                  <View style={styles.divider} />
                  <View style={styles.rateRows}>
                    <View style={styles.rateRow}>
                      <View style={styles.rateRowLeft}>
                        <View style={[styles.rateIconBox, { backgroundColor: '#fffbeb' }]}>
                          <Ionicons name="sunny-outline" size={scale(13)} color="#d97706" />
                        </View>
                        <Text style={styles.rateRowLabel}>Day Shift</Text>
                      </View>
                      <View style={styles.rateRowRight}>
                        <Text style={styles.rateAmt}>{formatRate(item.day_shift_rate)}</Text>
                        {item.day_shift_rate != null ? <Text style={styles.rateUnit}>{unit}</Text> : null}
                      </View>
                    </View>
                    <View style={styles.rateRow}>
                      <View style={styles.rateRowLeft}>
                        <View style={[styles.rateIconBox, { backgroundColor: '#eef2ff' }]}>
                          <Ionicons name="moon-outline" size={scale(13)} color="#6366f1" />
                        </View>
                        <Text style={styles.rateRowLabel}>Night Shift</Text>
                      </View>
                      <View style={styles.rateRowRight}>
                        <Text style={styles.rateAmt}>{formatRate(item.night_shift_rate)}</Text>
                        {item.night_shift_rate != null ? <Text style={styles.rateUnit}>{unit}</Text> : null}
                      </View>
                    </View>
                    <View style={styles.rateRow}>
                      <View style={styles.rateRowLeft}>
                        <View style={[styles.rateIconBox, { backgroundColor: '#fef2f2' }]}>
                          <Ionicons name="star-outline" size={scale(13)} color="#ef4444" />
                        </View>
                        <Text style={styles.rateRowLabel}>Sun / Holiday</Text>
                      </View>
                      <View style={styles.rateRowRight}>
                        <Text style={styles.rateAmt}>{formatRate(item.sunday_holiday_rate)}</Text>
                        {item.sunday_holiday_rate != null ? <Text style={styles.rateUnit}>{unit}</Text> : null}
                      </View>
                    </View>
                  </View>
                  <View style={styles.divider} />
                  <View style={styles.cardFooter}>
                    {item.payment_terms ? (
                      <View style={[styles.paymentChip, { backgroundColor: pc.bg, borderColor: pc.border }]}>
                        <Ionicons name={pc.icon} size={scale(11)} color={pc.color} />
                        <Text style={[styles.paymentChipText, { color: pc.color }]}>{pc.label}</Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      </Animated.View>
    </Modal>
  );
};

// ── HomeScreen ─────────────────────────────────────────────────────────────────
const HomeScreen = ({ navigation }: any) => {
  const { doctor, token } = useAuth();
  const { savedJobs, isJobSaved, saveJob, unsaveJob, applyJob, isJobApplied } = useJobs();

  const [activeJobs, setActiveJobs] = useState<Job[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [fetchedAvailability, setFetchedAvailability] = useState<any[]>([]);
  const [rateCard, setRateCard] = useState<RateEntry[]>([]);

  // Toast Notification state
  const [toastMessage, setToastMessage] = useState<string>('');
  const toastFadeAnim = useRef(new Animated.Value(0)).current;

  const showToast = (message: string) => {
    setToastMessage(message);
    Animated.sequence([
      Animated.timing(toastFadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(2000),
      Animated.timing(toastFadeAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start();
  };

  const formatDate = (dateString: string) => {
  if (!dateString) return 'TBD';
  const d = new Date(dateString);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

  // Fetch Active Jobs from Backend
  useEffect(() => {
    const fetchActiveJobs = async () => {
      try {
        setLoadingJobs(true);
        const response = await api.get('/api/doctors/jobs');
        
        if (response.data && response.data.success) {
          const mappedJobs = response.data.jobs.map((reqItem: any) => ({
            id: reqItem._id,
            hospital: reqItem.hospital_name,
            location: `${reqItem.city}, ${reqItem.state}`,
            date: formatDate(reqItem.shift_start_date), // Format as needed
            specialization: reqItem.speciality,
            department: reqItem.department || 'General',
            status: reqItem.status || 'Available',
            pay: `₹${reqItem.offered_rate}`,
            payType: reqItem.billing_shift_type === 'Hourly' ? '/hr' : 'Flat',
            urgency: reqItem.vacancy_status === 'Urgent' ? 'urgent' : 'normal',
            distance: 'N/A', // Geocoding can be added later
          }));
          setActiveJobs(mappedJobs);
        }
      } catch (error) {
        console.error("Error fetching jobs:", error);
        showToast('Failed to load active jobs');
      } finally {
        setLoadingJobs(false);
      }
    };

    fetchActiveJobs();
  }, []);

  const handleBookmarkToggle = async (job: Job) => {
    const originallySaved = isJobSaved(job.id);
    
    // Optimistic Update
    if (originallySaved) {
      unsaveJob(job.id); 
    } else {
      saveJob(job);
    }

    try {
      const response = await api.post(`/api/doctors/jobs/${job.id}/save`);
      if (response.data.success) {
        showToast(originallySaved ? 'Removed from Saved Jobs' : 'Job saved successfully!');
      }
    } catch (error) {
      console.error('Error toggling saved job:', error);
      // Revert optimistic update on failure
      if (originallySaved) saveJob(job);
      else unsaveJob(job.id);
      
      showToast('Error updating saved job status');
    }
  };

  // Sheet toggles & Tabs
  const [showRateSheet, setShowRateSheet] = useState(false);
  const [activeSection, setActiveSection] = useState<'jobs' | 'availability'>('jobs');

  useEffect(() => {
    if (!doctor?._id) return;
    api.get(`/${doctor._id}/availability`)
      .then(res => { if (res.data) setFetchedAvailability(res.data.availability ?? []); })
      .catch(err => console.log('Error fetching availability:', err));
  }, [doctor?._id]);

  useEffect(() => {
    if (!doctor?._id) return;
    api.get(`/api/doctors/rate-card/${doctor._id}`)
      .then(res => { if (res.data) setRateCard(res.data.data ?? []); })
      .catch(err => console.log('Error fetching rate card:', err));
  }, [doctor?._id]);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={C.cardBg} />

      <Animated.View pointerEvents="none" style={[styles.toastContainer, { opacity: toastFadeAnim }]}>
        <Ionicons name="checkmark-circle" size={18} color={C.white} />
        <Text style={styles.toastText}>{toastMessage}</Text>
      </Animated.View>

      <View style={styles.searchHeader}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={scale(18)} color={C.textMuted} />
          <TextInput placeholder="Search shifts, hospitals..." placeholderTextColor={C.textMuted} style={styles.searchInput} />
        </View>
        <TouchableOpacity style={styles.headerIcon}>
          <Ionicons name="chatbubble-ellipses-outline" size={scale(24)} color={C.ink} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.actionsScroll}>
          <TouchableOpacity style={[styles.actionChip, activeSection === 'jobs' && styles.actionChipActive]} onPress={() => setActiveSection('jobs')}>
            <Ionicons name="briefcase-outline" size={14} color={activeSection === 'jobs' ? C.primary : C.textSub} style={{ marginRight: 4 }} />
            <Text style={[styles.actionChipText, activeSection === 'jobs' && { color: C.primary }]}>Jobs</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionChip} onPress={() => navigation.navigate('SavedJobs')}>
            <Ionicons name="bookmark-outline" size={14} color={C.textSub} style={{ marginRight: 4 }} />
            <Text style={styles.actionChipText}>Saved ({savedJobs.length})</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.actionChip, activeSection === 'availability' && styles.actionChipActive]} onPress={() => setActiveSection('availability')}>
            <Ionicons name="calendar-outline" size={14} color={activeSection === 'availability' ? C.primary : C.textSub} style={{ marginRight: 4 }} />
            <Text style={[styles.actionChipText, activeSection === 'availability' && { color: C.primary }]}>Manage Availability</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionChip} onPress={() => setShowRateSheet(true)}>
            <Ionicons name="pricetags-outline" size={14} color={C.textSub} style={{ marginRight: 4 }} />
            <Text style={styles.actionChipText}>Rate Card</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionChip}>
            <Text style={styles.actionChipText}>Earnings</Text>
          </TouchableOpacity>
        </ScrollView>

        {activeSection === 'availability' ? (
          <View style={styles.availabilityWrapper}>
            <View style={styles.availabilityHeader}>
              <Text style={styles.availabilityTitle}>Manage Availability</Text>
              <Ionicons name="ellipsis-horizontal" size={20} color={C.textMuted} />
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
            <View style={styles.feedDividerRow}>
              <Text style={styles.feedDividerText}>RECOMMENDED FOR YOU</Text>
              <View style={styles.feedDividerLine} />
            </View>

            {loadingJobs ? (
               <ActivityIndicator size="large" color={C.primary} style={{ marginTop: 20 }} />
            ) : activeJobs.length === 0 ? (
               <Text style={{ textAlign: 'center', color: C.textMuted, marginTop: 20 }}>No active jobs found right now.</Text>
            ) : (
              activeJobs.map(req => {
                const saved = isJobSaved(req.id);
                const applied = isJobApplied(req.id);

                return (
                  <TouchableOpacity key={req.id} style={styles.jobCard} activeOpacity={0.9} onPress={() => navigation.navigate('JobDetails', { job: req })}>
                    <View style={styles.jobCardHeader}>
                      <View style={styles.companyLogo}>
                        <Ionicons name="business-outline" size={scale(24)} color={C.primary} />
                      </View>
                      <View style={styles.jobCardMeta}>
                        <Text style={styles.jobTitle}>{req.specialization}</Text>
                        <Text style={styles.companyName}>{req.hospital}</Text>
                        <Text style={styles.jobLocation}>{req.location}</Text>
                        <UrgencyBadge urgency={req.urgency} />
                      </View>
                      <TouchableOpacity onPress={() => handleBookmarkToggle(req)} style={styles.bookmarkBtn}>
                        <Ionicons name={saved ? 'bookmark' : 'bookmark-outline'} size={24} color={saved ? C.primary : C.textMuted} />
                      </TouchableOpacity>
                    </View>

                    <View style={styles.jobDetailsList}>
                      <View style={styles.jobDetailItem}>
                        <Ionicons name="time-outline" size={14} color={C.textSub} />
                        <Text style={styles.jobDetailText}>{req.date}</Text>
                      </View>
                      <View style={styles.jobDetailItem}>
                        <Ionicons name="cash-outline" size={14} color={C.textSub} />
                        <Text style={styles.jobDetailText}>{req.pay} {req.payType}</Text>
                      </View>
                    </View>

                    <View style={styles.jobActions}>
                      {applied ? (
                        <View style={styles.appliedBadge}>
                          <Ionicons name="checkmark-circle" size={16} color={C.success} />
                          <Text style={styles.appliedBadgeText}>Applied</Text>
                        </View>
                      ) : (
                        <TouchableOpacity style={styles.btnShadowWrapper} activeOpacity={0.85} onPress={() => { applyJob(req); showToast('Applied successfully!'); }}>
                          <LinearGradient colors={['#00a8c2', '#007b8e']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.applyBtnPrimary}>
                            <Text style={styles.applyBtnText}>Easy Apply</Text>
                          </LinearGradient>
                        </TouchableOpacity>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </>
        )}
      </ScrollView>

      <RateCardBottomSheet visible={showRateSheet} rates={rateCard} onClose={() => setShowRateSheet(false)} />
    </SafeAreaView>
  );
};

export default HomeScreen;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background },
  scroll: { paddingBottom: scale(100) },
  toastContainer: { position: 'absolute', top: scale(54), alignSelf: 'center', backgroundColor: C.ink, flexDirection: 'row', alignItems: 'center', gap: scale(8), paddingHorizontal: scale(16), paddingVertical: scale(10), borderRadius: scale(20), zIndex: 9999, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 10, elevation: 8 },
  toastText: { color: C.white, fontSize: scale(13), fontWeight: '700' },
  badgeWrap: { flexDirection: 'row', alignItems: 'center', gap: scale(4) },
  badgeText: { fontSize: scale(11), fontWeight: '700' },
  searchHeader: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.cardBg, paddingHorizontal: scale(20), paddingVertical: scale(14), borderBottomWidth: 1, borderBottomColor: C.border, gap: scale(14) },
  searchBar: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: C.inputBg, borderRadius: scale(14), paddingHorizontal: scale(14), height: scale(40), borderWidth: 1.5, borderColor: C.inputBg },
  searchInput: { flex: 1, marginLeft: scale(8), fontSize: scale(14), color: C.ink, fontWeight: '600', padding: 0 },
  headerIcon: { padding: scale(4) },
  actionsScroll: { paddingHorizontal: scale(20), paddingTop: scale(20), paddingBottom: scale(24), gap: scale(10) },
  actionChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.cardBg, borderWidth: 1, borderColor: C.border, borderRadius: scale(14), paddingHorizontal: scale(16), paddingVertical: scale(10) },
  actionChipActive: { borderColor: C.primary, backgroundColor: C.primaryLight },
  actionChipText: { fontSize: scale(13), fontWeight: '700', color: C.ink },
  availabilityWrapper: { marginHorizontal: scale(20), marginBottom: scale(24) },
  availabilityHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: scale(12), paddingHorizontal: scale(4) },
  availabilityTitle: { fontSize: scale(16), fontWeight: '900', color: C.ink, letterSpacing: -0.5 },
  feedDividerRow: { flexDirection: 'row', alignItems: 'center', marginHorizontal: scale(20), marginBottom: scale(20) },
  feedDividerText: { fontSize: scale(11), color: C.primary, fontWeight: '800', letterSpacing: 1.5, marginRight: scale(12) },
  feedDividerLine: { flex: 1, height: 1, backgroundColor: C.border },
  jobCard: { backgroundColor: C.cardBg, borderRadius: scale(24), marginHorizontal: scale(20), marginBottom: scale(16), borderWidth: 1, borderColor: C.border, shadowColor: C.ink, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.06, shadowRadius: 20, elevation: 4, padding: scale(20) },
  jobCardHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  companyLogo: { width: scale(52), height: scale(52), backgroundColor: C.inputBg, borderRadius: scale(14), borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center', marginRight: scale(14) },
  jobCardMeta: { flex: 1, gap: scale(3) },
  jobTitle: { fontSize: scale(16), fontWeight: '900', color: C.ink, letterSpacing: -0.3 },
  companyName: { fontSize: scale(14), color: C.textSub, fontWeight: '600' },
  jobLocation: { fontSize: scale(12), color: C.textMuted, marginBottom: scale(6), fontWeight: '500' },
  bookmarkBtn: { padding: scale(4) },
  jobDetailsList: { marginTop: scale(16), gap: scale(8) },
  jobDetailItem: { flexDirection: 'row', alignItems: 'center', gap: scale(8) },
  jobDetailText: { fontSize: scale(13), color: C.textSub, fontWeight: '600' },
  jobActions: { marginTop: scale(20), flexDirection: 'row' },
  btnShadowWrapper: { shadowColor: C.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 6, borderRadius: scale(14) },
  applyBtnPrimary: { paddingVertical: scale(12), paddingHorizontal: scale(24), borderRadius: scale(14), alignItems: 'center' },
  applyBtnText: { color: C.white, fontSize: scale(14), fontWeight: '800' },
  appliedBadge: { flexDirection: 'row', alignItems: 'center', gap: scale(6), backgroundColor: '#d1fae5', paddingHorizontal: scale(16), paddingVertical: scale(10), borderRadius: scale(12) },
  appliedBadgeText: { color: C.success, fontSize: scale(13), fontWeight: '700' },
  backdrop: {backgroundColor: 'rgba(17, 24, 39, 0.4)' },
  sheet: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: C.background, borderTopLeftRadius: scale(28), borderTopRightRadius: scale(28), maxHeight: SH * 0.85, paddingBottom: scale(34) },
  handle: { width: scale(40), height: scale(5), borderRadius: scale(2.5), backgroundColor: C.border, alignSelf: 'center', marginTop: scale(12), marginBottom: scale(4) },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', gap: scale(14), paddingHorizontal: scale(24), paddingVertical: scale(16), borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: C.cardBg },
  sheetIconBubble: { width: scale(40), height: scale(40), borderRadius: scale(14), backgroundColor: C.primaryLight, alignItems: 'center', justifyContent: 'center' },
  sheetTitle: { fontSize: scale(16), fontWeight: '900', color: C.ink, letterSpacing: -0.3 },
  sheetSub: { fontSize: scale(12), color: C.textSub, marginTop: scale(2), fontWeight: '500' },
  closeBtn: { width: scale(32), height: scale(32), borderRadius: scale(16), backgroundColor: C.inputBg, alignItems: 'center', justifyContent: 'center' },
  scrollContent: { paddingHorizontal: scale(20), paddingTop: scale(20) },
  emptyWrap: { alignItems: 'center', paddingVertical: scale(48), gap: scale(12) },
  emptyIconCircle: { width: scale(64), height: scale(64), borderRadius: scale(32), backgroundColor: C.primaryLight, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: scale(16), fontWeight: '900', color: C.ink },
  emptySub: { fontSize: scale(13), color: C.textSub, fontWeight: '500' },
  rateCard: { backgroundColor: C.cardBg, borderRadius: scale(16), borderWidth: 1, borderColor: C.border, overflow: 'hidden' },
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
  paymentChipText: { fontSize: scale(12), fontWeight: '700' }
});