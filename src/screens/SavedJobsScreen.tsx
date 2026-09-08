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
import LinearGradient from 'react-native-linear-gradient';
import { useJobs, Job } from '../context/JobContext';
import api from '../services/axiosConfig';
import { useIsFocused } from '@react-navigation/native'; // Ensure you have this installed

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
  warning: '#f59e0b',
};

const SavedJobsScreen = ({ navigation }: any) => {
  const { appliedJobs, unsaveJob, applyJob, isJobApplied } = useJobs();
  const isFocused = useIsFocused(); // To re-fetch if navigating back

  const [dbSavedJobs, setDbSavedJobs] = useState<Job[]>([]);
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

  // Fetch from the backend
  useEffect(() => {
    const fetchSavedJobs = async () => {
      try {
        setIsLoading(true);
        const response = await api.get('/api/doctors/saved-jobs');
        
        if (response.data && response.data.success) {
          const mappedSaved = response.data.jobs.map((reqItem: any) => ({
            id: reqItem._id,
            hospital: reqItem.hospital_name,
            location: `${reqItem.city}, ${reqItem.state}`,
            date: new Date(reqItem.shift_start_date).toLocaleDateString(),
            specialization: reqItem.speciality,
            pay: `₹${reqItem.offered_rate}`,
            payType: reqItem.billing_shift_type === 'Hourly' ? '/hr' : 'Flat',
            urgency: reqItem.vacancy_status === 'Urgent' ? 'urgent' : 'normal',
            distance: 'N/A', 
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
      // In a production app, you might re-fetch here if it fails
    }
  };

  const handleApply = (job: Job) => {
    applyJob(job);
    showToast('Applied successfully!');
  };

  const currentList = activeTab === 'saved' ? dbSavedJobs : appliedJobs;

  const filteredJobs = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return currentList;
    return currentList.filter(
      job =>
        job.specialization.toLowerCase().includes(q) ||
        job.hospital.toLowerCase().includes(q) ||
        job.location.toLowerCase().includes(q),
    );
  }, [currentList, searchQuery]);

  const renderJobCard = ({ item }: { item: Job }) => {
    const applied = isJobApplied(item.id);

    return (
      <TouchableOpacity style={styles.jobCard} activeOpacity={0.9} onPress={() => navigation.navigate('JobDetails', { job: item })}>
        <View style={styles.jobCardHeader}>
          <View style={styles.companyLogo}>
            <Ionicons name="business-outline" size={scale(24)} color={C.primary} />
          </View>
          <View style={styles.jobCardMeta}>
            <Text style={styles.jobTitle}>{item.specialization}</Text>
            <Text style={styles.companyName}>{item.hospital}</Text>
            <Text style={styles.jobLocation}>{item.location}</Text>
          </View>

          {activeTab === 'saved' && (
            <TouchableOpacity onPress={() => handleUnsave(item.id)} style={styles.iconBtn}>
              <Ionicons name="bookmark" size={24} color={C.primary} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.jobDetailsList}>
          <View style={styles.jobDetailItem}>
            <Ionicons name="time-outline" size={14} color={C.textSub} />
            <Text style={styles.jobDetailText}>{item.date}</Text>
          </View>
          <View style={styles.jobDetailItem}>
            <Ionicons name="cash-outline" size={14} color={C.textSub} />
            <Text style={styles.jobDetailText}>{item.pay} {item.payType}</Text>
          </View>
        </View>

        <View style={styles.jobActions}>
          {applied ? (
            <View style={styles.appliedBadge}>
              <Ionicons name="checkmark-circle" size={16} color={C.success} />
              <Text style={styles.appliedBadgeText}>Applied</Text>
            </View>
          ) : (
            <TouchableOpacity style={styles.btnShadowWrapper} activeOpacity={0.85} onPress={() => handleApply(item)}>
              <LinearGradient colors={['#00a8c2', '#007b8e']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.applyBtnPrimary}>
                <Text style={styles.applyBtnText}>Easy Apply</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={C.cardBg} />

      <Animated.View pointerEvents="none" style={[styles.toastContainer, { opacity: toastFadeAnim }]}>
        <Ionicons name="information-circle" size={18} color={C.white} />
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
          <TextInput placeholder={`Search ${activeTab === 'saved' ? 'Saved' : 'Applied'} jobs...`} placeholderTextColor={C.textMuted} value={searchQuery} onChangeText={setSearchQuery} style={styles.searchInput} />
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
  listContent: { padding: scale(20), paddingBottom: scale(60) },
  jobCard: { backgroundColor: C.cardBg, borderRadius: scale(20), marginBottom: scale(16), borderWidth: 1, borderColor: C.border, padding: scale(18) },
  jobCardHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  companyLogo: { width: scale(48), height: scale(48), backgroundColor: C.inputBg, borderRadius: scale(12), alignItems: 'center', justifyContent: 'center', marginRight: scale(12) },
  jobCardMeta: { flex: 1, gap: scale(2) },
  jobTitle: { fontSize: scale(15), fontWeight: '800', color: C.ink },
  companyName: { fontSize: scale(13), color: C.textSub, fontWeight: '600' },
  jobLocation: { fontSize: scale(12), color: C.textMuted },
  iconBtn: { padding: scale(4) },
  jobDetailsList: { marginTop: scale(14), gap: scale(6) },
  jobDetailItem: { flexDirection: 'row', alignItems: 'center', gap: scale(8) },
  jobDetailText: { fontSize: scale(13), color: C.textSub, fontWeight: '600' },
  jobActions: { marginTop: scale(16), flexDirection: 'row' },
  btnShadowWrapper: { borderRadius: scale(12) },
  applyBtnPrimary: { paddingVertical: scale(10), paddingHorizontal: scale(20), borderRadius: scale(12), alignItems: 'center' },
  applyBtnText: { color: C.white, fontSize: scale(13), fontWeight: '800' },
  appliedBadge: { flexDirection: 'row', alignItems: 'center', gap: scale(6), backgroundColor: '#d1fae5', paddingHorizontal: scale(12), paddingVertical: scale(8), borderRadius: scale(10) },
  appliedBadgeText: { color: C.success, fontSize: scale(13), fontWeight: '700' },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: scale(60), gap: scale(8) },
  emptyIconWrap: { width: scale(64), height: scale(64), borderRadius: scale(32), backgroundColor: C.primaryLight, alignItems: 'center', justifyContent: 'center', marginBottom: scale(8) },
  emptyTitle: { fontSize: scale(16), fontWeight: '800', color: C.ink },
  emptySubtitle: { fontSize: scale(13), color: C.textMuted, textAlign: 'center', paddingHorizontal: scale(30) },
});