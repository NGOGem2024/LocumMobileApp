import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  Animated,
  Dimensions,
  FlatList,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
  RefreshControl,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../context/AuthContext';
import { useJobs } from '../context/JobContext';
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
  overlay: 'rgba(0,0,0,0.4)',
};

const POPULAR_CITIES = ['Pune', 'Mumbai', 'Nagpur', 'Bangalore', 'Delhi'];
const POPULAR_SPECIALITIES = ['ICU', 'Emergency', 'General Physician', 'Cardiology'];
const QUICK_PAYS = ['1000', '2000', '5000', '10000'];

const getMatchStyle = (match: number) => {
  if (match >= 75) return { color: '#007b8e', bg: '#dcfce7' };
  if (match >= 50) return { color: '#fb923c', bg: '#ffedd5' };
  return { color: '#f87171', bg: '#fee2e2' };
};

// Helper: Format relative time based on Calendar Days
const getRelativeTime = (dateString: string) => {
  if (!dateString) return 'New';
  
  const date = new Date(dateString);
  const now = new Date();
  
  // Strip the time to compare pure calendar dates
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const past = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  
  const diffInDays = Math.floor((today.getTime() - past.getTime()) / (1000 * 60 * 60 * 24));

  if (diffInDays === 0) return 'Today';
  if (diffInDays === 1) return 'Yesterday';
  if (diffInDays < 7) return `${diffInDays} days ago`;
  if (diffInDays < 14) return '1 week ago';
  if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
  
  const diffInMonths = Math.floor(diffInDays / 30);
  return `${diffInMonths} month${diffInMonths > 1 ? 's' : ''} ago`;
};

