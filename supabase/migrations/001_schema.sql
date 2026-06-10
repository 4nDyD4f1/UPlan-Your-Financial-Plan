-- =============================================================================
-- UPlan Finance Tracker - Database Schema
-- Migration: 001_schema.sql
-- Description: Core tables, enums, indexes, and triggers
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- Extensions
-- ─────────────────────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─────────────────────────────────────────────────────────────────────────────
-- Custom Enum Types
-- ─────────────────────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE payment_method AS ENUM ('qris', 'cash', 'transfer', 'card');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE spending_category AS ENUM ('food', 'coffee', 'transport', 'shopping', 'entertainment', 'bills', 'health', 'other');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Users Table (extends Supabase auth.users)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  monthly_income BIGINT DEFAULT 0 CHECK (monthly_income >= 0),
  daily_budget BIGINT DEFAULT 0 CHECK (daily_budget >= 0),
  qris_daily_limit INT DEFAULT 6 CHECK (qris_daily_limit > 0),
  impulse_threshold BIGINT DEFAULT 50000 CHECK (impulse_threshold > 0),
  theme TEXT DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),
  fcm_token TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE public.users IS 'User profiles extending Supabase auth. Stores financial settings and preferences.';
COMMENT ON COLUMN public.users.monthly_income IS 'Monthly income in Indonesian Rupiah (IDR)';
COMMENT ON COLUMN public.users.daily_budget IS 'Daily spending budget in IDR';
COMMENT ON COLUMN public.users.qris_daily_limit IS 'Maximum QRIS taps allowed per day before warning';
COMMENT ON COLUMN public.users.impulse_threshold IS 'Amount threshold below which spending may be flagged as impulse';
COMMENT ON COLUMN public.users.fcm_token IS 'Firebase Cloud Messaging token for push notifications';

-- ─────────────────────────────────────────────────────────────────────────────
-- Transactions Table
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  amount BIGINT NOT NULL CHECK (amount > 0),
  merchant_name TEXT,
  category spending_category DEFAULT 'other' NOT NULL,
  payment_method payment_method DEFAULT 'qris' NOT NULL,
  note TEXT,
  receipt_url TEXT,
  is_impulse BOOLEAN DEFAULT FALSE NOT NULL,
  transaction_date TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE public.transactions IS 'All user financial transactions including QRIS, cash, transfer, and card payments.';
COMMENT ON COLUMN public.transactions.amount IS 'Transaction amount in IDR (must be positive)';
COMMENT ON COLUMN public.transactions.is_impulse IS 'Whether this transaction was flagged as an impulse purchase';
COMMENT ON COLUMN public.transactions.receipt_url IS 'URL to receipt image stored in Supabase Storage';

-- ─────────────────────────────────────────────────────────────────────────────
-- Goals Table
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL CHECK (char_length(title) >= 1 AND char_length(title) <= 200),
  description TEXT CHECK (description IS NULL OR char_length(description) <= 1000),
  target_amount BIGINT NOT NULL CHECK (target_amount > 0),
  current_amount BIGINT DEFAULT 0 CHECK (current_amount >= 0) NOT NULL,
  emoji TEXT DEFAULT '🎯',
  color TEXT DEFAULT 'pink' CHECK (color IN ('pink', 'purple', 'blue', 'green', 'yellow', 'orange', 'red')),
  deadline DATE,
  is_completed BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE public.goals IS 'User savings goals with progress tracking.';
COMMENT ON COLUMN public.goals.target_amount IS 'Target savings amount in IDR';
COMMENT ON COLUMN public.goals.current_amount IS 'Current progress towards the savings goal in IDR';

-- ─────────────────────────────────────────────────────────────────────────────
-- Daily Snapshots Table
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.daily_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  snapshot_date DATE NOT NULL,
  budget BIGINT CHECK (budget IS NULL OR budget >= 0),
  spent BIGINT DEFAULT 0 CHECK (spent >= 0) NOT NULL,
  qris_count INT DEFAULT 0 CHECK (qris_count >= 0) NOT NULL,
  total_transactions INT DEFAULT 0 CHECK (total_transactions >= 0) NOT NULL,
  saved BIGINT DEFAULT 0 NOT NULL,
  streak_days INT DEFAULT 0 CHECK (streak_days >= 0) NOT NULL,
  UNIQUE(user_id, snapshot_date)
);

COMMENT ON TABLE public.daily_snapshots IS 'Aggregated daily analytics for fast dashboard queries.';
COMMENT ON COLUMN public.daily_snapshots.saved IS 'Amount saved (budget - spent), can be negative if over-budget';
COMMENT ON COLUMN public.daily_snapshots.streak_days IS 'Consecutive days user stayed under QRIS daily limit';

-- ─────────────────────────────────────────────────────────────────────────────
-- Notification Preferences Table
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  push_enabled BOOLEAN DEFAULT TRUE NOT NULL,
  qris_alerts BOOLEAN DEFAULT TRUE NOT NULL,
  daily_reminder BOOLEAN DEFAULT TRUE NOT NULL,
  weekly_summary BOOLEAN DEFAULT TRUE NOT NULL,
  spending_triggers TEXT[] DEFAULT ARRAY['qris', 'card']::TEXT[],
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE public.notification_preferences IS 'Per-user notification settings for push alerts and summaries.';

-- ─────────────────────────────────────────────────────────────────────────────
-- Performance Indexes
-- ─────────────────────────────────────────────────────────────────────────────

-- Transactions: primary query pattern is by user + date range
CREATE INDEX IF NOT EXISTS idx_transactions_user_date
  ON public.transactions(user_id, transaction_date DESC);

-- Transactions: filter by payment method (QRIS tracking)
CREATE INDEX IF NOT EXISTS idx_transactions_method
  ON public.transactions(payment_method);

-- Transactions: filter by category (analytics)
CREATE INDEX IF NOT EXISTS idx_transactions_category
  ON public.transactions(category);

-- Transactions: partial index for impulse purchases (only rows where is_impulse = TRUE)
CREATE INDEX IF NOT EXISTS idx_transactions_impulse
  ON public.transactions(user_id, is_impulse)
  WHERE is_impulse = TRUE;

-- Transactions: compound index for impulse detection (recent QRIS transactions)
CREATE INDEX IF NOT EXISTS idx_transactions_qris_recent
  ON public.transactions(user_id, payment_method, transaction_date DESC)
  WHERE payment_method = 'qris';

-- Daily snapshots: primary query pattern is by user + date range
CREATE INDEX IF NOT EXISTS idx_daily_snapshots_user_date
  ON public.daily_snapshots(user_id, snapshot_date DESC);

-- Goals: filter by user
CREATE INDEX IF NOT EXISTS idx_goals_user
  ON public.goals(user_id);

-- Goals: filter active (incomplete) goals
CREATE INDEX IF NOT EXISTS idx_goals_active
  ON public.goals(user_id, is_completed)
  WHERE is_completed = FALSE;

-- ─────────────────────────────────────────────────────────────────────────────
-- Trigger Function: Auto-update updated_at timestamp
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply updated_at triggers
DROP TRIGGER IF EXISTS users_updated_at ON public.users;
CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS goals_updated_at ON public.goals;
CREATE TRIGGER goals_updated_at
  BEFORE UPDATE ON public.goals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS notification_preferences_updated_at ON public.notification_preferences;
CREATE TRIGGER notification_preferences_updated_at
  BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- Grant Usage
-- ─────────────────────────────────────────────────────────────────────────────
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;
