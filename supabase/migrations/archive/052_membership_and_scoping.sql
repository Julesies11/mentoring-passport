-- Migration 052: Multi-tenant Membership and Program Scoping

-- 0. Ensure updated_at helper exists
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 1. Create Role Enum for Memberships
DO $$ BEGIN
    CREATE TYPE public.mp_membership_role AS ENUM ('org-admin', 'supervisor', 'program-member');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Create Memberships Table (User <-> Organisation)
CREATE TABLE IF NOT EXISTS public.mp_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    organisation_id UUID NOT NULL REFERENCES public.mp_organisations(id) ON DELETE CASCADE,
    role public.mp_membership_role NOT NULL DEFAULT 'program-member',
    status TEXT NOT NULL CHECK (status IN ('active', 'archived')) DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, organisation_id)
);

-- 3. Create Supervisor Programs Table (Supervisor <-> Program)
CREATE TABLE IF NOT EXISTS public.mp_supervisor_programs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    program_id UUID NOT NULL REFERENCES public.mp_programs(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, program_id)
);

-- 4. Add isolation columns to data tables for RLS efficiency
-- mp_pairs: already has program_id, adding organisation_id
ALTER TABLE public.mp_pairs ADD COLUMN IF NOT EXISTS organisation_id UUID REFERENCES public.mp_organisations(id);

-- mp_meetings: adding organisation_id and program_id
ALTER TABLE public.mp_meetings ADD COLUMN IF NOT EXISTS organisation_id UUID REFERENCES public.mp_organisations(id);
ALTER TABLE public.mp_meetings ADD COLUMN IF NOT EXISTS program_id UUID REFERENCES public.mp_programs(id);

-- mp_evidence_uploads: adding organisation_id and program_id
ALTER TABLE public.mp_evidence_uploads ADD COLUMN IF NOT EXISTS organisation_id UUID REFERENCES public.mp_organisations(id);
ALTER TABLE public.mp_evidence_uploads ADD COLUMN IF NOT EXISTS program_id UUID REFERENCES public.mp_programs(id);

-- mp_pair_tasks: adding organisation_id and program_id
ALTER TABLE public.mp_pair_tasks ADD COLUMN IF NOT EXISTS organisation_id UUID REFERENCES public.mp_organisations(id);
ALTER TABLE public.mp_pair_tasks ADD COLUMN IF NOT EXISTS program_id UUID REFERENCES public.mp_programs(id);

-- 5. Data Backfill Script
DO $$
BEGIN
    -- Backfill mp_pairs organisation_id
    UPDATE public.mp_pairs p
    SET organisation_id = pr.organisation_id
    FROM public.mp_programs pr
    WHERE p.program_id = pr.id;

    -- Backfill mp_meetings
    UPDATE public.mp_meetings m
    SET 
        organisation_id = p.organisation_id,
        program_id = p.program_id
    FROM public.mp_pairs p
    WHERE m.pair_id = p.id;

    -- Backfill mp_pair_tasks
    UPDATE public.mp_pair_tasks pt
    SET 
        organisation_id = p.organisation_id,
        program_id = p.program_id
    FROM public.mp_pairs p
    WHERE pt.pair_id = p.id;

    -- Backfill mp_evidence_uploads
    UPDATE public.mp_evidence_uploads e
    SET 
        organisation_id = p.organisation_id,
        program_id = p.program_id
    FROM public.mp_pairs p
    WHERE e.pair_id = p.id;

    -- Backfill initial memberships from existing mp_profiles
    INSERT INTO public.mp_memberships (user_id, organisation_id, role, status)
    SELECT 
        id as user_id, 
        organisation_id, 
        CASE 
            WHEN role = 'supervisor' THEN 'org-admin'::public.mp_membership_role -- Default existing supervisors to org-admins for now
            ELSE 'program-member'::public.mp_membership_role 
        END as role,
        status
    FROM public.mp_profiles
    WHERE organisation_id IS NOT NULL
    ON CONFLICT (user_id, organisation_id) DO NOTHING;
END $$;

-- 6. Helper Functions for RLS

-- System Owner check
CREATE OR REPLACE FUNCTION public.is_system_owner()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.mp_profiles
    WHERE id = auth.uid() AND role = 'administrator'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Org Admin check
CREATE OR REPLACE FUNCTION public.is_org_admin(org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.mp_memberships
    WHERE user_id = auth.uid() 
    AND organisation_id = org_id 
    AND role = 'org-admin'
    AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Program Supervisor check
CREATE OR REPLACE FUNCTION public.is_program_supervisor(prog_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- System owners and Org Admins (of the parent org) are also allowed
  IF public.is_system_owner() THEN RETURN TRUE; END IF;
  
  RETURN EXISTS (
    SELECT 1 FROM public.mp_supervisor_programs sp
    JOIN public.mp_memberships m ON sp.user_id = m.user_id
    WHERE sp.user_id = auth.uid() 
    AND sp.program_id = prog_id
    AND m.status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Update Updated_at trigger for memberships
CREATE OR REPLACE TRIGGER update_mp_memberships_updated_at
    BEFORE UPDATE ON public.mp_memberships
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
