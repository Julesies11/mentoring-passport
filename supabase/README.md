# Supabase Setup Instructions

## Creating the Test Admin User

To use the Quick Test Login button on the sign-in page, you need to create a test user in your Supabase database.

### Steps:

1. **Open Supabase Dashboard**
   - Go to https://supabase.com/dashboard
   - Select your project

2. **Navigate to SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Click "New query"

3. **Run the SQL Script**
   - Copy the contents of `create-test-user.sql`
   - Paste it into the SQL Editor
   - Click "Run" or press `Ctrl+Enter`

4. **Verify User Creation**
   - The script will create a user with:
     - **Email**: `admin@test.com`
     - **Password**: `Admin123!`
   - You should see a success message and the user details

5. **Test the Login**
   - Go to your app's sign-in page
   - Click the "🚀 Quick Test Login" button
   - You should be automatically logged in

### Test User Details

- **Email**: admin@test.com
- **Password**: Admin123!
- **Name**: Test Admin
- **Username**: admin
- **Is Admin**: true

### Troubleshooting

If the Quick Test Login fails:
1. Make sure you ran the SQL script in your Supabase project
2. Check the browser console for error messages
3. Verify your Supabase credentials in `.env` file are correct
4. Make sure the user was created by running:
   ```sql
   SELECT id, email, raw_user_meta_data 
   FROM auth.users 
   WHERE email = 'admin@test.com';
   ```

### Security Note

⚠️ **Important**: This test user is for development/testing only. 
- Do NOT use these credentials in production
- Remove or disable the Quick Test Login button before deploying to production
- Change the password or delete this user in production environments
