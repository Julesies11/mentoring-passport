# Mentoring Passport Architecture Map

This document outlines the application's structure and data flow.

## 1. Directory Structure

- `src/lib/api/`: Service layer for Supabase communication.
- `src/hooks/`: Data fetching and state management using TanStack Query.
- `src/pages/`: Page components organized by role (admin, supervisor, program-member).
- `src/components/`: Reusable UI components.
- `src/auth/`: Authentication logic, context, and multi-tenant providers.
- `src/providers/`: Context providers (Organisation, Pairing, Theme, etc.).

## 2. Multi-Tenant Architecture
The system supports a 4-tier security model:
1. **System Owner (Administrator):** Global access, manages organisations.
2. **Organisation Admin:** God-mode within a specific organisation, manages supervisors and program access.
3. **Supervisor:** Program-scoped access to pairs and tasks.
4. **Program Member:** Mentors/Mentees restricted to their own pairs.

Users can have multiple **memberships** (`mp_memberships`) across different organisations and switch contexts seamlessly. **See `docs/MULTI_TENANT_SYSTEM.md` for full security details.**

## 3. Data Flow

1.  **UI Component:** Triggered by user action or mount.
2.  **Hook (`src/hooks/`):** Calls TanStack Query `useQuery` or `useMutation`, injecting the active context (`organisation_id`, `program_id`).
3.  **API Service (`src/lib/api/`):** Performs the actual `supabase` JS client call.
4.  **Supabase RLS:** Row Level Security policies enforce the 4-tier model.
5.  **Notifications:** Handled at the application level in `src/lib/api/notifications-service.ts`.

## 4. Key Feature Modules

### Task Management Flow
1. **Master Templates:** Organisation Admins create `mp_task_lists_master` containing master tasks.
2. **Program Assignment:** When a Supervisor creates a program, they select a Master Task List. A snapshot copy is made into `mp_program_tasks` for that specific program.
3. **Supervisor Curation:** Supervisors can edit and refine the `mp_program_tasks` specifically for their program without affecting the organisation's Master List.
4. **Pair Assignment:** When a mentor-mentee Pair is created, they are automatically assigned a snapshot of the current `mp_program_tasks` (copied to `mp_pair_tasks`).
5. **Participant Execution:** Pairs work through their `mp_pair_tasks`. They can add custom tasks (`is_custom = true`) but cannot delete tasks originally assigned by the program.

### Admin Section
- **Location:** `src/pages/admin/`
- **Focus:** System health, global metrics, and organisation creation.

### Supervisor / Org Admin Section
- **Location:** `src/pages/supervisor/`
- **Focus:** Managing Users, Programs, Participants, Task Lists, and Evidence Review.

### Participant (Program Member) Section
- **Location:** `src/pages/program-member/`
- **Focus:** Managing Tasks, Meetings, and Evidence.

## 5. Coding Standards

- **React 19:** Use functional components and modern hooks.
- **Vanilla CSS + Tailwind:** Styling via Metronic utility classes.
- **TanStack Query:** All data fetching must go through `useQuery` or `useMutation`.
- **Logic Placement:** Business logic resides in `src/lib/api/` or custom hooks, NOT in components or database triggers (unless unavoidable).

## 6. Persistent Constants

Key roles and statuses are defined in `src/config/constants.ts` and `src/config/types.ts`.
- **Roles:** `administrator`, `org-admin`, `supervisor`, `mentor`, `mentee`, `program-member`.
- **Pair Status:** `active`, `completed`, `archived`.
- **Task Status:** `not_submitted`, `awaiting_review`, `completed`.
