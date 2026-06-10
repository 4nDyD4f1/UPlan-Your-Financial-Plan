/**
 * UPlan — Supabase Client
 * Uses AsyncStorage for auth session persistence on React Native
 */

import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import 'react-native-url-polyfill/dist/polyfill';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://YOUR_PROJECT.supabase.co';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'YOUR_ANON_KEY';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // Disable for React Native
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// Database types matching our schema
export interface DBUser {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  monthly_income: number;
  daily_budget: number;
  qris_daily_limit: number;
  impulse_threshold: number;
  theme: 'light' | 'dark' | 'system';
  fcm_token: string | null;
  created_at: string;
  updated_at: string;
}

export interface DBTransaction {
  id: string;
  user_id: string;
  amount: number;
  merchant_name: string | null;
  category: string;
  payment_method: string;
  note: string | null;
  receipt_url: string | null;
  is_impulse: boolean;
  transaction_date: string;
  created_at: string;
}

export interface DBGoal {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  target_amount: number;
  current_amount: number;
  emoji: string;
  color: string;
  deadline: string | null;
  is_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface DBDailySnapshot {
  id: string;
  user_id: string;
  snapshot_date: string;
  budget: number;
  spent: number;
  qris_count: number;
  total_transactions: number;
  saved: number;
  streak_days: number;
}
