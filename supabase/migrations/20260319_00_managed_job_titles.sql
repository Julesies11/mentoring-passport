-- Consolidated Managed Job Titles Migration
-- 1. Create Job Titles lookup table
CREATE TABLE IF NOT EXISTS public.mp_job_titles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID REFERENCES public.mp_organisations(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organisation_id, title)
);

-- Enable RLS
ALTER TABLE public.mp_job_titles ENABLE ROW LEVEL SECURITY;

-- Create basic policies
-- Everyone in the organisation can read job titles
CREATE POLICY "Allow members to read job titles"
ON public.mp_job_titles
FOR SELECT
TO authenticated
USING (
    organisation_id IN (
        SELECT organisation_id FROM public.mp_profiles WHERE id = auth.uid()
    )
);

-- Org Admins can manage job titles
CREATE POLICY "Allow org admins to manage job titles"
ON public.mp_job_titles
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.mp_profiles
        WHERE id = auth.uid()
        AND (role = 'org-admin' OR role = 'administrator')
    )
);

-- 2. Initial data migration: Extract current unique strings into the new table
-- Assuming a single organisation instance as per project schema
INSERT INTO public.mp_job_titles (organisation_id, title)
SELECT DISTINCT 
    (SELECT id FROM public.mp_organisations LIMIT 1),
    job_title
FROM public.mp_profiles
WHERE job_title IS NOT NULL AND job_title <> ''
ON CONFLICT (organisation_id, title) DO NOTHING;

-- 3. Transition mp_profiles to relational structure
-- Add the new column
ALTER TABLE public.mp_profiles 
ADD COLUMN IF NOT EXISTS job_title_id UUID REFERENCES public.mp_job_titles(id) ON DELETE SET NULL;

-- Map existing data to the new IDs
UPDATE public.mp_profiles p
SET job_title_id = jt.id
FROM public.mp_job_titles jt
WHERE p.job_title = jt.title;

-- Drop the old text-based column
ALTER TABLE public.mp_profiles DROP COLUMN IF EXISTS job_title;
