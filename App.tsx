import React, { useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import SplashScreen from './src/screens/SplashScreen';
import RegisterDoctorScreen from './src/screens/RegisterDoctorScreen';
import DashboardScreen from './src/screens/DashboardScreen';

const Stack = createNativeStackNavigator();

const App = () => {
  const [splashDone, setSplashDone] = useState(false);

  return (
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
            {/* Register Screen */}
            <Stack.Screen
              name="RegisterDoctor"
              component={RegisterDoctorScreen}
            />

            {/* Dashboard Screen */}
            <Stack.Screen name="Dashboard" component={DashboardScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default App;
