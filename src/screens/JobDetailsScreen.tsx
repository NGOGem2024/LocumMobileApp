import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import { useJobs, Job } from '../context/JobContext';
import { useAuth } from '../context/AuthContext';

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
  warningLight: '#fef3c7',
  warning: '#d97706',
};

const ApplyJobScreen = ({ route, navigation }: any) => {
  // We expect rawDetails to be passed along with the mapped Job fields
  const { job }: { job: Job & { rawDetails?: any } } = route.params;
  const { doctor } = useAuth();
  const { applyJob } = useJobs();

  // Form Fields
  const [contactNumber, setContactNumber] = useState(doctor?.phone || '');
  const [note, setNote] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Animation Values
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  // Extract the full details passed from the API via HomeScreen
  const details = job.rawDetails || {};

  const handleConfirmApplication = () => {
    // 1. Mark job as applied in context
    applyJob(job);
    
    // 2. Switch to success view
    setIsSubmitted(true);

    // 3. Trigger the success animation
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4, 
        tension: 50,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleBackToHome = () => {
    navigation.popToTop();
  };

  const handleViewAppliedShifts = () => {
    navigation.navigate('SavedJobs');
  };

  // Helper for formatting API dates
  const formatDateString = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  // ─── SUCCESS VIEW ────────────────────────────────────────────────────────
  if (isSubmitted) {
    return (
      <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
        <StatusBar barStyle="dark-content" backgroundColor={C.background} />
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBackToHome} style={styles.iconBtn}>
            <Ionicons name="arrow-back" size={scale(24)} color={C.ink} />
          </TouchableOpacity>
        </View>

        <View style={styles.successContainer}>
          <Animated.View 
            style={[
              styles.successIconOuter, 
              { 
                opacity: opacityAnim,
                transform: [{ scale: scaleAnim }] 
              }
            ]}
          >
            <View style={styles.successIconInner}>
              <Ionicons name="checkmark" size={scale(48)} color={C.primary} />
            </View>
          </Animated.View>

          <Animated.Text style={[styles.successTitle, { opacity: opacityAnim }]}>
            Application Submitted!
          </Animated.Text>
          <Animated.Text style={[styles.successSubtitle, { opacity: opacityAnim }]}>
            You have successfully applied{'\n'}for this shift.
          </Animated.Text>
          <Animated.Text style={[styles.successMessage, { opacity: opacityAnim }]}>
            You will be notified once the{'\n'}hospital responds.
          </Animated.Text>
        </View>

        <View style={styles.successFooter}>
          <TouchableOpacity style={styles.btnWrapper} activeOpacity={0.85} onPress={handleBackToHome}>
            <LinearGradient colors={['#00a8c2', '#007b8e']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.primaryBtn}>
              <Text style={styles.primaryBtnText}>Back to Home</Text>
            </LinearGradient>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.ghostBtn} onPress={handleViewAppliedShifts}>
            <Text style={styles.ghostBtnText}>View Applied Shifts</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ─── APPLICATION FORM VIEW ───────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor={C.cardBg} />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={scale(24)} color={C.ink} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Shift Details</Text>
        <View style={{ width: scale(32) }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
         {/* Header Card */}
          <View style={styles.jobCard}>
            <View style={styles.jobIconBox}>
              <Ionicons name="business-outline" size={scale(24)} color={C.primary} />
            </View>
            <View style={styles.jobMeta}>
              <Text style={styles.jobTitle}>{details.speciality || job.specialization}</Text>
              
              {/* UPDATED: Wrap Hospital Name in TouchableOpacity */}
              <TouchableOpacity 
                activeOpacity={0.7} 
                onPress={() => {
                  if (details.hospital_details?.hospital_id) {
                    navigation.navigate('HospitalDetailsScreen', { hospitalId: details.hospital_details.hospital_id });
                  }
                }}
                style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: scale(2) }}
              >
                <Text style={[styles.jobHospital, { color: C.primary, textDecorationLine: 'underline' }]}>
                  {details.hospital_name || job.hospital}
                </Text>
                <Ionicons name="chevron-forward" size={14} color={C.primary} style={{ marginLeft: 2 }} />
              </TouchableOpacity>
              {/* END UPDATE */}

              <Text style={styles.jobDetailText}>{details.location?.city || details.city}, {details.state}</Text>
              {details.hospital_details?.branch?.name && (
                <View style={styles.branchBadge}>
                  <Text style={styles.branchText}>Branch: {details.hospital_details.branch.name}</Text>
                </View>
              )}
            </View>
          </View>

          {/* Schedule Details */}
          <Text style={styles.sectionTitle}>Schedule & Timings</Text>
          <View style={styles.infoCard}>
             <View style={styles.infoRow}>
                <Ionicons name="calendar-outline" size={scale(18)} color={C.primary} style={styles.infoIcon} />
                <View>
                  <Text style={styles.infoLabel}>Dates</Text>
                  <Text style={styles.infoValue}>
                    {formatDateString(details.shift_start_date)} - {formatDateString(details.shift_end_date)}
                  </Text>
                </View>
             </View>
             <View style={styles.divider} />
             <View style={styles.infoRow}>
                <Ionicons name="time-outline" size={scale(18)} color={C.primary} style={styles.infoIcon} />
                <View>
                  <Text style={styles.infoLabel}>Duty Timing</Text>
                  <Text style={styles.infoValue}>
                    {details.duty_from_time || 'N/A'} to {details.duty_to_time || 'N/A'} 
                    {details.total_shift_hours ? ` (${details.total_shift_hours} Hrs Total)` : ''}
                  </Text>
                </View>
             </View>
          </View>

          {/* Requirements & Compensation */}
          <Text style={styles.sectionTitle}>Requirements & Pay</Text>
          <View style={styles.infoCard}>
             <View style={styles.infoRow}>
                <Ionicons name="medkit-outline" size={scale(18)} color={C.primary} style={styles.infoIcon} />
                <View>
                  <Text style={styles.infoLabel}>Department</Text>
                  <Text style={styles.infoValue}>{details.department || 'General'} ({details.doctor_type || 'Any'} required)</Text>
                </View>
             </View>
             <View style={styles.divider} />
             <View style={styles.infoRow}>
                <Ionicons name="cash-outline" size={scale(18)} color={C.success} style={styles.infoIcon} />
                <View>
                  <Text style={styles.infoLabel}>Compensation</Text>
                  <Text style={[styles.infoValue, { color: C.success, fontWeight: '800' }]}>
                    ₹{details.offered_rate || '0'} <Text style={{fontWeight: '500', fontSize: scale(12)}}>{details.billing_shift_type || 'Per Shift'}</Text>
                  </Text>
                </View>
             </View>
             <View style={styles.divider} />
             <View style={styles.infoRow}>
                <Ionicons name="people-outline" size={scale(18)} color={C.primary} style={styles.infoIcon} />
                <View>
                  <Text style={styles.infoLabel}>Openings</Text>
                  <Text style={styles.infoValue}>{details.openings || 1} Position(s) | {details.shifts_required || 1} Shifts Required</Text>
                </View>
             </View>
          </View>

          {/* Application Form */}
          <Text style={styles.sectionTitle}>Apply</Text>
          <View style={styles.singleInputContainer}>
            <Ionicons name="call-outline" size={scale(18)} color={C.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.singleInput}
              placeholder="Enter your mobile number"
              placeholderTextColor={C.textMuted}
              keyboardType="phone-pad"
              value={contactNumber}
              onChangeText={setContactNumber}
            />
          </View>

          <View style={styles.multiInputContainer}>
            <TextInput
              style={styles.multiInput}
              placeholder="Any specific requests or availability notes? (Optional)"
              placeholderTextColor={C.textMuted}
              multiline={true}
              numberOfLines={4}
              textAlignVertical="top"
              value={note}
              onChangeText={setNote}
            />
          </View>

        </ScrollView>
      </KeyboardAvoidingView>

      {/* Footer Button */}
      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.btnWrapper} 
          activeOpacity={0.85} 
          onPress={handleConfirmApplication}
          disabled={!contactNumber.trim()} 
        >
          <LinearGradient 
            colors={contactNumber.trim() ? ['#00a8c2', '#007b8e'] : ['#9CA3AF', '#6B7280']} 
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} 
            style={styles.primaryBtn}
          >
            <Text style={styles.primaryBtnText}>Confirm Application</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default ApplyJobScreen;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: scale(16), paddingVertical: scale(14), backgroundColor: C.cardBg, borderBottomWidth: 1, borderBottomColor: C.border },
  iconBtn: { padding: scale(4) },
  headerTitle: { fontSize: scale(16), fontWeight: '800', color: C.ink },
  scrollContent: { padding: scale(20), paddingBottom: scale(40) },
  
  jobCard: { flexDirection: 'row', backgroundColor: C.cardBg, padding: scale(16), borderRadius: scale(16), borderWidth: 1, borderColor: C.border, marginBottom: scale(24), alignItems: 'center' },
  jobIconBox: { width: scale(56), height: scale(56), borderRadius: scale(12), backgroundColor: C.primaryLight, alignItems: 'center', justifyContent: 'center', marginRight: scale(16) },
  jobMeta: { flex: 1, gap: scale(2) },
  jobTitle: { fontSize: scale(15), fontWeight: '800', color: C.ink },
  jobHospital: { fontSize: scale(13), color: C.textSub, fontWeight: '600' },
  jobDetailText: { fontSize: scale(12), color: C.textMuted },
  
  sectionTitle: { fontSize: scale(14), fontWeight: '800', color: C.ink, marginBottom: scale(12), marginTop: scale(8) },
  
  infoCard: { backgroundColor: C.cardBg, borderRadius: scale(16), borderWidth: 1, borderColor: C.border, marginBottom: scale(20), overflow: 'hidden' },
  infoRow: { flexDirection: 'row', alignItems: 'center', padding: scale(16) },
  infoIcon: { marginRight: scale(14), backgroundColor: C.primaryLight, padding: scale(8), borderRadius: scale(10), overflow: 'hidden' },
  infoLabel: { fontSize: scale(12), color: C.textMuted, fontWeight: '600', marginBottom: scale(2) },
  infoValue: { fontSize: scale(14), color: C.ink, fontWeight: '700' },
  divider: { height: 1, backgroundColor: C.border, marginLeft: scale(56) },
  branchBadge: { marginTop: scale(6), backgroundColor: C.warningLight, alignSelf: 'flex-start', paddingHorizontal: scale(8), paddingVertical: scale(4), borderRadius: scale(6) },
  branchText: { fontSize: scale(11), color: C.warning, fontWeight: '700' },

  // Input Styles
  singleInputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.cardBg, borderRadius: scale(12), borderWidth: 1, borderColor: C.border, paddingHorizontal: scale(12), height: scale(48), marginBottom: scale(16) },
  inputIcon: { marginRight: scale(8) },
  singleInput: { flex: 1, fontSize: scale(14), color: C.ink },
  
  multiInputContainer: { backgroundColor: C.cardBg, borderRadius: scale(12), borderWidth: 1, borderColor: C.border, padding: scale(12), minHeight: scale(100), marginBottom: scale(16) },
  multiInput: { flex: 1, fontSize: scale(14), color: C.ink },

  footer: { backgroundColor: C.cardBg, borderTopWidth: 1, borderTopColor: C.border, paddingHorizontal: scale(20), paddingVertical: scale(14) },
  btnWrapper: { borderRadius: scale(12), overflow: 'hidden' },
  primaryBtn: { paddingVertical: scale(14), alignItems: 'center', borderRadius: scale(12) },
  primaryBtnText: { color: C.white, fontSize: scale(15), fontWeight: '800' },

  // Success View Styles
  successContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: scale(32) },
  successIconOuter: { width: scale(120), height: scale(120), borderRadius: scale(60), backgroundColor: C.primaryLight, alignItems: 'center', justifyContent: 'center', marginBottom: scale(32) },
  successIconInner: { width: scale(84), height: scale(84), borderRadius: scale(42), backgroundColor: C.white, alignItems: 'center', justifyContent: 'center', shadowColor: C.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 10, elevation: 5 },
  successTitle: { fontSize: scale(22), fontWeight: '900', color: C.ink, marginBottom: scale(12) },
  successSubtitle: { fontSize: scale(14), color: C.textSub, textAlign: 'center', lineHeight: scale(20), marginBottom: scale(24) },
  successMessage: { fontSize: scale(13), color: C.textMuted, textAlign: 'center', lineHeight: scale(18) },
  successFooter: { paddingHorizontal: scale(20), paddingBottom: scale(32), gap: scale(16) },
  ghostBtn: { paddingVertical: scale(14), alignItems: 'center' },
  ghostBtnText: { color: C.primary, fontSize: scale(15), fontWeight: '700' },
});