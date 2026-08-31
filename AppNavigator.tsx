import React, { useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import SplashScreen from './src/screens/SplashScreen';
import RegisterDoctorScreen from './src/screens/RegisterDoctorScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import LandingScreen from './src/screens/LandingScreen';
import LoginScreen from './src/screens/LoginScreen';
import ForgotPasswordScreen from './src/screens/ForgotPasswordScreen';
import GuestDashboardScreen from './src/screens/GuestDashboardScreen';

// Import the new Tab Navigator instead of individual screens
import MainTabNavigator from './src/components/MainTabNavigator';

import { useAuth } from './src/context/AuthContext';

const Stack = createNativeStackNavigator();

const AppNavigator = () => {
  const [splashDone, setSplashDone] = useState(false);
  const { isLoading, doctor } = useAuth();

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!splashDone || isLoading ? (
          <Stack.Screen name="Splash">
            {props => (
              <SplashScreen {...props} onFinish={() => setSplashDone(true)} />
            )}
          </Stack.Screen>
        ) : doctor ? (
          // ── AUTHENTICATED STACK ─────────────────────────────────────────
          <Stack.Group>
            {/* The Tab Navigator is now the root screen for authenticated users */}
            <Stack.Screen name="MainTabs" component={MainTabNavigator} />
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