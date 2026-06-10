-- =============================================================================
-- UPlan Finance Tracker - Row Level Security Policies
-- Migration: 002_rls_policies.sql
-- Description: Enable RLS on all tables and define access policies
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- Enable RLS on all tables
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────────────
-- Force RLS for table owners (prevents bypassing RLS even for table owner)
-- Service role will bypass via supabase_admin
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.users FORCE ROW LEVEL SECURITY;
ALTER TABLE public.transactions FORCE ROW LEVEL SECURITY;
ALTER TABLE public.goals FORCE ROW LEVEL SECURITY;
ALTER TABLE public.daily_snapshots FORCE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences FORCE ROW LEVEL SECURITY;

-- =============================================================================
-- USERS TABLE POLICIES
-- =============================================================================

-- Users: SELECT own profile
DROP POLICY IF EXISTS "users_select_own" ON public.users;
CREATE POLICY "users_select_own"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Users: INSERT own profile (auto-set id from auth.uid())
DROP POLICY IF EXISTS "users_insert_own" ON public.users;
CREATE POLICY "users_insert_own"
  ON public.users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Users: UPDATE own profile
DROP POLICY IF EXISTS "users_update_own" ON public.users;
CREATE POLICY "users_update_own"
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Users: DELETE own profile (cascade will clean up related data)
DROP POLICY IF EXISTS "users_delete_own" ON public.users;
CREATE POLICY "users_delete_own"
  ON public.users
  FOR DELETE
  TO authenticated
  USING (auth.uid() = id);

-- Users: Service role full access
DROP POLICY IF EXISTS "users_service_role" ON public.users;
CREATE POLICY "users_service_role"
  ON public.users
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =============================================================================
-- TRANSACTIONS TABLE POLICIES
-- =============================================================================

-- Transactions: SELECT own transactions
DROP POLICY IF EXISTS "transactions_select_own" ON public.transactions;
CREATE POLICY "transactions_select_own"
  ON public.transactions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Transactions: INSERT own transactions (auto-enforce user_id = auth.uid())
DROP POLICY IF EXISTS "transactions_insert_own" ON public.transactions;
CREATE POLICY "transactions_insert_own"
  ON public.transactions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Transactions: UPDATE own transactions
DROP POLICY IF EXISTS "transactions_update_own" ON public.transactions;
CREATE POLICY "transactions_update_own"
  ON public.transactions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Transactions: DELETE own transactions
DROP POLICY IF EXISTS "transactions_delete_own" ON public.transactions;
CREATE POLICY "transactions_delete_own"
  ON public.transactions
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Transactions: Service role full access
DROP POLICY IF EXISTS "transactions_service_role" ON public.transactions;
CREATE POLICY "transactions_service_role"
  ON public.transactions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =============================================================================
-- GOALS TABLE POLICIES
-- =============================================================================

-- Goals: SELECT own goals
DROP POLICY IF EXISTS "goals_select_own" ON public.goals;
CREATE POLICY "goals_select_own"
  ON public.goals
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Goals: INSERT own goals (enforce user_id = auth.uid())
DROP POLICY IF EXISTS "goals_insert_own" ON public.goals;
CREATE POLICY "goals_insert_own"
  ON public.goals
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Goals: UPDATE own goals
DROP POLICY IF EXISTS "goals_update_own" ON public.goals;
CREATE POLICY "goals_update_own"
  ON public.goals
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Goals: DELETE own goals
DROP POLICY IF EXISTS "goals_delete_own" ON public.goals;
CREATE POLICY "goals_delete_own"
  ON public.goals
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Goals: Service role full access
DROP POLICY IF EXISTS "goals_service_role" ON public.goals;
CREATE POLICY "goals_service_role"
  ON public.goals
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =============================================================================
-- DAILY SNAPSHOTS TABLE POLICIES
-- =============================================================================

-- Daily Snapshots: SELECT own snapshots
DROP POLICY IF EXISTS "snapshots_select_own" ON public.daily_snapshots;
CREATE POLICY "snapshots_select_own"
  ON public.daily_snapshots
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Daily Snapshots: INSERT own snapshots
DROP POLICY IF EXISTS "snapshots_insert_own" ON public.daily_snapshots;
CREATE POLICY "snapshots_insert_own"
  ON public.daily_snapshots
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Daily Snapshots: UPDATE own snapshots
DROP POLICY IF EXISTS "snapshots_update_own" ON public.daily_snapshots;
CREATE POLICY "snapshots_update_own"
  ON public.daily_snapshots
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Daily Snapshots: DELETE own snapshots
DROP POLICY IF EXISTS "snapshots_delete_own" ON public.daily_snapshots;
CREATE POLICY "snapshots_delete_own"
  ON public.daily_snapshots
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Daily Snapshots: Service role full access
DROP POLICY IF EXISTS "snapshots_service_role" ON public.daily_snapshots;
CREATE POLICY "snapshots_service_role"
  ON public.daily_snapshots
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =============================================================================
-- NOTIFICATION PREFERENCES TABLE POLICIES
-- =============================================================================

-- Notification Preferences: SELECT own preferences
DROP POLICY IF EXISTS "notif_prefs_select_own" ON public.notification_preferences;
CREATE POLICY "notif_prefs_select_own"
  ON public.notification_preferences
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Notification Preferences: INSERT own preferences
DROP POLICY IF EXISTS "notif_prefs_insert_own" ON public.notification_preferences;
CREATE POLICY "notif_prefs_insert_own"
  ON public.notification_preferences
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Notification Preferences: UPDATE own preferences
DROP POLICY IF EXISTS "notif_prefs_update_own" ON public.notification_preferences;
CREATE POLICY "notif_prefs_update_own"
  ON public.notification_preferences
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Notification Preferences: DELETE own preferences
DROP POLICY IF EXISTS "notif_prefs_delete_own" ON public.notification_preferences;
CREATE POLICY "notif_prefs_delete_own"
  ON public.notification_preferences
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Notification Preferences: Service role full access
DROP POLICY IF EXISTS "notif_prefs_service_role" ON public.notification_preferences;
CREATE POLICY "notif_prefs_service_role"
  ON public.notification_preferences
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =============================================================================
-- STORAGE POLICIES (Receipts Bucket)
-- =============================================================================

-- Storage: Users can upload receipts to their own folder
DROP POLICY IF EXISTS "receipts_upload_own" ON storage.objects;
CREATE POLICY "receipts_upload_own"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'receipts'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Storage: Users can view their own receipts
DROP POLICY IF EXISTS "receipts_select_own" ON storage.objects;
CREATE POLICY "receipts_select_own"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'receipts'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Storage: Users can update their own receipts
DROP POLICY IF EXISTS "receipts_update_own" ON storage.objects;
CREATE POLICY "receipts_update_own"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'receipts'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'receipts'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Storage: Users can delete their own receipts
DROP POLICY IF EXISTS "receipts_delete_own" ON storage.objects;
CREATE POLICY "receipts_delete_own"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'receipts'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
