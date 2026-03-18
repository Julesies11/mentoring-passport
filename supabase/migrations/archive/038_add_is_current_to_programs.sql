-- Add is_current flag to mp_programs
ALTER TABLE public.mp_programs ADD COLUMN IF NOT EXISTS is_current BOOLEAN DEFAULT FALSE;

-- Create a partial unique index to ensure only one program per organisation is current
DROP INDEX IF EXISTS idx_one_current_program_per_org;
CREATE UNIQUE INDEX idx_one_current_program_per_org 
ON public.mp_programs (organisation_id) 
WHERE (is_current = true);

-- Set the default program as current initially
UPDATE public.mp_programs 
SET is_current = true 
WHERE id IN (
  SELECT id FROM public.mp_programs 
  WHERE name = 'General Mentoring Program' 
  LIMIT 1
);
