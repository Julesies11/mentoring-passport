# Development Workflow & Standards

This document outlines the mandatory workflow for adding new features and maintaining the Mentoring Passport application.

## 1. Adding a New Page/Route

Every new page implementation MUST follow these steps to ensure system stability and consistency:

### Step 1: Create the Component
Place the new page component in the appropriate role-scoped directory:
- `src/pages/admin/`
- `src/pages/supervisor/`
- `src/pages/program-member/`

### Step 2: Configure Routing
Add the route to `src/routing/app-routing-setup.tsx`. Ensure it is wrapped in the correct role guard (`RequireRole`).

### Step 3: Add to Sidebar Menu
Update `src/config/menu.config.tsx` with the new item. 
- Use `requiredRole` and `requiredFlag` for access control.
- Use `KeenIcon` components for consistent iconography.

### Step 4: MANDATORY Smoke Test
Every new route **MUST** be added to the exhaustive smoke test suite to prevent "White Screen" regressions.
- **File:** `src/test/smoke.test.tsx`
- **Pattern:** Use the `waitFor` pattern to ensure asynchronous data fetching doesn't crash the component on mount.

## 2. Data Fetching Standards

- **Hook-First:** All API calls must be wrapped in a TanStack Query hook in `src/hooks/`.
- **API Isolation:** The raw Supabase logic must reside in `src/lib/api/`.
- **Logic Mapping:** Use the `select` option in `useQuery` to transform/group data. Never perform complex business logic inside the JSX.

## 3. UI & Styling

- **Metronic Primitives:** Use existing Metronic components (`Card`, `Button`, `Badge`) from `src/components/ui/` whenever possible.
- **Mobile-First:** Adhere to the Supervisor Mobile UI standards defined in `GEMINI.md`:
  - Use `min-w-0` on flex items to prevent overflow.
  - Remove card borders on mobile (`border-0 sm:border`).
  - Stack action buttons (`flex-col sm:flex-row`).

## 4. Database Interaction

- **Prefixing:** All new tables/columns must use the `mp_` prefix.
- **RBAC:** Always assume Level 4 users (Program Members) only see data scoped to their `pair_id`.
- **No SQL Logic:** Do not add triggers, views, or stored procedures to Supabase. All transformations belong in TypeScript.

## 5. Verification

Before submitting a PR or finishing a task, run the project's verification suite:
- `npx vitest` (Unit & Smoke tests)
- `npx playwright test` (Critical E2E flows)
- `npm run lint` / `tsc` (Type & Style checks)
