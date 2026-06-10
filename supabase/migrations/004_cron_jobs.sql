-- =============================================================================
-- UPlan Finance Tracker - Cron Jobs
-- Migration: 004_cron_jobs.sql
-- Description: Scheduled jobs for weekly summaries and daily snapshot resets
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- Enable pg_cron extension
-- ─────────────────────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Grant usage to postgres role (required for Supabase)
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;

-- ─────────────────────────────────────────────────────────────────────────────
-- Function: generate_daily_snapshots()
-- Purpose: Create/reset daily snapshot rows for all active users at midnight WIB
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.generate_daily_snapshots()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _today DATE;
BEGIN
  -- Calculate today's date in WIB (Asia/Jakarta)
  _today := (NOW() AT TIME ZONE 'Asia/Jakarta')::DATE;

  -- Create snapshot rows for all users who don't have one yet for today
  INSERT INTO public.daily_snapshots (
    user_id,
    snapshot_date,
    budget,
    spent,
    qris_count,
    total_transactions,
    saved,
    streak_days
  )
  SELECT
    u.id,
    _today,
    u.daily_budget,
    0,
    0,
    0,
    u.daily_budget,
    public.calculate_qris_streak(u.id)
  FROM public.users u
  WHERE NOT EXISTS (
    SELECT 1 FROM public.daily_snapshots ds
    WHERE ds.user_id = u.id AND ds.snapshot_date = _today
  )
  ON CONFLICT (user_id, snapshot_date) DO NOTHING;

  RAISE NOTICE 'Daily snapshots generated for date: %', _today;
END;
$$;


-- ─────────────────────────────────────────────────────────────────────────────
-- Function: trigger_weekly_summary()
-- Purpose: Called by cron to invoke the weekly-summary Edge Function
-- Note: In production, this calls the Edge Function via pg_net or
--       the Edge Function is triggered by its own cron schedule.
--       Here we prepare the data and log the event.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.trigger_weekly_summary()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user RECORD;
  _stats JSONB;
  _summary_count INT := 0;
BEGIN
  -- Iterate through all users who have weekly_summary enabled
  FOR _user IN
    SELECT u.id, u.full_name, u.fcm_token
    FROM public.users u
    JOIN public.notification_preferences np ON np.user_id = u.id
    WHERE np.weekly_summary = TRUE
      AND np.push_enabled = TRUE
  LOOP
    -- Generate weekly stats for each user
    _stats := public.get_weekly_stats(_user.id);

    -- Log the summary generation (actual push notification is sent via Edge Function)
    RAISE NOTICE 'Weekly summary generated for user: % (%), total_spent: %',
      _user.full_name,
      _user.id,
      _stats->>'total_spent';

    _summary_count := _summary_count + 1;
  END LOOP;

  RAISE NOTICE 'Weekly summaries generated for % users', _summary_count;
END;
$$;


-- ─────────────────────────────────────────────────────────────────────────────
-- Cron Job: Daily Snapshot Reset
-- Schedule: Every day at midnight WIB (17:00 UTC previous day)
-- ─────────────────────────────────────────────────────────────────────────────
SELECT cron.unschedule('uplan-daily-snapshot-reset')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'uplan-daily-snapshot-reset'
);

SELECT cron.schedule(
  'uplan-daily-snapshot-reset',    -- job name
  '0 17 * * *',                    -- every day at 17:00 UTC = 00:00 WIB (UTC+7)
  $$SELECT public.generate_daily_snapshots()$$
);


-- ─────────────────────────────────────────────────────────────────────────────
-- Cron Job: Weekly Summary
-- Schedule: Every Sunday at 09:00 WIB (02:00 UTC)
-- ─────────────────────────────────────────────────────────────────────────────
SELECT cron.unschedule('uplan-weekly-summary')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'uplan-weekly-summary'
);

SELECT cron.schedule(
  'uplan-weekly-summary',          -- job name
  '0 2 * * 0',                    -- every Sunday at 02:00 UTC = 09:00 WIB
  $$SELECT public.trigger_weekly_summary()$$
);


-- ─────────────────────────────────────────────────────────────────────────────
-- Cron Job: Clean up old daily snapshots (older than 1 year)
-- Schedule: 1st of every month at 03:00 UTC (10:00 WIB)
-- ─────────────────────────────────────────────────────────────────────────────
SELECT cron.unschedule('uplan-cleanup-old-snapshots')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'uplan-cleanup-old-snapshots'
);

SELECT cron.schedule(
  'uplan-cleanup-old-snapshots',   -- job name
  '0 3 1 * *',                    -- 1st of every month at 03:00 UTC
  $$DELETE FROM public.daily_snapshots WHERE snapshot_date < (NOW() - INTERVAL '1 year')::DATE$$
);
