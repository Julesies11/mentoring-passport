# ===============================
# 1. TERMINAL OUTPUT RULES
# ===============================
- Keep output minimal and concise.
- Do NOT print file diffs, patch-style output, or line-by-line code changes unless I explicitly ask.
- Summaries are okay, but avoid flooding the terminal.
- When making edits, respond with a brief explanation only.
- Never show 'added file', 'deleted file', or diff hunks unless asked.

# ===============================
# 2. BUILD / SCRIPT EXECUTION
# ===============================
- Do NOT run 'npm run build', 'npm run dev', or any scripts automatically.
- Do NOT run unit tests (e.g., 'npm test', 'vitest', 'npx vitest') automatically.
- Only execute build or test steps if I explicitly ask for them.

# Gemini Project Instructions — Metronic React (Vite) + TanStack Query + Supabase
This project uses:
- React 19 (Vite)
- Metronic React Template v9.4.0
- TanStack Query
- Supabase
- Tailwind integrated with Metronic

## Backend + Supabase Logic Rules
**All business logic must live inside the React app for maximum testability.**

Gemini must obey these rules:
1. **Do NOT create Supabase SQL functions, triggers, stored procedures, RPC endpoints, or views.**
2. **Do NOT add database-side joins or transformations.**
3. **Do NOT rely on Supabase server logic for app behaviour.**
4. **Keep ALL non-auth logic inside TypeScript where it can be unit tested.**
5. **Only use basic Supabase features:**
   - `supabase.from().select()`
   - `insert`, `update`, `delete`
   - `auth` (sign up, sign in, session, etc.)
6. Only create Supabase server logic if absolutely unavoidable:
   - Authentication
   - Security policies (RLS)
   - Required Supabase built-ins

Every other transformation (grouping, aggregating, merging, joining) must be done inside the app code:
- In API utility functions
- In custom hooks
- Inside TanStack Query `select` transformers

This ensures:  
✔ all logic is in TS  
✔ fully testable  
✔ predictable behaviour  
✔ no hidden database magic  

## Component / Module Structure
- Follow Metronic folder structure exactly.
- Group page-specific components in a `components` subfolder next to the page (e.g., `src/pages/supervisor/components/`).
- Shared UI components go in `src/components/`.
- Data fetching hooks go in `src/hooks/`.
- API logic goes in `src/lib/api/`.

## TanStack Query Conventions
- Use stable query keys.
- Use optimistic updates where helpful.
- Use `select`, `staleTime`, and `placeholderData` when appropriate.
- Place all API requests in `/modules/{feature}/api/*`.

## Supabase Conventions
- Use the JS client only.
- Type responses with Supabase-generated types.
- All filtering, joins, mapping, and data shaping must occur in the app.
- No custom SQL unless related to authentication.

## Tailwind / Metronic Conventions
- Use Tailwind classes from the Metronic config only.
- Follow Metronic card, grid, layout, and widget patterns.

## React Best Practices
- Avoid unnecessary useEffect.
- Keep components pure.
- Prefer custom hooks for data logic.
- Keep JSX minimal, clean, and Metronic-compliant.

# ===============================
# 3. MOBILE UI STANDARDS (Supervisor Section)
# ===============================
- **Header & Global Spacing:**
  - Hide the top title/toolbar (Breadcrumbs, Page Title, Description) on mobile (`hidden sm:block`).
  - Hide dashboard-style summary/stats cards on mobile (`hidden sm:grid`).
  - Reduce vertical gaps between components (`gap-2 sm:gap-5`).
  - Remove outer card borders on mobile (`border-0 sm:border`).

- **Layout Overflow & Flexbox Containment:**
  - **STRICT RULE:** Never use `overflow-x-hidden` or `max-w-full` on top-level layout wrappers to "fix" horizontal overflow. These hacks mask the root cause and break absolute positioned dropdown menus.
  - **STRICT RULE:** Use `min-w-0` on flex items (`flex-1 min-w-0`) containing text that needs to wrap or truncate. Without `min-w-0`, flexbox's default `min-width: auto` will stretch the container beyond the screen width to fit the text.
  - **Dropdown Constraints:** When using custom Radix `Select` components with complex internal layouts, always wrap the `<SelectValue>` content in a `<div className="flex-1 min-w-0 overflow-hidden">`. Otherwise, long selected values will blow out the `<SelectTrigger>` width.
  - **Wrapping Text:** Use `break-words` and `line-clamp-2` within text spans to ensure URLs and long titles wrap safely. Do not use `break-words` directly on `<span>` tags without `block` or `inline-block`, or use a `<div>` instead.

- **Dialogs & Modals:**
  - **Keyboard Management:** ALWAYS apply `onOpenAutoFocus={(e) => e.preventDefault()}` to `<DialogContent>` components containing text inputs. This prevents the mobile virtual keyboard from aggressively opening the moment the dialog mounts.
  - **Dynamic Viewport Height:** Use `max-h-[85dvh]` instead of `vh` for dialog containers. Dynamic Viewport Height (`dvh`) naturally recalculates when the mobile keyboard slides up, ensuring your dialog shrinks and your footer action buttons remain visible.
  - **Compact Forms:** Reduce internal dialog padding (`p-4 sm:p-6`), input heights (`h-10 sm:h-11`), and font sizes (`text-xs`) to maximize visible space on mobile screens.
  - **Stacked Actions:** Use `flex-col sm:flex-row` and `w-full` for footer action buttons on mobile, making them easy to tap.

- **Table Layout & Containment:**
  - **STRICT RULE:** NEVER use `table-fixed` without a desktop override. Always use `table-fixed md:table-auto` to ensure tables are contained on mobile but return to a natural, balanced layout on desktop.
  - **STRICT RULE:** Any width percentages applied to `<th>` or `<td>` MUST be mobile-only (e.g., `w-[45%] md:w-auto`). NEVER lock column widths on desktop.
  - Use `table-fixed` on mobile to prevent horizontal overflow; switch to `table-auto` on desktop (`table-fixed md:table-auto`).
  - Implement **Priority Hiding**: Keep only the most critical 2-3 columns on mobile (e.g., Names, Role, Pairings). Hide secondary data like Contact Info, Status Badges, and Dates.
  - Hide the "Actions" column on mobile if the row itself is made clickable.
  - Use `truncate` and `block` on all text-heavy cells to ensure ellipses (...) instead of wrapping or horizontal stretching.
  - Avatars should scale down on mobile (`size-7 md:size-8`).

- **Filtering & Interactivity:**
  - Default status filters to **'active'**.
  - Hide the 'All Statuses' option from dropdowns on mobile to maintain context (since status badges are hidden).
  - Implement auto-correction: if a user is on 'All Statuses' and enters mobile view, force switch to 'Active'.
  - Hide redundant or low-priority filters (like Role filters) on mobile to declutter the toolbar.
  - Make entire table rows clickable on mobile to open details/edit dialogs.

- **Pagination:**
  - Force pagination footers to stay on a **single row** (`flex-row` always).
  - Use compact components (`h-7`, `text-[10px]`) and condensed indicators (e.g., "1 / 10" instead of "1 of 10").
  - Use responsive labeling: hide "Show" and "per page" text on small mobile screens.