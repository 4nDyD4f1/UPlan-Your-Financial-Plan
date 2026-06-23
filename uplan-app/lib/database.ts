/**
 * UPlan — Local SQLite Database Layer
 * Provides persistent, reliable local storage for all app data.
 * No server, no Docker, no internet needed.
 */

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Constants ───────────────────────────────────────────────
const FIXED_USER_ID = 'uplan-local-user-001';
const STORAGE_KEYS = {
  user: 'uplan_db_user',
  transactions: 'uplan_db_transactions',
  goals: 'uplan_db_goals',
  session: 'uplan_db_session',
};

// ─── Type Definitions ────────────────────────────────────────
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

// ─── Safe Storage Helpers ────────────────────────────────────
const isServer = Platform.OS === 'web' && typeof window === 'undefined';

async function getItem(key: string): Promise<string | null> {
  if (isServer) return null;
  try {
    return await AsyncStorage.getItem(key);
  } catch (e) {
    console.error('[DB] getItem error:', key, e);
    return null;
  }
}

async function setItem(key: string, value: string): Promise<void> {
  if (isServer) return;
  try {
    await AsyncStorage.setItem(key, value);
  } catch (e) {
    console.error('[DB] setItem error:', key, e);
  }
}

// ─── UUID Generator ──────────────────────────────────────────
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ─── Cross-platform Alert ────────────────────────────────────
export function showAlert(title: string, message: string) {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n${message}`);
  } else {
    const { Alert } = require('react-native');
    Alert.alert(title, message);
  }
}

export function showConfirm(title: string, message: string, onConfirm: () => void) {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n${message}`)) {
      onConfirm();
    }
  } else {
    const { Alert } = require('react-native');
    Alert.alert(title, message, [
      { text: 'Batal', style: 'cancel' },
      { text: 'Ya', style: 'destructive', onPress: onConfirm },
    ]);
  }
}

// ═══════════════════════════════════════════════════════════════
// USER OPERATIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Always returns the same user. Creates one if it doesn't exist.
 * This is the KEY fix — user ID is now STABLE across reloads.
 */
export async function getOrCreateUser(email: string = 'user@uplan.app'): Promise<DBUser> {
  const raw = await getItem(STORAGE_KEYS.user);
  if (raw) {
    try {
      const user = JSON.parse(raw) as DBUser;
      // If the user already exists, return it as-is
      return user;
    } catch {
      // Corrupted data, will recreate below
    }
  }

  // Create new user with FIXED ID
  const newUser: DBUser = {
    id: FIXED_USER_ID,
    email,
    full_name: null,
    avatar_url: null,
    monthly_income: 0,
    daily_budget: 160000,
    qris_daily_limit: 6,
    impulse_threshold: 50000,
    theme: 'system',
    fcm_token: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  await setItem(STORAGE_KEYS.user, JSON.stringify(newUser));
  return newUser;
}

export async function getUserProfile(): Promise<DBUser | null> {
  const raw = await getItem(STORAGE_KEYS.user);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as DBUser;
  } catch {
    return null;
  }
}

export async function updateUserProfile(idOrUpdates: string | Partial<DBUser>, maybeUpdates?: Partial<DBUser>): Promise<DBUser> {
  const updates = typeof idOrUpdates === 'string' ? (maybeUpdates || {}) : idOrUpdates;
  const current = await getOrCreateUser();
  const updated: DBUser = {
    ...current,
    ...updates,
    id: current.id, // Never allow ID change
    updated_at: new Date().toISOString(),
  };
  await setItem(STORAGE_KEYS.user, JSON.stringify(updated));
  return updated;
}

// ═══════════════════════════════════════════════════════════════
// TRANSACTION OPERATIONS
// ═══════════════════════════════════════════════════════════════

async function getAllTransactions(): Promise<DBTransaction[]> {
  const raw = await getItem(STORAGE_KEYS.transactions);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as DBTransaction[];
  } catch {
    return [];
  }
}

