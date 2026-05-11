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
import { AuthProvider } from './src/context/AuthContext';
import ProfileScreen from './src/screens/ProfileScreen';

const Stack = createNativeStackNavigator();

const App = () => {
  const [splashDone, setSplashDone] = useState(false);

  return (
    <AuthProvider>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {!splashDone ? (
            // Splash Screen first
            <Stack.Screen name="Splash">
              {props => (
                <SplashScreen {...props} onFinish={() => setSplashDone(true)} />
              )}
            </Stack.Screen>
          ) : (
            <>
              <Stack.Screen name="LandingScreen" component={LandingScreen} />
              {/* Dashboard Screen */}
              <Stack.Screen
                name="DashboardScreen"
                component={DashboardScreen}
              />
              {/* Register Screen */}
              <Stack.Screen name="Register" component={RegisterDoctorScreen} />
              <Stack.Screen name="LoginScreen" component={LoginScreen} />
              <Stack.Screen
                name="ForgotPasswordScreen"
                component={ForgotPasswordScreen}
              />

              <Stack.Screen
                name="GuestDashboard"
                component={GuestDashboardScreen}
              />
              <Stack.Screen name="ProfileScreen" component={ProfileScreen} />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </AuthProvider>
  );
};

export default App;
