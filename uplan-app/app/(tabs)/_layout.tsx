/**
 * UPlan — Tab Bar Layout
 * Custom styled bottom tab bar matching the web app design
 */

import { Tabs } from 'expo-router';
import { View, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons, FontAwesome6 } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { UPlanColors } from '../../constants/colors';
import { useEffect } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { useTransactionStore } from '../../store/useTransactionStore';

export default function TabLayout() {
  const { theme } = useTheme();
  const user = useAuthStore((s) => s.user);
  const { fetchTransactions, fetchGoals, subscribeRealtime } = useTransactionStore();

  // Fetch data on mount
  useEffect(() => {
    if (user?.id) {
      fetchTransactions(user.id);
      fetchGoals(user.id);
      const unsubscribe = subscribeRealtime(user.id);
      return unsubscribe;
    }
  }, [user?.id]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.tabBar,
          borderTopColor: theme.tabBarBorder,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 88 : 70,
          paddingBottom: Platform.OS === 'ios' ? 28 : 10,
          paddingTop: 8,
          elevation: 0,
        },
        tabBarActiveTintColor: UPlanColors.primary,
        tabBarInactiveTintColor: theme.tabBarInactive,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="qris"
        options={{
          title: 'QRIS',
          tabBarIcon: ({ color, size }) => (
            <FontAwesome6 name="qrcode" size={20} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="goals"
        options={{
          title: 'Goals',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="flag" size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={22} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
