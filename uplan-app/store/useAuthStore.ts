/**
 * UPlan — Auth Store (Zustand)
 * Manages user session and profile via Supabase Auth
 */

import { create } from 'zustand';
import { supabase, type DBUser } from '../lib/supabase';
import type { Session, User } from '@supabase/supabase-js';

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: DBUser | null;
  loading: boolean;
  initialized: boolean;

  // Actions
  initialize: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithMagicLink: (email: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  fetchProfile: () => Promise<void>;
  updateProfile: (updates: Partial<DBUser>) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  profile: null,
  loading: false,
  initialized: false,

  initialize: async () => {
    try {
      // Get current session
      const { data: { session } } = await supabase.auth.getSession();
      set({ session, user: session?.user ?? null, initialized: true });

      if (session?.user) {
        await get().fetchProfile();
      }

      // Listen for auth changes
      supabase.auth.onAuthStateChange(async (event, newSession) => {
        set({ session: newSession, user: newSession?.user ?? null });

        if (event === 'SIGNED_IN' && newSession?.user) {
          await get().fetchProfile();
        }

        if (event === 'SIGNED_OUT') {
          set({ profile: null });
        }
      });
    } catch (error) {
      console.error('Auth init error:', error);
      set({ initialized: true });
    }
  },

  signInWithGoogle: async () => {
    set({ loading: true });
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: 'uplan://auth/callback',
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });
      if (error) throw error;
    } catch (error: any) {
      console.error('Google sign in error:', error.message);
    } finally {
      set({ loading: false });
    }
  },

  signInWithMagicLink: async (email: string) => {
    set({ loading: true });
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: 'uplan://auth/callback',
        },
      });
      return { error: error?.message ?? null };
    } catch (error: any) {
      return { error: error.message };
    } finally {
      set({ loading: false });
    }
  },

  signOut: async () => {
    set({ loading: true });
    try {
      await supabase.auth.signOut();
      set({ session: null, user: null, profile: null });
    } catch (error) {
      console.error('Sign out error:', error);
    } finally {
      set({ loading: false });
    }
  },

  fetchProfile: async () => {
    const { user } = get();
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        // Profile might not exist yet (new user → onboarding)
        if (error.code === 'PGRST116') {
          set({ profile: null });
          return;
        }
        throw error;
      }

      set({ profile: data as DBUser });
    } catch (error) {
      console.error('Fetch profile error:', error);
    }
  },

  updateProfile: async (updates: Partial<DBUser>) => {
    const { user } = get();
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single();

      if (error) throw error;
      set({ profile: data as DBUser });
    } catch (error) {
      console.error('Update profile error:', error);
    }
  },
}));
