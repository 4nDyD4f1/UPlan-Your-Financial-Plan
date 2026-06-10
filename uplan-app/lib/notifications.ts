/**
 * UPlan — Notifications Service
 * Expo Notifications + Firebase Cloud Messaging (FCM)
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform, Alert } from 'react-native';
import { supabase } from './supabase';

// Handler for how notifications should be shown when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerForPushNotificationsAsync(userId: string) {
  let token;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF00D5',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return;
    }
    
    try {
      // Get Expo push token (or APNS/FCM device token if prefer direct Firebase)
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: process.env.EXPO_PUBLIC_PROJECT_ID, // Ensure projectId is set in your env
      });
      token = tokenData.data;
      
      // Save token to Supabase User Profile
      if (token && userId) {
        await supabase
          .from('users')
          .update({ fcm_token: token })
          .eq('id', userId);
      }
    } catch (error) {
      console.error('Error fetching push token', error);
    }
  } else {
    console.log('Must use physical device for Push Notifications');
  }

  return token;
}

export function setupNotificationListeners() {
  const notificationListener = Notifications.addNotificationReceivedListener(notification => {
    // Fired when a notification is received while app is foregrounded
    console.log('Notification received!', notification);
  });

  const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
    // Fired when user taps on a notification
    console.log('Notification tapped!', response);
    // Add logic here to navigate to specific screens based on notification data
  });

  return () => {
    Notifications.removeNotificationSubscription(notificationListener);
    Notifications.removeNotificationSubscription(responseListener);
  };
}
