import React from 'react';
import { SafeAreaView, StatusBar, StyleSheet } from 'react-native';
import RegisterDoctorScreen from './src/screens/RegisterDoctorScreen';

const App = () => {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <RegisterDoctorScreen
        onSuccess={() => {
          console.log('Doctor Registered Successfully');
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
});

export default App;
