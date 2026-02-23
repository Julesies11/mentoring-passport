# Supabase Configuration Fix - Email Confirmation Issue

## 🔴 Problem

Participants are not being saved to `auth.users` or `mp_profiles` table because Supabase requires email confirmation by default, but users never receive confirmation emails (or can't access them).

## ✅ Solution

You need to **disable email confirmation** in Supabase settings.

---

## 📋 Step-by-Step Fix

### Option 1: Disable Email Confirmation (Recommended for Internal Apps)

1. **Open Supabase Dashboard**
   - Go to your project: https://supabase.com/dashboard

2. **Navigate to Authentication Settings**
   - Click **Authentication** in left sidebar
   - Click **Settings** (or **Providers**)
   - Scroll to **Email Auth** section

3. **Disable Email Confirmation**
   - Find the setting: **"Confirm email"** or **"Enable email confirmations"**
   - **Toggle it OFF** (disable it)
   - Click **Save**

4. **Test Participant Creation**
   - Try creating a new participant
   - User should be created immediately
   - User can log in right away with provided credentials

---

### Option 2: Enable Auto-Confirm for Signups (Alternative)

If you can't find the "Confirm email" toggle, try this:

1. **Go to Authentication → Settings**
2. Look for **"Enable email confirmations"** under Email Auth
3. **Uncheck/Disable** this option
4. Save changes

---

### Option 3: Use Supabase Admin API (Code Change)

If you need to keep email confirmation enabled for other users but want supervisors to create pre-confirmed users:

**Update the API to use admin privileges:**

```typescript
// In src/lib/api/participants.ts
import { createClient } from '@supabase/supabase-js';

// Create admin client (requires service role key)
const supabaseAdmin = createClient(
  import.meta.env.VITE_SUPABASE_URL!,
  import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY!, // Service role key
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export async function createParticipant(input: CreateParticipantInput): Promise<Participant> {
  // Use admin API to create user with email_confirm: true
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true, // Auto-confirm email
    user_metadata: {
      full_name: input.full_name || '',
    },
  });

  // ... rest of the code
}
```

**Add service role key to `.env`:**
```
VITE_SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

⚠️ **Warning**: Service role key bypasses RLS. Only use in secure server-side code.

---

## 🧪 Testing After Fix

1. **Create a test participant:**
   - Email: `test.participant@example.com`
   - Password: `TestPass123!`
   - Role: Mentee
   - Name: Test Participant

2. **Check browser console** for logs:
   - Look for: `"Creating participant: test.participant@example.com"`
   - Look for: `"Auth signup result:"`
   - Check if `authData.user` exists
   - Check if `email_confirmed_at` is set

3. **Verify in Supabase Dashboard:**
   - Go to **Authentication → Users**
   - Look for the new user
   - Check if email is confirmed (green checkmark)

4. **Verify in Database:**
   - Go to **Table Editor → mp_profiles**
   - Look for the new profile
   - Check if `must_change_password` is `true`

5. **Test Login:**
   - Log out from supervisor account
   - Try logging in as the new participant
   - Should redirect to change password page

---

## 🔍 Debugging Checklist

If participant creation still fails, check:

### 1. Browser Console Logs
Open browser DevTools (F12) and check for:
- ✅ `"Creating participant: [email]"`
- ✅ `"Auth signup result:"` - should show user data
- ❌ Any error messages

### 2. Supabase Dashboard - Authentication
- Go to **Authentication → Users**
- Check if user appears in the list
- If user exists but email not confirmed:
  - **Email confirmation is still enabled** → Disable it
- If user doesn't exist at all:
  - Check for error in browser console
  - Check Supabase logs

### 3. Supabase Dashboard - Logs
- Go to **Logs → Auth Logs**
- Look for signup events
- Check for any errors

### 4. Database Trigger
Verify the `mp_handle_new_user` trigger is working:

```sql
-- Check if trigger exists
SELECT * FROM pg_trigger WHERE tgname = 'mp_on_auth_user_created';

-- Check if function exists
SELECT * FROM pg_proc WHERE proname = 'mp_handle_new_user';

-- Test the trigger manually
SELECT mp_handle_new_user();
```

### 5. RLS Policies
Check if RLS policies are blocking the insert:

```sql
-- Temporarily disable RLS to test (DON'T LEAVE THIS IN PRODUCTION)
ALTER TABLE mp_profiles DISABLE ROW LEVEL SECURITY;

-- Try creating a participant

-- Re-enable RLS
ALTER TABLE mp_profiles ENABLE ROW LEVEL SECURITY;
```

---

## 🎯 Expected Behavior After Fix

### When Supervisor Creates Participant:

1. **Browser Console Shows:**
   ```
   Creating participant: john.doe@example.com
   Auth signup result: {
     authData: {
       user: { id: "...", email: "john.doe@example.com", email_confirmed_at: "2024-..." },
       session: { ... }
     },
     authError: null
   }
   Profile update result: {
     profile: { id: "...", email: "john.doe@example.com", role: "mentee", must_change_password: true },
     profileError: null
   }
   ```

2. **Credentials Dialog Appears**
   - Shows all participant details
   - Copy button works

3. **Supabase Dashboard Shows:**
   - New user in **Authentication → Users** (email confirmed ✓)
   - New profile in **Table Editor → mp_profiles**

### When Participant Logs In:

1. **First Login:**
   - User enters email and temporary password
   - Redirected to `/auth/change-password`
   - Changes password
   - Redirected to dashboard

2. **Subsequent Logins:**
   - User enters email and new password
   - Goes directly to dashboard

---

## 🚨 Common Issues

### Issue: "User created but email not confirmed"

**Cause**: Email confirmation is still enabled in Supabase

**Fix**: 
1. Go to Authentication → Settings
2. Disable "Confirm email"
3. Try creating participant again

### Issue: "Profile was not created by trigger"

**Cause**: The `mp_handle_new_user` trigger is not firing

**Fix**:
1. Check if trigger exists (see SQL above)
2. Verify trigger is enabled
3. Check Supabase logs for trigger errors

### Issue: "Failed to update profile: permission denied"

**Cause**: RLS policies are blocking the update

**Fix**:
1. Verify you're logged in as supervisor
2. Check RLS policies on `mp_profiles` table
3. Ensure supervisors have update permissions

### Issue: User appears in auth.users but not in mp_profiles

**Cause**: Trigger failed to create profile

**Fix**:
1. Check trigger function for errors
2. Manually create profile:
   ```sql
   INSERT INTO mp_profiles (id, email, role)
   VALUES ('user-id-here', 'email@example.com', 'mentee');
   ```

---

## 📝 Summary

**Most Common Fix**: Disable email confirmation in Supabase Authentication settings.

**Steps**:
1. Supabase Dashboard → Authentication → Settings
2. Find "Confirm email" or "Enable email confirmations"
3. Toggle OFF
4. Save
5. Test participant creation

After this fix, participants will be created immediately and can log in right away with the credentials provided by the supervisor.
