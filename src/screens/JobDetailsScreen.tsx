import React, { useState, useRef, useEffect, useMemo } from 'react';
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
import Geolocation from '@react-native-community/geolocation';
import { WebView } from 'react-native-webview';
import { useJobs, Job } from '../context/JobContext';
import { useAuth } from '../context/AuthContext';
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
  warningLight: '#fef3c7',
  warning: '#d97706',
};

const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  if (distance < 1) return `${(distance * 1000).toFixed(0)} m away`;
  return `${distance.toFixed(1)} km away`;
};

const ApplyJobScreen = ({ route, navigation }: any) => {
  const { job }: { job: Job & { rawDetails?: any } } = route.params;
  const { doctor } = useAuth();
  const { applyJob, isJobApplied } = useJobs();

  const isApplied = isJobApplied(job.id);

  const [note, setNote] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const details = job.rawDetails || {};

  useEffect(() => {
    Geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (error) => console.log('Location Error:', error.message),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );
  }, []);

  const handleConfirmApplication = async () => {
    try {
      const response = await api.post(`/api/doctors/jobs/${job.id}/apply`, {
        contact_number: doctor?.phone || '',
        note: note,
      });

      if (response.data && response.data.success) {
        applyJob(job);
        setIsSubmitted(true);
        Animated.parallel([
          Animated.spring(scaleAnim, { toValue: 1, friction: 4, tension: 50, useNativeDriver: true }),
          Animated.timing(opacityAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        ]).start();
      }
    } catch (error) {
      console.error("Error confirming application:", error);
    }
  };

  const handleBackToHome = () => navigation.popToTop();
  const handleViewAppliedShifts = () => navigation.navigate('SavedJobs');

  const formatDateString = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  };

  let distanceText = null;
  const jobCoords = details.hospital_details?.branch?.location?.coordinates || details.location?.coordinates;
  
  if (userLocation && jobCoords && jobCoords.length === 2) {
    distanceText = getDistance(userLocation.lat, userLocation.lng, jobCoords[1], jobCoords[0]);
  }

  // --- Generate Leaflet HTML with Routing Machine ---
  const leafletHtml = useMemo(() => {
    if (!userLocation || !jobCoords || jobCoords.length !== 2) return '';

    const jobLat = jobCoords[1];
    const jobLng = jobCoords[0];

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
          <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
          <link rel="stylesheet" href="https://unpkg.com/leaflet-routing-machine@latest/dist/leaflet-routing-machine.css" />
          <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
          <script src="https://unpkg.com/leaflet-routing-machine@latest/dist/leaflet-routing-machine.js"></script>
          <style>
            body, html { margin: 0; padding: 0; width: 100%; height: 100%; }
            #map { width: 100%; height: 100%; }
            /* Hide the turn-by-turn instruction panel to keep the map clean */
            .leaflet-routing-container { display: none !important; }
            .leaflet-control-attribution { font-size: 8px !important; }
          </style>
        </head>
        <body>
          <div id="map"></div>
          <script>
            var map = L.map('map', { zoomControl: false });
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
              maxZoom: 18,
              attribution: '© OpenStreetMap'
            }).addTo(map);

            L.Routing.control({
              waypoints: [
                L.latLng(${userLocation.lat}, ${userLocation.lng}),
                L.latLng(${jobLat}, ${jobLng})
              ],
              createMarker: function(i, wp, nWps) {
                if (i === 0) {
                  return L.marker(wp.latLng).bindPopup("<b>Your Location</b>");
                } else {
                  return L.marker(wp.latLng).bindPopup("<b>Hospital Location</b>");
                }
              },
              routeWhileDragging: false,
              addWaypoints: false,
              fitSelectedRoutes: true,
              showAlternatives: false,
              lineOptions: {
                styles: [{color: '#007b8e', opacity: 0.8, weight: 5}]
              }
            }).addTo(map);
          </script>
        </body>
      </html>
    `;
  }, [userLocation, jobCoords]);


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
          <Animated.View style={[styles.successIconOuter, { opacity: opacityAnim, transform: [{ scale: scaleAnim }] }]}>
            <View style={styles.successIconInner}>
              <Ionicons name="checkmark" size={scale(48)} color={C.primary} />
            </View>
          </Animated.View>

          <Animated.Text style={[styles.successTitle, { opacity: opacityAnim }]}>Application Submitted!</Animated.Text>
          <Animated.Text style={[styles.successSubtitle, { opacity: opacityAnim }]}>You have successfully applied{'\n'}for this shift.</Animated.Text>
          <Animated.Text style={[styles.successMessage, { opacity: opacityAnim }]}>You will be notified once the{'\n'}hospital responds.</Animated.Text>
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
          
          <View style={styles.jobCard}>
            <View style={styles.jobIconBox}>
              <Ionicons name="business-outline" size={scale(24)} color={C.primary} />
            </View>
            <View style={styles.jobMeta}>
              <Text style={styles.jobTitle}>{details.speciality || job.specialization}</Text>
              
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

              <Text style={styles.jobDetailText}>{details.location?.city || details.city}, {details.state}</Text>
              
              <View style={styles.tagsRow}>
                {details.hospital_details?.branch?.name && (
                  <View style={styles.branchBadge}>
                    <Text style={styles.branchText}>Branch: {details.hospital_details.branch.name}</Text>
                  </View>
                )}

                {distanceText && (
                  <View style={styles.distanceBadge}>
                    <Ionicons name="navigate-circle-outline" size={12} color={C.primary} style={{marginRight: 2}} />
                    <Text style={styles.distanceText}>{distanceText}</Text>
                  </View>
                )}
              </View>
            </View>
          </View>

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

          {/* New Map Section */}
          <Text style={styles.sectionTitle}>Directions</Text>
          <View style={styles.mapCard}>
            {leafletHtml ? (
              <WebView
                originWhitelist={['*']}
                source={{ html: leafletHtml }}
                style={styles.webviewMap}
                nestedScrollEnabled={true}
                scrollEnabled={false}
              />
            ) : (
              <View style={styles.noMapWrap}>
                <Ionicons name="map-outline" size={scale(32)} color={C.textMuted} />
                <Text style={styles.noMapText}>Waiting for location data...</Text>
              </View>
            )}
          </View>

          {!isApplied && (
            <>
              <Text style={styles.sectionTitle}>Apply</Text>
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
            </>
          )}

        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.footer}>
        {isApplied ? (
          <View style={[styles.primaryBtn, { backgroundColor: '#d1fae5', flexDirection: 'row', justifyContent: 'center' }]}>
            <Ionicons name="checkmark-circle" size={scale(18)} color={C.success} style={{ marginRight: scale(8) }} />
            <Text style={[styles.primaryBtnText, { color: C.success }]}>Applied</Text>
          </View>
        ) : (
          <TouchableOpacity style={styles.btnWrapper} activeOpacity={0.85} onPress={handleConfirmApplication}>
            <LinearGradient colors={['#00a8c2', '#007b8e']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.primaryBtn}>
              <Text style={styles.primaryBtnText}>Confirm Application</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
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
  
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: scale(6), marginTop: scale(4) },
  branchBadge: { backgroundColor: C.warningLight, alignSelf: 'flex-start', paddingHorizontal: scale(8), paddingVertical: scale(4), borderRadius: scale(6) },
  branchText: { fontSize: scale(11), color: C.warning, fontWeight: '700' },
  distanceBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.primaryLight, paddingHorizontal: scale(6), paddingVertical: scale(3), borderRadius: scale(6), alignSelf: 'flex-start' },
  distanceText: { fontSize: scale(11), color: C.primary, fontWeight: '700' },
  
  sectionTitle: { fontSize: scale(14), fontWeight: '800', color: C.ink, marginBottom: scale(12), marginTop: scale(8) },
  
  infoCard: { backgroundColor: C.cardBg, borderRadius: scale(16), borderWidth: 1, borderColor: C.border, marginBottom: scale(20), overflow: 'hidden' },
  infoRow: { flexDirection: 'row', alignItems: 'center', padding: scale(16) },
  infoIcon: { marginRight: scale(14), backgroundColor: C.primaryLight, padding: scale(8), borderRadius: scale(10), overflow: 'hidden' },
  infoLabel: { fontSize: scale(12), color: C.textMuted, fontWeight: '600', marginBottom: scale(2) },
  infoValue: { fontSize: scale(14), color: C.ink, fontWeight: '700' },
  divider: { height: 1, backgroundColor: C.border, marginLeft: scale(56) },

  // Map Styles
  mapCard: { height: scale(220), borderRadius: scale(16), overflow: 'hidden', borderWidth: 1, borderColor: C.border, backgroundColor: C.cardBg, marginBottom: scale(20) },
  webviewMap: { flex: 1, backgroundColor: 'transparent' },
  noMapWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: scale(8) },
  noMapText: { fontSize: scale(13), color: C.textMuted, fontWeight: '600' },

  multiInputContainer: { backgroundColor: C.cardBg, borderRadius: scale(12), borderWidth: 1, borderColor: C.border, padding: scale(12), minHeight: scale(100), marginBottom: scale(16) },
  multiInput: { flex: 1, fontSize: scale(14), color: C.ink },

  footer: { backgroundColor: C.cardBg, borderTopWidth: 1, borderTopColor: C.border, paddingHorizontal: scale(20), paddingVertical: scale(14) },
  btnWrapper: { borderRadius: scale(12), overflow: 'hidden' },
  primaryBtn: { paddingVertical: scale(14), alignItems: 'center', borderRadius: scale(12) },
  primaryBtnText: { color: C.white, fontSize: scale(15), fontWeight: '800' },

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