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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../context/AuthContext';
import { useJobs, Job } from '../context/JobContext';
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
};

// Helper function for Circular Ring colors (Lighter, softer colors)
const getMatchStyle = (match: number) => {
  if (match >= 75) return { color: '#007b8e', bg: '#dcfce7' }; // Light Green
  if (match >= 50) return { color: '#fb923c', bg: '#ffedd5' }; // Light Orange
  return { color: '#f87171', bg: '#fee2e2' }; // Light Red (Coral)
};

const ViewAllJobs = ({ navigation }: any) => {
  const { doctor } = useAuth();
  const { isJobSaved, saveJob, unsaveJob, applyJob, isJobApplied } = useJobs();

  const [activeJobs, setActiveJobs] = useState<any[]>([]); // using any[] for new fields
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
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

  const fetchJobs = useCallback(async () => {
    try {
      const res = await api.get('/api/doctors/jobs');
      if (res.data?.success) {
        const formattedJobs = res.data.jobs.map((reqItem: any) => ({
          id: reqItem._id,
          hospital: reqItem.hospital_name,
          location: `${reqItem.city}, ${reqItem.state}`,
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
        setActiveJobs(formattedJobs);
      }
    } catch (error) {
      showToast('Failed to load jobs');
    }
  }, [showToast]);

  useEffect(() => {
    setLoading(true);
    fetchJobs().finally(() => setLoading(false));
  }, [fetchJobs]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchJobs();
    setRefreshing(false);
  }, [fetchJobs]);

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

  const filteredJobs = activeJobs.filter(job => 
    job.hospital.toLowerCase().includes(searchQuery.toLowerCase()) ||
    job.specialization.toLowerCase().includes(searchQuery.toLowerCase()) ||
    job.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderJobCard = ({ item: req }: { item: any }) => {
    const saved = isJobSaved(req.id);
    const applied = isJobApplied(req.id);
    
    // ✅ CALCULATE CIRCULAR MATCH BADGE COLORS
    const matchStyle = getMatchStyle(req.matchPercentage);
    
    // Extract distance if available
    const distanceStr = req.matchedCriteria?.location?.distance_km != null 
        ? `${req.matchedCriteria.location.distance_km} km` 
        : '';

    return (
      <TouchableOpacity style={styles.jobCard} activeOpacity={0.9} onPress={() => navigation.navigate('JobDetails', { job: req })}>
        <View style={styles.jobTop}>
          
          {/* ✅ CIRCULAR MATCH RING AROUND LOGO */}
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
              {/* ✅ APPEND DISTANCE IF AVAILABLE */}
              <Text style={styles.jobLocation} numberOfLines={1}>
                {req.location} {distanceStr ? ` • ${distanceStr}` : ''}
              </Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => handleBookmarkToggle(req)} style={styles.jobBookmark}>
            <Ionicons name={saved ? 'bookmark' : 'bookmark-outline'} size={scale(22)} color={saved ? C.primary : C.textMuted} />
          </TouchableOpacity>
        </View>

        {/* ✅ MISSING REQUIREMENTS WARNING (If degree doesn't match) */}
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

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={C.background} />

      <Animated.View pointerEvents="none" style={[styles.toastContainer, { opacity: toastFadeAnim }]}>
        <Ionicons name="checkmark-circle" size={18} color={C.white} />
        <Text style={styles.toastText}>{toastMessage}</Text>
      </Animated.View>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={scale(22)} color={C.ink} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Browse Jobs</Text>
        <View style={{ width: scale(22) }} /> 
      </View>

      {/* Search & Filter */}
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
        <TouchableOpacity style={styles.filterBtn}>
          <Ionicons name="options-outline" size={scale(20)} color={C.ink} />
        </TouchableOpacity>
      </View>

      {/* Job List */}
      {loading && !refreshing ? (
        <View style={styles.centerWrap}>
          <ActivityIndicator size="large" color={C.primary} />
        </View>
      ) : filteredJobs.length === 0 ? (
        <View style={styles.centerWrap}>
          <Ionicons name="search-outline" size={scale(48)} color={C.border} />
          <Text style={styles.emptyText}>No jobs found matching your search.</Text>
        </View>
      ) : (
        <FlatList
          data={filteredJobs}
          keyExtractor={item => item.id}
          renderItem={renderJobCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.primary]} />}
        />
      )}
    </SafeAreaView>
  );
};

export default ViewAllJobs;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background },
  toastContainer: {
    position: 'absolute', top: scale(54), alignSelf: 'center', backgroundColor: C.ink,
    flexDirection: 'row', alignItems: 'center', gap: scale(8), paddingHorizontal: scale(16),
    paddingVertical: scale(10), borderRadius: scale(20), zIndex: 9999,
  },
  toastText: { color: C.white, fontSize: scale(13), fontWeight: '700' },
  
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: scale(20), paddingVertical: scale(12),
  },
  backBtn: { padding: scale(4), marginLeft: scale(-4) },
  headerTitle: { fontSize: scale(18), fontWeight: '800', color: C.ink },
  
  searchFilterContainer: { 
    flexDirection: 'row', alignItems: 'center', gap: scale(10), 
    paddingHorizontal: scale(20), paddingBottom: scale(16) 
  },
  searchBar: {
    flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: C.cardBg,
    borderRadius: scale(12), paddingHorizontal: scale(14), height: scale(44),
    borderWidth: 1, borderColor: C.border,
  },
  searchInput: { flex: 1, marginLeft: scale(8), fontSize: scale(14), color: C.ink, padding: 0 },
  filterBtn: {
    width: scale(44), height: scale(44), backgroundColor: C.cardBg, 
    borderRadius: scale(12), borderWidth: 1, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center',
  },

  centerWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: scale(20) },
  emptyText: { color: C.textMuted, fontSize: scale(14), marginTop: scale(12), textAlign: 'center' },

  listContent: { paddingHorizontal: scale(20), paddingBottom: scale(40), gap: scale(14) },
  
  jobCard: {
    backgroundColor: C.cardBg, borderRadius: scale(16), borderWidth: 1, borderColor: C.border,
    padding: scale(16), width: '100%',
  },
  jobTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: scale(12) }, // adjusted margin
  
  // ✅ NEW MATCH RING STYLES
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
  jobIconBox: {
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
  
  missingReqBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#e0e8ea', padding: scale(6), borderRadius: scale(6), marginBottom: scale(12), gap: scale(4) },
  missingReqText: { fontSize: scale(10), color: '#007b8e', fontWeight: '600' },
  
  jobInfo: { flex: 1, justifyContent: 'center' },
  jobTitle: { fontSize: scale(15), fontWeight: '800', color: C.ink, marginBottom: scale(2) },
  jobHospital: { fontSize: scale(13), color: C.textSub, marginBottom: scale(4), fontWeight: '500' },
  jobLocationRow: { flexDirection: 'row', alignItems: 'center', gap: scale(4) },
  jobLocation: { fontSize: scale(12), color: C.textMuted, fontWeight: '500' },
  jobBookmark: { padding: scale(4), marginLeft: scale(8) },
  
  jobBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  jobDetails: { gap: scale(8) },
  jobDetailRow: { flexDirection: 'row', alignItems: 'center', gap: scale(6) },
  jobDetailText: { fontSize: scale(12), color: C.textSub, fontWeight: '600' },
  jobApplyBtn: { backgroundColor: C.primaryLight, paddingVertical: scale(10), paddingHorizontal: scale(24), borderRadius: scale(10) },
  jobApplyText: { color: C.primary, fontSize: scale(13), fontWeight: '700' },
  jobAppliedBadge: { backgroundColor: C.successLight, paddingVertical: scale(10), paddingHorizontal: scale(24), borderRadius: scale(10) },
  jobAppliedText: { color: C.success, fontSize: scale(13), fontWeight: '700' },
});