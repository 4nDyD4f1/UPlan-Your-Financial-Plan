-- =============================================================================
-- UPlan Finance Tracker - PostgreSQL Functions & Triggers
-- Migration: 003_functions.sql
-- Description: Business logic functions for user management, analytics,
--              impulse detection, streaks, and weekly stats
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- Function: handle_new_user()
-- Trigger: Fires on auth.users INSERT
-- Purpose: Auto-create public.users profile + notification_preferences
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _full_name TEXT;
  _avatar_url TEXT;
  _email TEXT;
BEGIN
  -- Extract metadata from auth signup
  _email := COALESCE(NEW.email, '');
  _full_name := COALESCE(
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'name',
    split_part(_email, '@', 1)
  );
  _avatar_url := COALESCE(
    NEW.raw_user_meta_data ->> 'avatar_url',
    NEW.raw_user_meta_data ->> 'picture',
    NULL
  );

  -- Create user profile with sensible defaults for Indonesian Gen Z
  INSERT INTO public.users (
    id,
    email,
    full_name,
    avatar_url,
    monthly_income,
    daily_budget,
    qris_daily_limit,
    impulse_threshold
  ) VALUES (
    NEW.id,
    _email,
    _full_name,
    _avatar_url,
    0,           -- monthly_income: user sets during onboarding
    0,           -- daily_budget: user sets during onboarding
    6,           -- qris_daily_limit: default 6 taps/day
    50000        -- impulse_threshold: Rp 50.000
  )
  ON CONFLICT (id) DO NOTHING;

  -- Create default notification preferences
  INSERT INTO public.notification_preferences (
    user_id,
    push_enabled,
    qris_alerts,
    daily_reminder,
    weekly_summary,
    spending_triggers
  ) VALUES (
    NEW.id,
    TRUE,
    TRUE,
    TRUE,
    TRUE,
    ARRAY['qris', 'card']::TEXT[]
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Attach trigger to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();


-- ─────────────────────────────────────────────────────────────────────────────
-- Function: check_impulse()
-- Purpose: Determine if a transaction is an impulse purchase
-- Logic:
--   1. Amount is below user's impulse_threshold, AND
--   2. Payment method is QRIS, AND
--   3. User has 2+ QRIS transactions in the last 3 hours
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.check_impulse(
  p_transaction_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id UUID;
  _amount BIGINT;
  _payment_method payment_method;
  _transaction_date TIMESTAMPTZ;
  _impulse_threshold BIGINT;
  _recent_qris_count INT;
  _is_impulse BOOLEAN := FALSE;
BEGIN
  -- Get the transaction details
  SELECT t.user_id, t.amount, t.payment_method, t.transaction_date
  INTO _user_id, _amount, _payment_method, _transaction_date
  FROM public.transactions t
  WHERE t.id = p_transaction_id;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Only check QRIS transactions
  IF _payment_method != 'qris' THEN
    RETURN FALSE;
  END IF;

  -- Get user's impulse threshold
  SELECT u.impulse_threshold
  INTO _impulse_threshold
  FROM public.users u
  WHERE u.id = _user_id;

  IF NOT FOUND THEN
    _impulse_threshold := 50000; -- fallback default
  END IF;

  -- Check condition 1: amount below threshold
  IF _amount >= _impulse_threshold THEN
    RETURN FALSE;
  END IF;

  -- Check condition 2: 2+ QRIS transactions in last 3 hours (excluding current)
  SELECT COUNT(*)
  INTO _recent_qris_count
  FROM public.transactions t
  WHERE t.user_id = _user_id
    AND t.payment_method = 'qris'
    AND t.id != p_transaction_id
    AND t.transaction_date >= (_transaction_date - INTERVAL '3 hours')
    AND t.transaction_date <= _transaction_date;

  _is_impulse := (_recent_qris_count >= 2);

  -- Update the transaction's is_impulse flag
  IF _is_impulse THEN
    UPDATE public.transactions
    SET is_impulse = TRUE
    WHERE id = p_transaction_id;
  END IF;

  RETURN _is_impulse;
END;
$$;


-- ─────────────────────────────────────────────────────────────────────────────
-- Function: calculate_qris_streak()
-- Purpose: Calculate consecutive days a user stayed under their QRIS limit
-- Returns: Number of consecutive streak days
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.calculate_qris_streak(
  p_user_id UUID
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _streak INT := 0;
  _qris_limit INT;
  _check_date DATE;
  _daily_qris_count INT;
BEGIN
  -- Get user's QRIS daily limit
  SELECT u.qris_daily_limit
  INTO _qris_limit
  FROM public.users u
  WHERE u.id = p_user_id;

  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  -- Start from yesterday and count backwards
  -- (today is still in progress, so we don't count it)
  _check_date := (NOW() AT TIME ZONE 'Asia/Jakarta')::DATE - 1;

  LOOP
    -- Count QRIS transactions for this day (in WIB timezone)
    SELECT COUNT(*)
    INTO _daily_qris_count
    FROM public.transactions t
    WHERE t.user_id = p_user_id
      AND t.payment_method = 'qris'
      AND (t.transaction_date AT TIME ZONE 'Asia/Jakarta')::DATE = _check_date;

    -- If no transactions at all for this day, check if user had any activity
    -- A day with zero transactions doesn't break the streak (user simply didn't spend)
    -- But if user never had transactions before this date, stop counting
    IF _daily_qris_count = 0 THEN
      -- Check if user had ANY transaction on or before this date
      IF NOT EXISTS (
        SELECT 1 FROM public.transactions t
        WHERE t.user_id = p_user_id
          AND (t.transaction_date AT TIME ZONE 'Asia/Jakarta')::DATE <= _check_date
      ) THEN
        EXIT; -- No more history, stop counting
      END IF;
      -- Day with no QRIS = under limit, streak continues
      _streak := _streak + 1;
    ELSIF _daily_qris_count <= _qris_limit THEN
      -- Under or at limit, streak continues
      _streak := _streak + 1;
    ELSE
      -- Over limit, streak broken
      EXIT;
    END IF;

    _check_date := _check_date - 1;

    -- Safety: don't go back more than 365 days
    IF _streak >= 365 THEN
      EXIT;
    END IF;
  END LOOP;

  RETURN _streak;
END;
$$;


-- ─────────────────────────────────────────────────────────────────────────────
-- Function: update_daily_snapshot()
-- Purpose: Upsert daily_snapshots row when a transaction is created
-- Called: Via trigger on transactions INSERT
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.update_daily_snapshot()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _snapshot_date DATE;
  _user_budget BIGINT;
  _total_spent BIGINT;
  _qris_count INT;
  _total_txns INT;
  _streak INT;
BEGIN
  -- Calculate the snapshot date in WIB timezone
  _snapshot_date := (NEW.transaction_date AT TIME ZONE 'Asia/Jakarta')::DATE;

  -- Get user's daily budget
  SELECT u.daily_budget
  INTO _user_budget
  FROM public.users u
  WHERE u.id = NEW.user_id;

  _user_budget := COALESCE(_user_budget, 0);

  -- Aggregate all transactions for this user on this date
  SELECT
    COALESCE(SUM(t.amount), 0),
    COALESCE(COUNT(*) FILTER (WHERE t.payment_method = 'qris'), 0),
    COALESCE(COUNT(*), 0)
  INTO _total_spent, _qris_count, _total_txns
  FROM public.transactions t
  WHERE t.user_id = NEW.user_id
    AND (t.transaction_date AT TIME ZONE 'Asia/Jakarta')::DATE = _snapshot_date;

  -- Calculate streak
  _streak := public.calculate_qris_streak(NEW.user_id);

  -- Upsert the daily snapshot
  INSERT INTO public.daily_snapshots (
    user_id,
    snapshot_date,
    budget,
    spent,
    qris_count,
    total_transactions,
    saved,
    streak_days
  ) VALUES (
    NEW.user_id,
    _snapshot_date,
    _user_budget,
    _total_spent,
    _qris_count,
    _total_txns,
    _user_budget - _total_spent,
    _streak
  )
  ON CONFLICT (user_id, snapshot_date) DO UPDATE SET
    budget = EXCLUDED.budget,
    spent = EXCLUDED.spent,
    qris_count = EXCLUDED.qris_count,
    total_transactions = EXCLUDED.total_transactions,
    saved = EXCLUDED.saved,
    streak_days = EXCLUDED.streak_days;

  RETURN NEW;
END;
$$;


-- ─────────────────────────────────────────────────────────────────────────────
-- Function: trigger_check_impulse()
-- Purpose: Wrapper trigger function to call check_impulse on INSERT
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.trigger_check_impulse()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only check QRIS transactions for impulse behavior
  IF NEW.payment_method = 'qris' THEN
    PERFORM public.check_impulse(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;


-- ─────────────────────────────────────────────────────────────────────────────
-- Function: get_weekly_stats()
-- Purpose: Returns weekly spending summary for a user
-- Parameters: p_user_id UUID
-- Returns: JSON with total_spent, qris_count, top_category, impulse_count,
--          previous_week_spent, change_percentage, daily_breakdown
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_weekly_stats(
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _result JSONB;
  _week_start TIMESTAMPTZ;
  _week_end TIMESTAMPTZ;
  _prev_week_start TIMESTAMPTZ;
  _prev_week_end TIMESTAMPTZ;
  _total_spent BIGINT;
  _qris_count INT;
  _impulse_count INT;
  _top_category TEXT;
  _top_category_amount BIGINT;
  _prev_total_spent BIGINT;
  _change_pct NUMERIC;
  _daily_breakdown JSONB;
  _category_breakdown JSONB;
  _total_transactions INT;
  _avg_per_transaction BIGINT;
BEGIN
  -- Define current week (Monday to now, WIB timezone)
  _week_end := NOW();
  _week_start := date_trunc('week', NOW() AT TIME ZONE 'Asia/Jakarta')
                 AT TIME ZONE 'Asia/Jakarta';
  _prev_week_end := _week_start;
  _prev_week_start := _week_start - INTERVAL '7 days';

  -- Current week aggregates
  SELECT
    COALESCE(SUM(t.amount), 0),
    COALESCE(COUNT(*) FILTER (WHERE t.payment_method = 'qris'), 0),
    COALESCE(COUNT(*) FILTER (WHERE t.is_impulse = TRUE), 0),
    COALESCE(COUNT(*), 0)
  INTO _total_spent, _qris_count, _impulse_count, _total_transactions
  FROM public.transactions t
  WHERE t.user_id = p_user_id
    AND t.transaction_date >= _week_start
    AND t.transaction_date <= _week_end;

  -- Average per transaction
  IF _total_transactions > 0 THEN
    _avg_per_transaction := _total_spent / _total_transactions;
  ELSE
    _avg_per_transaction := 0;
  END IF;

  -- Top category this week
  SELECT t.category::TEXT, COALESCE(SUM(t.amount), 0)
  INTO _top_category, _top_category_amount
  FROM public.transactions t
  WHERE t.user_id = p_user_id
    AND t.transaction_date >= _week_start
    AND t.transaction_date <= _week_end
  GROUP BY t.category
  ORDER BY SUM(t.amount) DESC
  LIMIT 1;

  _top_category := COALESCE(_top_category, 'other');
  _top_category_amount := COALESCE(_top_category_amount, 0);

  -- Previous week total
  SELECT COALESCE(SUM(t.amount), 0)
  INTO _prev_total_spent
  FROM public.transactions t
  WHERE t.user_id = p_user_id
    AND t.transaction_date >= _prev_week_start
    AND t.transaction_date < _prev_week_end;

  -- Week-over-week change percentage
  IF _prev_total_spent > 0 THEN
    _change_pct := ROUND(
      ((_total_spent::NUMERIC - _prev_total_spent::NUMERIC) / _prev_total_spent::NUMERIC) * 100,
      1
    );
  ELSE
    _change_pct := CASE WHEN _total_spent > 0 THEN 100.0 ELSE 0.0 END;
  END IF;

  -- Daily breakdown (last 7 days)
  SELECT COALESCE(jsonb_agg(day_data ORDER BY day_data->>'date'), '[]'::JSONB)
  INTO _daily_breakdown
  FROM (
    SELECT jsonb_build_object(
      'date', d::DATE,
      'spent', COALESCE(SUM(t.amount), 0),
      'transactions', COALESCE(COUNT(t.id), 0),
      'qris_count', COALESCE(COUNT(t.id) FILTER (WHERE t.payment_method = 'qris'), 0)
    ) AS day_data
    FROM generate_series(
      (_week_start AT TIME ZONE 'Asia/Jakarta')::DATE,
      (NOW() AT TIME ZONE 'Asia/Jakarta')::DATE,
      '1 day'::INTERVAL
    ) AS d
    LEFT JOIN public.transactions t
      ON t.user_id = p_user_id
      AND (t.transaction_date AT TIME ZONE 'Asia/Jakarta')::DATE = d::DATE
    GROUP BY d
  ) sub;

  -- Category breakdown
  SELECT COALESCE(jsonb_agg(cat_data), '[]'::JSONB)
  INTO _category_breakdown
  FROM (
    SELECT jsonb_build_object(
      'category', t.category::TEXT,
      'total', SUM(t.amount),
      'count', COUNT(*),
      'percentage', ROUND(
        (SUM(t.amount)::NUMERIC / NULLIF(_total_spent, 0)::NUMERIC) * 100, 1
      )
    ) AS cat_data
    FROM public.transactions t
    WHERE t.user_id = p_user_id
      AND t.transaction_date >= _week_start
      AND t.transaction_date <= _week_end
    GROUP BY t.category
    ORDER BY SUM(t.amount) DESC
  ) sub;

  -- Build result JSON
  _result := jsonb_build_object(
    'user_id', p_user_id,
    'week_start', _week_start,
    'week_end', _week_end,
    'total_spent', _total_spent,
    'total_transactions', _total_transactions,
    'avg_per_transaction', _avg_per_transaction,
    'qris_count', _qris_count,
    'impulse_count', _impulse_count,
    'top_category', _top_category,
    'top_category_amount', _top_category_amount,
    'previous_week_spent', _prev_total_spent,
    'change_percentage', _change_pct,
    'daily_breakdown', _daily_breakdown,
    'category_breakdown', _category_breakdown,
    'streak_days', public.calculate_qris_streak(p_user_id)
  );

  RETURN _result;
END;
$$;


-- ─────────────────────────────────────────────────────────────────────────────
-- Triggers on transactions table
-- ─────────────────────────────────────────────────────────────────────────────

-- Trigger: Update daily snapshot after each transaction insert
DROP TRIGGER IF EXISTS trg_update_daily_snapshot ON public.transactions;
CREATE TRIGGER trg_update_daily_snapshot
  AFTER INSERT ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_daily_snapshot();

-- Trigger: Check impulse after each transaction insert
-- Use a CONSTRAINT trigger with INITIALLY DEFERRED so the row exists
-- when check_impulse queries it
DROP TRIGGER IF EXISTS trg_check_impulse ON public.transactions;
CREATE CONSTRAINT TRIGGER trg_check_impulse
  AFTER INSERT ON public.transactions
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_check_impulse();


-- ─────────────────────────────────────────────────────────────────────────────
-- Function: auto_complete_goal()
-- Purpose: Mark goal as completed when current_amount >= target_amount
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.auto_complete_goal()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.current_amount >= NEW.target_amount AND NOT NEW.is_completed THEN
    NEW.is_completed := TRUE;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_complete_goal ON public.goals;
CREATE TRIGGER trg_auto_complete_goal
  BEFORE UPDATE ON public.goals
  FOR EACH ROW
  WHEN (NEW.current_amount IS DISTINCT FROM OLD.current_amount)
  EXECUTE FUNCTION public.auto_complete_goal();