const ViewAllJobs = ({ navigation }: any) => {
  const { doctor } = useAuth();
  const { isJobSaved, saveJob, unsaveJob, applyJob, isJobApplied } = useJobs();

  const [activeJobs, setActiveJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Search & Pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const LIMIT = 10;
  
  // Filters State - Set default shift_type to 'Locum'
  const [isFilterModalVisible, setFilterModalVisible] = useState(false);
  const initialFilters = { speciality: '', city: '', billing_shift_type: '', shift_type: 'Locum', min_pay: '' };
  const [tempFilters, setTempFilters] = useState(initialFilters);
  const [activeFilters, setActiveFilters] = useState(initialFilters);

  const [toastMessage, setToastMessage] = useState('');
  const toastFadeAnim = useRef(new Animated.Value(0)).current;

  const showToast = useCallback((message: string) => {
    setToastMessage(message);
    Animated.sequence([
      Animated.timing(toastFadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(2000),
      Animated.timing(toastFadeAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start();
  }, [toastFadeAnim]);

  const fetchJobs = useCallback(async (pageNumber = 1, currentSearch = '', filtersToApply = activeFilters) => {
    try {
      if (pageNumber === 1) setLoading(true);
      else setLoadingMore(true);

      const params = {
        page: pageNumber,
        limit: LIMIT,
        search: currentSearch || undefined,
        speciality: filtersToApply.speciality || undefined,
        city: filtersToApply.city || undefined,
        billing_shift_type: filtersToApply.billing_shift_type || undefined,
        shift_type: filtersToApply.shift_type || undefined,
        min_pay: filtersToApply.min_pay || undefined,
      };

      const res = await api.get('/api/doctors/jobs', { params });

      if (res.data?.success) {
        const formattedJobs = res.data.jobs.map((reqItem: any) => ({
          id: reqItem._id,
          hospital: reqItem.hospital_name,
          location: `${reqItem.city}, ${reqItem.state}`,
          postedAt: getRelativeTime(reqItem.created_at || reqItem.createdAt),
          date: reqItem.shift_start_date ? new Date(reqItem.shift_start_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'TBD',
          specialization: reqItem.speciality,
          department: reqItem.department || 'General',
          status: reqItem.status || 'Available',
          pay: `₹${reqItem.offered_rate}`,
          payType: reqItem.billing_shift_type === 'Hourly' ? '/hr' : 'Flat',
          urgency: reqItem.vacancy_status,
          matchPercentage: reqItem.match_percentage || 0,
          matchedCriteria: reqItem.matched_criteria || null,
          rawDetails: reqItem,
        }));

        setActiveJobs(prev => pageNumber === 1 ? formattedJobs : [...prev, ...formattedJobs]);
        
        const { currentPage, totalPages } = res.data.pagination;
        setPage(currentPage);
        setHasMore(currentPage < totalPages);
      }
    } catch (error) {
      showToast('Failed to load jobs');
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  }, [showToast, activeFilters]);

  // Debounced Search
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchJobs(1, searchQuery, activeFilters);
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, fetchJobs, activeFilters]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchJobs(1, searchQuery, activeFilters);
  }, [fetchJobs, searchQuery, activeFilters]);

  const handleLoadMore = useCallback(() => {
    if (!loadingMore && !loading && hasMore) {
      fetchJobs(page + 1, searchQuery, activeFilters);
    }
  }, [loadingMore, loading, hasMore, page, fetchJobs, searchQuery, activeFilters]);

  const applyFilters = () => {
    setActiveFilters(tempFilters);
    setFilterModalVisible(false);
    fetchJobs(1, searchQuery, tempFilters);
  };

  const clearFilters = () => {
    setTempFilters(initialFilters);
    setActiveFilters(initialFilters);
    setFilterModalVisible(false);
    fetchJobs(1, searchQuery, initialFilters);
  };

  const handleBookmarkToggle = async (job: any) => {
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

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={C.primary} />
      </View>
    );
  };

  const renderJobCard = ({ item: req }: { item: any }) => {
    const saved = isJobSaved(req.id);
    const applied = isJobApplied(req.id);
    const matchStyle = getMatchStyle(req.matchPercentage);
    
    const distanceStr = req.matchedCriteria?.location?.distance_km != null 
        ? `${req.matchedCriteria.location.distance_km} km` 
        : '';

    return (
      <TouchableOpacity style={styles.jobCard} activeOpacity={0.9} onPress={() => navigation.navigate('JobDetails', { job: req })}>
        <View style={styles.jobTop}>
          
          <View style={[styles.matchRing, { borderColor: matchStyle.color }]}>
            <View style={styles.jobIconBox}>
              <Ionicons name="business-outline" size={scale(20)} color={matchStyle.color} />
            </View>
            <View style={[styles.matchPercentPill, { backgroundColor: matchStyle.color }]}>
              <Text style={styles.matchPercentText}>{req.matchPercentage}%</Text>
            </View>
          </View>

          <View style={styles.jobInfo}>
            <Text style={styles.jobTitle} numberOfLines={1}>{req.specialization}</Text>
            <Text style={styles.jobHospital} numberOfLines={1}>{req.hospital}</Text>
            <View style={styles.jobLocationRow}>
              <Ionicons name="location-outline" size={scale(12)} color={C.textMuted} />
              <Text style={styles.jobLocation} numberOfLines={1}>
                {req.location} {distanceStr ? ` • ${distanceStr}` : ''}
              </Text>
            </View>
          </View>
          
          {/* POSTED TIME & BOOKMARK CORNER */}
          <View style={styles.rightCorner}>
            <Text style={styles.postedText}>{req.postedAt}</Text>
            <TouchableOpacity onPress={() => handleBookmarkToggle(req)} style={styles.jobBookmark}>
              <Ionicons name={saved ? 'bookmark' : 'bookmark-outline'} size={scale(22)} color={saved ? C.primary : C.textMuted} />
            </TouchableOpacity>
          </View>

        </View>

        {req.matchedCriteria && req.matchedCriteria.degree && req.matchedCriteria.degree.matched === false && (
           <View style={styles.missingReqBox}>
              <Ionicons name="warning-outline" size={scale(12)} color="#854d0e" />
              <Text style={styles.missingReqText}>Requires: {req.matchedCriteria.degree.required_degree}</Text>
           </View>
        )}

        <View style={styles.jobBottom}>
          <View style={styles.jobDetails}>
            <View style={styles.jobDetailRow}>
              <Ionicons name="calendar-outline" size={scale(14)} color={C.textSub} />
              <Text style={styles.jobDetailText}>{req.date}</Text>
            </View>
            <View style={styles.jobDetailRow}>
              <Ionicons name="cash-outline" size={scale(14)} color={C.textSub} />
              <Text style={styles.jobDetailText}>{req.pay} {req.payType}</Text>
            </View>
          </View>
          
          {applied ? (
            <View style={styles.jobAppliedBadge}>
              <Text style={styles.jobAppliedText}>Applied</Text>
            </View>
          ) : (
            <TouchableOpacity style={styles.jobApplyBtn} activeOpacity={0.85} onPress={() => handleApply(req)}>
              <Text style={styles.jobApplyText}>Apply Now</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  // Ensure filter is highlighted only if a filter OTHER than the default Locum is applied (optional UI tweak)
  // If you want the filter button to light up even for the default Locum, keep this as is.
  const isFilterActive = Object.entries(activeFilters).some(([key, val]) => {
    if (key === 'shift_type' && val === 'Locum') return false; // Ignore default state for active badge
    return val !== '';
  });

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={C.background} />

      <Animated.View pointerEvents="none" style={[styles.toastContainer, { opacity: toastFadeAnim }]}>
        <Ionicons name="checkmark-circle" size={18} color={C.white} />
        <Text style={styles.toastText}>{toastMessage}</Text>
      </Animated.View>

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={scale(22)} color={C.ink} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Browse Jobs</Text>
        <View style={{ width: scale(22) }} /> 
      </View>

      <View style={styles.searchFilterContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={scale(18)} color={C.textMuted} />
          <TextInput 
            placeholder="Search specialties, hospitals..." 
            placeholderTextColor={C.textMuted} 
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery} 
          />
        </View>
        <TouchableOpacity 
          style={[styles.filterBtn, isFilterActive && styles.filterBtnActive]} 
          onPress={() => setFilterModalVisible(true)}
        >
          <Ionicons name="options-outline" size={scale(20)} color={isFilterActive ? C.primary : C.ink} />
          {isFilterActive && <View style={styles.filterBadge} />}
        </TouchableOpacity>
      </View>

      {loading && !refreshing ? (
        <View style={styles.centerWrap}>
          <ActivityIndicator size="large" color={C.primary} />
        </View>
      ) : activeJobs.length === 0 ? (
        <View style={styles.centerWrap}>
          <Ionicons name="search-outline" size={scale(48)} color={C.border} />
          <Text style={styles.emptyText}>No jobs found matching your criteria.</Text>
        </View>
      ) : (
        <FlatList
          data={activeJobs}
          keyExtractor={item => item.id}
          renderItem={renderJobCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.primary]} />}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={renderFooter}
        />
      )}

      {/* MODERN & EASY FILTER MODAL */}
      <Modal visible={isFilterModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalContent}>
            
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Quick Filters</Text>
              <TouchableOpacity onPress={() => setFilterModalVisible(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={scale(24)} color={C.ink} />
              </TouchableOpacity>
            </View>

            <View style={styles.filterSection}>
              
              {/* 1. CITY FILTER */}
              <View style={styles.filterGroup}>
                <Text style={styles.filterLabel}>City</Text>
                <View style={styles.chipWrap}>
                  {POPULAR_CITIES.map((city) => {
                    const isActive = tempFilters.city.toLowerCase() === city.toLowerCase();
                    return (
                      <TouchableOpacity 
                        key={city} 
                        style={[styles.quickChip, isActive && styles.quickChipActive]}
                        onPress={() => setTempFilters(prev => ({ ...prev, city: isActive ? '' : city }))}
                      >
                        <Text style={[styles.quickChipText, isActive && styles.quickChipTextActive]}>{city}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <TextInput 
                  style={styles.filterInput} 
                  placeholder="Or type another city..." 
                  placeholderTextColor={C.textMuted}
                  value={tempFilters.city}
                  onChangeText={(text) => setTempFilters(prev => ({ ...prev, city: text }))}
                />
              </View>

              {/* 2. SPECIALITY FILTER */}
              <View style={styles.filterGroup}>
                <Text style={styles.filterLabel}>Speciality</Text>
                <View style={styles.chipWrap}>
                  {POPULAR_SPECIALITIES.map((spec) => {
                    const isActive = tempFilters.speciality.toLowerCase() === spec.toLowerCase();
                    return (
                      <TouchableOpacity 
                        key={spec} 
                        style={[styles.quickChip, isActive && styles.quickChipActive]}
                        onPress={() => setTempFilters(prev => ({ ...prev, speciality: isActive ? '' : spec }))}
                      >
                        <Text style={[styles.quickChipText, isActive && styles.quickChipTextActive]}>{spec}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <TextInput 
                  style={styles.filterInput} 
                  placeholder="Or type another speciality..." 
                  placeholderTextColor={C.textMuted}
                  value={tempFilters.speciality}
                  onChangeText={(text) => setTempFilters(prev => ({ ...prev, speciality: text }))}
                />
              </View>

              {/* 3. MIN PAY & SHIFT TYPE */}
              <View style={styles.rowFilters}>
                <View style={styles.halfFilter}>
                  <Text style={styles.filterLabel}>Min Pay</Text>
                  <View style={styles.chipWrap}>
                    {QUICK_PAYS.map((pay) => {
                      const isActive = tempFilters.min_pay === pay;
                      return (
                        <TouchableOpacity 
                          key={pay} 
                          style={[styles.quickChip, isActive && styles.quickChipActive]}
                          onPress={() => setTempFilters(prev => ({ ...prev, min_pay: isActive ? '' : pay }))}
                        >
                          <Text style={[styles.quickChipText, isActive && styles.quickChipTextActive]}>₹{pay}+</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                <View style={styles.halfFilter}>
                  <Text style={styles.filterLabel}>Billing</Text>
                  <View style={styles.chipWrap}>
                    {['Flat', 'Hourly'].map((type) => {
                      const isActive = tempFilters.billing_shift_type === type;
                      return (
                        <TouchableOpacity 
                          key={type} 
                          style={[styles.quickChip, isActive && styles.quickChipActive]}
                          onPress={() => setTempFilters(prev => ({ ...prev, billing_shift_type: isActive ? '' : type }))}
                        >
                          <Text style={[styles.quickChipText, isActive && styles.quickChipTextActive]}>{type}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              </View>

              {/* 4. EMPLOYMENT SHIFT TYPE */}
              <View style={styles.filterGroup}>
                <Text style={styles.filterLabel}>Employment Type</Text>
                <View style={styles.chipWrap}>
                  {['Locum', 'Full Time'].map((type) => {
                    const isActive = tempFilters.shift_type === type;
                    return (
                      <TouchableOpacity 
                        key={type} 
                        style={[styles.quickChip, isActive && styles.quickChipActive]}
                        onPress={() => setTempFilters(prev => ({ ...prev, shift_type: isActive ? '' : type }))}
                      >
                        <Text style={[styles.quickChipText, isActive && styles.quickChipTextActive]}>{type}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.clearBtn} onPress={clearFilters}>
                <Text style={styles.clearBtnText}>Reset</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.applyBtn} onPress={applyFilters}>
                <Text style={styles.applyBtnText}>Show Jobs</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

    </SafeAreaView>
  );
};

export default ViewAllJobs;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background },
  toastContainer: { position: 'absolute', top: scale(54), alignSelf: 'center', backgroundColor: C.ink, flexDirection: 'row', alignItems: 'center', gap: scale(8), paddingHorizontal: scale(16), paddingVertical: scale(10), borderRadius: scale(20), zIndex: 9999 },
  toastText: { color: C.white, fontSize: scale(13), fontWeight: '700' },
  
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: scale(20), paddingVertical: scale(12) },
  backBtn: { padding: scale(4), marginLeft: scale(-4) },
  headerTitle: { fontSize: scale(18), fontWeight: '800', color: C.ink },
  
  searchFilterContainer: { flexDirection: 'row', alignItems: 'center', gap: scale(10), paddingHorizontal: scale(20), paddingBottom: scale(16) },
  searchBar: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: C.cardBg, borderRadius: scale(12), paddingHorizontal: scale(14), height: scale(44), borderWidth: 1, borderColor: C.border },
  searchInput: { flex: 1, marginLeft: scale(8), fontSize: scale(14), color: C.ink, padding: 0 },
  
  filterBtn: { width: scale(44), height: scale(44), backgroundColor: C.cardBg, borderRadius: scale(12), borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  filterBtnActive: { borderColor: C.primary, backgroundColor: C.primaryLight },
  filterBadge: { position: 'absolute', top: scale(10), right: scale(10), width: scale(8), height: scale(8), borderRadius: scale(4), backgroundColor: C.primary },
  
  centerWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: scale(20) },
  emptyText: { color: C.textMuted, fontSize: scale(14), marginTop: scale(12), textAlign: 'center' },
  listContent: { paddingHorizontal: scale(20), paddingBottom: scale(40), gap: scale(14) },
  
  jobCard: { backgroundColor: C.cardBg, borderRadius: scale(16), borderWidth: 1, borderColor: C.border, padding: scale(16), width: '100%' },
  jobTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: scale(12) },
  
  matchRing: { width: scale(52), height: scale(52), borderRadius: scale(26), borderWidth: 2.5, alignItems: 'center', justifyContent: 'center', marginRight: scale(14), marginBottom: scale(4), position: 'relative' },
  jobIconBox: { width: scale(42), height: scale(42), borderRadius: scale(21), backgroundColor: C.inputBg, alignItems: 'center', justifyContent: 'center' },
  matchPercentPill: { position: 'absolute', bottom: scale(-8), paddingHorizontal: scale(6), paddingVertical: scale(2), borderRadius: scale(8), borderWidth: 1.5, borderColor: C.white },
  matchPercentText: { fontSize: scale(9), fontWeight: '800', color: C.white },
  
  jobInfo: { flex: 1, justifyContent: 'center' },
  jobTitle: { fontSize: scale(15), fontWeight: '800', color: C.ink, marginBottom: scale(2) },
  jobHospital: { fontSize: scale(13), color: C.textSub, marginBottom: scale(4), fontWeight: '500' },
  jobLocationRow: { flexDirection: 'row', alignItems: 'center', gap: scale(4) },
  jobLocation: { fontSize: scale(12), color: C.textMuted, fontWeight: '500' },
  
  rightCorner: { alignItems: 'flex-end', justifyContent: 'flex-start' },
  postedText: { fontSize: scale(10), color: C.textMuted, fontWeight: '500', marginBottom: scale(6) },
  jobBookmark: { padding: scale(4) },
  
  missingReqBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#e0e8ea', padding: scale(6), borderRadius: scale(6), marginBottom: scale(12), gap: scale(4) },
  missingReqText: { fontSize: scale(10), color: '#007b8e', fontWeight: '600' },
  
  jobBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  jobDetails: { gap: scale(8) },
  jobDetailRow: { flexDirection: 'row', alignItems: 'center', gap: scale(6) },
  jobDetailText: { fontSize: scale(12), color: C.textSub, fontWeight: '600' },
  jobApplyBtn: { backgroundColor: C.primaryLight, paddingVertical: scale(10), paddingHorizontal: scale(24), borderRadius: scale(10) },
  jobApplyText: { color: C.primary, fontSize: scale(13), fontWeight: '700' },
  jobAppliedBadge: { backgroundColor: C.successLight, paddingVertical: scale(10), paddingHorizontal: scale(24), borderRadius: scale(10) },
  jobAppliedText: { color: C.success, fontSize: scale(13), fontWeight: '700' },
  footerLoader: { paddingVertical: scale(20), alignItems: 'center' },

  // EASY FILTER MODAL STYLES
  modalOverlay: { flex: 1, backgroundColor: C.overlay, justifyContent: 'flex-end' },
  modalContent: { backgroundColor: C.cardBg, borderTopLeftRadius: scale(24), borderTopRightRadius: scale(24), padding: scale(20), paddingBottom: Platform.OS === 'ios' ? scale(40) : scale(20) },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: scale(16) },
  modalTitle: { fontSize: scale(20), fontWeight: '800', color: C.ink },
  closeBtn: { padding: scale(4) },
  
  filterSection: { gap: scale(20), marginBottom: scale(24) },
  filterGroup: { gap: scale(10) },
  rowFilters: { flexDirection: 'row', justifyContent: 'space-between', gap: scale(16) },
  halfFilter: { flex: 1, gap: scale(10) },
  
  filterLabel: { fontSize: scale(14), fontWeight: '700', color: C.ink },
  filterInput: { backgroundColor: C.inputBg, borderRadius: scale(10), paddingHorizontal: scale(14), height: scale(42), fontSize: scale(13), color: C.ink, marginTop: scale(4) },
  
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: scale(8) },
  quickChip: { paddingVertical: scale(8), paddingHorizontal: scale(14), borderRadius: scale(16), backgroundColor: C.inputBg, borderWidth: 1, borderColor: C.border },
  quickChipActive: { backgroundColor: C.primaryLight, borderColor: C.primary },
  quickChipText: { fontSize: scale(12), fontWeight: '600', color: C.textSub },
  quickChipTextActive: { color: C.primary },

  modalFooter: { flexDirection: 'row', gap: scale(14) },
  clearBtn: { flex: 1, paddingVertical: scale(14), borderRadius: scale(12), backgroundColor: '#FEE2E2', alignItems: 'center' },
  clearBtnText: { fontSize: scale(14), fontWeight: '700', color: '#B91C1C' },
  applyBtn: { flex: 2, paddingVertical: scale(14), borderRadius: scale(12), backgroundColor: C.primary, alignItems: 'center' },
  applyBtnText: { fontSize: scale(14), fontWeight: '700', color: C.white },
});