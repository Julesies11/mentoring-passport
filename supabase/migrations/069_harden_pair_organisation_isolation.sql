-- Migration 069: Harden Pair Organisation Isolation
-- This migration ensures all existing pairs and related data have isolation columns populated and prevents future NULLs.
-- We prefer application-level logic over triggers for better testability.

-- 1. Backfill mp_pairs
UPDATE public.mp_pairs p
SET organisation_id = pr.organisation_id
FROM public.mp_programs pr
WHERE p.program_id = pr.id AND p.organisation_id IS NULL;

-- 2. Backfill mp_pair_tasks
UPDATE public.mp_pair_tasks pt
SET 
  organisation_id = p.organisation_id,
  program_id = p.program_id
FROM public.mp_pairs p
WHERE pt.pair_id = p.id AND (pt.organisation_id IS NULL OR pt.program_id IS NULL);

-- 3. Backfill mp_meetings
UPDATE public.mp_meetings m
SET 
  organisation_id = p.organisation_id,
  program_id = p.program_id
FROM public.mp_pairs p
WHERE m.pair_id = p.id AND (m.organisation_id IS NULL OR m.program_id IS NULL);

-- 4. Backfill mp_evidence_uploads
UPDATE public.mp_evidence_uploads e
SET 
  organisation_id = p.organisation_id,
  program_id = p.program_id
FROM public.mp_pairs p
WHERE e.pair_id = p.id AND (e.organisation_id IS NULL OR e.program_id IS NULL);

-- 5. Add NOT NULL constraints
DO $$ 
BEGIN
    -- mp_pairs
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mp_pairs' AND column_name = 'organisation_id') THEN
        ALTER TABLE public.mp_pairs ALTER COLUMN organisation_id SET NOT NULL;
    END IF;

    -- mp_pair_tasks
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mp_pair_tasks' AND column_name = 'organisation_id') THEN
        ALTER TABLE public.mp_pair_tasks ALTER COLUMN organisation_id SET NOT NULL;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mp_pair_tasks' AND column_name = 'program_id') THEN
        ALTER TABLE public.mp_pair_tasks ALTER COLUMN program_id SET NOT NULL;
    END IF;

    -- mp_meetings
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mp_meetings' AND column_name = 'organisation_id') THEN
        ALTER TABLE public.mp_meetings ALTER COLUMN organisation_id SET NOT NULL;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mp_meetings' AND column_name = 'program_id') THEN
        ALTER TABLE public.mp_meetings ALTER COLUMN program_id SET NOT NULL;
    END IF;

    -- mp_evidence_uploads
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mp_evidence_uploads' AND column_name = 'organisation_id') THEN
        ALTER TABLE public.mp_evidence_uploads ALTER COLUMN organisation_id SET NOT NULL;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mp_evidence_uploads' AND column_name = 'program_id') THEN
        ALTER TABLE public.mp_evidence_uploads ALTER COLUMN program_id SET NOT NULL;
    END IF;
END $$;
