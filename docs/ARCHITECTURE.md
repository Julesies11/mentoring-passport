# Mentoring Passport Architecture Map

This document outlines the application's structure and data flow for the Single Organisation Instance.

## 1. Directory Structure

- `src/lib/api/`: Service layer for Supabase communication.
- `src/hooks/`: Data fetching and state management using TanStack Query.
- `src/pages/`: Page components organized by role (admin, supervisor, program-member).
- `src/components/`: Reusable UI components.
- `src/auth/`: Authentication logic, context, and JWT-based role providers.
- `src/providers/`: Context providers (Pairing, Theme, etc.).

## 2. Security Model (RBAC)
The system uses a 4-tier security model enforced via Role-Based Access Control (RBAC) in the JWT and Supabase RLS:

1. **Administrator (`administrator`):** Global instance access, manages users and system settings.
2. **Org Admin (`org-admin`):** Instance-level administrator with full access to programs, pairs, job titles, and task templates.
3. **Supervisor (`supervisor`):** Program-scoped access. Manages participants and pairs within explicitly assigned programs via `mp_supervisor_programs`.
4. **Program Member (`program-member`):** Mentors and Mentees restricted to their own pairings and tasks.

**Source of Truth:** The user's role is stored in `mp_profiles.role` and automatically synced to `auth.users.app_metadata.role`. RLS policies verify this metadata directly from the JWT to ensure zero-recursion performance.

## 3. Data Flow & Business Logic Rules

**MANDATORY RULE:** All business logic must live inside the React app for maximum testability.
- **NO** Supabase SQL functions, triggers (except role sync), stored procedures, or RPC endpoints.
- **USE SQL joins for data retrieval:** To ensure high performance, relational data (e.g., profiles with job titles) must be fetched in a single query using Supabase's relational selection.
- **ALL** data mapping and business logic occurs in the TypeScript layer (API services or TanStack Query `select` transformers).

1.  **UI Component:** Triggered by user action or mount.
2.  **Hook (`src/hooks/`):** Calls TanStack Query `useQuery` or `useMutation`.
3.  **API Service (`src/lib/api/`):** Performs the `supabase` JS client call. Includes relational `.select()` strings and maps the nested results to flat, typed interfaces.
4.  **Supabase RLS:** Row Level Security policies enforce access control based on the user's `role` and `id`.

## 4. Key Feature Modules

### Task Management Flow (Snapshotting)
1. **Master Templates:** Admins create `mp_task_lists_master` containing `mp_tasks_master`.
2. **Program Assignment:** Programs are linked to a Master Task List. A snapshot copy is made into `mp_program_tasks` for that specific program.
3. **Program Curation:** Supervisors (assigned to the program) can edit and refine the `mp_program_tasks` specifically for their program without affecting the global Master List.
4. **Pair Assignment:** When a Pair is created, they are assigned a snapshot of the current `mp_program_tasks` (copied to `mp_pair_tasks`).
5. **Execution:** Pairs work through their `mp_pair_tasks`. They can add custom tasks (`is_custom = true`) but cannot delete tasks originally assigned by the program.

### Managed Job Titles
1. **Central Registry:** Org Admins manage a list of approved job titles in `mp_job_titles`.
2. **Relational Link:** User profiles reference a job title via `job_title_id`.
3. **Propagation:** Renaming a title in the central registry immediately updates the displayed title for all assigned users.
4. **Active Status:** Titles can be deactivated. Deactivated titles remain on existing profiles but cannot be selected for new users or updates.

### Admin Sections
- **Administrator:** `src/pages/admin/` (User management, Instance settings).
- **Org Admin:** `src/pages/org-admin/` (Programs, Pairings, Job Titles, Task Templates, Evidence Audit).

### Supervisor Section
- **Location:** `src/pages/supervisor/`
- **Focus:** Dashboard, Pairs, Program Tasks, Evidence Review, Calendar.

### Participant (Program Member) Section
- **Location:** `src/pages/program-member/`
- **Focus:** Dashboard, My Tasks, Relationship (Mentor/Mentee details), Meetings.

## 5. Coding Standards

- **React 19:** Use functional components and modern hooks.
- **Vanilla CSS + Tailwind:** Styling via Metronic utility classes.
- **TanStack Query:** All data fetching must go through `useQuery` or `useMutation` in `src/hooks/`.
- **Logic Placement:** Business logic resides in `src/lib/api/` or custom hooks, NOT in components or database triggers (except for the Role Sync trigger).

## 6. Persistent Constants

Key roles and statuses are defined in `src/config/constants.ts` and `src/config/types.ts`.
- **Roles:** `administrator`, `org-admin`, `supervisor`, `program-member`.
- **Pair Status:** `active`, `completed`, `archived`.
- **Task Status:** `not_submitted`, `awaiting_review`, `completed`.
