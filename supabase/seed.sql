-- =============================================================================
-- UPlan Finance Tracker - Seed Data
-- File: seed.sql
-- Description: Demo user with sample transactions, goals, and preferences
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- Demo User: Fixed UUID for reproducible development
-- ─────────────────────────────────────────────────────────────────────────────
-- NOTE: In local dev, you must first create an auth.users entry.
-- Supabase CLI `supabase db seed` runs after migrations, so the
-- handle_new_user trigger will auto-create the public.users row.
-- We insert directly here for a complete seed.

-- Create auth user (only works in local dev / seeding context)
INSERT INTO auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token
) VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'demo@uplan.id',
  crypt('demo123456', gen_salt('bf')),
  NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{"full_name": "Andi Pratama", "avatar_url": null}',
  NOW(),
  NOW(),
  '',
  ''
) ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- User Profile (in case trigger didn't fire or for direct seeding)
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO public.users (
  id,
  email,
  full_name,
  avatar_url,
  monthly_income,
  daily_budget,
  qris_daily_limit,
  impulse_threshold,
  theme,
  fcm_token
) VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'demo@uplan.id',
  'Andi Pratama',
  NULL,
  5000000,   -- Rp 5.000.000/month
  150000,    -- Rp 150.000/day
  6,
  50000,     -- Rp 50.000 impulse threshold
  'system',
  NULL
) ON CONFLICT (id) DO UPDATE SET
  monthly_income = EXCLUDED.monthly_income,
  daily_budget = EXCLUDED.daily_budget;

-- ─────────────────────────────────────────────────────────────────────────────
-- Notification Preferences
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO public.notification_preferences (
  user_id,
  push_enabled,
  qris_alerts,
  daily_reminder,
  weekly_summary,
  spending_triggers
) VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  TRUE,
  TRUE,
  TRUE,
  TRUE,
  ARRAY['qris', 'card']::TEXT[]
) ON CONFLICT (user_id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- Sample Transactions (last 14 days, variety of categories and methods)
-- ─────────────────────────────────────────────────────────────────────────────

-- Today's transactions
INSERT INTO public.transactions (user_id, amount, merchant_name, category, payment_method, note, is_impulse, transaction_date) VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 35000, 'Kopi Kenangan', 'coffee', 'qris', 'Iced Tiger Sugar', FALSE, NOW() - INTERVAL '2 hours'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 25000, 'Warteg Bu Siti', 'food', 'qris', 'Nasi ayam + teh', FALSE, NOW() - INTERVAL '5 hours'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 12000, 'Indomaret', 'shopping', 'qris', 'Snack sore', TRUE, NOW() - INTERVAL '1 hour');

-- Yesterday's transactions
INSERT INTO public.transactions (user_id, amount, merchant_name, category, payment_method, note, is_impulse, transaction_date) VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 45000, 'Fore Coffee', 'coffee', 'qris', 'Kopi susu + croissant', FALSE, NOW() - INTERVAL '1 day 3 hours'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 28000, 'Grab Transport', 'transport', 'qris', 'Kampus ke kos', FALSE, NOW() - INTERVAL '1 day 6 hours'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 55000, 'Solaria', 'food', 'card', 'Makan bareng temen', FALSE, NOW() - INTERVAL '1 day 8 hours'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 15000, 'Alfamart', 'shopping', 'qris', 'Minuman dingin', TRUE, NOW() - INTERVAL '1 day 2 hours');

-- 2 days ago
INSERT INTO public.transactions (user_id, amount, merchant_name, category, payment_method, note, is_impulse, transaction_date) VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 150000, 'Tokopedia', 'shopping', 'transfer', 'Case HP baru', FALSE, NOW() - INTERVAL '2 days 4 hours'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 22000, 'Kopi Tuku', 'coffee', 'qris', 'Es kopi susu tetangga', FALSE, NOW() - INTERVAL '2 days 3 hours'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 30000, 'Gojek', 'transport', 'qris', 'GoRide ke mall', FALSE, NOW() - INTERVAL '2 days 6 hours');

-- 3 days ago
INSERT INTO public.transactions (user_id, amount, merchant_name, category, payment_method, note, is_impulse, transaction_date) VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 18000, 'Mie Ayam Pak Kumis', 'food', 'cash', 'Mie ayam bakso', FALSE, NOW() - INTERVAL '3 days 5 hours'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 40000, 'Janji Jiwa', 'coffee', 'qris', 'Jiwa Toast + Kopi', FALSE, NOW() - INTERVAL '3 days 2 hours'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 75000, 'CGV Cinema', 'entertainment', 'qris', 'Nonton film bareng', FALSE, NOW() - INTERVAL '3 days 9 hours');

-- 4 days ago
INSERT INTO public.transactions (user_id, amount, merchant_name, category, payment_method, note, is_impulse, transaction_date) VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 350000, 'Apotek K-24', 'health', 'transfer', 'Vitamin + obat flu', FALSE, NOW() - INTERVAL '4 days 3 hours'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 32000, 'Starbucks', 'coffee', 'qris', 'Caramel Macchiato', FALSE, NOW() - INTERVAL '4 days 7 hours'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 25000, 'Grab Transport', 'transport', 'qris', 'Ke apotek', FALSE, NOW() - INTERVAL '4 days 4 hours');

