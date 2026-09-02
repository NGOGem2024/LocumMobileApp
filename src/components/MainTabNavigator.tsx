import React from 'react';
import { StyleSheet, Dimensions } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import HomeScreen from '../screens/HomeScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SavedJobsScreen from '../screens/SavedJobsScreen';

const EarningsPlaceholder = () => null;

const Tab = createBottomTabNavigator();
const { width: SW } = Dimensions.get('window');
const scale = (size: number) => (SW / 390) * size;

const C = {
  primary: '#007b8e',
  ink: '#111827',
  textMuted: '#9CA3AF',
  cardBg: '#FFFFFF',
  border: '#E5E7EB',
};

const MainTabNavigator = () => {
  const insets = useSafeAreaInsets();
  const calculatedHeight = 60 + insets.bottom;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: C.primary,
        tabBarInactiveTintColor: C.textMuted,
        tabBarStyle: {
          backgroundColor: C.cardBg,
          borderTopWidth: 1,
          borderTopColor: C.border,
          elevation: 10,
          shadowColor: C.ink,
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.05,
          shadowRadius: 10,
          height: calculatedHeight,
          paddingTop: scale(6),
          paddingBottom: insets.bottom > 0 ? insets.bottom : scale(6),
        },
        tabBarLabelStyle: styles.tabLabel,
        tabBarItemStyle: {
          justifyContent: 'center',
          alignItems: 'center',
          paddingBottom: insets.bottom > 0 ? 0 : scale(4),
        },
        tabBarIcon: ({ focused, color }) => {
          let iconName = '';

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Saved Jobs') {
            iconName = focused ? 'bookmark' : 'bookmark-outline';
          } else if (route.name === 'Earnings') {
            iconName = focused ? 'wallet' : 'wallet-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={scale(22)} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Saved Jobs" component={SavedJobsScreen} />
      <Tab.Screen name="Earnings" component={EarningsPlaceholder} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabLabel: {
    fontSize: scale(10),
    fontWeight: '700',
    marginTop: scale(2),
  },
});

export default MainTabNavigator;