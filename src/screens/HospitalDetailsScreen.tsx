import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  ScrollView,
  ActivityIndicator,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { WebView } from 'react-native-webview';
import Geolocation from '@react-native-community/geolocation';
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
  warning: '#f59e0b',
  warningLight: '#fef3c7',
};

// --- Types based on Hospital.js Schema ---
type Branch = {
  _id: string;
  branch_name: string;
  is_primary: boolean;
  address_line?: string;
  city: string;
  state: string;
  pincode: string;
  location?: {
    type: string;
    coordinates: [number, number]; // [Longitude, Latitude]
  };
};

type HRContact = {
  _id: string;
  name: string;
  designation?: string;
  mobile_number: string;
  whatsapp_number?: string;
  email: string;
  is_primary: boolean;
};

type HospitalData = {
  _id: string;
  hospital_unique_id: string;
  hospital_name: string;
  category: string;
  partnership_status: string;
  email?: string;
  phone_number?: string;
  website_url?: string;
  description?: string;
  no_of_beds: number;
  status: string;
  branches: Branch[];
  hr_contacts: HRContact[];
};

// --- Distance Calculation Helper ---
const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; // Radius of the Earth in km
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

  if (distance < 1) {
    return `${(distance * 1000).toFixed(0)} m away`;
  }
  return `${distance.toFixed(1)} km away`;
};

