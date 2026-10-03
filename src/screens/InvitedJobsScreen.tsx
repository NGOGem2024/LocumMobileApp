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
  ActivityIndicator,
  LayoutAnimation,
  Platform,
  UIManager
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import api from '../services/axiosConfig';
import { useIsFocused } from '@react-navigation/native';

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
  white: '#ffffff',
  urgent: '#ef4444',
  success: '#10b981',
  successLight: '#d1fae5',
  warning: '#f59e0b',
  warningLight: '#FEF3C7',
  dangerLight: '#fee2e2',
  danger: '#ef4444',
};

const InvitedJobsScreen = ({ navigation }: any) => {
  const isFocused = useIsFocused();
  const [dbJobs, setDbJobs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'responded'>('pending');
  
  // Search States
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchActive, setIsSearchActive] = useState(false);

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

  const formatDate = (dateString: string) => {
    if (!dateString) return 'TBD';
    const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-GB', options);
  };

  useEffect(() => {
    const fetchInvitedJobs = async () => {
      try {
        setIsLoading(true);
        const response = await api.get('/api/doctors/invited-jobs?limit=50');
        
        if (response.data && response.data.success) {
          setDbJobs(response.data.jobs || []);
        }
      } catch (error) {
        console.error("Error fetching invited jobs:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (isFocused) {
      fetchInvitedJobs();
    }
  }, [isFocused]);

  const handleRespond = async (invitationId: string, responseStatus: 'Interested' | 'Not Interested') => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    
    setDbJobs(prev => prev.map(job => 
      job.invitation_id === invitationId 
        ? { ...job, pipeline_status: responseStatus, doctor_response: responseStatus }
        : job
    ));

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
    }
  };

  const toggleSearch = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (isSearchActive) {
      setIsSearchActive(false);
      setSearchQuery('');
    } else {
      setIsSearchActive(true);
    }
  };

  const filteredJobs = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const tabFiltered = dbJobs.filter(job => 
      activeTab === 'pending' 
        ? job.pipeline_status === 'Invited' 
        : job.pipeline_status !== 'Invited'
    );

    if (!q) return tabFiltered;
    return tabFiltered.filter(
      job =>
        (job.speciality || '').toLowerCase().includes(q) ||
        (job.hospital_name || '').toLowerCase().includes(q) ||
        (job.city || '').toLowerCase().includes(q),
    );
  }, [dbJobs, searchQuery, activeTab]);

  const renderJobCard = ({ item }: { item: any }) => {
    const spec = item.speciality || 'General';
    const dept = item.department || '';
    const startD = item.shift_start_date;
    const endD = item.shift_end_date;
    const fromT = item.duty_from_time || 'TBD';
    const toT = item.duty_to_time || 'TBD';
    const rate = item.offered_rate || '0';
    const shiftType = item.billing_shift_type || 'Shift';
    const isUrgent = item.vacancy_status === 'Urgent';
    
    let displayDatesRange = 'TBD';
    if (startD) {
      const start = formatDate(startD);
      const end = endD ? formatDate(endD) : start;
      displayDatesRange = start === end ? start : `${start} to ${end}`;
    }

    return (
      <View style={styles.jobCard}>
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
            </View>
          </View>
          
          <Text style={styles.hospitalName} numberOfLines={1}>{item.hospital_name}</Text>
          
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={scale(12)} color={C.textMuted} /> 
            <Text style={styles.locationText} numberOfLines={1}>
              {item.city}{item.state ? `, ${item.state}` : ''}
            </Text>
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
            {activeTab === 'pending' ? (
              <View style={styles.actionButtonGroup}>
                <TouchableOpacity 
                  style={styles.declineBtn} 
                  activeOpacity={0.85} 
                  onPress={() => handleRespond(item.invitation_id, 'Not Interested')}
                >
                  <Text style={styles.declineBtnText}>Decline</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.applyBtn} 
                  activeOpacity={0.85} 
                  onPress={() => handleRespond(item.invitation_id, 'Interested')}
                >
                  <Text style={styles.applyBtnText}>Interested</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={[
                styles.appliedBadge, 
                item.doctor_response === 'Not Interested' && styles.declinedBadge
              ]}>
                <Text style={[
                  styles.appliedBadgeText, 
                  item.doctor_response === 'Not Interested' && styles.declinedBadgeText
                ]}>
                  {item.doctor_response || item.pipeline_status}
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={C.cardBg} />

      <Animated.View pointerEvents="none" style={[styles.toastContainer, { opacity: toastFadeAnim }]}>
        <Ionicons name="checkmark-circle" size={18} color={C.white} />
        <Text style={styles.toastText}>{toastMessage}</Text>
      </Animated.View>

      {/* COMPACT HEADER WITH INLINE SEARCH */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => isSearchActive ? toggleSearch() : navigation?.goBack()} 
          style={styles.backBtn}
        >
          <Ionicons name="arrow-back" size={scale(22)} color={C.ink} />
        </TouchableOpacity>
        
        {isSearchActive ? (
          <TextInput 
            autoFocus
            placeholder={`Search ${activeTab} invitations...`} 
            placeholderTextColor={C.textMuted} 
            value={searchQuery} 
            onChangeText={setSearchQuery} 
            style={styles.headerSearchInput} 
          />
        ) : (
          <Text style={styles.headerTitle}>Invited Jobs</Text>
        )}

        <TouchableOpacity onPress={toggleSearch} style={styles.iconBtn}>
          <Ionicons 
            name={isSearchActive ? "close" : "search-outline"} 
            size={scale(22)} 
            color={C.ink} 
          />
        </TouchableOpacity>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tabBtn, activeTab === 'pending' && styles.tabBtnActive]} 
          onPress={() => { 
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setActiveTab('pending'); 
          }}
        >
          <Text style={[styles.tabText, activeTab === 'pending' && styles.tabTextActive]}>
            Pending ({dbJobs.filter(j => j.pipeline_status === 'Invited').length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tabBtn, activeTab === 'responded' && styles.tabBtnActive]} 
          onPress={() => { 
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setActiveTab('responded'); 
          }}
        >
          <Text style={[styles.tabText, activeTab === 'responded' && styles.tabTextActive]}>
            Responded ({dbJobs.filter(j => j.pipeline_status !== 'Invited').length})
          </Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={C.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredJobs}
          keyExtractor={item => item.invitation_id}
          renderItem={renderJobCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconWrap}>
                <Ionicons name="mail-open-outline" size={scale(36)} color={C.primary} />
              </View>
              <Text style={styles.emptyTitle}>No {activeTab} invitations</Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery ? 'No matches for your search term.' : `You have no ${activeTab} job invitations at this time.`}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

