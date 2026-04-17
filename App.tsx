import React, { useState } from 'react';
import SplashScreen from './src/screens/SplashScreen'; // adjust path
import RegisterDoctorScreen from './src/screens/RegisterDoctorScreen'; // adjust path

const App = () => {
  const [splashDone, setSplashDone] = useState(false);

  if (!splashDone) {
    return <SplashScreen onFinish={() => setSplashDone(true)} />;
  }

  return <RegisterDoctorScreen />;
};

export default App;