const HospitalDetailsScreen = ({ route, navigation }: any) => {
  const { hospitalId } = route.params;
  const [hospital, setHospital] = useState<HospitalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  // 1. Fetch Hospital Data
  useEffect(() => {
    const fetchHospital = async () => {
      try {
        const response = await api.get(`/api/hospital/${hospitalId}`);
        if (response.data.success) {
          setHospital(response.data.data);
        } else {
          setError(response.data.message || 'Hospital not found');
        }
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to load hospital');
      } finally {
        setLoading(false);
      }
    };

    fetchHospital();
  }, [hospitalId]);

  // 2. Fetch User Location
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

  // Determine Primary Branch
  const primaryBranch = useMemo(() => {
    if (!hospital?.branches?.length) return null;
    return hospital.branches.find((b) => b.is_primary) || hospital.branches[0];
  }, [hospital]);

  // Open Native Maps App
  const openNavigation = (branch: Branch) => {
    if (!branch.location?.coordinates) return;
    const [lng, lat] = branch.location.coordinates;
    const label = encodeURIComponent(branch.branch_name);
    const url = Platform.select({
      ios: `maps:0,0?q=${label}@${lat},${lng}`,
      android: `geo:0,0?q=${lat},${lng}(${label})`,
    });
    if (url) Linking.openURL(url).catch(() => {});
  };

  // Generate Leaflet Map HTML
  const leafletHtml = useMemo(() => {
    if (!hospital?.branches?.length) return '';

    const validBranches = hospital.branches.filter(
      (b) => b.location?.coordinates && b.location.coordinates.length === 2
    );

    if (validBranches.length === 0) return '';

    const centerLat = primaryBranch?.location?.coordinates[1] || validBranches[0].location!.coordinates[1];
    const centerLng = primaryBranch?.location?.coordinates[0] || validBranches[0].location!.coordinates[0];

    const markersJs = validBranches
      .map((b) => {
        const [lng, lat] = b.location!.coordinates;
        return `
          L.marker([${lat}, ${lng}])
            .addTo(map)
            .bindPopup("<b>${b.branch_name.replace(/"/g, '\\"')}</b><br/>${b.city}, ${b.state}");
        `;
      })
      .join('\n');

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
          <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
          <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
          <style>
            body, html { margin: 0; padding: 0; width: 100%; height: 100%; }
            #map { width: 100%; height: 100%; }
            .leaflet-control-attribution { font-size: 8px !important; }
          </style>
        </head>
        <body>
          <div id="map"></div>
          <script>
            var map = L.map('map', { zoomControl: true }).setView([${centerLat}, ${centerLng}], 12);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
              maxZoom: 18,
              attribution: '© OpenStreetMap'
            }).addTo(map);

            ${markersJs}
          </script>
        </body>
      </html>
    `;
  }, [hospital, primaryBranch]);

  if (loading) {
    return (
      <SafeAreaView style={styles.centerRoot}>
        <ActivityIndicator size="large" color={C.primary} />
      </SafeAreaView>
    );
  }

  if (error || !hospital) {
    return (
      <SafeAreaView style={styles.centerRoot}>
        <Ionicons name="alert-circle-outline" size={scale(48)} color={C.warning} />
        <Text style={styles.errorText}>{error || 'No hospital found'}</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtnFallback}>
          <Text style={styles.backBtnFallbackText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor={C.cardBg} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={scale(24)} color={C.ink} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Hospital Details</Text>
        <View style={{ width: scale(32) }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Hospital Info Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.logoBox}>
              <Ionicons name="business" size={scale(26)} color={C.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.hospitalName}>{hospital.hospital_name}</Text>
              <Text style={styles.hospitalId}>{hospital.hospital_unique_id}</Text>
            </View>
          </View>

          <View style={styles.tagsContainer}>
            <View style={styles.tag}>
              <Text style={styles.tagText}>{hospital.category}</Text>
            </View>
            <View style={[styles.tag, { backgroundColor: hospital.status === 'Active' ? C.successLight : C.warningLight }]}>
              <Text style={[styles.tagText, { color: hospital.status === 'Active' ? C.success : C.warning }]}>
                {hospital.status}
              </Text>
            </View>
            {hospital.no_of_beds > 0 && (
              <View style={[styles.tag, { backgroundColor: C.inputBg }]}>
                <Ionicons name="bed-outline" size={scale(12)} color={C.textSub} style={{ marginRight: 4 }} />
                <Text style={styles.tagText}>{hospital.no_of_beds} Beds</Text>
              </View>
            )}
          </View>
        </View>

        {/* Location & Map Section */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Hospital Location</Text>
          {primaryBranch && (
            <TouchableOpacity onPress={() => openNavigation(primaryBranch)} style={styles.directionBtn}>
              <Ionicons name="navigate-outline" size={14} color={C.primary} />
              <Text style={styles.directionBtnText}>Open Maps</Text>
            </TouchableOpacity>
          )}
        </View>

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
              <Text style={styles.noMapText}>No GPS coordinates available</Text>
            </View>
          )}
        </View>

        {/* Branch Details */}
        <Text style={styles.sectionTitle}>Branches ({hospital.branches.length})</Text>
        {hospital.branches.map((branch, idx) => {
          
          let distanceText = null;
          if (userLocation && branch.location?.coordinates) {
            const branchLng = branch.location.coordinates[0];
            const branchLat = branch.location.coordinates[1];
            distanceText = getDistance(userLocation.lat, userLocation.lng, branchLat, branchLng);
          }

          return (
            <View key={branch._id || idx} style={styles.branchCard}>
              <View style={styles.branchHeader}>
                <Ionicons
                  name={branch.is_primary ? 'star' : 'location'}
                  size={16}
                  color={branch.is_primary ? C.warning : C.primary}
                />
                <Text style={styles.branchName}>{branch.branch_name}</Text>
                
                {branch.is_primary && (
                  <View style={styles.primaryBadge}>
                    <Text style={styles.primaryBadgeText}>HQ</Text>
                  </View>
                )}

                {distanceText && (
                  <View style={styles.distanceBadge}>
                    <Ionicons name="navigate-circle-outline" size={12} color={C.primary} style={{marginRight: 2}} />
                    <Text style={styles.distanceText}>{distanceText}</Text>
                  </View>
                )}
              </View>

              <Text style={styles.addressText}>
                {branch.address_line ? `${branch.address_line}\n` : ''}
                {branch.city}, {branch.state} - {branch.pincode}
              </Text>

              {branch.location?.coordinates && (
                <TouchableOpacity style={styles.branchNavBtn} onPress={() => openNavigation(branch)}>
                  <Ionicons name="navigate" size={13} color={C.primary} />
                  <Text style={styles.branchNavBtnText}>Navigate to Branch</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })}

        {/* HR Contacts */}
        {hospital.hr_contacts.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>HR Contacts</Text>
            {hospital.hr_contacts.map((hr, index) => (
              <View key={hr._id || index} style={styles.hrCard}>
                <View style={styles.hrAvatar}>
                  <Text style={styles.hrInitials}>{hr.name.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={styles.hrInfo}>
                  <Text style={styles.hrName}>{hr.name}</Text>
                  {hr.designation && <Text style={styles.hrDesig}>{hr.designation}</Text>}
                  <Text style={styles.hrDetail}>
                    <Ionicons name="call-outline" size={12} /> {hr.mobile_number}
                  </Text>
                  <Text style={styles.hrDetail}>
                    <Ionicons name="mail-outline" size={12} /> {hr.email}
                  </Text>
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default HospitalDetailsScreen;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background },
  centerRoot: { flex: 1, backgroundColor: C.background, alignItems: 'center', justifyContent: 'center' },
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

  card: {
    backgroundColor: C.cardBg,
    borderRadius: scale(16),
    borderWidth: 1,
    borderColor: C.border,
    padding: scale(16),
    marginBottom: scale(20),
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: scale(14) },
  logoBox: {
    width: scale(52),
    height: scale(52),
    borderRadius: scale(12),
    backgroundColor: C.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: scale(14),
  },
  hospitalName: { fontSize: scale(17), fontWeight: '900', color: C.ink, marginBottom: scale(2) },
  hospitalId: { fontSize: scale(12), color: C.textMuted, fontWeight: '600' },
  tagsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: scale(8) },
  tag: {
    backgroundColor: C.primaryLight,
    paddingHorizontal: scale(10),
    paddingVertical: scale(6),
    borderRadius: scale(8),
    flexDirection: 'row',
    alignItems: 'center',
  },
  tagText: { color: C.primary, fontSize: scale(12), fontWeight: '700' },

  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scale(12),
  },
  sectionTitle: { fontSize: scale(15), fontWeight: '800', color: C.ink, marginBottom: scale(12) },
  directionBtn: { flexDirection: 'row', alignItems: 'center', gap: scale(4) },
  directionBtnText: { fontSize: scale(13), color: C.primary, fontWeight: '700' },

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
  noMapWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: scale(8) },
  noMapText: { fontSize: scale(13), color: C.textMuted, fontWeight: '600' },

  branchCard: {
    backgroundColor: C.cardBg,
    borderRadius: scale(14),
    borderWidth: 1,
    borderColor: C.border,
    padding: scale(14),
    marginBottom: scale(12),
  },
  branchHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: scale(6), gap: scale(6), flexWrap: 'wrap' },
  branchName: { fontSize: scale(14), fontWeight: '700', color: C.ink, flex: 1 },
  primaryBadge: { backgroundColor: C.warningLight, paddingHorizontal: scale(6), paddingVertical: scale(2), borderRadius: scale(4) },
  primaryBadgeText: { fontSize: scale(10), color: C.warning, fontWeight: '800' },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.primaryLight,
    paddingHorizontal: scale(6),
    paddingVertical: scale(3),
    borderRadius: scale(6),
    marginLeft: scale(8),
  },
  distanceText: { fontSize: scale(11), color: C.primary, fontWeight: '700' },
  addressText: { fontSize: scale(12), color: C.textSub, lineHeight: scale(18) },
  branchNavBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
    marginTop: scale(10),
    paddingTop: scale(8),
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  branchNavBtnText: { fontSize: scale(12), color: C.primary, fontWeight: '700' },

  hrCard: {
    flexDirection: 'row',
    backgroundColor: C.cardBg,
    borderRadius: scale(12),
    borderWidth: 1,
    borderColor: C.border,
    padding: scale(12),
    marginBottom: scale(10),
    alignItems: 'center',
  },
  hrAvatar: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(22),
    backgroundColor: C.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: scale(12),
  },
  hrInitials: { fontSize: scale(16), fontWeight: '800', color: C.primary },
  hrInfo: { flex: 1 },
  hrName: { fontSize: scale(14), fontWeight: '800', color: C.ink },
  hrDesig: { fontSize: scale(12), color: C.textSub, marginBottom: scale(2) },
  hrDetail: { fontSize: scale(11), color: C.textMuted, marginTop: scale(2) },

  errorText: { fontSize: scale(14), color: C.ink, marginTop: scale(14), marginBottom: scale(20) },
  backBtnFallback: { paddingHorizontal: scale(18), paddingVertical: scale(10), backgroundColor: C.inputBg, borderRadius: scale(8) },
  backBtnFallbackText: { fontSize: scale(13), fontWeight: '700', color: C.ink },
});