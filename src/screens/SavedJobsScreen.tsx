import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Dimensions,
  StatusBar,
  Animated,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useJobs } from '../context/JobContext';
import api from '../services/axiosConfig';
import { useIsFocused } from '@react-navigation/native'; 

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
  urgent: '#ef4444',
  success: '#10b981',
  successLight: '#d1fae5',
  warning: '#f59e0b',
  warningLight: '#FEF3C7',
};

const SavedJobsScreen = ({ navigation }: any) => {
  const { appliedJobs, unsaveJob, applyJob, isJobApplied } = useJobs();
  const isFocused = useIsFocused(); 

  const [dbSavedJobs, setDbSavedJobs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'saved' | 'applied'>('saved');
  const [searchQuery, setSearchQuery] = useState('');

  // Toast feedback state
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

  // Helper to format date strings
  const formatDate = (dateString: string) => {
    if (!dateString) return 'TBD';
    const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-GB', options);
  };

  // Fetch from the backend
  useEffect(() => {
    const fetchSavedJobs = async () => {
      try {
        setIsLoading(true);
        const response = await api.get('/api/doctors/saved-jobs');
        
        if (response.data && response.data.success) {
          const mappedSaved = response.data.jobs.map((reqItem: any) => ({
            id: reqItem._id,
            hospital: reqItem.hospital_name || '',
            location: `${reqItem.city || ''}, ${reqItem.state || ''}`,
            city: reqItem.city || '',
            state: reqItem.state || '',
            specialization: reqItem.speciality || '',
            department: reqItem.department || '',
            shift_start_date: reqItem.shift_start_date,
            shift_end_date: reqItem.shift_end_date,
            duty_from_time: reqItem.duty_from_time,
            duty_to_time: reqItem.duty_to_time,
            offered_rate: reqItem.offered_rate,
            billing_shift_type: reqItem.billing_shift_type,
            vacancy_status: reqItem.vacancy_status,
            rawDetails: reqItem,
          }));
          setDbSavedJobs(mappedSaved);
        }
      } catch (error) {
        console.error("Error fetching saved jobs:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (isFocused) {
      fetchSavedJobs();
    }
  }, [isFocused]);

  const handleUnsave = async (id: string) => {
    // Optimistic UI Update
    setDbSavedJobs(prev => prev.filter(job => job.id !== id));
    unsaveJob(id); 

    try {
      const response = await api.post(`/api/doctors/jobs/${id}/save`);
      if (response.data.success) {
        showToast('Job removed from Saved');
      }
    } catch (error) {
      showToast('Failed to remove job');
    }
  };

  const handleApply = (job: any) => {
    applyJob(job);
    showToast('Applied successfully!');
  };

  const currentList = activeTab === 'saved' ? dbSavedJobs : appliedJobs;

  const filteredJobs = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return currentList;
    return currentList.filter(
      job =>
        (job.specialization || job.speciality || '').toLowerCase().includes(q) ||
        job.hospital.toLowerCase().includes(q) ||
        job.location.toLowerCase().includes(q),
    );
  }, [currentList, searchQuery]);

  const renderJobCard = ({ item }: { item: any }) => {
    const applied = isJobApplied(item.id);

    // Fallbacks for data coming from Context (Applied) vs DB (Saved)
    const spec = item.specialization || item.speciality || item.rawDetails?.speciality || 'General';
    const dept = item.department || item.rawDetails?.department || '';
    const startD = item.shift_start_date || item.rawDetails?.shift_start_date;
    const endD = item.shift_end_date || item.rawDetails?.shift_end_date;
    const fromT = item.duty_from_time || item.rawDetails?.duty_from_time || 'TBD';
    const toT = item.duty_to_time || item.rawDetails?.duty_to_time || 'TBD';
    const rate = item.offered_rate || item.rawDetails?.offered_rate || '0';
    const shiftType = item.billing_shift_type || item.rawDetails?.billing_shift_type || 'Shift';
    const isUrgent = item.vacancy_status === 'Urgent' || item.rawDetails?.vacancy_status === 'Urgent';
    
    // Format Date Range
    let displayDatesRange = '';
    if (startD) {
      const start = formatDate(startD);
      const end = endD ? formatDate(endD) : start;
      displayDatesRange = start === end ? start : `${start} to ${end}`;
    } else {
      displayDatesRange = 'TBD';
    }

    return (
      <TouchableOpacity 
        style={styles.jobCard} 
        activeOpacity={0.9} 
        onPress={() => navigation.navigate('JobDetails', { job: item })}
      >
        <View style={styles.cardHeader}>
          <View style={styles.titleRow}>
            <Text style={styles.jobTitle} numberOfLines={1}>
              {spec} {dept ? `- ${dept}` : ''}
            </Text>
            
            <View style={styles.topRightIcons}>
              {isUrgent && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>Urgent</Text>
                </View>
              )}
              {activeTab === 'saved' && (
                <TouchableOpacity onPress={() => handleUnsave(item.id)} style={styles.iconBtn}>
                  <Ionicons name="bookmark" size={scale(20)} color={C.primary} />
                </TouchableOpacity>
              )}
            </View>
          </View>
          
          <Text style={styles.hospitalName} numberOfLines={1}>{item.hospital}</Text>
          
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={scale(12)} color={C.textMuted} /> 
            <Text style={styles.locationText} numberOfLines={1}>{item.location}</Text>
          </View>
        </View>

        <View style={styles.cardDetails}>
          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={scale(14)} color={C.textSub} />
            <Text style={styles.detailText}>{displayDatesRange}</Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="time-outline" size={scale(14)} color={C.textSub} />
            <Text style={styles.detailText}>
              {fromT} - {toT}
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.cardFooter}>
          <View>
            <Text style={styles.payText}>
              ₹{rate} <Text style={styles.paySubText}>/ {shiftType}</Text>
            </Text>
          </View>

          <View style={styles.jobActions}>
            {applied ? (
              <View style={styles.appliedBadge}>
                <Text style={styles.appliedBadgeText}>Applied</Text>
              </View>
            ) : (
              <TouchableOpacity style={styles.applyBtn} activeOpacity={0.85} onPress={() => handleApply(item)}>
                <Text style={styles.applyBtnText}>Apply Now</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={C.cardBg} />

      <Animated.View pointerEvents="none" style={[styles.toastContainer, { opacity: toastFadeAnim }]}>
        <Ionicons name="checkmark-circle" size={18} color={C.white} />
        <Text style={styles.toastText}>{toastMessage}</Text>
      </Animated.View>

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation?.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={scale(22)} color={C.ink} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Saved Jobs</Text>
        <View style={{ width: scale(22) }} />
      </View>

      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={scale(18)} color={C.textMuted} />
          <TextInput 
            placeholder={`Search ${activeTab === 'saved' ? 'Saved' : 'Applied'} jobs...`} 
            placeholderTextColor={C.textMuted} 
            value={searchQuery} 
            onChangeText={setSearchQuery} 
            style={styles.searchInput} 
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={C.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity style={[styles.tabBtn, activeTab === 'saved' && styles.tabBtnActive]} onPress={() => { setActiveTab('saved'); setSearchQuery(''); }}>
          <Text style={[styles.tabText, activeTab === 'saved' && styles.tabTextActive]}>Saved ({dbSavedJobs.length})</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabBtn, activeTab === 'applied' && styles.tabBtnActive]} onPress={() => { setActiveTab('applied'); setSearchQuery(''); }}>
          <Text style={[styles.tabText, activeTab === 'applied' && styles.tabTextActive]}>Applied ({appliedJobs.length})</Text>
        </TouchableOpacity>
      </View>

      {isLoading && activeTab === 'saved' ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={C.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredJobs}
          keyExtractor={item => item.id}
          renderItem={renderJobCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconWrap}>
                <Ionicons name={activeTab === 'saved' ? 'bookmark-outline' : 'briefcase-outline'} size={scale(36)} color={C.primary} />
              </View>
              <Text style={styles.emptyTitle}>No {activeTab === 'saved' ? 'saved' : 'applied'} jobs found</Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery ? 'No matches for your search term.' : `Items will appear here once you ${activeTab === 'saved' ? 'bookmark' : 'apply for'} them.`}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

export default SavedJobsScreen;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background },
  toastContainer: { position: 'absolute', top: scale(54), alignSelf: 'center', backgroundColor: C.ink, flexDirection: 'row', alignItems: 'center', gap: scale(8), paddingHorizontal: scale(16), paddingVertical: scale(10), borderRadius: scale(20), zIndex: 9999, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 10, elevation: 8 },
  toastText: { color: C.white, fontSize: scale(13), fontWeight: '700' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: scale(20), paddingVertical: scale(14), backgroundColor: C.cardBg, borderBottomWidth: 1, borderBottomColor: C.border },
  backBtn: { padding: scale(4) },
  headerTitle: { fontSize: scale(17), fontWeight: '800', color: C.ink },
  
  searchSection: { paddingHorizontal: scale(20), paddingTop: scale(14), backgroundColor: C.cardBg },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.inputBg, borderRadius: scale(14), paddingHorizontal: scale(14), height: scale(40) },
  searchInput: { flex: 1, marginLeft: scale(8), fontSize: scale(14), color: C.ink, fontWeight: '600', padding: 0 },
  
  tabContainer: { flexDirection: 'row', paddingHorizontal: scale(20), paddingVertical: scale(12), backgroundColor: C.cardBg, borderBottomWidth: 1, borderBottomColor: C.border, gap: scale(10) },
  tabBtn: { flex: 1, paddingVertical: scale(10), borderRadius: scale(12), backgroundColor: C.inputBg, alignItems: 'center' },
  tabBtnActive: { backgroundColor: C.primaryLight },
  tabText: { fontSize: scale(13), fontWeight: '700', color: C.textSub },
  tabTextActive: { color: C.primary },
  
  listContent: { padding: scale(16), paddingBottom: scale(60) },
  
  // TIGHTENED COMPACT CARD UI
  jobCard: { 
    backgroundColor: C.cardBg, 
    borderRadius: scale(14), 
    marginBottom: scale(12), 
    borderWidth: 1, 
    borderColor: C.border, 
    padding: scale(14), 
    shadowColor: C.ink, 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.03, 
    shadowRadius: 6, 
    elevation: 1 
  },
  cardHeader: { marginBottom: scale(10) },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: scale(2) },
  jobTitle: { flex: 1, fontSize: scale(14), fontWeight: '800', color: C.ink, letterSpacing: -0.2, paddingRight: scale(8) },
  topRightIcons: { flexDirection: 'row', alignItems: 'center', gap: scale(6) },
  badge: { backgroundColor: C.warningLight, paddingHorizontal: scale(6), paddingVertical: scale(2), borderRadius: scale(6) },
  badgeText: { fontSize: scale(9), fontWeight: '700', color: C.warning, textTransform: 'uppercase' },
  iconBtn: { padding: scale(2), marginTop: scale(-4), marginRight: scale(-4) },
  
  hospitalName: { fontSize: scale(13), color: C.ink, fontWeight: '600', marginBottom: scale(2) },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: scale(4) },
  locationText: { fontSize: scale(11), color: C.textMuted, fontWeight: '500' },
  
  cardDetails: { 
    backgroundColor: C.inputBg, 
    borderRadius: scale(10), 
    padding: scale(10), 
    gap: scale(6), 
    marginBottom: scale(10) 
  },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: scale(6) },
  detailText: { fontSize: scale(12), color: C.ink, fontWeight: '600' },
  
  divider: { height: 1, backgroundColor: C.border, marginBottom: scale(10) },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  
  payText: { fontSize: scale(14), fontWeight: '800', color: C.ink },
  paySubText: { fontSize: scale(11), fontWeight: '600', color: C.textSub },
  
  jobActions: { flexDirection: 'row' },
  applyBtn: { backgroundColor: C.primaryLight, paddingVertical: scale(8), paddingHorizontal: scale(16), borderRadius: scale(8) },
  applyBtnText: { color: C.primary, fontSize: scale(12), fontWeight: '700' },
  appliedBadge: { backgroundColor: C.successLight, paddingVertical: scale(8), paddingHorizontal: scale(16), borderRadius: scale(8) },
  appliedBadgeText: { color: C.success, fontSize: scale(12), fontWeight: '700' },
  
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: scale(60), gap: scale(8) },
  emptyIconWrap: { width: scale(64), height: scale(64), borderRadius: scale(32), backgroundColor: C.primaryLight, alignItems: 'center', justifyContent: 'center', marginBottom: scale(8) },
  emptyTitle: { fontSize: scale(16), fontWeight: '800', color: C.ink },
  emptySubtitle: { fontSize: scale(13), color: C.textMuted, textAlign: 'center', paddingHorizontal: scale(30), lineHeight: scale(18) },
});