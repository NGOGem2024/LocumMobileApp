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
import { useJobs } from '../context/JobContext';
import AvailabilitySection from '../components/AvailabilitySection';
import api from '../services/axiosConfig';

const { width: SW, height: SH } = Dimensions.get('window');
const scale = (size: number) => (SW / 390) * size;

const SHOW_RECOMMENDED = false;

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
  effective_from?: string;
  payment_terms?: PaymentTerm;
};

const formatRate = (val?: number | null) => (val == null ? '—' : `₹${val}`);

// Time conversion function for AM/PM
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

const getPaymentConfig = (term?: PaymentTerm) => {
  const configs: Record<string, any> = {
    'Next Day Payout': {
      icon: 'flash-outline',
      color: '#d97706',
      bg: '#fffbeb',
      border: '#fde68a',
      label: 'Next Day Payout',
    },
    'Weekly Payout': {
      icon: 'calendar-outline',
      color: '#15803d',
      bg: '#f0fdf4',
      border: '#bbf7d0',
      label: 'Weekly Payout',
    },
    'Monthly Payout': {
      icon: 'albums-outline',
      color: '#6d28d9',
      bg: '#f5f3ff',
      border: '#ddd6fe',
      label: 'Monthly Payout',
    },
  };
  return (
    configs[term ?? ''] || {
      icon: 'cash-outline',
      color: C.textMuted,
      bg: '#F9FAFB',
      border: C.border,
      label: term ?? '',
    }
  );
};

const getMatchStyle = (match: number) => {
  if (match >= 75) return { color: '#007b8e', bg: '#dcfce7' };
  if (match >= 50) return { color: '#fb923c', bg: '#ffedd5' };
  return { color: '#f87171', bg: '#fee2e2' };
};

const getRelativeTime = (dateString: string) => {
  if (!dateString) return 'New';
  const date = new Date(dateString);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const past = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffInDays = Math.floor(
    (today.getTime() - past.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diffInDays === 0) return 'Today';
  if (diffInDays === 1) return 'Yesterday';
  if (diffInDays < 7) return `${diffInDays} days ago`;
  if (diffInDays < 14) return '1 week ago';
  if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
  const diffInMonths = Math.floor(diffInDays / 30);
  return `${diffInMonths} month${diffInMonths > 1 ? 's' : ''} ago`;
};

const formatDate = (dateString: string) => {
  if (!dateString) return 'TBD';
  const options: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  };
  return new Date(dateString).toLocaleDateString('en-GB', options);
};

