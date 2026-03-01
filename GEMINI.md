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
- Only execute build steps if I explicitly ask for them.

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
- Place new features in `/modules/{feature-name}`.
- UI components go in `components/`.
- Data hooks go in `hooks/`.
- API logic goes in `api/`.

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