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
import { useJobs } from '../context/JobContext';
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
  successLight: '#d1fae5',
  warningLight: '#ffedd5',
  warning: '#fb923c',
  errorLight: '#fee2e2',
  error: '#f87171',
};

const getMatchStyle = (match: number) => {
  if (match >= 75) return { color: '#007b8e', bg: '#dcfce7' };
  if (match >= 50) return { color: '#fb923c', bg: '#ffedd5' };
  return { color: '#f87171', bg: '#fee2e2' };
};

const getDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  if (distance < 1) return `${(distance * 1000).toFixed(0)} m away`;
  return `${distance.toFixed(1)} km away`;
};

const JobDetailsScreen = ({ route, navigation }: any) => {
  const jobParam = route.params?.job;
  const jobDetailsParam = route.params?.jobDetails;
  
  const isAssigned = route.params?.isAssigned || false;
  const jobStatus = route.params?.jobStatus; 
  
  const isCancelled = jobStatus === 'Cancelled';
  const isInvited = jobStatus === 'Invited';
  
  const details = jobParam?.rawDetails || jobDetailsParam || {};
  const pipelineStatus = details.pipeline_status;
  const doctorResponse = details.doctor_response;

  const isNotInterested = doctorResponse === 'Not Interested' || pipelineStatus === 'Drop';
  const isInterested = doctorResponse === 'Interested' || pipelineStatus === 'Interested' || jobStatus === 'Interested';
  
  const shiftStartDate = details.assignment_info?.assigned_from || details.shift_start_date;
  const shiftEndDate = details.assignment_info?.assigned_to || details.shift_end_date || details.assignment_info?.assigned_from || details.shift_start_date;
  
  const isDateExpired = shiftEndDate ? (new Date(shiftEndDate).setHours(0,0,0,0) < new Date().setHours(0,0,0,0)) : false;

  const isInvitationExpired = pipelineStatus === 'Expired' || details.vacancy_status === 'Closed' || isDateExpired;

  const jobId = jobParam?.id || details._id || details.requirement_id;
  const invitationId = details.invitation_id;
  
  const declineReasonText = details.assignment_info?.decline_reason || details.decline_reason || '';
  const { doctor } = useAuth();
  const { applyJob, isJobApplied } = useJobs();

  const isApplied = isJobApplied(jobId);

  const canApply = !isCancelled && !isNotInterested && !isInvitationExpired && !isAssigned && !isApplied && !isInterested;

  const [note, setNote] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const matchPercentage =
    jobParam?.matchPercentage || details.matchPercentage || 100;
  const criteria = jobParam?.matchedCriteria || details.matchedCriteria || {};

  const matchStyle = getMatchStyle(matchPercentage);

  useEffect(() => {
    Geolocation.getCurrentPosition(
      position => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      error => console.log('Location Error:', error.message),
      { 
        enableHighAccuracy: false, 
        timeout: 10000, 
        maximumAge: 60000 
      },
    );
  }, []);

  const handleConfirmApplication = async () => {
    try {
      const response = await api.post(`/api/doctors/jobs/${jobId}/apply`, {
        contact_number: doctor?.phone || '',
        note: note,
      });

      if (response.data && response.data.success) {
        if (jobParam) applyJob(jobParam);
        setIsSubmitted(true);
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
      }
    } catch (error) {
      console.error('Error confirming application:', error);
    }
  };

  const handleRespondToInvitation = async (responseStatus: 'Interested' | 'Not Interested') => {
    if (!invitationId) return;
    try {
      const response = await api.post('/api/doctors/invited-jobs/respond', {
        invitation_id: invitationId,
        response: responseStatus
      });
      if (response.data.success) {
         navigation.goBack();
      }
    } catch (error) {
      console.error('Error responding to invitation:', error);
    }
  };

  const handleBackToHome = () => navigation.popToTop();
  const handleViewAppliedShifts = () => navigation.navigate('SavedJobs');

  const formatDateString = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatShortDate = (dateString: string) => {
    if (!dateString) return '';
    const options: Intl.DateTimeFormatOptions = {
      day: '2-digit',
      month: 'short',
    };
    return new Date(dateString).toLocaleDateString('en-GB', options);
  };

  let distanceText = null;
  const jobCoords =
    details.hospital_details?.branch?.location?.coordinates ||
    details.location?.coordinates;

  if (userLocation && jobCoords && jobCoords.length === 2) {
    distanceText = getDistance(
      userLocation.lat,
      userLocation.lng,
      jobCoords[1],
      jobCoords[0],
    );
  }

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
          <Animated.View
            style={[
              styles.successIconOuter,
              { opacity: opacityAnim, transform: [{ scale: scaleAnim }] },
            ]}
          >
            <View style={styles.successIconInner}>
              <Ionicons name="checkmark" size={scale(48)} color={C.primary} />
            </View>
          </Animated.View>

          <Animated.Text
            style={[styles.successTitle, { opacity: opacityAnim }]}
          >
            Application Submitted!
          </Animated.Text>
          <Animated.Text
            style={[styles.successSubtitle, { opacity: opacityAnim }]}
          >
            You have successfully applied{'\n'}for this shift.
          </Animated.Text>
          <Animated.Text
            style={[styles.successMessage, { opacity: opacityAnim }]}
          >
            You will be notified once the{'\n'}hospital responds.
          </Animated.Text>
        </View>

        <View style={styles.successFooter}>
          <TouchableOpacity
            style={styles.btnWrapper}
            activeOpacity={0.85}
            onPress={handleBackToHome}
          >
            <LinearGradient
              colors={['#00a8c2', '#007b8e']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.primaryBtn}
            >
              <Text style={styles.primaryBtnText}>Back to Home</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.ghostBtn}
            onPress={handleViewAppliedShifts}
          >
            <Text style={styles.ghostBtnText}>View Applied Shifts</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const assignedDates = details.assignment_info?.assigned_dates || details.assigned_dates || [];
  const hasIndividualDates = assignedDates.length > 0;

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor={C.cardBg} />

      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.iconBtn}
        >
          <Ionicons name="arrow-back" size={scale(24)} color={C.ink} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isAssigned || isInvited ? 'Duty Details' : 'Shift Details'}
        </Text>
        <View style={{ width: scale(32) }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.jobCard}>
            
              <View style={[styles.jobIconBox, { marginRight: scale(16) }]}>
                <Ionicons
                  name="business-outline"
                  size={scale(24)}
                  color={matchStyle.color}
                />
              </View>
             

            <View style={styles.jobMeta}>
              <Text style={styles.jobTitle}>
                {details.speciality || jobParam?.specialization}
              </Text>

              <Text style={[styles.jobHospital, { paddingVertical: scale(2) }]}>
                {details.hospital_name ||
                  jobParam?.hospital ||
                  details.hospital_details?.hospital_name}
              </Text>

              <Text style={styles.jobDetailText}>
                {details.location?.city || details.city}, {details.state}
              </Text>

              <View style={styles.tagsRow}>
                {details.hospital_details?.branch?.name && (
                  <View style={styles.branchBadge}>
                    <Text style={styles.branchText}>
                      Branch: {details.hospital_details.branch.name}
                    </Text>
                  </View>
                )}

                {distanceText && (
                  <View style={styles.distanceBadge}>
                    <Ionicons
                      name="navigate-circle-outline"
                      size={12}
                      color={C.primary}
                      style={{ marginRight: 2 }}
                    />
                    <Text style={styles.distanceText}>{distanceText}</Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          <Text style={styles.sectionTitle}>
            {isAssigned ? 'Confirmed Schedule' : isInvited ? 'Proposed Schedule' : 'Schedule & Timings'}
          </Text>
          <View style={styles.infoCard}>
            <View
              style={[
                styles.infoRow,
                (isAssigned || isInvited) &&
                  hasIndividualDates && { alignItems: 'flex-start' },
              ]}
            >
              <Ionicons
                name="calendar-outline"
                size={scale(18)}
                color={C.primary}
                style={styles.infoIcon}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.infoLabel}>
                  {isAssigned || isInvited ? 'Dates' : 'Dates'}
                </Text>

                {(isAssigned || isInvited) && hasIndividualDates ? (
                  <View style={styles.dateChipContainer}>
                    {assignedDates.map((d: string) => (
                      <View key={d} style={styles.dateChip}>
                        <Text style={styles.dateChipText}>
                          {formatShortDate(d)}
                        </Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.infoValue}>
                    {isAssigned || isInvited
                      ? `${formatDateString(
                          details.assignment_info?.assigned_from || details.assigned_from ||
                            details.shift_start_date,
                        )} - ${formatDateString(
                          details.assignment_info?.assigned_to || details.assigned_to ||
                            details.shift_end_date,
                        )}`
                      : `${formatDateString(
                          details.shift_start_date,
                        )} - ${formatDateString(details.shift_end_date)}`}
                  </Text>
                )}
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <Ionicons
                name="time-outline"
                size={scale(18)}
                color={C.primary}
                style={styles.infoIcon}
              />
              <View>
                <Text style={styles.infoLabel}>Duty Timing</Text>
                <Text style={styles.infoValue}>
                  {details.duty_from_time || 'N/A'} to{' '}
                  {details.duty_to_time || 'N/A'}
                  {details.total_shift_hours
                    ? ` (${details.total_shift_hours} Hrs Total)`
                    : ''}
                </Text>
              </View>
            </View>
          </View>

          {(!isAssigned && !isInvited) && (
            <>
              <Text style={styles.sectionTitle}>Requirements & Pay</Text>
              <View style={styles.infoCard}>
                <View style={styles.infoRow}>
                  <Ionicons
                    name="medkit-outline"
                    size={scale(18)}
                    color={C.primary}
                    style={styles.infoIcon}
                  />
                  <View>
                    <Text style={styles.infoLabel}>Department</Text>
                    <Text style={styles.infoValue}>
                      {details.department || 'General'} (
                      {details.doctor_type || 'Any'} required)
                    </Text>
                  </View>
                </View>
                <View style={styles.divider} />
                <View style={styles.infoRow}>
                  <Ionicons
                    name="cash-outline"
                    size={scale(18)}
                    color={C.success}
                    style={styles.infoIcon}
                  />
                  <View>
                    <Text style={styles.infoLabel}>Compensation</Text>
                    <Text
                      style={[
                        styles.infoValue,
                        { color: C.success, fontWeight: '800' },
                      ]}
                    >
                      ₹{details.offered_rate || '0'}{' '}
                      <Text style={{ fontWeight: '500', fontSize: scale(12) }}>
                        {details.billing_shift_type || 'Per Shift'}
                      </Text>
                    </Text>
                  </View>
                </View>
                <View style={styles.divider} />
                <View style={styles.infoRow}>
                  <Ionicons
                    name="people-outline"
                    size={scale(18)}
                    color={C.primary}
                    style={styles.infoIcon}
                  />
                  <View>
                    <Text style={styles.infoLabel}>Openings</Text>
                    <Text style={styles.infoValue}>
                      {details.openings || 1} Position(s) |{' '}
                      {details.shifts_required || 1} Shifts Required
                    </Text>
                  </View>
                </View>
              </View>
            </>
          )}

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
                <Ionicons
                  name="map-outline"
                  size={scale(32)}
                  color={C.textMuted}
                />
                <Text style={styles.noMapText}>
                  Waiting for location data...
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.footer}>
        {isCancelled ? (
          <View style={{ gap: scale(8) }}>
            <View style={[styles.primaryBtn, { backgroundColor: C.errorLight, flexDirection: 'row', justifyContent: 'center' }]}>
              <Ionicons name="close-circle" size={scale(18)} color={C.error} style={{ marginRight: scale(8) }} />
              <Text style={[styles.primaryBtnText, { color: C.error }]}>Duty Cancelled</Text>
            </View>
            {!!declineReasonText && (
              <Text style={{ textAlign: 'center', color: '#b91c1c', fontSize: scale(13), fontWeight: '600' }}>
                Reason: {declineReasonText}
              </Text>
            )}
          </View>

        ) : isNotInterested ? (
          <View style={[styles.primaryBtn, { backgroundColor: C.errorLight, flexDirection: 'row', justifyContent: 'center' }]}>
            <Ionicons name="close-circle" size={scale(18)} color={C.error} style={{ marginRight: scale(8) }} />
            <Text style={[styles.primaryBtnText, { color: C.error }]}>Not Interested</Text>
          </View>

        ) : isInvitationExpired ? (
          <View style={[styles.primaryBtn, { backgroundColor: C.inputBg, flexDirection: 'row', justifyContent: 'center' }]}>
            <Ionicons name="time-outline" size={scale(18)} color={C.textMuted} style={{ marginRight: scale(8) }} />
            <Text style={[styles.primaryBtnText, { color: C.textSub }]}>Expired</Text>
          </View>

        ) : isAssigned ? (
          <View
            style={[
              styles.primaryBtn,
              {
                backgroundColor: '#d1fae5',
                flexDirection: 'row',
                justifyContent: 'center',
              },
            ]}
          >
            <Ionicons
              name="checkmark-done-circle"
              size={scale(18)}
              color={C.success}
              style={{ marginRight: scale(8) }}
            />
            <Text style={[styles.primaryBtnText, { color: C.success }]}>
              {jobStatus === 'Past' ? 'Duty Completed' : 'Duty Assigned'}
            </Text>
          </View>

        ) : isInterested ? (
          <View
            style={[
              styles.primaryBtn,
              {
                backgroundColor: C.primaryLight,
                flexDirection: 'row',
                justifyContent: 'center',
              },
            ]}
          >
            <Ionicons
              name="checkmark-circle"
              size={scale(18)}
              color={C.primary}
              style={{ marginRight: scale(8) }}
            />
            <Text style={[styles.primaryBtnText, { color: C.primary }]}>
              Interested
            </Text>
          </View>
          
        ) : isApplied ? (
          <View
            style={[
              styles.primaryBtn,
              {
                backgroundColor: '#d1fae5',
                flexDirection: 'row',
                justifyContent: 'center',
              },
            ]}
          >
            <Ionicons
              name="checkmark-circle"
              size={scale(18)}
              color={C.success}
              style={{ marginRight: scale(8) }}
            />
            <Text style={[styles.primaryBtnText, { color: C.success }]}>
              Applied
            </Text>
          </View>
          
        ) : isInvited ? (
          <View style={{ flexDirection: 'row', gap: scale(12) }}>
            <TouchableOpacity
              style={[styles.primaryBtn, { flex: 1, backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#EF4444' }]}
              activeOpacity={0.8}
              onPress={() => handleRespondToInvitation('Not Interested')}
            >
              <Text style={[styles.primaryBtnText, { color: '#EF4444' }]}>Decline</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.primaryBtn, { flex: 1, backgroundColor: C.primary, borderWidth: 1, borderColor: C.primary }]}
              activeOpacity={0.8}
              onPress={() => handleRespondToInvitation('Interested')}
            >
              <Text style={styles.primaryBtnText}>Interested</Text>
            </TouchableOpacity>
          </View>

        ) : (
          <TouchableOpacity
            style={styles.btnWrapper}
            activeOpacity={0.85}
            onPress={handleConfirmApplication}
          >
            <LinearGradient
              colors={['#00a8c2', '#007b8e']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.primaryBtn}
            >
              <Text style={styles.primaryBtnText}>Confirm Application</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
};

export default JobDetailsScreen;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(16),
    paddingVertical: scale(14),
    backgroundColor: C.cardBg,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  iconBtn: { padding: scale(4) },
  headerTitle: { fontSize: scale(16), fontWeight: '800', color: C.ink },
  scrollContent: { padding: scale(20), paddingBottom: scale(40) },

  jobCard: {
    flexDirection: 'row',
    backgroundColor: C.cardBg,
    padding: scale(16),
    borderRadius: scale(16),
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: scale(24),
    alignItems: 'center',
  },

  matchRing: {
    width: scale(64),
    height: scale(64),
    borderRadius: scale(32),
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: scale(16),
    position: 'relative',
  },
  jobIconBox: {
    width: scale(52),
    height: scale(52),
    borderRadius: scale(26),
    backgroundColor: C.inputBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  matchPercentPill: {
    position: 'absolute',
    bottom: scale(-10),
    paddingHorizontal: scale(8),
    paddingVertical: scale(2),
    borderRadius: scale(10),
    borderWidth: 2,
    borderColor: C.white,
  },
  matchPercentText: {
    fontSize: scale(10),
    fontWeight: '900',
    color: C.white,
  },

  jobMeta: { flex: 1, gap: scale(2) },
  jobTitle: { fontSize: scale(15), fontWeight: '800', color: C.ink },
  jobHospital: { fontSize: scale(13), color: C.textSub, fontWeight: '600' },
  jobDetailText: { fontSize: scale(12), color: C.textMuted },

  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scale(6),
    marginTop: scale(4),
  },
  branchBadge: {
    backgroundColor: '#fef3c7',
    alignSelf: 'flex-start',
    paddingHorizontal: scale(8),
    paddingVertical: scale(4),
    borderRadius: scale(6),
  },
  branchText: { fontSize: scale(11), color: '#d97706', fontWeight: '700' },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.primaryLight,
    paddingHorizontal: scale(6),
    paddingVertical: scale(3),
    borderRadius: scale(6),
    alignSelf: 'flex-start',
  },
  distanceText: { fontSize: scale(11), color: C.primary, fontWeight: '700' },

  sectionTitle: {
    fontSize: scale(14),
    fontWeight: '800',
    color: C.ink,
    marginBottom: scale(12),
    marginTop: scale(8),
  },

  infoCard: {
    backgroundColor: C.cardBg,
    borderRadius: scale(16),
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: scale(20),
    overflow: 'hidden',
  },

  infoRow: { flexDirection: 'row', alignItems: 'center', padding: scale(16) },
  infoIcon: {
    marginRight: scale(14),
    backgroundColor: C.primaryLight,
    padding: scale(8),
    borderRadius: scale(10),
    overflow: 'hidden',
  },
  infoLabel: {
    fontSize: scale(12),
    color: C.textMuted,
    fontWeight: '600',
    marginBottom: scale(2),
  },
  infoValue: { fontSize: scale(14), color: C.ink, fontWeight: '700' },
  divider: { height: 1, backgroundColor: C.border, marginLeft: scale(56) },

  dateChipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scale(6),
    marginTop: scale(4),
  },
  dateChip: {
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingHorizontal: scale(8),
    paddingVertical: scale(4),
    borderRadius: scale(6),
  },
  dateChipText: { fontSize: scale(12), fontWeight: '600', color: C.ink },

  mapCard: {
    height: scale(220),
    borderRadius: scale(16),
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.cardBg,
    marginBottom: scale(20),
  },
  webviewMap: { flex: 1, backgroundColor: 'transparent' },
  noMapWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(8),
  },
  noMapText: { fontSize: scale(13), color: C.textMuted, fontWeight: '600' },

  multiInputContainer: {
    backgroundColor: C.cardBg,
    borderRadius: scale(12),
    borderWidth: 1,
    borderColor: C.border,
    padding: scale(12),
    minHeight: scale(100),
    marginBottom: scale(16),
  },
  multiInput: { flex: 1, fontSize: scale(14), color: C.ink },

  footer: {
    backgroundColor: C.cardBg,
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingHorizontal: scale(20),
    paddingVertical: scale(14),
  },
  btnWrapper: { borderRadius: scale(12), overflow: 'hidden' },
  primaryBtn: {
    paddingVertical: scale(14),
    alignItems: 'center',
    borderRadius: scale(12),
  },
  primaryBtnText: { color: C.white, fontSize: scale(15), fontWeight: '800' },

  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: scale(32),
  },
  successIconOuter: {
    width: scale(120),
    height: scale(120),
    borderRadius: scale(60),
    backgroundColor: C.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scale(32),
  },
  successIconInner: {
    width: scale(84),
    height: scale(84),
    borderRadius: scale(42),
    backgroundColor: C.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },
  successTitle: {
    fontSize: scale(22),
    fontWeight: '900',
    color: C.ink,
    marginBottom: scale(12),
  },
  successSubtitle: {
    fontSize: scale(14),
    color: C.textSub,
    textAlign: 'center',
    lineHeight: scale(20),
    marginBottom: scale(24),
  },
  successMessage: {
    fontSize: scale(13),
    color: C.textMuted,
    textAlign: 'center',
    lineHeight: scale(18),
  },
  successFooter: {
    paddingHorizontal: scale(20),
    paddingBottom: scale(32),
    gap: scale(16),
  },
  ghostBtn: { paddingVertical: scale(14), alignItems: 'center' },
  ghostBtnText: { color: C.primary, fontSize: scale(15), fontWeight: '700' },
});