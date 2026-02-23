# Debug RLS Issue - Step by Step

## Run these queries in Supabase SQL Editor to diagnose the issue:

### 1. Check your current user ID and role
```sql
SELECT 
  auth.uid() as my_user_id,
  mp_get_my_role() as my_role,
  p.email,
  p.role as profile_role,
  p.status
FROM mp_profiles p
WHERE p.id = auth.uid();
```

**Expected result:** Should show your user with role = 'supervisor'

### 2. If role is NOT 'supervisor', update it:
```sql
UPDATE mp_profiles 
SET role = 'supervisor' 
WHERE id = auth.uid();
```

### 3. Test the RLS policy directly
```sql
-- This should return true for supervisors
SELECT mp_get_my_role() = 'supervisor' as is_supervisor;
```

### 4. Check if the RLS policy exists
```sql
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'mp_pairs';
```

**Expected:** Should see "Supervisors can manage pairs" policy

### 5. Try to insert a pair directly (bypass app)
```sql
-- Replace with actual mentor and mentee IDs from your database
INSERT INTO mp_pairs (mentor_id, mentee_id, status)
VALUES (
  'mentor-user-id-here',
  'mentee-user-id-here',
  'active'
)
RETURNING *;
```

### 6. If direct insert works, the issue is in the app
If direct insert fails with same RLS error, run this:

```sql
-- Temporarily check what the function returns
SELECT 
  auth.uid() as current_user,
  (SELECT role FROM mp_profiles WHERE id = auth.uid()) as role_from_query,
  mp_get_my_role() as role_from_function;
```

### 7. Nuclear option - Temporarily disable RLS to test
```sql
-- ONLY FOR TESTING - DO NOT LEAVE THIS IN PRODUCTION
ALTER TABLE mp_pairs DISABLE ROW LEVEL SECURITY;

-- Try creating pair in app

-- Re-enable RLS immediately after
ALTER TABLE mp_pairs ENABLE ROW LEVEL SECURITY;
```

## Most Common Issues:

1. **User doesn't have supervisor role** - Run query #1 and #2
2. **Function not returning correct role** - Run query #6
3. **Policy not applied** - Run query #4
4. **Cache issue** - Refresh app, clear browser cache, or logout/login

## Report Back:
Run query #1 first and tell me what you see!
