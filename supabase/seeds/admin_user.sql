-- ============================================================
-- Pwen Books — Admin Account Setup
-- Run this ONCE in the Supabase SQL Editor.
-- ============================================================
--
-- Admin credentials:
--   Email   : admin@pwen.la
--   Password: Admin@Pwen1
--
-- After running this, sign in at /auth using the email tab.
-- ============================================================

-- 1. Create auth user (email confirmed, no verification email needed)
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  aud,
  role,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change
) VALUES (
  'e0000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'admin@pwen.la',
  crypt('Admin@Pwen1', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"name":"Platform Admin"}'::jsonb,
  'authenticated',
  'authenticated',
  now(),
  now(),
  '', '', '', ''
)
ON CONFLICT (id) DO NOTHING;

-- 2. Create email identity (provider_id = email for the email provider)
INSERT INTO auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  provider_id,
  last_sign_in_at,
  created_at,
  updated_at
) VALUES (
  'e0000000-0000-0000-0000-000000000001',
  'e0000000-0000-0000-0000-000000000001',
  '{"sub":"e0000000-0000-0000-0000-000000000001","email":"admin@pwen.la"}'::jsonb,
  'email',
  'admin@pwen.la',
  now(),
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

-- 3. Promote to ADMIN role
-- (The on_auth_user_created trigger already created the public.users row with CUSTOMER role)
UPDATE public.users
SET role = 'ADMIN', name = 'Platform Admin'
WHERE id = 'e0000000-0000-0000-0000-000000000001';

-- ── To promote YOUR own account instead ──────────────────────────────────────
-- Replace the email below with the email you used to sign up:
--
-- UPDATE public.users SET role = 'ADMIN' WHERE email = 'your@email.com';
-- ─────────────────────────────────────────────────────────────────────────────
