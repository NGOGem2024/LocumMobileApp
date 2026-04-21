import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
} from 'react-native';

const DashboardScreen = ({ route }: any) => {
  const doctorName = route?.params?.name || 'Doctor';

  const isVerified = false; // 🔴 CHANGE THIS LATER FROM API

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.wrapper}>
        {/* HEADER */}
        <Text style={styles.welcome}>Welcome, Dr. {doctorName}</Text>

        {/* STATUS CARD */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Verification Status</Text>

          <Text
            style={[styles.status, { color: isVerified ? 'green' : 'orange' }]}
          >
            {isVerified ? 'Verified ✅' : 'Pending Verification ⏳'}
          </Text>

          {!isVerified && (
            <Text style={styles.note}>
              Your account will be unlocked after verification (24–48 hrs)
            </Text>
          )}
        </View>

        {/* LOCKED FEATURES */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Features</Text>

          <Feature title="Available Shifts" locked={!isVerified} />
          <Feature title="Apply for Jobs" locked={!isVerified} />
          <Feature title="Earnings" locked={!isVerified} />
          <Feature title="Profile" locked={false} />
        </View>

        {/* DUMMY DATA */}
        {isVerified && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Upcoming Shift</Text>
            <Text style={styles.text}>Hospital: City Care</Text>
            <Text style={styles.text}>Date: 25 April</Text>
            <Text style={styles.text}>Time: 10 AM - 6 PM</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const Feature = ({ title, locked }: any) => (
  <TouchableOpacity style={styles.feature}>
    <Text style={styles.featureText}>
      {title} {locked ? '🔒' : ''}
    </Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4fbfc',
  },
  wrapper: {
    padding: 16,
  },
  welcome: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 20,
  },
  card: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
  },
  status: {
    fontSize: 14,
    fontWeight: '600',
  },
  note: {
    fontSize: 12,
    color: 'gray',
    marginTop: 6,
  },
  feature: {
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderColor: '#ddd',
  },
  featureText: {
    fontSize: 14,
  },
  text: {
    fontSize: 13,
    marginBottom: 4,
  },
});

export default DashboardScreen;
