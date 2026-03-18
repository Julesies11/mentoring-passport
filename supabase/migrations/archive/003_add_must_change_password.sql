-- Add must_change_password column to mp_profiles
-- This flag forces users to change their password on first login

ALTER TABLE mp_profiles
ADD COLUMN must_change_password BOOLEAN NOT NULL DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN mp_profiles.must_change_password IS 'Flag to force password change on first login. Set to true when supervisor creates account with temporary password.';
