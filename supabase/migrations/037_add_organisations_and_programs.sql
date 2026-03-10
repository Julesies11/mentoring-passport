-- ============================================================================
-- 1. BASE TABLES (MUST BE FIRST)
-- ============================================================================

CREATE TABLE IF NOT EXISTS mp_organisations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  logo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mp_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES mp_organisations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  start_date DATE,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 2. SCHEMA MODIFICATIONS (ADD COLUMNS BEFORE POLICIES)
-- ============================================================================

-- Add organisation_id to profiles
ALTER TABLE public.mp_profiles ADD COLUMN IF NOT EXISTS organisation_id UUID REFERENCES public.mp_organisations(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_mp_profiles_organisation_id ON public.mp_profiles(organisation_id);

-- Add organisation_id to tasks_master
ALTER TABLE public.mp_tasks_master ADD COLUMN IF NOT EXISTS organisation_id UUID REFERENCES public.mp_organisations(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_mp_tasks_master_organisation_id ON public.mp_tasks_master(organisation_id);

-- Add program_id to pairs
ALTER TABLE public.mp_pairs ADD COLUMN IF NOT EXISTS program_id UUID REFERENCES public.mp_programs(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_mp_pairs_program_id ON public.mp_pairs(program_id);

-- ============================================================================
-- 3. TRIGGERS & FUNCTIONS
-- ============================================================================

-- Apply updated_at triggers
CREATE TRIGGER mp_update_organisations_updated_at BEFORE
UPDATE ON mp_organisations FOR EACH ROW
EXECUTE FUNCTION mp_update_updated_at_column();

CREATE TRIGGER mp_update_programs_updated_at BEFORE
UPDATE ON mp_programs FOR EACH ROW
EXECUTE FUNCTION mp_update_updated_at_column();

-- Update New User Handler
CREATE OR REPLACE FUNCTION public.mp_handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.mp_profiles (id, email, role, full_name, status, organisation_id)
  VALUES (
    NEW.id,
    NEW.email,
    CASE 
      WHEN COALESCE(NEW.raw_user_meta_data->>'role', '') = 'supervisor' THEN 'supervisor'
      ELSE 'program-member'
    END,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'active',
    (NULLIF(NEW.raw_user_meta_data->>'organisation_id', ''))::UUID
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 4. ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE mp_organisations ENABLE ROW LEVEL SECURITY;
ALTER TABLE mp_programs ENABLE ROW LEVEL SECURITY;

-- Policies for mp_organisations
DROP POLICY IF EXISTS "Organisations are viewable by authenticated users" ON mp_organisations;
CREATE POLICY "Organisations are viewable by authenticated users"
  ON mp_organisations FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Organisations are viewable by anon users during signup" ON mp_organisations;
CREATE POLICY "Organisations are viewable by anon users during signup"
  ON mp_organisations FOR SELECT
  TO anon
  USING (true);

DROP POLICY IF EXISTS "Supervisors can update their own organisation" ON mp_organisations;
CREATE POLICY "Supervisors can update their own organisation"
  ON mp_organisations FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM mp_profiles 
      WHERE id = auth.uid() 
      AND role = 'supervisor' 
      AND organisation_id = mp_organisations.id
    )
  );

-- Policies for mp_programs
DROP POLICY IF EXISTS "Programs are viewable by organisation members" ON mp_programs;
CREATE POLICY "Programs are viewable by organisation members"
  ON mp_programs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM mp_profiles 
      WHERE id = auth.uid() 
      AND organisation_id = mp_programs.organisation_id
    )
  );

DROP POLICY IF EXISTS "Supervisors can manage programs" ON mp_programs;
CREATE POLICY "Supervisors can manage programs"
  ON mp_programs FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM mp_profiles 
      WHERE id = auth.uid() 
      AND role = 'supervisor' 
      AND organisation_id = mp_programs.organisation_id
    )
  );

-- Policies for mp_tasks_master (Org filtered)
DROP POLICY IF EXISTS "Supervisors can manage all master tasks" ON mp_tasks_master;
DROP POLICY IF EXISTS "Supervisors can view all master tasks" ON mp_tasks_master;
DROP POLICY IF EXISTS "Supervisors can manage their organisation's master tasks" ON mp_tasks_master;
DROP POLICY IF EXISTS "Users can view their organisation's master tasks" ON mp_tasks_master;

CREATE POLICY "Supervisors can manage their organisation's master tasks" ON mp_tasks_master
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM mp_profiles 
    WHERE id = auth.uid() 
    AND role = 'supervisor'
    AND organisation_id = mp_tasks_master.organisation_id
  )
);

CREATE POLICY "Users can view their organisation's master tasks" ON mp_tasks_master
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM mp_profiles 
    WHERE id = auth.uid() 
    AND organisation_id = mp_tasks_master.organisation_id
  )
);

-- ============================================================================
-- 5. SEED DATA
-- ============================================================================

DO $$
DECLARE
  v_org_id UUID;
  v_prog_id UUID;
BEGIN
  -- Get or create Fiona Stanley Hospital
  SELECT id INTO v_org_id FROM mp_organisations WHERE name = 'Fiona Stanley Hospital' LIMIT 1;
  
  IF v_org_id IS NULL THEN
    INSERT INTO mp_organisations (name) VALUES ('Fiona Stanley Hospital') RETURNING id INTO v_org_id;
  END IF;

  -- Update existing profiles to use this org
  UPDATE mp_profiles SET organisation_id = v_org_id WHERE organisation_id IS NULL;
  
  -- Update existing master tasks to use this org
  UPDATE mp_tasks_master SET organisation_id = v_org_id WHERE organisation_id IS NULL;

  -- Create a default program for this org
  SELECT id INTO v_prog_id FROM mp_programs WHERE organisation_id = v_org_id AND name = 'General Mentoring Program' LIMIT 1;
  
  IF v_prog_id IS NULL THEN
    INSERT INTO mp_programs (organisation_id, name, start_date, end_date) 
    VALUES (v_org_id, 'General Mentoring Program', '2025-01-01', '2025-12-31')
    RETURNING id INTO v_prog_id;
  END IF;

  -- Update existing pairs to use this program
  UPDATE mp_pairs SET program_id = v_prog_id WHERE program_id IS NULL;

END $$;

-- ============================================================================
-- 6. STORAGE BUCKETS
-- ============================================================================

-- Create storage bucket for organisation logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('mp-logos', 'mp-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for mp-logos bucket
DROP POLICY IF EXISTS "Anyone can view logos" ON storage.objects;
CREATE POLICY "Anyone can view logos"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'mp-logos');

DROP POLICY IF EXISTS "Supervisors can upload logos for their organisation" ON storage.objects;
CREATE POLICY "Supervisors can upload logos for their organisation"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'mp-logos' 
    AND (
      EXISTS (
        SELECT 1 FROM mp_profiles 
        WHERE id = auth.uid() 
        AND role = 'supervisor'
      )
    )
  );

DROP POLICY IF EXISTS "Supervisors can update logos for their organisation" ON storage.objects;
CREATE POLICY "Supervisors can update logos for their organisation"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'mp-logos'
    AND (
      EXISTS (
        SELECT 1 FROM mp_profiles 
        WHERE id = auth.uid() 
        AND role = 'supervisor'
      )
    )
  );
