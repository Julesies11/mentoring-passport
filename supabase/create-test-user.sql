-- Create a test admin user for development/testing
-- Email: admin@test.com
-- Password: Admin123!

-- This SQL creates a user in Supabase auth.users table
-- Run this in your Supabase SQL Editor

-- Insert user into auth.users
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  invited_at,
  confirmation_token,
  confirmation_sent_at,
  recovery_token,
  recovery_sent_at,
  email_change_token_new,
  email_change,
  email_change_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  created_at,
  updated_at,
  phone,
  phone_confirmed_at,
  phone_change,
  phone_change_token,
  phone_change_sent_at,
  email_change_token_current,
  email_change_confirm_status,
  banned_until,
  reauthentication_token,
  reauthentication_sent_at,
  is_sso_user,
  deleted_at
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'admin@test.com',
  -- This is the encrypted password for 'Admin123!'
  -- Generated using Supabase's crypt function with bcrypt
  crypt('Admin123!', gen_salt('bf')),
  NOW(),
  NULL,
  '',
  NULL,
  '',
  NULL,
  '',
  '',
  NULL,
  NULL,
  '{"provider":"email","providers":["email"]}',
  '{"username":"admin","first_name":"Test","last_name":"Admin","fullname":"Test Admin","is_admin":true}',
  NULL,
  NOW(),
  NOW(),
  NULL,
  NULL,
  '',
  '',
  NULL,
  '',
  0,
  NULL,
  '',
  NULL,
  false,
  NULL
)
ON CONFLICT (email) DO NOTHING;

-- Update the profile to supervisor role (trigger auto-created it as mentee)
UPDATE mp_profiles 
SET role = 'supervisor', 
    full_name = 'Test Admin',
    department = 'Administration'
WHERE email = 'admin@test.com';

-- Verify the user and profile were created
SELECT 
  u.id, 
  u.email, 
  p.role,
  p.full_name,
  p.department
FROM auth.users u
LEFT JOIN mp_profiles p ON u.id = p.id
WHERE u.email = 'admin@test.com';
