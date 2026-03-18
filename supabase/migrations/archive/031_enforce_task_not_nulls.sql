-- Migration 031: Enforce NOT NULL constraints on task tables
-- Ensures that name and evidence_type_id are never null for master tasks, master subtasks, pair tasks, and pair subtasks.

-- Before applying NOT NULL, you must ensure there are no existing NULL values.
-- This sets a fallback evidence type for any existing records with NULL.
DO $$ 
DECLARE 
  fallback_type_id UUID;
BEGIN
  -- Get the 'Not Applicable' evidence type, or just the first one available
  SELECT id INTO fallback_type_id 
  FROM public.mp_evidence_types 
  WHERE name ILIKE '%Not Applicable%'
  LIMIT 1;

  -- Fallback to any evidence type if 'Not Applicable' doesn't exist
  IF fallback_type_id IS NULL THEN
    SELECT id INTO fallback_type_id FROM public.mp_evidence_types LIMIT 1;
  END IF;

  -- 1. Fix existing NULLs in mp_tasks_master
  UPDATE public.mp_tasks_master 
  SET evidence_type_id = fallback_type_id 
  WHERE evidence_type_id IS NULL;

  UPDATE public.mp_tasks_master 
  SET name = 'Untitled Task' 
  WHERE name IS NULL;

  -- 2. Fix existing NULLs in mp_subtasks_master
  UPDATE public.mp_subtasks_master 
  SET evidence_type_id = fallback_type_id 
  WHERE evidence_type_id IS NULL;

  UPDATE public.mp_subtasks_master 
  SET name = 'Untitled Subtask' 
  WHERE name IS NULL;
END $$;

-- Now safely apply the NOT NULL constraints to the master tables
ALTER TABLE public.mp_tasks_master
  ALTER COLUMN name SET NOT NULL,
  ALTER COLUMN evidence_type_id SET NOT NULL;

ALTER TABLE public.mp_subtasks_master
  ALTER COLUMN name SET NOT NULL,
  ALTER COLUMN evidence_type_id SET NOT NULL;

-- Apply constraints to pair tables (these may already exist based on schema, but this enforces it explicitly)
ALTER TABLE public.mp_pair_tasks
  ALTER COLUMN name SET NOT NULL,
  ALTER COLUMN evidence_type_id SET NOT NULL;

ALTER TABLE public.mp_pair_subtasks
  ALTER COLUMN name SET NOT NULL,
  ALTER COLUMN evidence_type_id SET NOT NULL;
