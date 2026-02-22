# Database Migrations

## Running the Schema Migration

### Option 1: Supabase Dashboard (Recommended)

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Navigate to **SQL Editor** in the left sidebar
4. Click **New query**
5. Copy the entire contents of `001_schema.sql`
6. Paste into the SQL Editor
7. Click **Run** or press `Ctrl+Enter`

### Option 2: Supabase CLI

```bash
supabase db push
```

## What This Migration Creates

### Tables (all prefixed with `mp_`)
- `mp_profiles` - User profiles linked to auth.users
- `mp_pairs` - Mentor-mentee pairings
- `mp_tasks` - Predefined checklist tasks (25 tasks across groups A-E)
- `mp_pair_tasks` - Task completion tracking per pair
- `mp_meetings` - Meeting records
- `mp_meeting_subtasks` - Meeting checklist items
- `mp_evidence` - Photo and text evidence submissions
- `mp_notes` - Shared and private notes
- `mp_notifications` - User notifications

### Storage Buckets
- `evidence-photos` - For evidence photo uploads (private)
- `avatars` - For user profile pictures (public)

### Triggers
- Auto-creates `mp_profiles` row when user signs up
- Auto-creates `mp_pair_tasks` for all tasks when pair is created
- Auto-updates `updated_at` timestamps

### RLS Policies
- Role-based access control (supervisor, mentor, mentee)
- Supervisors can manage everything
- Mentors and mentees can only access their own pairs
- Users can only see their own notifications

### Seed Data
- 25 predefined tasks across groups A-E
- Tasks include evidence types: photo, notes, or n/a

## After Running Migration

1. Run the test user creation script: `create-test-user.sql`
2. The test user will have a profile auto-created via trigger
3. Update the profile role to 'supervisor' if needed:

```sql
UPDATE mp_profiles 
SET role = 'supervisor' 
WHERE email = 'admin@test.com';
```

## Verification

Check that everything was created:

```sql
-- Check tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'mp_%';

-- Check storage buckets
SELECT * FROM storage.buckets;

-- Check seed data
SELECT COUNT(*) FROM mp_tasks; -- Should return 25

-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename LIKE 'mp_%';
```