async function saveAllTransactions(transactions: DBTransaction[]): Promise<void> {
  await setItem(STORAGE_KEYS.transactions, JSON.stringify(transactions));
}

export async function getTransactions(userId: string): Promise<DBTransaction[]> {
  const all = await getAllTransactions();
  return all
    .filter((t) => t.user_id === userId)
    .sort((a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime());
}

export async function insertTransaction(
  tx: Omit<DBTransaction, 'id' | 'created_at'>
): Promise<DBTransaction> {
  const newTx: DBTransaction = {
    ...tx,
    id: generateUUID(),
    created_at: new Date().toISOString(),
  };

  const all = await getAllTransactions();
  all.unshift(newTx);
  await saveAllTransactions(all);

  console.log('[DB] Transaction inserted:', newTx.id, newTx.merchant_name, newTx.amount);
  return newTx;
}

export async function deleteTransaction(id: string): Promise<void> {
  const all = await getAllTransactions();
  const filtered = all.filter((t) => t.id !== id);
  await saveAllTransactions(filtered);
  console.log('[DB] Transaction deleted:', id);
}

// ═══════════════════════════════════════════════════════════════
// GOAL OPERATIONS
// ═══════════════════════════════════════════════════════════════

async function getAllGoals(): Promise<DBGoal[]> {
  const raw = await getItem(STORAGE_KEYS.goals);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as DBGoal[];
  } catch {
    return [];
  }
}

async function saveAllGoals(goals: DBGoal[]): Promise<void> {
  await setItem(STORAGE_KEYS.goals, JSON.stringify(goals));
}

export async function getGoals(userId: string): Promise<DBGoal[]> {
  const all = await getAllGoals();
  return all
    .filter((g) => g.user_id === userId)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export async function insertGoal(
  goal: Omit<DBGoal, 'id' | 'created_at' | 'updated_at' | 'is_completed'>
): Promise<DBGoal> {
  const newGoal: DBGoal = {
    ...goal,
    id: generateUUID(),
    is_completed: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const all = await getAllGoals();
  all.unshift(newGoal);
  await saveAllGoals(all);

  console.log('[DB] Goal inserted:', newGoal.id, newGoal.title);
  return newGoal;
}

export async function updateGoal(id: string, updates: Partial<DBGoal>): Promise<void> {
  const all = await getAllGoals();
  const idx = all.findIndex((g) => g.id === id);
  if (idx === -1) return;

  all[idx] = {
    ...all[idx],
    ...updates,
    id: all[idx].id, // Never change ID
    updated_at: new Date().toISOString(),
  };
  await saveAllGoals(all);
  console.log('[DB] Goal updated:', id);
}

export async function deleteGoal(id: string): Promise<void> {
  const all = await getAllGoals();
  const filtered = all.filter((g) => g.id !== id);
  await saveAllGoals(filtered);
  console.log('[DB] Goal deleted:', id);
}

// ═══════════════════════════════════════════════════════════════
// DATABASE INITIALIZATION
// ═══════════════════════════════════════════════════════════════

let _initialized = false;

/**
 * Initialize the database. Safe to call multiple times.
 * On first call, ensures user exists and storage keys are set up.
 */
export async function initDatabase(): Promise<DBUser> {
  const user = await getOrCreateUser();
  if (!_initialized) {
    console.log('[DB] Database initialized. User ID:', user.id);
    _initialized = true;
  }
  return user;
}

// ═══════════════════════════════════════════════════════════════
// SESSION MANAGEMENT
// ═══════════════════════════════════════════════════════════════

export async function hasSession(): Promise<boolean> {
  const session = await getItem(STORAGE_KEYS.session);
  return session === 'active';
}

export async function setSession(active: boolean): Promise<void> {
  if (active) {
    await setItem(STORAGE_KEYS.session, 'active');
  } else {
    await AsyncStorage.removeItem(STORAGE_KEYS.session);
  }
}
