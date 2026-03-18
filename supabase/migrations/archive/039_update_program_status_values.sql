-- Update program status check constraint
ALTER TABLE public.mp_programs DROP CONSTRAINT IF EXISTS mp_programs_status_check;
ALTER TABLE public.mp_programs ADD CONSTRAINT mp_programs_status_check CHECK (status IN ('active', 'inactive', 'archived'));

-- Migrate existing 'archived' to 'inactive'
UPDATE public.mp_programs SET status = 'inactive' WHERE status = 'archived';
