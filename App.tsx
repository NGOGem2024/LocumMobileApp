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
import { AuthProvider, useAuth } from './src/context/AuthContext';
import ProfileScreen from './src/screens/ProfileScreen';
import HomeScreen from './src/screens/HomeScreen';

const Stack = createNativeStackNavigator();

// ── Inner navigator — has access to AuthContext ─────────────────────────────
const RootNavigator = () => {
  const [splashDone, setSplashDone] = useState(false);
  const { isLoading, doctor } = useAuth();

  // Keep showing splash until:
  //   1. Splash animation is done  AND
  //   2. AsyncStorage restore is complete (isLoading = false)
  if (!splashDone || isLoading) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Splash">
          {props => (
            <SplashScreen {...props} onFinish={() => setSplashDone(true)} />
          )}
        </Stack.Screen>
      </Stack.Navigator>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {doctor ? (
        // ── AUTHENTICATED stack ──────────────────────────────────────────────
        <>
          <Stack.Screen name="HomeScreen" component={HomeScreen} />
          <Stack.Screen name="ProfileScreen" component={ProfileScreen} />
          <Stack.Screen
            name="GuestDashboard"
            component={GuestDashboardScreen}
          />
        </>
      ) : (
        // ── UNAUTHENTICATED stack ────────────────────────────────────────────
        <>
          <Stack.Screen name="LandingScreen" component={LandingScreen} />
          <Stack.Screen name="DashboardScreen" component={DashboardScreen} />
          <Stack.Screen name="Register" component={RegisterDoctorScreen} />
          <Stack.Screen name="LoginScreen" component={LoginScreen} />
          <Stack.Screen
            name="ForgotPasswordScreen"
            component={ForgotPasswordScreen}
          />
        </>
      )}
    </Stack.Navigator>
  );
};

// ── Root — AuthProvider wraps everything ────────────────────────────────────
const App = () => (
  <AuthProvider>
    <NavigationContainer>
      <RootNavigator />
    </NavigationContainer>
  </AuthProvider>
);

export default App;
