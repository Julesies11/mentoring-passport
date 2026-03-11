# Mentoring Passport Architecture Map

This document outlines the application's structure and data flow.

## 1. Directory Structure

- `src/lib/api/`: Service layer for Supabase communication.
- `src/hooks/`: Data fetching and state management using TanStack Query.
- `src/pages/`: Page components organized by role (supervisor, program-member).
- `src/components/`: Reusable UI components.
- `src/auth/`: Authentication logic and providers.
- `src/providers/`: Context providers (Organisation, Pairing, Theme, etc.).

## 2. Data Flow

1.  **UI Component:** Triggered by user action or mount.
2.  **Hook (`src/hooks/`):** Calls TanStack Query `useQuery` or `useMutation`.
3.  **API Service (`src/lib/api/`):** Performs the actual `supabase` JS client call.
4.  **Supabase:** Updates the database and triggers any PostgreSQL functions.
5.  **Notifications:** Handled at the application level in `src/lib/api/notifications-service.ts`.

## 3. Key Feature Modules

### Supervisor Section
- **Location:** `src/pages/supervisor/`
- **Focus:** Managing Organizations, Programs, Participants, and Master Tasks.

### Participant (Program Member) Section
- **Location:** `src/pages/program-member/`
- **Focus:** Managing Tasks, Meetings, and Evidence.

## 4. Coding Standards

- **React 19:** Use functional components and modern hooks.
- **Vanilla CSS + Tailwind:** Styling via Metronic utility classes.
- **TanStack Query:** All data fetching must go through `useQuery` or `useMutation`.
- **Logic Placement:** Business logic resides in `src/lib/api/` or custom hooks, NOT in components or database triggers (unless unavoidable).

## 5. Persistent Constants

Key roles and statuses are defined in `src/config/constants.ts` and `src/config/types.ts`.
- **Roles:** `supervisor`, `mentor`, `mentee`, `program-member`.
- **Pair Status:** `active`, `completed`, `archived`.
- **Task Status:** `not_submitted`, `awaiting_review`, `completed`.