const formatShortDate = (dateString: string) => {
  if (!dateString) return '';
  const options: Intl.DateTimeFormatOptions = {
    day: '2-digit',
    month: 'short',
  };
  return new Date(dateString).toLocaleDateString('en-GB', options);
};

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
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: visible ? 1 : 0,
        duration: visible ? 220 : 180,
        useNativeDriver: true,
      }),
      visible
        ? Animated.spring(slideAnim, {
            toValue: 0,
            damping: 20,
            stiffness: 200,
            useNativeDriver: true,
          })
        : Animated.timing(slideAnim, {
            toValue: SH,
            duration: 220,
            useNativeDriver: true,
          }),
    ]).start();
  }, [visible, fadeAnim, slideAnim]);

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]} />
      </TouchableWithoutFeedback>

      <Animated.View
        style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}
      >
        <View style={styles.handle} />
        <View style={styles.sheetHeader}>
          <View style={styles.sheetIconBubble}>
            <Ionicons name="pricetags" size={scale(18)} color={C.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.sheetTitle}>Rate Card</Text>
            <Text style={styles.sheetSub}>
              {rates.length} duty {rates.length === 1 ? 'type' : 'types'}{' '}
              configured
            </Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={scale(18)} color={C.textSub} />
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContentHorizontal}
          snapToInterval={scale(280) + scale(14)}
          decelerationRate="fast"
        >
          {rates.length === 0 ? (
            <View style={styles.emptyWrap}>
              <View style={styles.emptyIconCircle}>
                <Ionicons
                  name="pricetag-outline"
                  size={scale(28)}
                  color={C.primary}
                />
              </View>
              <Text style={styles.emptyTitle}>No rate card yet</Text>
              <Text style={styles.emptySub}>
                Your admin will configure your rates
              </Text>
            </View>
          ) : (
            rates.map((item, idx) => {
              const unit = item.rate_type === 'Hourly' ? '/hr' : '/shift';
              const pc = getPaymentConfig(item.payment_terms);

              return (
                <View
                  key={item._id ?? `${item.duty_type}-${idx}`}
                  style={[
                    styles.rateCard,
                    idx !== rates.length - 1 && { marginRight: scale(14) },
                  ]}
                >
                  <View style={styles.cardHeader}>
                    <View style={styles.dutyIconWrap}>
                      <Ionicons
                        name="medkit-outline"
                        size={scale(15)}
                        color={C.primary}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.dutyName}>{item.duty_type}</Text>
                      <Text style={styles.dutySubLabel}>Duty Type</Text>
                    </View>
                    <View style={styles.rateTypeBadge}>
                      <Text style={styles.rateTypeBadgeText}>
                        {item.rate_type}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.divider} />

                  <View style={styles.rateRows}>
                    <View style={styles.rateRow}>
                      <View style={styles.rateRowLeft}>
                        <View
                          style={[
                            styles.rateIconBox,
                            { backgroundColor: '#fffbeb' },
                          ]}
                        >
                          <Ionicons
                            name="sunny-outline"
                            size={scale(13)}
                            color="#d97706"
                          />
                        </View>
                        <Text style={styles.rateRowLabel}>Day Shift</Text>
                      </View>
                      <View style={styles.rateRowRight}>
                        <Text style={styles.rateAmt}>
                          {formatRate(item.day_shift_rate)}
                        </Text>
                        {item.day_shift_rate != null && (
                          <Text style={styles.rateUnit}>{unit}</Text>
                        )}
                      </View>
                    </View>

                    {item.night_shift_rate != null && (
                      <View style={styles.rateRow}>
                        <View style={styles.rateRowLeft}>
                          <View
                            style={[
                              styles.rateIconBox,
                              { backgroundColor: '#f3e8ff' },
                            ]}
                          >
                            <Ionicons
                              name="moon-outline"
                              size={scale(13)}
                              color="#7e22ce"
                            />
                          </View>
                          <Text style={styles.rateRowLabel}>Night Shift</Text>
                        </View>
                        <View style={styles.rateRowRight}>
                          <Text style={styles.rateAmt}>
                            {formatRate(item.night_shift_rate)}
                          </Text>
                          <Text style={styles.rateUnit}>{unit}</Text>
                        </View>
                      </View>
                    )}

                    {item.sunday_holiday_rate != null && (
                      <View style={styles.rateRow}>
                        <View style={styles.rateRowLeft}>
                          <View
                            style={[
                              styles.rateIconBox,
                              { backgroundColor: '#fee2e2' },
                            ]}
                          >
                            <Ionicons
                              name="calendar-clear-outline"
                              size={scale(13)}
                              color="#b91c1c"
                            />
                          </View>
                          <Text style={styles.rateRowLabel}>
                            Sunday / Holiday
                          </Text>
                        </View>
                        <View style={styles.rateRowRight}>
                          <Text style={styles.rateAmt}>
                            {formatRate(item.sunday_holiday_rate)}
                          </Text>
                          <Text style={styles.rateUnit}>{unit}</Text>
                        </View>
                      </View>
                    )}
                  </View>

                  <View style={styles.divider} />

                  {item.payment_terms && (
                    <View style={styles.cardFooter}>
                      <View
                        style={[
                          styles.paymentChip,
                          { backgroundColor: pc.bg, borderColor: pc.border },
                        ]}
                      >
                        <Ionicons
                          name={pc.icon}
                          size={scale(11)}
                          color={pc.color}
                        />
                        <Text
                          style={[styles.paymentChipText, { color: pc.color }]}
                        >
                          {pc.label}
                        </Text>
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
    </View>
  );
};

const HomeScreen = ({ navigation }: any) => {
  const { doctor, token } = useAuth();
  const { isJobSaved, saveJob, unsaveJob, applyJob, isJobApplied } = useJobs();

  const [activeJobs, setActiveJobs] = useState<any[]>([]);
  const [upcomingDuties, setUpcomingDuties] = useState<any[]>([]);
  const [currentDuty, setCurrentDuty] = useState<any>(null);

  const [loadingJobs, setLoadingJobs] = useState(true);
  const [fetchedAvailability, setFetchedAvailability] = useState<any[]>([]);
  const [rateCard, setRateCard] = useState<RateEntry[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string>('');
  const [showRateSheet, setShowRateSheet] = useState(false);

  const [activeSection, setActiveSection] = useState<'jobs' | 'availability'>('jobs');

  const toastFadeAnim = useRef(new Animated.Value(0)).current;

  const quickActions = [
    {
      id: 'jobs',
      title: 'Duties & Jobs',
      sub: 'Explore opportunities',
      icon: 'briefcase-outline',
      color: '#4A90E2',
      lightBg: '#F4F8FF',
      borderColor: '#E6F0FA',
      onPress: () => navigation.navigate('DutiesScreen'),
    },
    {
      id: 'availability',
      title: 'Availability',
      sub: 'Set preferences',
      icon: 'time-outline',
      color: '#F39C12',
      lightBg: '#FFF7F0',
      borderColor: '#FCEADA',
      onPress: () => navigation.navigate('AvailabilitySection'),
    },
    {
      id: 'rate',
      title: 'Rate Card',
      sub: 'View your rates',
      icon: 'pricetags-outline',
      color: '#9B59B6',
      lightBg: '#F8F5FF',
      borderColor: '#EFE8FA',
      onPress: () => setShowRateSheet(true),
    },
  ];

  const showToast = useCallback(
    (message: string) => {
      setToastMessage(message);
      Animated.sequence([
        Animated.timing(toastFadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.delay(2000),
        Animated.timing(toastFadeAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    },
    [toastFadeAnim],
  );

  const loadAllData = useCallback(async () => {
    if (!doctor?._id) return;
    try {
      const [jobsRes, availRes, rateRes, currentDutyRes, upcomingDutiesRes] = await Promise.all([
        api.get('/api/doctors/jobs').catch(() => ({ data: { success: false, jobs: [] } })),
        api.get(`/api/doctors/${doctor._id}/availability`).catch(() => ({ data: { availability: [] } })),
        api.get(`/api/doctors/rate-card/${doctor._id}`).catch(() => ({ data: { data: [] } })),
        api.get('/api/doctors/current-duty').catch(() => ({ data: { success: false } })),
        api.get('/api/doctors/upcoming-duties').catch(() => ({ data: { success: false } })),
      ]);

      if (jobsRes.data?.success) {
        setActiveJobs(
          jobsRes.data.jobs.map((reqItem: any) => ({
            id: reqItem._id,
            hospital: reqItem.hospital_name,
            location: `${reqItem.city}, ${reqItem.state}`,
            postedAt: getRelativeTime(reqItem.created_at || reqItem.createdAt),
            date: reqItem.shift_start_date
              ? new Date(reqItem.shift_start_date).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })
              : 'TBD',
            specialization: reqItem.speciality,
            department: reqItem.department || 'General',
            status: reqItem.status || 'Available',
            pay: `₹${reqItem.offered_rate}`,
            payType: reqItem.billing_shift_type === 'Hourly' ? '/hr' : 'Flat',
            urgency: reqItem.vacancy_status,
            matchPercentage: reqItem.matchPercentage || 0,
            matchedCriteria: reqItem.matchedCriteria || null,
            rawDetails: reqItem,
          })),
        );
      }

      // Handle Current Duty
      if (currentDutyRes.data?.success && currentDutyRes.data.has_current_duty) {
        setCurrentDuty(currentDutyRes.data.duty);
      } else {
        setCurrentDuty(null);
      }

      // Handle Upcoming Duties
      if (upcomingDutiesRes.data?.success) {
        setUpcomingDuties(upcomingDutiesRes.data.duties || []);
      } else {
        setUpcomingDuties([]);
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

  const handleBookmarkToggle = async (job: any) => {
    const originallySaved = isJobSaved(job.id);
    originallySaved ? unsaveJob(job.id) : saveJob(job);
    try {
      const { data } = await api.post(`/api/doctors/jobs/${job.id}/save`);
      if (data.success)
        showToast(
          originallySaved
            ? 'Removed from Saved Jobs'
            : 'Job saved successfully!',
        );
    } catch {
      originallySaved ? saveJob(job) : unsaveJob(job.id);
      showToast('Error updating saved job status');
    }
  };

  const handleApply = async (job: any) => {
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
  const greeting = isMorning
    ? 'Good morning'
    : isAfternoon
    ? 'Good afternoon'
    : 'Good evening';
  const greetingIcon = isMorning
    ? 'partly-sunny'
    : isAfternoon
    ? 'sunny'
    : 'moon';
  const greetingColor = isMorning
    ? '#f59e0b'
    : isAfternoon
    ? '#d97706'
    : '#6366f1';
  const userName = doctor?.first_name || 'Doctor';

  // Extract Current Duty details
  const cdArea = currentDuty?.hospital?.area || '';
  const cdCity = currentDuty?.hospital?.district || currentDuty?.hospital?.city || '';
  const cdState = currentDuty?.hospital?.state || '';
  const cdPincode = currentDuty?.hospital?.pincode || '';

  const cdLocationParts = [cdArea, cdCity, cdState].filter(Boolean);
  let cdLocationString = cdLocationParts.join(', ');
  if (cdPincode) {
    cdLocationString = cdLocationString ? `${cdLocationString} - ${cdPincode}` : cdPincode;
  }

  const assignedDates: string[] = currentDuty?.assigned_schedule?.assigned_dates || [];
  const remainingDates: string[] = currentDuty?.assigned_schedule?.remaining_dates || [];

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={C.background} />

      <Animated.View
        pointerEvents="none"
        style={[styles.toastContainer, { opacity: toastFadeAnim }]}
      >
        <Ionicons name="checkmark-circle" size={18} color={C.white} />
        <Text style={styles.toastText}>{toastMessage}</Text>
      </Animated.View>

      <TopBar />

      <View style={styles.headerContainer}>
        <View style={styles.greetingRow}>
          <View style={styles.greetingTextWrap}>
            <Ionicons
              name={greetingIcon}
              size={scale(14)}
              color={greetingColor}
            />
            <Text style={styles.greetingText}>{greeting},</Text>
          </View>
          <Text style={styles.userNameText}>{userName}</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[C.primary]}
          />
        }
      >
        {activeSection === 'availability' ? (
          <View style={styles.availabilityWrapper}>
            <View style={styles.availabilityHeader}>
              <Text style={styles.availabilityTitle}>Manage Availability</Text>
              <Ionicons
                name="ellipsis-horizontal"
                size={scale(20)}
                color={C.textMuted}
              />
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
            {/* 1. CURRENT DUTY SECTION */}
            {currentDuty && (
              <View style={styles.sectionContainer}>
                <LinearGradient
                  colors={['#E5F8FA', '#F3FCFD']}
                  style={styles.currentDutyCard}
                >
                  <View style={styles.cdHeader}>
                    <View style={styles.cdHeaderLeft}>
                      <View style={styles.cdDot} />
                      <Text style={styles.cdHeaderText}>CURRENT DUTY</Text>
                    </View>
                    <Text style={styles.cdInProgress}>
                      {currentDuty.duty_state === 'IN_PROGRESS'
                        ? 'In Progress'
                        : currentDuty.status || 'Active'}
                    </Text>
                  </View>

                  <View style={styles.cdBody}>
                    <View style={styles.cdIconBox}>
                      <Ionicons
                        name="business-outline"
                        size={scale(20)}
                        color={C.primary}
                      />
                    </View>
                    <View style={styles.cdInfo}>
                      <Text style={styles.cdTitle} numberOfLines={1}>
                        {currentDuty.speciality || currentDuty.department || 'General Duty'}
                      </Text>
                      <Text style={styles.cdHospital} numberOfLines={1}>
                        {currentDuty.hospital?.name || 'Hospital'}
                      </Text>
                      {cdLocationString ? (
                        <View style={styles.cdLocationRow}>
                          <Ionicons
                            name="location-outline"
                            size={scale(12)}
                            color={C.textSub}
                          />
                          <Text style={styles.cdLocationText} numberOfLines={2}>
                            {cdLocationString}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  </View>

                  {/* ASSIGNED & REMAINING DATES BREAKDOWN */}
                  <View style={styles.cdDatesBlock}>
                    {/* Assigned Dates */}
                    <View style={styles.cdDateRow}>
                      <View style={styles.cdDateLabelWrap}>
                        <Ionicons
                          name="calendar-outline"
                          size={scale(12)}
                          color={C.primary}
                        />
                        <Text style={styles.cdDateLabelText}>
                          Assigned ({assignedDates.length}):
                        </Text>
                      </View>
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.cdChipsScroll}
                      >
                        {assignedDates.length > 0 ? (
                          assignedDates.map((d: string) => (
                            <View key={d} style={styles.cdAssignedChip}>
                              <Text style={styles.cdAssignedChipText}>
                                {formatShortDate(d)}
                              </Text>
                            </View>
                          ))
                        ) : (
                          <Text style={styles.cdEmptyDateText}>No dates recorded</Text>
                        )}
                      </ScrollView>
                    </View>

                    {/* Remaining Dates */}
                    <View style={styles.cdDateRow}>
                      <View style={styles.cdDateLabelWrap}>
                        <Ionicons
                          name="time-outline"
                          size={scale(12)}
                          color={C.warning}
                        />
                        <Text style={styles.cdDateLabelText}>
                          Remaining ({remainingDates.length}):
                        </Text>
                      </View>
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.cdChipsScroll}
                      >
                        {remainingDates.length > 0 ? (
                          remainingDates.map((d: string) => (
                            <View key={d} style={styles.cdRemainingChip}>
                              <Text style={styles.cdRemainingChipText}>
                                {formatShortDate(d)}
                              </Text>
                            </View>
                          ))
                        ) : (
                          <View style={styles.cdLastDayBadge}>
                            <Text style={styles.cdLastDayText}>Final Day Today</Text>
                          </View>
                        )}
                      </ScrollView>
                    </View>
                  </View>

                  <View style={styles.cdDivider} />

                  <View style={styles.cdFooter}>
                    <View style={styles.cdFooterItem}>
                      <Ionicons
                        name="time-outline"
                        size={scale(14)}
                        color={C.textSub}
                      />
                      <Text style={styles.cdFooterText}>
                        {formatTimeAMPM(currentDuty.shift_timings?.duty_from_time)} -{' '}
                        {formatTimeAMPM(currentDuty.shift_timings?.duty_to_time)}
                      </Text>
                    </View>
                    <View style={styles.cdFooterItem}>
                      <Ionicons
                        name="cash-outline"
                        size={scale(14)}
                        color={C.success}
                      />
                      <Text style={[styles.cdFooterText, { color: C.ink, fontWeight: '800' }]}>
                        ₹{currentDuty.configured_rate || currentDuty.offered_rate || '0'}
                      </Text>
                    </View>
                  </View>
                </LinearGradient>
              </View>
            )}

            {/* 2. REAL UPCOMING DUTIES SECTION */}
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Upcoming Duties</Text>
              </View>

              {loadingJobs && !refreshing ? (
                <ActivityIndicator
                  size="small"
                  color={C.primary}
                  style={{ marginVertical: 10 }}
                />
              ) : upcomingDuties.length === 0 ? (
                <View style={styles.emptyUpcomingBox}>
                  <Ionicons
                    name="calendar-outline"
                    size={scale(24)}
                    color={C.textMuted}
                  />
                  <Text style={styles.emptyUpcomingText}>
                    No upcoming duties scheduled.
                  </Text>
                </View>
              ) : (
                upcomingDuties.slice(0, 3).map(duty => {
                  const hospitalName = duty.hospital?.name || 'Hospital Name Pending';

                  const area = duty.hospital?.area || '';
                  const city = duty.hospital?.city || '';
                  const state = duty.hospital?.state || '';
                  const pincode = duty.hospital?.pincode || '';

                  const locationParts = [area, city, state].filter(Boolean);
                  let locationString = locationParts.join(', ');

                  if (pincode) {
                    locationString = locationString ? `${locationString} - ${pincode}` : pincode;
                  }

                  if (!locationString) {
                    locationString = 'Location unavailable';
                  }

                  const dutyAssignedDates = duty.assigned_dates || [];
                  const hasIndividualDates = dutyAssignedDates.length > 0;

                  let displayDatesRange = '';
                  if (!hasIndividualDates) {
                    displayDatesRange = 'Dates pending';
                  }

                  const displayRate = duty.configured_rate || duty.offered_rate || duty.rates || '0';

                  const MAX_CHIPS = 2;
                  const visibleDates = dutyAssignedDates.slice(0, MAX_CHIPS);
                  const hiddenDatesCount = dutyAssignedDates.length - MAX_CHIPS;

                  return (
                    <TouchableOpacity
                      key={duty.requirement_id || duty._id}
                      style={styles.upcomingCard}
                      activeOpacity={0.9}
                      onPress={() =>
                        navigation.navigate('JobDetails', {
                          jobDetails: duty,
                          isAssigned: true,
                          jobStatus: 'Upcoming',
                        })
                      }
                    >
                      <View style={styles.ucTop}>
                        <View style={styles.ucIconBox}>
                          <Ionicons
                            name="medical-outline"
                            size={scale(22)}
                            color={C.primary}
                          />
                        </View>

                        <View style={styles.ucInfo}>
                          <Text style={styles.ucTitle}>
                            {duty.speciality || 'Speciality Not Specified'}
                          </Text>
                          <Text style={styles.ucDepartment}>
                            {duty.department || 'Department Not Specified'}
                          </Text>
                          <Text style={styles.ucHospital}>{hospitalName}</Text>

                          {locationString ? (
                            <View style={styles.ucLocationRowMain}>
                              <Ionicons
                                name="location-outline"
                                size={scale(12)}
                                color={C.textMuted}
                              />
                              <Text style={styles.ucLocation} numberOfLines={2}>
                                {locationString}
                              </Text>
                            </View>
                          ) : null}
                        </View>

                        <View
                          style={[
                            styles.ucBadge,
                            { backgroundColor: '#d1fae5' },
                          ]}
                        >
                          <Text
                            style={[styles.ucBadgeText, { color: '#10b981' }]}
                          >
                            Confirmed
                          </Text>
                        </View>
                      </View>

                      <View style={styles.ucBottom}>
                        <View style={{ gap: scale(8) }}>
                          <View style={styles.ucDateSection}>
                            <Ionicons
                              name="calendar-outline"
                              size={scale(13)}
                              color={C.textSub}
                            />
                            {hasIndividualDates ? (
                              <View style={styles.ucDateChipsWrap}>
                                {visibleDates.map((d: string) => (
                                  <View key={d} style={styles.ucDateChip}>
                                    <Text style={styles.ucDateChipText}>
                                      {formatShortDate(d)}
                                    </Text>
                                  </View>
                                ))}
                                {hiddenDatesCount > 0 && (
                                  <View style={styles.ucDateChipMore}>
                                    <Text style={styles.ucDateChipMoreText}>
                                      +{hiddenDatesCount}
                                    </Text>
                                  </View>
                                )}
                              </View>
                            ) : (
                              <Text style={styles.ucDetailText}>
                                {displayDatesRange}
                              </Text>
                            )}
                          </View>

                          <View style={styles.ucDetailRow}>
                            <Ionicons
                              name="time-outline"
                              size={scale(13)}
                              color={C.textSub}
                            />
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
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.actionsScroll}
                decelerationRate="fast"
                snapToInterval={scale(145) + scale(12)}
              >
                {quickActions.map(action => (
                  <TouchableOpacity
                    key={action.id}
                    style={[
                      styles.qaCard,
                      {
                        backgroundColor: action.lightBg,
                        borderColor: action.borderColor,
                      },
                    ]}
                    activeOpacity={0.8}
                    onPress={action.onPress}
                  >
                    <View style={styles.qaTopRow}>
                      <View
                        style={[
                          styles.qaIconBox,
                          { backgroundColor: action.color },
                        ]}
                      >
                        <Ionicons
                          name={action.icon}
                          size={scale(16)}
                          color={C.white}
                        />
                      </View>
                      <Ionicons
                        name="chevron-forward"
                        size={scale(14)}
                        color={action.color}
                      />
                    </View>
                    <Text style={styles.qaTitle} numberOfLines={1}>
                      {action.title}
                    </Text>
                    <Text style={styles.qaSub} numberOfLines={1}>
                      {action.sub}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {SHOW_RECOMMENDED && (
              <>
                <View style={styles.sectionHeaderNoPad}>
                  <Text style={styles.sectionTitlePad}>Recommended for You</Text>
                  <TouchableOpacity
                    style={[styles.viewAllBtn, { marginRight: scale(20) }]}
                    onPress={() => navigation.navigate('ViewAllJobs')}
                  >
                    <Text style={styles.viewAllText}>View All </Text>
                    <Ionicons
                      name="arrow-forward"
                      size={scale(14)}
                      color={C.primary}
                    />
                  </TouchableOpacity>
                </View>

                {loadingJobs && !refreshing ? (
                  <ActivityIndicator
                    size="large"
                    color={C.primary}
                    style={{ marginTop: 20 }}
                  />
                ) : activeJobs.length === 0 ? (
                  <Text
                    style={{
                      textAlign: 'center',
                      color: C.textMuted,
                      marginTop: 20,
                    }}
                  >
                    No active jobs found right now.
                  </Text>
                ) : (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.horizontalJobScroll}
                    snapToInterval={scale(280) + scale(12)}
                    decelerationRate="fast"
                  >
                    {activeJobs.slice(0, 5).map(req => {
                      const saved = isJobSaved(req.id);
                      const applied = isJobApplied(req.id);
                      const matchStyle = getMatchStyle(req.matchPercentage);

                      const distanceStr =
                        req.matchedCriteria?.location?.distance_km != null
                          ? `${req.matchedCriteria.location.distance_km} km`
                          : '';

                      return (
                        <TouchableOpacity
                          key={req.id}
                          style={styles.hJobCard}
                          activeOpacity={0.9}
                          onPress={() =>
                            navigation.navigate('JobDetails', { job: req })
                          }
                        >
                          <View style={styles.hJobTop}>
                            <View
                              style={[
                                styles.matchRing,
                                { borderColor: matchStyle.color },
                              ]}
                            >
                              <View style={styles.hJobIconBox}>
                                <Ionicons
                                  name="business-outline"
                                  size={scale(20)}
                                  color={matchStyle.color}
                                />
                              </View>
                              <View
                                style={[
                                  styles.matchPercentPill,
                                  { backgroundColor: matchStyle.color },
                                ]}
                              >
                                <Text style={styles.matchPercentText}>
                                  {req.matchPercentage}%
                                </Text>
                              </View>
                            </View>

                            <View style={styles.hJobInfo}>
                              <Text style={styles.hJobTitle} numberOfLines={1}>
                                {req.specialization}
                              </Text>
                              <Text
                                style={styles.hJobHospital}
                                numberOfLines={1}
                              >
                                {req.hospital}
                              </Text>
                              <View style={styles.hJobLocationRow}>
                                <Ionicons
                                  name="location-outline"
                                  size={scale(12)}
                                  color={C.textMuted}
                                />
                                <Text
                                  style={styles.hJobLocation}
                                  numberOfLines={1}
                                >
                                  {req.location}{' '}
                                  {distanceStr ? ` • ${distanceStr}` : ''}
                                </Text>
                              </View>
                            </View>

                            <View style={styles.rightCorner}>
                              <Text style={styles.postedText}>
                                {req.postedAt}
                              </Text>
                              <TouchableOpacity
                                onPress={() => handleBookmarkToggle(req)}
                                style={styles.hJobBookmark}
                              >
                                <Ionicons
                                  name={saved ? 'bookmark' : 'bookmark-outline'}
                                  size={scale(20)}
                                  color={saved ? C.primary : C.textMuted}
                                />
                              </TouchableOpacity>
                            </View>
                          </View>

                          {req.matchedCriteria &&
                            req.matchedCriteria.degree &&
                            req.matchedCriteria.degree.matched === false && (
                              <View style={styles.missingReqBox}>
                                <Ionicons
                                  name="warning-outline"
                                  size={scale(12)}
                                  color={C.textSub}
                                />
                                <Text style={styles.missingReqText}>
                                  Requires:{' '}
                                  {req.matchedCriteria.degree.required_degree}
                                </Text>
                              </View>
                            )}

                          <View style={styles.hJobBottom}>
                            <View style={styles.hJobDetails}>
                              <View style={styles.hJobDetailRow}>
                                <Ionicons
                                  name="calendar-outline"
                                  size={scale(14)}
                                  color={C.textSub}
                                />
                                <Text style={styles.hJobDetailText}>
                                  {req.date}
                                </Text>
                              </View>
                              <View style={styles.hJobDetailRow}>
                                <Ionicons
                                  name="cash-outline"
                                  size={scale(14)}
                                  color={C.textSub}
                                />
                                <Text style={styles.hJobDetailText}>
                                  {req.pay} {req.payType}
                                </Text>
                              </View>
                            </View>

                            {applied ? (
                              <View style={styles.hJobAppliedBadge}>
                                <Text style={styles.hJobAppliedText}>
                                  Applied
                                </Text>
                              </View>
                            ) : (
                              <TouchableOpacity
                                style={styles.hJobApplyBtn}
                                activeOpacity={0.85}
                                onPress={() => handleApply(req)}
                              >
                                <Text style={styles.hJobApplyText}>
                                  Apply Now
                                </Text>
                              </TouchableOpacity>
                            )}
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                )}
              </>
            )}
          </>
        )}
      </ScrollView>

      <RateCardBottomSheet
        visible={showRateSheet}
        rates={rateCard}
        onClose={() => setShowRateSheet(false)}
      />
    </SafeAreaView>
  );
};

export default HomeScreen;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background },
  scroll: { paddingBottom: scale(30) },
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
  },
  toastText: { color: C.white, fontSize: scale(13), fontWeight: '700' },

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
  logoImage: { width: '100%', height: '100%' },

  headerContainer: {
    paddingHorizontal: scale(20),
    paddingTop: scale(2),
    paddingBottom: scale(10),
    gap: scale(12),
  },
  greetingRow: { flexDirection: 'row', alignItems: 'center' },
  greetingTextWrap: { flexDirection: 'row', alignItems: 'center' },
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

  sectionContainer: { marginHorizontal: scale(20), marginBottom: scale(20) },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scale(10),
  },
  sectionHeaderNoPad: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scale(10),
  },
  sectionTitle: { fontSize: scale(16), fontWeight: '800', color: C.ink },
  sectionTitlePad: {
    fontSize: scale(16),
    fontWeight: '800',
    color: C.ink,
    marginLeft: scale(20),
  },
  viewAllBtn: { flexDirection: 'row', alignItems: 'center' },
  viewAllText: { fontSize: scale(12), fontWeight: '700', color: C.primary },

  // --- 1. CURRENT DUTY ---
  currentDutyCard: {
    borderRadius: scale(14),
    padding: scale(14),
    borderWidth: 1,
    borderColor: '#D4EBEB',
  },
  cdHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scale(12),
  },
  cdHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: scale(6) },
  cdDot: {
    width: scale(6),
    height: scale(6),
    borderRadius: scale(3),
    backgroundColor: C.success,
  },
  cdHeaderText: {
    fontSize: scale(11),
    fontWeight: '800',
    color: C.primary,
    letterSpacing: 0.5,
  },
  cdInProgress: { fontSize: scale(12), fontWeight: '700', color: C.primary },

  cdBody: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: scale(12),
  },
  cdIconBox: {
    width: scale(42),
    height: scale(42),
    borderRadius: scale(10),
    backgroundColor: C.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: scale(12),
  },
  cdInfo: { flex: 1, justifyContent: 'center' },
  cdTitle: {
    fontSize: scale(15),
    fontWeight: '700',
    color: C.ink,
    marginBottom: scale(2),
  },
  cdHospital: {
    fontSize: scale(13),
    color: C.textSub,
    marginBottom: scale(3),
    fontWeight: '600',
  },
  cdLocationRow: { flexDirection: 'row', alignItems: 'flex-start', gap: scale(4) },
  cdLocationText: { fontSize: scale(12), color: C.textSub, fontWeight: '500', flex: 1, lineHeight: scale(16) },

  // Current duty date chips & breakdown
  cdDatesBlock: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: scale(10),
    padding: scale(10),
    gap: scale(8),
    marginBottom: scale(10),
  },
  cdDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cdDateLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
    width: scale(110),
  },
  cdDateLabelText: {
    fontSize: scale(11),
    fontWeight: '700',
    color: C.ink,
  },
  cdChipsScroll: {
    flexDirection: 'row',
    gap: scale(6),
    paddingRight: scale(8),
  },
  cdAssignedChip: {
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: '#C7E4E9',
    paddingHorizontal: scale(7),
    paddingVertical: scale(2.5),
    borderRadius: scale(5),
  },
  cdAssignedChipText: {
    fontSize: scale(10),
    fontWeight: '700',
    color: C.primary,
  },
  cdRemainingChip: {
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
    paddingHorizontal: scale(7),
    paddingVertical: scale(2.5),
    borderRadius: scale(5),
  },
  cdRemainingChipText: {
    fontSize: scale(10),
    fontWeight: '700',
    color: '#d97706',
  },
  cdLastDayBadge: {
    backgroundColor: '#ecfdf5',
    paddingHorizontal: scale(8),
    paddingVertical: scale(2.5),
    borderRadius: scale(5),
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  cdLastDayText: {
    fontSize: scale(10),
    fontWeight: '700',
    color: '#059669',
  },
  cdEmptyDateText: {
    fontSize: scale(10),
    color: C.textMuted,
    fontStyle: 'italic',
  },

  cdDivider: {
    height: 1,
    backgroundColor: '#d8eef0',
    marginBottom: scale(10),
  },

  cdFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cdFooterItem: {
    flexDirection: 'row',
    gap: scale(6),
    alignItems: 'center',
  },
  cdFooterText: {
    fontSize: scale(12),
    color: C.textSub,
    fontWeight: '700',
  },
  cdBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#006C7C',
    paddingVertical: scale(7),
    paddingHorizontal: scale(12),
    borderRadius: scale(8),
    gap: scale(4),
  },
  cdBtnText: { color: C.white, fontSize: scale(12), fontWeight: '700' },

  // --- 2. UPCOMING DUTIES ---
  emptyUpcomingBox: {
    alignItems: 'center',
    paddingVertical: scale(16),
    backgroundColor: C.cardBg,
    borderRadius: scale(12),
    borderWidth: 1,
    borderColor: C.border,
    borderStyle: 'dashed',
  },
  emptyUpcomingText: {
    fontSize: scale(12),
    color: C.textMuted,
    fontWeight: '500',
    marginTop: scale(8),
  },
  upcomingCard: {
    backgroundColor: C.cardBg,
    borderRadius: scale(14),
    borderWidth: 1,
    borderColor: C.border,
    padding: scale(16),
    marginBottom: scale(14),
  },
  ucTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: scale(8),
  },
  ucIconBox: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(22),
    backgroundColor: C.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: scale(12),
  },
  ucInfo: { flex: 1, paddingRight: scale(8) },
  ucTitle: { 
    fontSize: scale(15), 
    fontWeight: '800', 
    color: C.ink, 
    marginBottom: scale(2) 
  },
  ucDepartment: { 
    fontSize: scale(13), 
    color: C.textSub, 
    fontWeight: '600', 
    marginBottom: scale(4) 
  },
  ucHospital: {
    fontSize: scale(13),
    color: C.primary,
    fontWeight: '700',
  },
  ucBadge: {
    paddingHorizontal: scale(6),
    paddingVertical: scale(3),
    borderRadius: scale(6),
    alignSelf: 'flex-start',
  },
  ucBadgeText: { fontSize: scale(10), fontWeight: '700' },

  ucLocationRowMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
    marginTop: scale(4), 
  },
  ucLocation: { 
    fontSize: scale(12), 
    color: C.textMuted, 
    fontWeight: '500',
    flex: 1 
  },

  ucBottom: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingTop: scale(12),
    marginTop: scale(8),
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  ucDateSection: { flexDirection: 'row', alignItems: 'center', gap: scale(6) },
  ucDateChipsWrap: { flexDirection: 'row', gap: scale(4) },
  ucDateChip: {
    backgroundColor: C.inputBg,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: scale(6),
    paddingVertical: scale(2),
    borderRadius: scale(4),
  },
  ucDateChipText: { fontSize: scale(10), fontWeight: '600', color: C.ink },
  ucDateChipMore: {
    backgroundColor: C.primaryLight,
    paddingHorizontal: scale(6),
    paddingVertical: scale(2),
    borderRadius: scale(4),
    justifyContent: 'center',
  },
  ucDateChipMoreText: {
    fontSize: scale(10),
    fontWeight: '700',
    color: C.primary,
  },
  ucDetailRow: { flexDirection: 'row', alignItems: 'center', gap: scale(6) },
  ucDetailText: { fontSize: scale(12), color: C.textSub, fontWeight: '700' },

  ucPayBadge: {
    backgroundColor: C.primaryLight,
    paddingHorizontal: scale(12),
    paddingVertical: scale(6),
    borderRadius: scale(8),
    alignItems: 'flex-end',
  },
  ucPayAmt: { fontSize: scale(13), fontWeight: '800', color: C.primary },
  ucPayUnit: {
    fontSize: scale(10),
    fontWeight: '600',
    color: C.primary,
    marginTop: scale(1),
  },

  // --- 3. QUICK ACTIONS ---
  quickActionsContainer: { marginBottom: scale(20) },
  actionsScroll: {
    paddingHorizontal: scale(20),
    paddingTop: scale(6),
    gap: scale(10),
    paddingBottom: scale(4),
  },
  qaCard: {
    width: scale(145),
    borderRadius: scale(12),
    padding: scale(14),
    borderWidth: 1,
  },
  qaTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: scale(10),
  },
  qaIconBox: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(10),
    alignItems: 'center',
    justifyContent: 'center',
  },
  qaTitle: {
    fontSize: scale(14),
    fontWeight: '800',
    color: C.ink,
    marginBottom: scale(2),
  },
  qaSub: { fontSize: scale(11), color: C.textSub, fontWeight: '500' },

  // --- 6. RECOMMENDED FOR YOU ---
  horizontalJobScroll: {
    paddingHorizontal: scale(20),
    gap: scale(12),
    paddingBottom: scale(20),
    paddingTop: scale(6),
  },
  hJobCard: {
    backgroundColor: C.cardBg,
    borderRadius: scale(16),
    borderWidth: 1,
    borderColor: C.border,
    width: scale(280),
    padding: scale(16),
  },
  hJobTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: scale(12),
  },
  hJobInfo: { flex: 1, justifyContent: 'center' },

  matchRing: {
    width: scale(52),
    height: scale(52),
    borderRadius: scale(26),
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: scale(14),
    marginBottom: scale(4),
    position: 'relative',
  },
  hJobIconBox: {
    width: scale(42),
    height: scale(42),
    borderRadius: scale(21),
    backgroundColor: C.inputBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  matchPercentPill: {
    position: 'absolute',
    bottom: scale(-8),
    paddingHorizontal: scale(6),
    paddingVertical: scale(2),
    borderRadius: scale(8),
    borderWidth: 1.5,
    borderColor: C.white,
  },
  matchPercentText: {
    fontSize: scale(9),
    fontWeight: '800',
    color: C.white,
  },

  rightCorner: { alignItems: 'flex-end', justifyContent: 'flex-start' },
  postedText: {
    fontSize: scale(10),
    color: C.textMuted,
    fontWeight: '500',
    marginBottom: scale(6),
  },

  missingReqBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e0e8ea',
    padding: scale(6),
    borderRadius: scale(6),
    marginBottom: scale(12),
    gap: scale(4),
  },
  missingReqText: { fontSize: scale(10), color: '#007b8e', fontWeight: '600' },

  hJobTitle: {
    fontSize: scale(15),
    fontWeight: '800',
    color: C.ink,
    marginBottom: scale(2),
  },
  hJobHospital: {
    fontSize: scale(13),
    color: C.textSub,
    marginBottom: scale(4),
    fontWeight: '500',
  },
  hJobLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
  },
  hJobLocation: { fontSize: scale(12), color: C.textMuted, fontWeight: '500' },
  hJobBookmark: { padding: scale(4) },
  hJobBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  hJobDetails: { gap: scale(8) },
  hJobDetailRow: { flexDirection: 'row', alignItems: 'center', gap: scale(6) },
  hJobDetailText: { fontSize: scale(12), color: C.textSub, fontWeight: '600' },
  hJobApplyBtn: {
    backgroundColor: C.primaryLight,
    paddingVertical: scale(10),
    paddingHorizontal: scale(20),
    borderRadius: scale(10),
  },
  hJobApplyText: { color: C.primary, fontSize: scale(13), fontWeight: '700' },
  hJobAppliedBadge: {
    backgroundColor: '#d1fae5',
    paddingVertical: scale(10),
    paddingHorizontal: scale(20),
    borderRadius: scale(10),
  },
  hJobAppliedText: { color: C.success, fontSize: scale(13), fontWeight: '700' },

  availabilityWrapper: {
    marginHorizontal: scale(20),
    marginBottom: scale(24),
    marginTop: scale(8),
  },
  availabilityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scale(12),
    paddingHorizontal: scale(4),
  },
  availabilityTitle: {
    fontSize: scale(16),
    fontWeight: '900',
    color: C.ink,
    letterSpacing: -0.5,
  },

  // --- BOTTOM SHEET ---
  backdrop: { flex: 1, backgroundColor: 'rgba(17, 24, 39, 0.4)' },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: C.background,
    borderTopLeftRadius: scale(28),
    borderTopRightRadius: scale(28),
    maxHeight: SH * 0.85,
    paddingBottom: scale(34),
  },
  handle: {
    width: scale(40),
    height: scale(5),
    borderRadius: scale(2.5),
    backgroundColor: C.border,
    alignSelf: 'center',
    marginTop: scale(12),
    marginBottom: scale(4),
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(14),
    paddingHorizontal: scale(24),
    paddingVertical: scale(16),
    borderBottomWidth: 1,
    borderBottomColor: C.cardBg,
  },
  sheetIconBubble: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(14),
    backgroundColor: C.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetTitle: {
    fontSize: scale(16),
    fontWeight: '900',
    color: C.ink,
    letterSpacing: -0.3,
  },
  sheetSub: {
    fontSize: scale(12),
    color: C.textSub,
    marginTop: scale(2),
    fontWeight: '500',
  },
  closeBtn: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(16),
    backgroundColor: C.inputBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: { paddingHorizontal: scale(20), paddingTop: scale(20) },
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: scale(48),
    gap: scale(12),
    width: SW - scale(40),
  },
  emptyIconCircle: {
    width: scale(64),
    height: scale(64),
    borderRadius: scale(32),
    backgroundColor: C.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: { fontSize: scale(16), fontWeight: '900', color: C.ink },
  emptySub: { fontSize: scale(13), color: C.textSub, fontWeight: '500' },
  scrollContentHorizontal: {
    paddingHorizontal: scale(20),
    paddingTop: scale(20),
    paddingBottom: scale(20),
    flexGrow: 1,
  },
  rateCard: {
    backgroundColor: C.cardBg,
    borderRadius: scale(16),
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
    width: scale(280),
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(12),
    paddingHorizontal: scale(16),
    paddingVertical: scale(16),
  },
  dutyIconWrap: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(10),
    backgroundColor: C.inputBg,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dutyName: { fontSize: scale(14), fontWeight: '800', color: C.ink },
  dutySubLabel: {
    fontSize: scale(12),
    color: C.textMuted,
    marginTop: scale(2),
    fontWeight: '500',
  },
  rateTypeBadge: {
    backgroundColor: C.background,
    borderRadius: scale(8),
    paddingHorizontal: scale(10),
    paddingVertical: scale(6),
    borderWidth: 1,
    borderColor: C.border,
  },
  rateTypeBadgeText: {
    fontSize: scale(11),
    fontWeight: '700',
    color: C.textSub,
  },
  divider: { height: 1, backgroundColor: C.border },
  rateRows: { paddingHorizontal: scale(16), paddingVertical: scale(8) },
  rateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: scale(10),
  },
  rateRowLeft: { flexDirection: 'row', alignItems: 'center', gap: scale(10) },
  rateIconBox: {
    width: scale(28),
    height: scale(28),
    borderRadius: scale(8),
    alignItems: 'center',
    justifyContent: 'center',
  },
  rateRowLabel: { fontSize: scale(13), color: C.textSub, fontWeight: '700' },
  rateRowRight: { flexDirection: 'row', alignItems: 'baseline', gap: scale(4) },
  rateAmt: { fontSize: scale(15), fontWeight: '900', color: C.ink },
  rateUnit: { fontSize: scale(11), fontWeight: '600', color: C.textMuted },
  cardFooter: { paddingHorizontal: scale(16), paddingVertical: scale(14) },
  paymentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: scale(6),
    borderRadius: scale(8),
    borderWidth: 1,
    paddingHorizontal: scale(10),
    paddingVertical: scale(6),
  },
  paymentChipText: { fontSize: scale(12), fontWeight: '700' },
});