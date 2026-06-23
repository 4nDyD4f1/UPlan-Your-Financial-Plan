/**
 * UPlan — Auth Store (Zustand)
 * Uses database.ts for stable user identity
 */

import { create } from 'zustand';
import {
  initDatabase,
  getOrCreateUser,
  getUserProfile,
  updateUserProfile,
  hasSession,
  setSession,
  showAlert,
  type DBUser,
} from '../lib/database';

interface AuthState {
  user: { id: string; email: string } | null;
  profile: DBUser | null;
  session: { access_token: string; user: { id: string; email: string } } | null;
  loading: boolean;
  initialized: boolean;

  // Actions
  initialize: () => Promise<void>;
  signInAsGuest: (name: string) => Promise<{ error: string | null }>;
  signInWithGoogle: () => Promise<void>;
  signInWithPassword: (email: string, password: string) => Promise<{ error: string | null }>;
  signUpWithPassword: (email: string, password: string) => Promise<{ error: string | null }>;
  signInWithMagicLink: (email: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  fetchProfile: () => Promise<void>;
  updateProfile: (updates: Partial<DBUser>) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  session: null,
  loading: false,
  initialized: false,

  initialize: async () => {
    try {
      const dbUser = await initDatabase();
      const sessionActive = await hasSession();
      
      if (sessionActive) {
        const user = { id: dbUser.id, email: dbUser.email };
        const session = { access_token: 'local_session', user };
        set({ user, session, profile: dbUser, initialized: true });
        console.log('[Auth] Restored session for user:', dbUser.id);
      } else {
        // No session → show login screen
        set({ user: null, session: null, profile: null, initialized: true });
        console.log('[Auth] No active session. Showing login.');
      }
    } catch (error) {
      console.error('[Auth] Init error:', error);
      set({ initialized: true });
    }
  },

  signInAsGuest: async (name: string) => {
    set({ loading: true });
    try {
      const dbUser = await getOrCreateUser('guest@uplan.app');
      await updateUserProfile(dbUser.id, { full_name: name || 'Guest' });
      await setSession(true);
      
      const user = { id: dbUser.id, email: dbUser.email };
      const session = { access_token: 'local_session', user };
      set({ user, session, profile: { ...dbUser, full_name: name || 'Guest' }, loading: false });
    } catch (error: any) {
      console.error(error);
      set({ loading: false });
      return { error: error.message };
    }
    return { error: null };
  },

  signInWithGoogle: async () => {
    set({ loading: true });
    try {
      const dbUser = await getOrCreateUser('google_user@uplan.app');
      await setSession(true);
      const user = { id: dbUser.id, email: dbUser.email };
      const session = { access_token: 'local_session', user };
      set({
        user,
        session,
        profile: dbUser,
        loading: false,
      });
    } catch (e) {
      console.error('[Auth] Google sign in error:', e);
      set({ loading: false });
    }
  },

  signInWithPassword: async (email: string, _password: string) => {
    set({ loading: true });
    try {
      const dbUser = await getOrCreateUser(email);
      // Update email if different
      const updated = await updateUserProfile({ email });
      const user = { id: updated.id, email: updated.email };
      set({
        user,
        session: { access_token: 'local_session', user },
        profile: updated,
        loading: false,
      });
      return { error: null };
    } catch (e) {
      console.error('[Auth] Password sign in error:', e);
      set({ loading: false });
      return { error: 'Gagal login.' };
    }
  },

  signUpWithPassword: async (email: string, _password: string) => {
    set({ loading: true });
    try {
      const dbUser = await getOrCreateUser(email);
      const updated = await updateUserProfile({ email });
      const user = { id: updated.id, email: updated.email };
      set({
        user,
        session: { access_token: 'local_session', user },
        profile: updated,
        loading: false,
      });
      return { error: null };
    } catch (e) {
      console.error('[Auth] Sign up error:', e);
      set({ loading: false });
      return { error: 'Gagal membuat akun.' };
    }
  },

  signInWithMagicLink: async (email: string) => {
    set({ loading: true });
    try {
      const dbUser = await getOrCreateUser(email);
      const updated = await updateUserProfile({ email });
      const user = { id: updated.id, email: updated.email };
      set({
        user,
        session: { access_token: 'local_session', user },
        profile: updated,
        loading: false,
      });
      return { error: null };
    } catch (e) {
      console.error('[Auth] Magic link error:', e);
      set({ loading: false });
      return { error: 'Gagal mengirim magic link.' };
    }
  },

  signOut: async () => {
    try {
      await setSession(false);
    } catch (e) {
      console.error('[Auth] Clear session error:', e);
    }
    set({
      user: null,
      session: null,
      profile: null,
      loading: false,
    });
  },

  fetchProfile: async () => {
    try {
      const profile = await getUserProfile();
      if (profile) set({ profile });
    } catch (e) {
      console.error('[Auth] Fetch profile error:', e);
    }
  },

  updateProfile: async (updates: Partial<DBUser>) => {
    try {
      const updated = await updateUserProfile(updates);
      set({ profile: updated });
      console.log('[Auth] Profile updated:', Object.keys(updates).join(', '));
    } catch (e) {
      console.error('[Auth] Update profile error:', e);
    }
  },
}));
