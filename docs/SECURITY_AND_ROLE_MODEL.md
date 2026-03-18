# Single-Organisation Security & Role Model

This document outlines the security architecture and structural implementation of the single-organisation instance, designed for high performance and secure role-based access control.

## 1. User Hierarchy

| Level | Role Name | Scope | Description |
| :--- | :--- | :--- | :--- |
| **1** | **Administrator** | Global | Full access to all instance data, global settings, and user management. |
| **2** | **Org Admin** | Instance | God-mode within the instance. Manages programs, pairings, and task templates. |
| **3** | **Supervisor** | Program | Managed participants and pairs within explicitly assigned programs (mapped via `mp_supervisor_programs`). |
| **4** | **Participant** | Pair | Mentors and Mentees. Access only to their own profile, pairings, tasks, and meetings. |

## 2. Data Model & Flattening

The system was migrated from a multi-tenant system to a **Single Organisation Instance** in Migrations 077 and 091.
- `mp_memberships` table has been dropped.
- `organisation_id` columns have been removed from all data tables.
- **Organisation Context:** There is only one organization context. The hospital/org identity is global.

## 3. Security Model (JWT-Based RLS)

Security is enforced using Supabase Row Level Security (RLS) driven by JWT metadata. This approach avoids recursive database lookups for roles, ensuring high performance.

### Role Sync Mechanism
- A database trigger (`tr_sync_user_role`) monitors changes to `mp_profiles.role`.
- Any update to a user's role is automatically synchronized to their `auth.users.app_metadata.role` field.
- This ensures the JWT (which includes `app_metadata`) always contains the user's latest role.

### JWT Helpers (Zero-Recursion)
RLS policies use the following SQL helpers defined in Migration 091:
- `public.is_sys_admin()`: Returns `TRUE` if `role == 'administrator'`.
- `public.is_org_admin()`: Returns `TRUE` if `role == 'org-admin'`.
- `public.is_supervisor(prog_id)`: Returns `TRUE` if `role == 'supervisor'` and user is assigned to the given program.
- `public.is_privileged()`: Returns `TRUE` if the user is an Administrator, Org Admin, or Supervisor.
- `public.is_pair_member(pair_id)`: Returns `TRUE` if the user is the mentor or mentee of the given pair.

### Policy Examples
- **`mp_programs`:** Accessible to Admins, Org Admins, and assigned Supervisors. Program members only see the programs they are part of (via `mp_pairs`).
- **`mp_pair_tasks`:** Accessible to privileged roles or the specific mentor/mentee pair members.
- **`mp_profiles`:** All authenticated users can view profiles, but only the owner or Admins can edit them.

## 4. Frontend Implementation

### State Management
- **AuthContext:** Provides `role`, `isSysAdmin`, `isOrgAdmin`, and `isSupervisor` booleans derived directly from the authenticated user's profile and JWT metadata.
- **Sidebar Menu:** Dynamically switches between `MENU_ADMINISTRATOR`, `MENU_ORG_ADMIN`, `MENU_SUPERVISOR`, and `MENU_PROGRAM_MEMBER` layouts based on the active role.

### Context Switching
Unlike the previous multi-tenant model, there is no "Hospital Switcher." If a user needs to act in a different role, their `role` must be updated in `mp_profiles`. If a Supervisor manages multiple programs, the filtering is handled by the `is_supervisor(p_program_id)` RLS helper and frontend UI filters.

## 5. Storage Security
Bucket-level policies (`storage.objects`) are also role-based:
- **`mp-avatars`:** Users can manage their own avatar; privileged roles can view/manage all.
- **`mp-logos`:** Only Admins can manage instance logos.
- **`mp-evidence-photos`:** Access restricted to privileged roles or the specific mentor/mentee pair associated with the evidence.
