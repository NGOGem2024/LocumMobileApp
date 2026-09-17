import React, { useEffect, useRef, useState, useCallback } from 'react';
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
  ActivityIndicator,
  RefreshControl,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import { useAuth } from '../context/AuthContext';
import { useJobs, Job } from '../context/JobContext';
import AvailabilitySection from '../components/AvailabilitySection';
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

const formatRate = (val?: number | null) => (val == null ? '—' : `₹${val}`);

const getPaymentConfig = (term?: PaymentTerm) => {
  const configs: Record<string, any> = {
    'Next Day Payout': { icon: 'flash-outline', color: '#d97706', bg: '#fffbeb', border: '#fde68a', label: 'Next Day Payout' },
    'Weekly Payout': { icon: 'calendar-outline', color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0', label: 'Weekly Payout' },
    'Monthly Payout': { icon: 'albums-outline', color: '#6d28d9', bg: '#f5f3ff', border: '#ddd6fe', label: 'Monthly Payout' },
  };
  return configs[term ?? ''] || { icon: 'cash-outline', color: C.textMuted, bg: '#F9FAFB', border: C.border, label: term ?? '' };
};

const UrgencyBadge = ({ urgency }: { urgency: string }) => {
  const status = (urgency || '').toLowerCase();
  
  let config;
  if (status === 'urgent' || status === 'in progress') {
    config = { color: C.urgent, label: 'Actively Hiring', icon: 'flash' };
  } else if (status === 'closed') {
    config = { color: C.textMuted, label: 'Closed', icon: 'lock-closed' };
  } else {
    config = { color: C.success, label: 'Open', icon: 'checkmark-circle' };
  }

  return (
    <View style={styles.badgeWrap}>
      <Ionicons name={config.icon} size={scale(12)} color={config.color} />
      <Text style={[styles.badgeText, { color: C.textSub }]}>{config.label}</Text>
    </View>
  );
};

const RateCardBottomSheet = ({ visible, rates, onClose }: { visible: boolean; rates: RateEntry[]; onClose: () => void; }) => {
  const slideAnim = useRef(new Animated.Value(SH)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: visible ? 1 : 0, duration: visible ? 220 : 180, useNativeDriver: true }),
      visible 
        ? Animated.spring(slideAnim, { toValue: 0, damping: 20, stiffness: 200, useNativeDriver: true })
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
          <View style={styles.sheetIconBubble}>
            <Ionicons name="pricetags" size={scale(18)} color={C.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.sheetTitle}>Rate Card</Text>
            <Text style={styles.sheetSub}>{rates.length} duty {rates.length === 1 ? 'type' : 'types'} configured</Text>
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
                        {item.day_shift_rate != null && <Text style={styles.rateUnit}>{unit}</Text>}
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
                        {item.night_shift_rate != null && <Text style={styles.rateUnit}>{unit}</Text>}
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
                        {item.sunday_holiday_rate != null && <Text style={styles.rateUnit}>{unit}</Text>}
                      </View>
                    </View>
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

const TopBar = () => {
  return (
    <View style={styles.topBarContainer}>
      <TouchableOpacity style={styles.logoContainer} activeOpacity={0.8}>
        <Image 
          source={require('../assets/image.png')} 
          style={styles.logoImage} 
          resizeMode="contain" 
        />
      </TouchableOpacity>

      <View style={styles.topBarIcons}>
        <TouchableOpacity style={styles.headerIcon} activeOpacity={0.7}>
          <Ionicons name="chatbubble-ellipses-outline" size={scale(22)} color={C.ink} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerIcon} activeOpacity={0.7}>
          <Ionicons name="notifications-outline" size={scale(22)} color={C.ink} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const HomeScreen = ({ navigation }: any) => {
  const { doctor, token } = useAuth();
  const { isJobSaved, saveJob, unsaveJob, applyJob, isJobApplied } = useJobs();

  const [activeJobs, setActiveJobs] = useState<Job[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [fetchedAvailability, setFetchedAvailability] = useState<any[]>([]);
  const [rateCard, setRateCard] = useState<RateEntry[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string>('');
  const [showRateSheet, setShowRateSheet] = useState(false);
  const [activeSection, setActiveSection] = useState<'jobs' | 'availability'>('jobs');
  
  const toastFadeAnim = useRef(new Animated.Value(0)).current;

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
      const [jobsRes, availRes, rateRes] = await Promise.all([
        api.get('/api/doctors/jobs').catch(() => ({ data: { success: false, jobs: [] } })),
        api.get(`/${doctor._id}/availability`).catch(() => ({ data: { availability: [] } })),
        api.get(`/api/doctors/rate-card/${doctor._id}`).catch(() => ({ data: { data: [] } }))
      ]);

      if (jobsRes.data?.success) {
        setActiveJobs(jobsRes.data.jobs.map((reqItem: any) => ({
          id: reqItem._id,
          hospital: reqItem.hospital_name,
          location: `${reqItem.city}, ${reqItem.state}`,
          date: reqItem.shift_start_date ? new Date(reqItem.shift_start_date).toLocaleDateString('en-GB') : 'TBD',
          specialization: reqItem.speciality,
          department: reqItem.department || 'General',
          status: reqItem.status || 'Available',
          pay: `₹${reqItem.offered_rate}`,
          payType: reqItem.billing_shift_type === 'Hourly' ? '/hr' : 'Flat',
          urgency: reqItem.vacancy_status,
          rawDetails: reqItem,
        })));
      }
      
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

  const handleBookmarkToggle = async (job: Job) => {
    const originallySaved = isJobSaved(job.id);
    originallySaved ? unsaveJob(job.id) : saveJob(job);

    try {
      const { data } = await api.post(`/api/doctors/jobs/${job.id}/save`);
      if (data.success) showToast(originallySaved ? 'Removed from Saved Jobs' : 'Job saved successfully!');
    } catch {
      originallySaved ? saveJob(job) : unsaveJob(job.id);
      showToast('Error updating saved job status');
    }
  };

  const handleApply = async (job: Job) => {
    try {
      const { data } = await api.post(`/api/doctors/jobs/${job.id}/apply`);
      if (data?.success) {
        applyJob(job);
        showToast(data.message || 'Applied successfully!');
      } else {
        showToast(data.message || 'Failed to apply.');
      }
    } catch (error: any) {
      showToast(error.response?.data?.message || 'Error applying to job');
    }
  };

  const currentHour = new Date().getHours();
  const isMorning = currentHour < 12;
  const isAfternoon = currentHour >= 12 && currentHour < 17;
  
  const greeting = isMorning ? 'Good morning' : isAfternoon ? 'Good afternoon' : 'Good evening';
  const greetingIcon = isMorning ? 'partly-sunny' : isAfternoon ? 'sunny' : 'moon';
  const greetingColor = isMorning ? '#f59e0b' : isAfternoon ? '#d97706' : '#6366f1';
  
  const userName = doctor?.first_name || 'Doctor';

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={C.background} />

      <Animated.View pointerEvents="none" style={[styles.toastContainer, { opacity: toastFadeAnim }]}>
        <Ionicons name="checkmark-circle" size={18} color={C.white} />
        <Text style={styles.toastText}>{toastMessage}</Text>
      </Animated.View>

      <TopBar />

      <View style={styles.headerContainer}>
        <View style={styles.greetingRow}>
          <View style={styles.greetingTextWrap}>
            <Ionicons name={greetingIcon} size={scale(14)} color={greetingColor} />
            <Text style={styles.greetingText}>{greeting},</Text>
          </View>
          <Text style={styles.userNameText}>{userName}</Text>
        </View>
        
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={scale(16)} color={C.textMuted} />
          <TextInput placeholder="Search shifts, hospitals..." placeholderTextColor={C.textMuted} style={styles.searchInput} />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.primary]} />}
      >
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.actionsScroll}>
          <TouchableOpacity style={[styles.actionChip, activeSection === 'jobs' && styles.actionChipActive]} onPress={() => setActiveSection('jobs')}>
            <Ionicons name="briefcase-outline" size={scale(13)} color={activeSection === 'jobs' ? C.primary : C.textSub} style={{ marginRight: scale(4) }} />
            <Text style={[styles.actionChipText, activeSection === 'jobs' && { color: C.primary }]}>Jobs</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionChip} onPress={() => navigation.navigate('DutiesScreen')}>
            <Text style={styles.actionChipText}>Duties Screen</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.actionChip, activeSection === 'availability' && styles.actionChipActive]} onPress={() => setActiveSection('availability')}>
            <Ionicons name="calendar-outline" size={scale(13)} color={activeSection === 'availability' ? C.primary : C.textSub} style={{ marginRight: scale(4) }} />
            <Text style={[styles.actionChipText, activeSection === 'availability' && { color: C.primary }]}>Manage Availability</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionChip} onPress={() => setShowRateSheet(true)}>
            <Ionicons name="pricetags-outline" size={scale(13)} color={C.textSub} style={{ marginRight: scale(4) }} />
            <Text style={styles.actionChipText}>Rate Card</Text>
          </TouchableOpacity>
        </ScrollView>

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
            <View style={styles.feedDividerRow}>
              <Text style={styles.feedDividerText}>RECOMMENDED FOR YOU</Text>
              <View style={styles.feedDividerLine} />
            </View>

            {loadingJobs && !refreshing ? (
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
                        <Ionicons name={saved ? 'bookmark' : 'bookmark-outline'} size={scale(22)} color={saved ? C.primary : C.textMuted} />
                      </TouchableOpacity>
                    </View>

                    <View style={styles.jobDetailsList}>
                      <View style={styles.jobDetailItem}>
                        <Ionicons name="time-outline" size={scale(13)} color={C.textSub} />
                        <Text style={styles.jobDetailText}>{req.date}</Text>
                      </View>
                      <View style={styles.jobDetailItem}>
                        <Ionicons name="cash-outline" size={scale(13)} color={C.textSub} />
                        <Text style={styles.jobDetailText}>{req.pay} {req.payType}</Text>
                      </View>
                    </View>

                    <View style={styles.jobActions}>
                      {applied ? (
                        <View style={styles.appliedBadge}>
                          <Ionicons name="checkmark-circle" size={scale(14)} color={C.success} />
                          <Text style={styles.appliedBadgeText}>Applied</Text>
                        </View>
                      ) : (
                        <TouchableOpacity style={styles.btnShadowWrapper} activeOpacity={0.85} onPress={() => handleApply(req)}>
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
  toastContainer: {
    position: 'absolute', top: scale(54), alignSelf: 'center', backgroundColor: C.ink,
    flexDirection: 'row', alignItems: 'center', gap: scale(8), paddingHorizontal: scale(16),
    paddingVertical: scale(10), borderRadius: scale(20), zIndex: 9999,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 10, elevation: 8,
  },
  toastText: { color: C.white, fontSize: scale(13), fontWeight: '700' },
  badgeWrap: { flexDirection: 'row', alignItems: 'center', gap: scale(4) },
  badgeText: { fontSize: scale(11), fontWeight: '700' },
  
  // TOP BAR STYLES (Compact Layout)
  topBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(20),
    paddingTop: scale(4),
    paddingBottom: scale(2),
  },
  logoContainer: {
    width: scale(95),
    height: scale(42),
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  topBarIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
  },
  headerIcon: {
    padding: scale(2),
  },

  // HEADER CONTAINER (Greeting & Search - Compact Layout)
  headerContainer: {
    paddingHorizontal: scale(20),
    paddingTop: scale(2),
    paddingBottom: scale(4),
    gap: scale(8),
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  greetingTextWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  greetingText: {
    fontSize: scale(13),
    color: C.textSub,
    fontWeight: '700',
    marginLeft: scale(4),
  },
  userNameText: {
    fontSize: scale(16),
    color: C.ink,
    fontWeight: '900',
    marginLeft: scale(4),
  },
  
  // SEARCH BAR (Slimmer profile)
  searchBar: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: C.cardBg,
    borderRadius: scale(12), paddingHorizontal: scale(12), height: scale(38),
    borderWidth: 1, borderColor: C.border,
    shadowColor: C.ink, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  searchInput: { 
    flex: 1, marginLeft: scale(8), fontSize: scale(13), color: C.ink, fontWeight: '600', padding: 0 
  },
  
  // ACTIONS TABS (Reduced Size)
  actionsScroll: { 
    paddingHorizontal: scale(20), 
    paddingTop: scale(10), 
    paddingBottom: scale(14), 
    gap: scale(8) 
  },
  actionChip: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: C.cardBg,
    borderWidth: 1, borderColor: C.border, 
    borderRadius: scale(10), // Reduced from 14
    paddingHorizontal: scale(12), // Reduced from 16
    paddingVertical: scale(8), // Reduced from 10
  },
  actionChipActive: { borderColor: C.primary, backgroundColor: C.primaryLight },
  actionChipText: { fontSize: scale(12), fontWeight: '700', color: C.ink }, // Reduced from 13

  availabilityWrapper: { marginHorizontal: scale(20), marginBottom: scale(24) },
  availabilityHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: scale(12), paddingHorizontal: scale(4) },
  availabilityTitle: { fontSize: scale(16), fontWeight: '900', color: C.ink, letterSpacing: -0.5 },
  
  // --- JOB FEED & CARDS (Compact Layout) ---
  feedDividerRow: { flexDirection: 'row', alignItems: 'center', marginHorizontal: scale(20), marginBottom: scale(14) },
  feedDividerText: { fontSize: scale(10), color: C.primary, fontWeight: '800', letterSpacing: 1.2, marginRight: scale(12) },
  feedDividerLine: { flex: 1, height: 1, backgroundColor: C.border },
  
  jobCard: {
    backgroundColor: C.cardBg, 
    borderRadius: scale(20), 
    marginHorizontal: scale(20),
    marginBottom: scale(12), 
    borderWidth: 1, 
    borderColor: C.border,
    shadowColor: C.ink, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 3, 
    padding: scale(16), 
  },
  jobCardHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  
  companyLogo: {
    width: scale(44), 
    height: scale(44), 
    backgroundColor: C.inputBg,
    borderRadius: scale(12), 
    borderWidth: 1, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center', 
    marginRight: scale(12), 
  },
  jobCardMeta: { flex: 1, gap: scale(2) }, 
  jobTitle: { fontSize: scale(15), fontWeight: '900', color: C.ink, letterSpacing: -0.3 }, 
  companyName: { fontSize: scale(13), color: C.textSub, fontWeight: '600' }, 
  jobLocation: { fontSize: scale(11), color: C.textMuted, marginBottom: scale(4), fontWeight: '500' }, 
  
  bookmarkBtn: { padding: scale(4) },
  
  jobDetailsList: { marginTop: scale(12), gap: scale(6) }, 
  jobDetailItem: { flexDirection: 'row', alignItems: 'center', gap: scale(6) },
  jobDetailText: { fontSize: scale(12), color: C.textSub, fontWeight: '600' }, 
  
  jobActions: { marginTop: scale(14), flexDirection: 'row' }, 
  btnShadowWrapper: { shadowColor: C.primary, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4, borderRadius: scale(12) },
  
  applyBtnPrimary: { 
    paddingVertical: scale(10), 
    paddingHorizontal: scale(20), 
    borderRadius: scale(12), 
    alignItems: 'center' 
  },
  applyBtnText: { color: C.white, fontSize: scale(13), fontWeight: '800' }, 
  
  appliedBadge: { 
    flexDirection: 'row', alignItems: 'center', gap: scale(6), 
    backgroundColor: '#d1fae5', 
    paddingHorizontal: scale(14), 
    paddingVertical: scale(8), 
    borderRadius: scale(10) 
  },
  appliedBadgeText: { color: C.success, fontSize: scale(12), fontWeight: '700' },

  backdrop: { flex: 1, backgroundColor: 'rgba(17, 24, 39, 0.4)' },
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