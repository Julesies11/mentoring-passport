# Multi-Tenant 4-Tier Architecture

This document outlines the security and structural implementation of the multi-tenant system designed for hospital-grade deployment.

## 1. User Hierarchy

| Level | Role Name | Scope | Description |
| :--- | :--- | :--- | :--- |
| **1** | **System Owner** | Global | Access to all organisations and global system settings. Can create new organisations. |
| **2** | **Org Admin** | Organisation | God-mode within a single hospital. Manages supervisors and assigns them to programs. |
| **3** | **Supervisor** | Program | Managed participants and pairs within explicitly assigned programs (e.g., specific wards). |
| **4** | **Participant** | Pair | Mentors and Mentees. Access only to their own profile, pairs, and tasks. |

## 2. Data Model

### Core Tables
- `mp_organisations`: The top-level tenant entity (e.g., Fiona Stanley Hospital).
- `mp_memberships`: Junction table linking `auth.users` to `mp_organisations`. Stores the `role` (org-admin, supervisor, program-member) for that specific hospital.
- `mp_supervisor_programs`: Junction table linking `supervisors` to specific `mp_programs`.

### Isolation Columns
Every data table (`mp_pairs`, `mp_meetings`, `mp_evidence_uploads`, `mp_pair_tasks`) contains:
- `organisation_id`: For hospital-level isolation (Org Admin scope).
- `program_id`: For specialty/ward isolation (Supervisor scope).

## 3. Security Model (RLS)

Security is enforced via **Migration 053** and **054** using three helper functions:
1. `is_system_owner()`: Checks if the global profile role is 'administrator'.
2. `is_org_admin(org_id)`: Checks if the user has an 'org-admin' membership for the specific organisation.
3. `is_program_supervisor(prog_id)`: Checks if the user is assigned to the specific program via `mp_supervisor_programs`.

### Tiered Logic Example (SELECT):
- **System Owner:** Returns `TRUE` always.
- **Org Admin:** Returns `TRUE` if `organisation_id` matches their membership.
- **Supervisor:** Returns `TRUE` if `program_id` exists in their assignments.
- **Participant:** Returns `TRUE` if they are the `mentor_id` or `mentee_id` of the parent pair.

## 4. Frontend Implementation

### State Management
- **AuthContext:** Derives `isSystemOwner`, `isOrgAdmin`, and `isSupervisor` from the *active membership*.
- **OrganisationProvider:** Manages the `effectiveOrgId`. It prioritizes **Masquerade Mode** (for System Owners), then the user's **selected organisation**, then their default profile ID.

### UI Components
- **Hospital Switcher:** Located in the User Dropdown menu. Allows users with multiple memberships to jump between hospital contexts.
- **Masquerade Banner:** A high-contrast persistent banner shown when a System Owner is "Entering as Supervisor."
- **Sidebar Menu:** Dynamically switches between `MENU_ADMINISTRATOR`, `MENU_ORG_ADMIN`, `MENU_SUPERVISOR`, and `MENU_PROGRAM_MEMBER` based on the active context.

## 5. Persistence
The active organisation context is persisted in `auth.users` metadata via the `selected_organisation_id` field and synced to local storage for instant layout rendering.
