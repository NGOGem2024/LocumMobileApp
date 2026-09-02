import React, { useState, useRef, useEffect } from 'react';
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
};

const ApplyJobScreen = ({ route, navigation }: any) => {
  const { job }: { job: Job } = route.params;
  const { doctor } = useAuth();
  const { applyJob } = useJobs();

  // Form Fields
  const [contactNumber, setContactNumber] = useState(doctor?.phone || '');
  const [note, setNote] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Animation Values
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  // Fallbacks for doctor details
  const doctorName = doctor?.full_name ? `Dr. ${doctor.full_name}` : 'Dr. Rahul Sharma';
  const doctorQualifications = doctor?.qualifications || 'MBBS - 5 Years Exp.';

  const handleConfirmApplication = () => {
    // 1. Mark job as applied in context
    applyJob(job);
    
    // 2. Switch to success view
    setIsSubmitted(true);

    // 3. Trigger the success animation
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4, // Lower friction = more bounciness
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
    navigation.popToTop(); // Go all the way back to HomeScreen
  };

  const handleViewAppliedShifts = () => {
    navigation.navigate('SavedJobs');
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
          {/* Animated Checkmark Bubble */}
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
        <Text style={styles.headerTitle}>Apply for this Shift</Text>
        <View style={{ width: scale(32) }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          {/* Job Summary Card */}
          <View style={styles.jobCard}>
            <View style={styles.jobIconBox}>
              <Ionicons name="business-outline" size={scale(24)} color={C.primary} />
            </View>
            <View style={styles.jobMeta}>
              <Text style={styles.jobTitle}>{job.specialization}</Text>
              <Text style={styles.jobHospital}>{job.hospital}</Text>
              <Text style={styles.jobDetailText}>{job.location}</Text>
              <Text style={styles.jobDetailText}>{job.date}</Text>
            </View>
          </View>

          {/* User Details */}
          <Text style={styles.sectionTitle}>Your Profile</Text>
          <View style={styles.userCard}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={scale(20)} color={C.white} />
            </View>
            <View>
              <Text style={styles.userName}>{doctorName}</Text>
              <Text style={styles.userQual}>{doctorQualifications}</Text>
            </View>
          </View>

          {/* Contact Number Field */}
          <Text style={styles.sectionTitle}>Contact Number</Text>
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

          {/* Optional Note Field */}
          <Text style={styles.sectionTitle}>Your Note (Optional)</Text>
          <View style={styles.multiInputContainer}>
            <TextInput
              style={styles.multiInput}
              placeholder="Any specific requests or availability notes?"
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
          disabled={!contactNumber.trim()} // Prevent submission if no phone number
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
  
  userCard: { flexDirection: 'row', alignItems: 'center', marginBottom: scale(16) },
  avatar: { width: scale(48), height: scale(48), borderRadius: scale(24), backgroundColor: '#9CA3AF', alignItems: 'center', justifyContent: 'center', marginRight: scale(12) },
  userName: { fontSize: scale(14), fontWeight: '700', color: C.ink },
  userQual: { fontSize: scale(12), color: C.textMuted, marginTop: scale(2) },

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