export default InvitedJobsScreen;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background },
  toastContainer: { position: 'absolute', top: scale(54), alignSelf: 'center', backgroundColor: C.ink, flexDirection: 'row', alignItems: 'center', gap: scale(8), paddingHorizontal: scale(16), paddingVertical: scale(10), borderRadius: scale(20), zIndex: 9999, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 10, elevation: 8 },
  toastText: { color: C.white, fontSize: scale(13), fontWeight: '700' },
  
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: scale(20), paddingVertical: scale(14), backgroundColor: C.cardBg, borderBottomWidth: 1, borderBottomColor: C.border },
  backBtn: { padding: scale(4) },
  iconBtn: { padding: scale(4) },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: scale(17), fontWeight: '800', color: C.ink },
  headerSearchInput: { flex: 1, marginHorizontal: scale(10), backgroundColor: C.inputBg, borderRadius: scale(8), paddingHorizontal: scale(12), paddingVertical: scale(6), fontSize: scale(14), color: C.ink },
  
tabContainer: { flexDirection: 'row', paddingHorizontal: scale(20), paddingVertical: scale(12), gap: scale(10) },  tabBtn: { flex: 1, paddingVertical: scale(10), borderRadius: scale(12), backgroundColor: C.inputBg, alignItems: 'center' },
  tabBtnActive: { backgroundColor: C.primaryLight },
  tabText: { fontSize: scale(13), fontWeight: '700', color: C.textSub },
  tabTextActive: { color: C.primary },
  
  listContent: { padding: scale(16), paddingBottom: scale(60) },
  
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
  
  jobActions: { flexDirection: 'row', alignItems: 'center' },
  actionButtonGroup: { flexDirection: 'row', gap: scale(8) },
  applyBtn: { backgroundColor: C.primary, paddingVertical: scale(8), paddingHorizontal: scale(16), borderRadius: scale(8) },
  applyBtnText: { color: C.white, fontSize: scale(12), fontWeight: '700' },
  declineBtn: { backgroundColor: C.inputBg, paddingVertical: scale(8), paddingHorizontal: scale(16), borderRadius: scale(8) },
  declineBtnText: { color: C.textSub, fontSize: scale(12), fontWeight: '700' },
  
  appliedBadge: { backgroundColor: C.successLight, paddingVertical: scale(8), paddingHorizontal: scale(16), borderRadius: scale(8) },
  appliedBadgeText: { color: C.success, fontSize: scale(12), fontWeight: '700' },
  declinedBadge: { backgroundColor: C.dangerLight },
  declinedBadgeText: { color: C.danger },
  
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: scale(60), gap: scale(8) },
  emptyIconWrap: { width: scale(64), height: scale(64), borderRadius: scale(32), backgroundColor: C.primaryLight, alignItems: 'center', justifyContent: 'center', marginBottom: scale(8) },
  emptyTitle: { fontSize: scale(16), fontWeight: '800', color: C.ink },
  emptySubtitle: { fontSize: scale(13), color: C.textMuted, textAlign: 'center', paddingHorizontal: scale(30), lineHeight: scale(18) },
});