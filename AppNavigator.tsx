import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import SplashScreen from './src/screens/SplashScreen';
import RegisterDoctorScreen from './src/screens/RegisterDoctorScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import LandingScreen from './src/screens/LandingScreen';
import LoginScreen from './src/screens/LoginScreen';
import ForgotPasswordScreen from './src/screens/ForgotPasswordScreen';
import GuestDashboardScreen from './src/screens/GuestDashboardScreen';

// Default import for SavedJobsScreen
import SavedJobsScreen from './src/screens/SavedJobsScreen';

// Tab Navigator
import MainTabNavigator from './src/components/MainTabNavigator';

import { useAuth } from './src/context/AuthContext';
import { DutyShiftsDetailScreen } from './src/screens/DutyShiftsDetailScreen';
import ApplyJobScreen from './src/screens/ApplyJobScreen';
import EarningsHistoryScreen from './src/screens/EarningsHistoryScreen';
import EarningsOverviewScreen from './src/screens/EarningsOverviewScreen';
import EditDoctorProfileScreen from './src/screens/EditDoctorProfileScreen';
import HospitalDetailsScreen from './src/screens/HospitalDetailsScreen';
import DutiesScreen from './src/screens/DutiesScreen';
import ViewAllJobsScreen from './src/screens/ViewAllJobs';
import AvailabilitySection from './src/components/AvailabilitySection';
import {
  navigationRef,
  flushPendingNavigation,
  setPushNavigationReady,
} from './src/services/pushNotifications';

const Stack = createNativeStackNavigator();

const AppNavigator = () => {
  const [splashDone, setSplashDone] = useState(false);
  const { isLoading, doctor } = useAuth();

  useEffect(() => {
    setPushNavigationReady(splashDone && !isLoading && !!doctor);
  }, [splashDone, isLoading, doctor]);

  // Wait until both AsyncStorage session restoration (isLoading) AND the splash screen animation are finished
  const isReady = splashDone && !isLoading;

  return (
    <NavigationContainer ref={navigationRef} onReady={flushPendingNavigation}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isReady ? (
          <Stack.Screen name="Splash">
            {props => (
              <SplashScreen 
                {...props} 
                onFinish={() => {
                  // Only mark splash done when AsyncStorage has also finished loading
                  setSplashDone(true);
                }} 
              />
            )}
          </Stack.Screen>
        ) : doctor ? (
          // ── AUTHENTICATED STACK ─────────────────────────────────────────
          <Stack.Group>
            <Stack.Screen name="MainTabs" component={MainTabNavigator} />
            <Stack.Screen name="SavedJobs" component={SavedJobsScreen} />
            <Stack.Screen name="DutyShiftsDetailScreen" component={DutyShiftsDetailScreen} />
            <Stack.Screen name="DutiesScreen" component={DutiesScreen} />
            <Stack.Screen name="EditDoctorProfileScreen" component={EditDoctorProfileScreen} />
            <Stack.Screen name="EarningsHistory" component={EarningsHistoryScreen} />
            <Stack.Screen name="EarningsOverview" component={EarningsOverviewScreen} />
            <Stack.Screen name="HospitalDetailsScreen" component={HospitalDetailsScreen} />
            <Stack.Screen name="ViewAllJobs" component={ViewAllJobsScreen} />
            <Stack.Screen name="ApplyJob" component={ApplyJobScreen} />
            <Stack.Screen name="AvailabilitySection" component={AvailabilitySection} />
          </Stack.Group>
        ) : (
          // ── UNAUTHENTICATED STACK ───────────────────────────────────────
          <Stack.Group>
            <Stack.Screen name="LandingScreen" component={LandingScreen} />
            <Stack.Screen
              name="GuestDashboardScreen"
              component={GuestDashboardScreen}
            />
            <Stack.Screen name="DashboardScreen" component={DashboardScreen} />
            <Stack.Screen name="Register" component={RegisterDoctorScreen} />
            <Stack.Screen name="LoginScreen" component={LoginScreen} />
            <Stack.Screen
              name="ForgotPasswordScreen"
              component={ForgotPasswordScreen}
            />
          </Stack.Group>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;