-- 5 days ago
INSERT INTO public.transactions (user_id, amount, merchant_name, category, payment_method, note, is_impulse, transaction_date) VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 85000, 'Padang Sederhana', 'food', 'qris', 'Rendang + nasi', FALSE, NOW() - INTERVAL '5 days 6 hours'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 10000, 'Mixue', 'food', 'qris', 'Es krim murah', TRUE, NOW() - INTERVAL '5 days 2 hours'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 8000, 'Mixue', 'food', 'qris', 'Boba tea', TRUE, NOW() - INTERVAL '5 days 1 hour');

-- 6 days ago
INSERT INTO public.transactions (user_id, amount, merchant_name, category, payment_method, note, is_impulse, transaction_date) VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 500000, 'PLN', 'bills', 'transfer', 'Token listrik kos', FALSE, NOW() - INTERVAL '6 days 10 hours'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 38000, 'Point Coffee', 'coffee', 'qris', 'Vanilla latte', FALSE, NOW() - INTERVAL '6 days 3 hours');

-- 7-10 days ago (previous week data for comparison)
INSERT INTO public.transactions (user_id, amount, merchant_name, category, payment_method, note, is_impulse, transaction_date) VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 42000, 'Kopi Kenangan', 'coffee', 'qris', 'Weekend coffee', FALSE, NOW() - INTERVAL '8 days 4 hours'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 120000, 'Shopee', 'shopping', 'transfer', 'Earphone bluetooth', FALSE, NOW() - INTERVAL '9 days 5 hours'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 65000, 'McDonald''s', 'food', 'qris', 'McD bareng squad', FALSE, NOW() - INTERVAL '9 days 7 hours'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 35000, 'Gojek', 'transport', 'qris', 'GoRide pulang malam', FALSE, NOW() - INTERVAL '10 days 2 hours'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 200000, 'Uniqlo', 'shopping', 'card', 'Kaos diskon', FALSE, NOW() - INTERVAL '10 days 8 hours'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 15000, 'Chatime', 'food', 'qris', 'Bubble tea', TRUE, NOW() - INTERVAL '11 days 3 hours'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 50000, 'Spotify', 'entertainment', 'transfer', 'Premium bulanan', FALSE, NOW() - INTERVAL '12 days 1 hour');

-- ─────────────────────────────────────────────────────────────────────────────
-- Sample Goals (3 goals with various progress)
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO public.goals (user_id, title, description, target_amount, current_amount, emoji, color, deadline, is_completed) VALUES
  (
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'iPhone 16',
    'Nabung buat beli iPhone 16 pas THR turun',
    18000000,
    5400000,
    '📱',
    'pink',
    '2026-12-31',
    FALSE
  ),
  (
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'Trip Bali',
    'Liburan semester bareng bestie ke Bali',
    3500000,
    2800000,
    '🏖️',
    'blue',
    '2026-08-15',
    FALSE
  ),
  (
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'Dana Darurat',
    'Target 3x pengeluaran bulanan untuk emergency fund',
    15000000,
    15000000,
    '🛡️',
    'green',
    NULL,
    TRUE
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- Sample Daily Snapshots (last 7 days)
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO public.daily_snapshots (user_id, snapshot_date, budget, spent, qris_count, total_transactions, saved, streak_days) VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', (NOW() AT TIME ZONE 'Asia/Jakarta')::DATE, 150000, 72000, 3, 3, 78000, 5),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', ((NOW() - INTERVAL '1 day') AT TIME ZONE 'Asia/Jakarta')::DATE, 150000, 143000, 3, 4, 7000, 4),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', ((NOW() - INTERVAL '2 days') AT TIME ZONE 'Asia/Jakarta')::DATE, 150000, 202000, 2, 3, -52000, 3),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', ((NOW() - INTERVAL '3 days') AT TIME ZONE 'Asia/Jakarta')::DATE, 150000, 133000, 2, 3, 17000, 2),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', ((NOW() - INTERVAL '4 days') AT TIME ZONE 'Asia/Jakarta')::DATE, 150000, 407000, 2, 3, -257000, 1),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', ((NOW() - INTERVAL '5 days') AT TIME ZONE 'Asia/Jakarta')::DATE, 150000, 103000, 3, 3, 47000, 0),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', ((NOW() - INTERVAL '6 days') AT TIME ZONE 'Asia/Jakarta')::DATE, 150000, 538000, 1, 2, -388000, 0)
ON CONFLICT (user_id, snapshot_date) DO UPDATE SET
  budget = EXCLUDED.budget,
  spent = EXCLUDED.spent,
  qris_count = EXCLUDED.qris_count,
  total_transactions = EXCLUDED.total_transactions,
  saved = EXCLUDED.saved,
  streak_days = EXCLUDED.streak_days;
