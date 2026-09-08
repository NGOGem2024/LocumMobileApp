import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SectionList,
  StyleSheet,
  Dimensions,
  StatusBar,
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
  white: '#ffffff',
};

// Mock Data structure for the SectionList
const SCHEDULE_DATA = [
  {
    title: 'Today',
    data: [
      {
        id: '1',
        role: 'General Physician',
        hospital: 'Apollo Hospital',
        contextTime: 'Today, 6 PM - 10 PM',
        date: '24 Aug 2026',
        time: '6:00 PM - 10:00 PM (4h)',
        location: 'Apollo Hospital, Baner, Pune',
        contactRole: 'HR Manager',
        contactPhone: '+91 98765-43210',
        pay: '₹2,500 Flat',
      },
    ],
  },
  {
    title: 'Tomorrow',
    data: [
      {
        id: '2',
        role: 'Internal Medicine',
        hospital: 'Ruby Hall Clinic',
        contextTime: 'Tomorrow, 8 AM - 2 PM',
        date: '25 Aug 2026',
        time: '8:00 AM - 2:00 PM (6h)',
        location: 'Ruby Hall Clinic, Dhole Patil Rd, Pune',
        contactRole: 'Floor Manager',
        contactPhone: '+91 99887-76655',
        pay: '₹800 /hr',
      },
    ],
  },
  {
    title: '25 Aug',
    data: [
      {
        id: '3',
        role: 'Emergency Medicine',
        hospital: 'Sahyadri Hospital',
        contextTime: '25 Aug, 10 AM - 6 PM',
        date: '25 Aug 2026',
        time: '10:00 AM - 6:00 PM (8h)',
        location: 'Sahyadri Hospital, Deccan Gymkhana, Pune',
        contactRole: 'ER Director',
        contactPhone: '+91 91234-56789',
        pay: '₹1,200 /hr',
      },
    ],
  },
];

const MyScheduleScreen = ({ navigation }: any) => {
  const [activeTab, setActiveTab] = useState<'Upcoming' | 'Completed' | 'Cancelled'>('Upcoming');
  const tabs = ['Upcoming', 'Completed', 'Cancelled'] as const;

  const renderItem = ({ item }: { item: typeof SCHEDULE_DATA[0]['data'][0] }) => (
    <TouchableOpacity 
      style={styles.jobCard} 
      activeOpacity={0.85} 
      onPress={() => navigation.navigate('ScheduleDetailsScreen', { shiftDetails: item })}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.jobTitle}>{item.role}</Text>
        <Text style={styles.companyName}>{item.hospital}</Text>
      </View>
      
      <View style={styles.cardFooter}>
        <Text style={styles.timeText}>{item.time.split(' (')[0]}</Text>
        <Text style={styles.payText}>{item.pay}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderSectionHeader = ({ section: { title } }: any) => (
    <Text style={styles.sectionTitle}>{title}</Text>
  );

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={C.cardBg} />

      {/* Visually Separated Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation?.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={scale(24)} color={C.ink} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Schedule</Text>
        <View style={{ width: scale(24) }} /> 
      </View>

      {/* Tabs Floating Below the Header */}
      <View style={styles.tabContainer}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab;
          return (
            <TouchableOpacity
              key={tab}
              style={[styles.tabBtn, isActive && styles.tabBtnActive]}
              onPress={() => setActiveTab(tab)}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                {tab}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Schedule List */}
      <SectionList
        sections={SCHEDULE_DATA}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled={false}
      />
    </SafeAreaView>
  );
};

export default MyScheduleScreen;

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
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: scale(20),
    paddingTop: scale(20),
    paddingBottom: scale(12),
    gap: scale(10),
    backgroundColor: 'transparent',
  },
  tabBtn: {
    flex: 1,
    paddingVertical: scale(10),
    borderRadius: scale(14),
    backgroundColor: C.cardBg,
    alignItems: 'center',
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
    color: C.ink,
  },
  tabTextActive: {
    color: C.primary,
  },
  listContent: {
    paddingHorizontal: scale(20),
    paddingBottom: scale(100), 
  },
  sectionTitle: {
    fontSize: scale(14),
    fontWeight: '800',
    color: C.ink,
    marginTop: scale(12),
    marginBottom: scale(12),
    letterSpacing: -0.3,
  },
  jobCard: {
    backgroundColor: C.cardBg,
    borderRadius: scale(20),
    marginBottom: scale(16),
    borderWidth: 1,
    borderColor: C.border,
    padding: scale(20),
    shadowColor: C.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 3,
  },
  cardHeader: {
    marginBottom: scale(18),
  },
  jobTitle: {
    fontSize: scale(15),
    fontWeight: '900',
    color: C.ink,
    marginBottom: scale(4),
    letterSpacing: -0.3,
  },
  companyName: {
    fontSize: scale(13),
    color: C.textMuted,
    fontWeight: '600',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeText: {
    fontSize: scale(13),
    fontWeight: '700',
    color: C.ink,
  },
  payText: {
    fontSize: scale(13),
    fontWeight: '700',
    color: C.ink,
  },
});