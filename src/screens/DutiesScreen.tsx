import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Dimensions,
  StatusBar,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';

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
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  white: '#ffffff',
};

// Dummy JSON Data from API
const DUMMY_RESPONSE = {
  jobs: [
    {
      _id: '6aa146eb0d8f41bdbe7077e2',
      hospital_details: {
        hospital_name: 'Smile Hospital Pandharpur',
      },
      department: 'Intensive Care Unit (ICU)',
      speciality: 'Radiology',
      billing_shift_type: 'Per Shift',
      offered_rate: 3000,
      shift_start_date: '2026-09-09T00:00:00.000Z',
      shift_end_date: '2026-10-31T00:00:00.000Z',
      duty_from_time: '09:00',
      duty_to_time: '18:00',
      vacancy_status: 'Urgent',
      city: 'Solapur',
      state: 'Maharashtra',
    },
    {
      _id: '6a9e5d07eb8c9f3da9343727',
      hospital_details: {
        hospital_name: 'TestAMK_Hospital',
      },
      department: 'General Ward',
      speciality: 'General Medicine',
      billing_shift_type: 'Per Shift',
      offered_rate: 4500,
      shift_start_date: '2026-09-08T00:00:00.000Z',
      shift_end_date: '2026-09-08T00:00:00.000Z',
      duty_from_time: '08:00',
      duty_to_time: '18:00',
      vacancy_status: 'Open',
      city: 'Rangareddy',
      state: 'Telangana',
    },
    {
      _id: '6a9579833ac269c21f5e0f3e',
      hospital_details: {
        hospital_name: 'Kachare Hospital & Maternity Home',
      },
      department: 'Operation Theater (OT)',
      speciality: 'General Medicine',
      billing_shift_type: 'Per Shift',
      offered_rate: 1800,
      shift_start_date: '2026-09-03T00:00:00.000Z',
      shift_end_date: '2026-09-04T00:00:00.000Z',
      duty_from_time: '10:00',
      duty_to_time: '18:00',
      vacancy_status: 'Open',
      city: 'Solapur',
      state: 'Maharashtra',
    },
  ],
};

const DutiesScreen = ({ navigation }: any) => {
  const [activeTab, setActiveTab] = useState<'Assigned' | 'Active' | 'Past' | 'Cancelled'>('Assigned');
  const tabs = ['Assigned', 'Active', 'Past', 'Cancelled'] as const;

  // Helper to format date strings
  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-GB', options);
  };

  const renderItem = ({ item }: { item: typeof DUMMY_RESPONSE.jobs[0] }) => (
    <TouchableOpacity
      style={styles.jobCard}
      activeOpacity={0.85}
      onPress={() => navigation.navigate('DutyDetailsScreen', { jobDetails: item })}
    >
      <View style={styles.cardHeader}>
        <View style={styles.titleRow}>
          <Text style={styles.jobTitle} numberOfLines={1}>
            {item.speciality} - {item.department}
          </Text>
          {item.vacancy_status === 'Urgent' && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Urgent</Text>
            </View>
          )}
        </View>
        <Text style={styles.hospitalName}>{item.hospital_details.hospital_name}</Text>
        <Text style={styles.locationText}>
          <Ionicons name="location-outline" size={scale(12)} color={C.textMuted} /> {item.city}, {item.state}
        </Text>
      </View>

      <View style={styles.cardDetails}>
        <View style={styles.detailRow}>
          <Ionicons name="calendar-outline" size={scale(16)} color={C.textSub} />
          <Text style={styles.detailText}>
            {formatDate(item.shift_start_date)}
            {item.shift_start_date !== item.shift_end_date ? ` to ${formatDate(item.shift_end_date)}` : ''}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="time-outline" size={scale(16)} color={C.textSub} />
          <Text style={styles.detailText}>
            {item.duty_from_time} - {item.duty_to_time}
          </Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.cardFooter}>
        <Text style={styles.statusText}>{activeTab} Duty</Text>
        <Text style={styles.payText}>
          ₹{item.offered_rate} <Text style={styles.paySubText}>/ {item.billing_shift_type}</Text>
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={C.cardBg} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation?.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={scale(24)} color={C.ink} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Duties</Text>
        <View style={{ width: scale(24) }} />
      </View>

      {/* Scrollable Tabs */}
      <View style={styles.tabWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabContainer}>
          {tabs.map((tab) => {
            const isActive = activeTab === tab;
            return (
              <TouchableOpacity
                key={tab}
                style={[styles.tabBtn, isActive && styles.tabBtnActive]}
                onPress={() => setActiveTab(tab)}
                activeOpacity={0.7}
              >
                <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{tab}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Duties List */}
      <FlatList
        data={DUMMY_RESPONSE.jobs}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        // In the future, you can filter `data` based on the `activeTab` state here
      />
    </SafeAreaView>
  );
};

export default DutiesScreen;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.background,
  },
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
  backBtn: {
    padding: scale(4),
  },
  headerTitle: {
    fontSize: scale(17),
    fontWeight: '800',
    color: C.ink,
    letterSpacing: -0.3,
  },
  tabWrapper: {
    backgroundColor: C.background,
  },
  tabContainer: {
    paddingHorizontal: scale(20),
    paddingTop: scale(16),
    paddingBottom: scale(12),
    gap: scale(10),
  },
  tabBtn: {
    paddingHorizontal: scale(16),
    paddingVertical: scale(8),
    borderRadius: scale(20),
    backgroundColor: C.cardBg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.border,
  },
  tabBtnActive: {
    backgroundColor: C.primaryLight,
    borderColor: C.primary,
  },
  tabText: {
    fontSize: scale(13),
    fontWeight: '700',
    color: C.textSub,
  },
  tabTextActive: {
    color: C.primary,
  },
  listContent: {
    paddingHorizontal: scale(20),
    paddingBottom: scale(100),
    paddingTop: scale(8),
  },
  jobCard: {
    backgroundColor: C.cardBg,
    borderRadius: scale(16),
    marginBottom: scale(16),
    borderWidth: 1,
    borderColor: C.border,
    padding: scale(16),
    shadowColor: C.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    marginBottom: scale(12),
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scale(4),
  },
  jobTitle: {
    flex: 1,
    fontSize: scale(15),
    fontWeight: '800',
    color: C.ink,
    letterSpacing: -0.3,
    paddingRight: scale(8),
  },
  badge: {
    backgroundColor: C.warningLight,
    paddingHorizontal: scale(8),
    paddingVertical: scale(2),
    borderRadius: scale(8),
  },
  badgeText: {
    fontSize: scale(10),
    fontWeight: '700',
    color: C.warning,
    textTransform: 'uppercase',
  },
  hospitalName: {
    fontSize: scale(14),
    color: C.ink,
    fontWeight: '600',
    marginBottom: scale(4),
  },
  locationText: {
    fontSize: scale(12),
    color: C.textMuted,
    fontWeight: '500',
  },
  cardDetails: {
    backgroundColor: C.inputBg,
    borderRadius: scale(12),
    padding: scale(12),
    gap: scale(8),
    marginBottom: scale(12),
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
  },
  detailText: {
    fontSize: scale(13),
    color: C.ink,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: C.border,
    marginBottom: scale(12),
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusText: {
    fontSize: scale(12),
    fontWeight: '700',
    color: C.primary,
    textTransform: 'uppercase',
  },
  payText: {
    fontSize: scale(15),
    fontWeight: '800',
    color: C.ink,
  },
  paySubText: {
    fontSize: scale(12),
    fontWeight: '600',
    color: C.textSub,
  },
});