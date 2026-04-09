import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { DoctorService } from '../services/Doctorservice';
import { Doctor } from '../types/Doctor';

interface Props {
  onRegisterNew: () => void;
}

const SPECIALIZATION_COLORS: Record<string, string> = {
  Cardiologist: '#e53935',
  Pediatrician: '#8e24aa',
  Neurologist: '#1e88e5',
  Orthopedic: '#f4511e',
  Dermatologist: '#00897b',
  Gynecologist: '#d81b60',
  Psychiatrist: '#5e35b1',
  General: '#43a047',
};

const getColor = (spec?: string): string => {
  if (!spec) return '#607d8b';
  for (const key of Object.keys(SPECIALIZATION_COLORS)) {
    if (spec.toLowerCase().includes(key.toLowerCase()))
      return SPECIALIZATION_COLORS[key];
  }
  return '#1565c0';
};

const formatDate = (dateStr: string): string => {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const DoctorListScreen: React.FC<Props> = ({ onRegisterNew }) => {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchDoctors = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await DoctorService.getAllDoctors();
      setDoctors(res.doctors ?? []);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to load doctors');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDoctors();
  }, [fetchDoctors]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDoctors(true);
  };

  const filteredDoctors = doctors.filter(
    d =>
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.specialization?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.mobile_number.includes(searchQuery),
  );

  const renderDoctor = ({ item }: { item: Doctor }) => {
    const color = getColor(item.specialization);
    const initials = item.name
      .split(' ')
      .map(w => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();

    return (
      <View style={styles.card}>
        <View style={styles.cardLeft}>
          <View style={[styles.avatar, { backgroundColor: color }]}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={[styles.statusDot, { backgroundColor: '#4caf50' }]} />
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.doctorName}>{item.name}</Text>
          {item.specialization ? (
            <View style={[styles.specBadge, { backgroundColor: color + '18' }]}>
              <Text style={[styles.specText, { color }]}>
                {item.specialization}
              </Text>
            </View>
          ) : null}
          <View style={styles.infoRow}>
            <Text style={styles.infoIcon}>📱</Text>
            <Text style={styles.infoText}>{item.mobile_number}</Text>
          </View>
          {item.email ? (
            <View style={styles.infoRow}>
              <Text style={styles.infoIcon}>✉️</Text>
              <Text style={styles.infoText} numberOfLines={1}>
                {item.email}
              </Text>
            </View>
          ) : null}
          {item.qualification ? (
            <View style={styles.infoRow}>
              <Text style={styles.infoIcon}>🎓</Text>
              <Text style={styles.infoText}>{item.qualification}</Text>
            </View>
          ) : null}
          {item.experience_years ? (
            <View style={styles.infoRow}>
              <Text style={styles.infoIcon}>⏱</Text>
              <Text style={styles.infoText}>
                {item.experience_years} yrs experience
              </Text>
            </View>
          ) : null}
          {item.clinic_address ? (
            <View style={styles.infoRow}>
              <Text style={styles.infoIcon}>📍</Text>
              <Text style={styles.infoText} numberOfLines={1}>
                {item.clinic_address}
              </Text>
            </View>
          ) : null}
          <Text style={styles.dateText}>
            Registered {formatDate(item.created_at)}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Doctors</Text>
          <Text style={styles.headerCount}>{doctors.length} registered</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={onRegisterNew}>
          <Text style={styles.addBtnText}>+ Add New</Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchWrapper}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInputSearch
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search by name, specialty, or mobile..."
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Text style={styles.clearIcon}>✕</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* List */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#1565c0" />
          <Text style={styles.loadingText}>Loading doctors...</Text>
        </View>
      ) : filteredDoctors.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyIcon}>{searchQuery ? '🔍' : '🏥'}</Text>
          <Text style={styles.emptyTitle}>
            {searchQuery ? 'No results found' : 'No doctors yet'}
          </Text>
          <Text style={styles.emptySubtitle}>
            {searchQuery
              ? `No doctor matches "${searchQuery}"`
              : 'Register the first doctor to get started'}
          </Text>
          {!searchQuery && (
            <TouchableOpacity style={styles.emptyBtn} onPress={onRegisterNew}>
              <Text style={styles.emptyBtnText}>Register First Doctor</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={filteredDoctors}
          keyExtractor={item => item._id}
          renderItem={renderDoctor}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#1565c0']}
              tintColor="#1565c0"
            />
          }
        />
      )}
    </View>
  );
};

// Inline search input (avoids extra file)
import { TextInput } from 'react-native';
const TextInputSearch: React.FC<{
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
}> = ({ value, onChangeText, placeholder }) => (
  <TextInput
    style={{ flex: 1, fontSize: 14, color: '#1a2332', paddingVertical: 0 }}
    value={value}
    onChangeText={onChangeText}
    placeholder={placeholder}
    placeholderTextColor="#90a4ae"
    returnKeyType="search"
  />
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f8' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  headerTitle: { fontSize: 26, fontWeight: '800', color: '#1a2332' },
  headerCount: { fontSize: 13, color: '#78909c', marginTop: 2 },
  addBtn: {
    backgroundColor: '#1565c0',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
    shadowColor: '#1565c0',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 6,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1.5,
    borderColor: '#e0e7ef',
  },
  searchIcon: { fontSize: 16, marginRight: 8 },
  clearIcon: { color: '#90a4ae', fontSize: 14, paddingLeft: 8 },
  list: { padding: 16, paddingTop: 10 },
  card: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  cardLeft: { marginRight: 14, alignItems: 'center' },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 6,
    borderWidth: 2,
    borderColor: '#fff',
  },
  cardBody: { flex: 1 },
  doctorName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a2332',
    marginBottom: 5,
  },
  specBadge: {
    alignSelf: 'flex-start',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 8,
  },
  specText: { fontSize: 12, fontWeight: '600' },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 3 },
  infoIcon: { fontSize: 11, marginRight: 5, width: 16 },
  infoText: { fontSize: 13, color: '#546e7a', flex: 1 },
  dateText: { fontSize: 11, color: '#b0bec5', marginTop: 8 },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  loadingText: { color: '#78909c', marginTop: 12, fontSize: 14 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a2332',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#90a4ae',
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyBtn: {
    backgroundColor: '#1565c0',
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginTop: 20,
  },
  emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});

export default DoctorListScreen;
