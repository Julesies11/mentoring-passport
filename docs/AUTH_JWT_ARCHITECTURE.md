# Robust Multi-Tenant Auth Architecture (JWT-Based)

This document outlines the authoritative design for the Mentoring Passport's authentication and multi-tenant isolation system. It replaces the legacy "Database-Lookup" RLS model with a "JWT-Based Active Context" model.

## 1. Core Philosophy: The "Active Context"
Users can belong to multiple organizations (e.g., Fiona Stanley Hospital and Joondalup Hospital) but they only have one identity (email). 
- **Available Contexts:** All memberships stored in `mp_memberships`.
- **Active Context:** The single organization and role the user is *currently* viewing, stored securely inside their **Supabase JWT**.

## 2. JWT Structure (`user_metadata`)
Upon login or organization switch, the user's `auth.users.raw_user_meta_data` is updated. Supabase automatically injects this into the JWT.

```json
{
  "sub": "user-uuid",
  "email": "user@test.com",
  "user_metadata": {
    "active_org_id": "uuid-of-current-hospital",
    "active_role": "supervisor",
    "is_system_owner": false
  }
}
```

## 3. The Login & Selection Flow

### Scenario A: Multi-Org User
1. **Login:** User authenticates. The initial JWT has no `active_org_id` (Limbo State).
2. **Detection:** The React `AuthProvider` detects multiple entries in `mp_memberships`.
3. **Selection:** User is redirected to `/auth/select-organisation` to view Org cards (Names + Logos).
4. **The "Set":** User selects a card. The app calls the `switch_active_org(org_id)` RPC.
5. **The Refresh:** The app calls `supabase.auth.refreshSession()`. Supabase issues a **New JWT** with the `active_org_id`.
6. **Redirect:** User is sent to the dashboard.

### Scenario B: Single-Org User
1. **Login:** User authenticates.
2. **Auto-Set:** The app detects only one membership, calls `switch_active_org(org_id)` and `refreshSession()` immediately.
3. **Redirect:** User lands straight on the dashboard with a fully primed JWT.

## 4. Database Implementation (RLS Macros)
To keep policies fast (O(1) complexity), we use PostgreSQL macros to extract context from the JWT without hitting the disk.

```sql
-- Helper to get active Org ID from JWT
CREATE OR REPLACE FUNCTION auth.active_org_id() RETURNS uuid AS $$
  SELECT (auth.jwt() -> 'user_metadata' ->> 'active_org_id')::uuid;
$$ LANGUAGE SQL STABLE;

-- Helper to get active Role from JWT
CREATE OR REPLACE FUNCTION auth.active_role() RETURNS text AS $$
  SELECT (auth.jwt() -> 'user_metadata' ->> 'active_role')::text;
$$ LANGUAGE SQL STABLE;
```

### Simplified RLS Policies:
- **SELECT:** `organisation_id = auth.active_org_id()`
- **INSERT:** `organisation_id = auth.active_org_id()`
- **UPDATE:** `organisation_id = auth.active_org_id() AND auth.active_role() IN ('org-admin', 'supervisor')`

## 5. Security Advantages
1. **No Data Leaks:** If a user is active in "Hospital A," the RLS automatically blocks "Hospital B" data even if the developer forgets a `.eq()` filter in React.
2. **Performance:** No `JOIN`s or `EXISTS` subqueries are required for permission checks.
3. **Role Fluidity:** A user can be a 'Supervisor' in one hospital and a 'Mentor' in another; the JWT updates the role permissions dynamically on switch.
4. **Masquerade Mode:** System Owners can update their own `active_org_id` to any hospital to view the app exactly as a local user would.
