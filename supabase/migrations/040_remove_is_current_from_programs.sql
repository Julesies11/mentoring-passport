-- Remove is_current and its partial unique index
DROP INDEX IF EXISTS idx_one_current_program_per_org;
ALTER TABLE public.mp_programs DROP COLUMN IF EXISTS is_current;
