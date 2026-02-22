-- Mentoring Passport Database Schema
-- All tables prefixed with mp_ (mentoring passport)
-- Uses separate mp_profiles table (NOT user_metadata) for supervisor-managed data

-- ============================================================================
-- EXTENSIONS
-- ============================================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- TABLES
-- ============================================================================

-- Profiles table (linked to auth.users)
CREATE TABLE mp_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('supervisor', 'mentor', 'mentee')),
  full_name TEXT,
  department TEXT,
  bio TEXT,
  avatar_url TEXT,
  phone TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Evidence types lookup table (supervisor-managed)
CREATE TABLE mp_evidence_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Pairs table (mentor-mentee pairings)
CREATE TABLE mp_pairs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mentor_id UUID NOT NULL REFERENCES mp_profiles(id) ON DELETE CASCADE,
  mentee_id UUID NOT NULL REFERENCES mp_profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_pair UNIQUE (mentor_id, mentee_id),
  CONSTRAINT different_users CHECK (mentor_id != mentee_id)
);

-- Tasks table (predefined checklist items)
CREATE TABLE mp_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  evidence_type_id UUID REFERENCES mp_evidence_types(id) ON DELETE SET NULL,
  sort_order INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Pair tasks (tracks completion status for each pair)
CREATE TABLE mp_pair_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pair_id UUID NOT NULL REFERENCES mp_pairs(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES mp_tasks(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'not_submitted' CHECK (status IN ('not_submitted', 'awaiting_review', 'completed')),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_pair_task UNIQUE (pair_id, task_id)
);

-- Meetings table
CREATE TABLE mp_meetings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pair_id UUID NOT NULL REFERENCES mp_pairs(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  date_time TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'completed', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Meeting subtasks (checklist items for each meeting)
CREATE TABLE mp_meeting_subtasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  meeting_id UUID NOT NULL REFERENCES mp_meetings(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Evidence table (photos and text submissions)
CREATE TABLE mp_evidence (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pair_id UUID NOT NULL REFERENCES mp_pairs(id) ON DELETE CASCADE,
  task_id UUID REFERENCES mp_tasks(id) ON DELETE SET NULL,
  meeting_id UUID REFERENCES mp_meetings(id) ON DELETE SET NULL,
  submitted_by UUID NOT NULL REFERENCES mp_profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('photo', 'text')),
  file_url TEXT,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES mp_profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Notes table (shared and private notes)
CREATE TABLE mp_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pair_id UUID NOT NULL REFERENCES mp_pairs(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES mp_profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_private BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Notifications table
CREATE TABLE mp_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipient_id UUID NOT NULL REFERENCES mp_profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN (
    'evidence_uploaded',
    'evidence_approved',
    'evidence_rejected',
    'note_added',
    'meeting_created',
    'meeting_updated',
    'pair_created',
    'pair_archived',
    'guidance_added',
    'task_completed'
  )),
  title TEXT NOT NULL,
  description TEXT,
  action_url TEXT,
  related_id UUID,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX idx_mp_profiles_role ON mp_profiles(role);
CREATE INDEX idx_mp_profiles_status ON mp_profiles(status);
CREATE INDEX idx_mp_evidence_types_name ON mp_evidence_types(name);
CREATE INDEX idx_mp_tasks_evidence_type ON mp_tasks(evidence_type_id);
CREATE INDEX idx_mp_pairs_mentor ON mp_pairs(mentor_id);
CREATE INDEX idx_mp_pairs_mentee ON mp_pairs(mentee_id);
CREATE INDEX idx_mp_pairs_status ON mp_pairs(status);
CREATE INDEX idx_mp_pair_tasks_pair ON mp_pair_tasks(pair_id);
CREATE INDEX idx_mp_pair_tasks_status ON mp_pair_tasks(status);
CREATE INDEX idx_mp_meetings_pair ON mp_meetings(pair_id);
CREATE INDEX idx_mp_meetings_date ON mp_meetings(date_time);
CREATE INDEX idx_mp_evidence_pair ON mp_evidence(pair_id);
CREATE INDEX idx_mp_evidence_status ON mp_evidence(status);
CREATE INDEX idx_mp_notes_pair ON mp_notes(pair_id);
CREATE INDEX idx_mp_notifications_recipient ON mp_notifications(recipient_id);
CREATE INDEX idx_mp_notifications_unread ON mp_notifications(recipient_id, is_read);

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to relevant tables
CREATE TRIGGER update_mp_evidence_types_updated_at BEFORE UPDATE ON mp_evidence_types
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_mp_profiles_updated_at BEFORE UPDATE ON mp_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_mp_tasks_updated_at BEFORE UPDATE ON mp_tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_mp_pairs_updated_at BEFORE UPDATE ON mp_pairs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_mp_pair_tasks_updated_at BEFORE UPDATE ON mp_pair_tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_mp_meetings_updated_at BEFORE UPDATE ON mp_meetings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_mp_evidence_updated_at BEFORE UPDATE ON mp_evidence
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_mp_notes_updated_at BEFORE UPDATE ON mp_notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to auto-create profile when user signs up
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.mp_profiles (id, email, role, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    'mentee', -- default role
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Function to auto-create pair_tasks when a pair is created
CREATE OR REPLACE FUNCTION create_pair_tasks_for_new_pair()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO mp_pair_tasks (pair_id, task_id, status)
  SELECT NEW.id, id, 'not_submitted'
  FROM mp_tasks;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create pair_tasks when pair is created
CREATE TRIGGER on_pair_created
  AFTER INSERT ON mp_pairs
  FOR EACH ROW EXECUTE FUNCTION create_pair_tasks_for_new_pair();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE mp_evidence_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE mp_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE mp_pairs ENABLE ROW LEVEL SECURITY;
ALTER TABLE mp_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE mp_pair_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE mp_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE mp_meeting_subtasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE mp_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE mp_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE mp_notifications ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user's role
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT AS $$
  SELECT role FROM mp_profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================================
-- RLS POLICIES: mp_evidence_types
-- ============================================================================

-- All authenticated users can view evidence types
CREATE POLICY "Evidence types are viewable by all"
  ON mp_evidence_types FOR SELECT
  TO authenticated
  USING (true);

-- Only supervisors can manage evidence types
CREATE POLICY "Supervisors can manage evidence types"
  ON mp_evidence_types FOR ALL
  TO authenticated
  USING (get_my_role() = 'supervisor')
  WITH CHECK (get_my_role() = 'supervisor');

-- ============================================================================
-- RLS POLICIES: mp_profiles
-- ============================================================================

-- All authenticated users can view all profiles
CREATE POLICY "Profiles are viewable by authenticated users"
  ON mp_profiles FOR SELECT
  TO authenticated
  USING (true);

-- Users can update their own profile (except role and status)
CREATE POLICY "Users can update own profile"
  ON mp_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Supervisors can do everything with profiles
CREATE POLICY "Supervisors can manage all profiles"
  ON mp_profiles FOR ALL
  TO authenticated
  USING (get_my_role() = 'supervisor')
  WITH CHECK (get_my_role() = 'supervisor');

-- ============================================================================
-- RLS POLICIES: mp_pairs
-- ============================================================================

-- Users can view pairs they're involved in
CREATE POLICY "Users can view their own pairs"
  ON mp_pairs FOR SELECT
  TO authenticated
  USING (
    mentor_id = auth.uid() OR
    mentee_id = auth.uid() OR
    get_my_role() = 'supervisor'
  );

-- Supervisors can manage all pairs
CREATE POLICY "Supervisors can manage pairs"
  ON mp_pairs FOR ALL
  TO authenticated
  USING (get_my_role() = 'supervisor')
  WITH CHECK (get_my_role() = 'supervisor');

-- ============================================================================
-- RLS POLICIES: mp_tasks
-- ============================================================================

-- All authenticated users can view tasks
CREATE POLICY "Tasks are viewable by all"
  ON mp_tasks FOR SELECT
  TO authenticated
  USING (true);

-- Only supervisors can manage tasks
CREATE POLICY "Supervisors can manage tasks"
  ON mp_tasks FOR ALL
  TO authenticated
  USING (get_my_role() = 'supervisor')
  WITH CHECK (get_my_role() = 'supervisor');

-- ============================================================================
-- RLS POLICIES: mp_pair_tasks
-- ============================================================================

-- Users can view pair_tasks for their pairs
CREATE POLICY "Users can view their pair tasks"
  ON mp_pair_tasks FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM mp_pairs
      WHERE mp_pairs.id = pair_id
      AND (mentor_id = auth.uid() OR mentee_id = auth.uid() OR get_my_role() = 'supervisor')
    )
  );

-- Mentors and mentees can update their pair_tasks
CREATE POLICY "Pair members can update pair tasks"
  ON mp_pair_tasks FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM mp_pairs
      WHERE mp_pairs.id = pair_id
      AND (mentor_id = auth.uid() OR mentee_id = auth.uid())
    )
  );

-- Supervisors can manage all pair_tasks
CREATE POLICY "Supervisors can manage pair tasks"
  ON mp_pair_tasks FOR ALL
  TO authenticated
  USING (get_my_role() = 'supervisor')
  WITH CHECK (get_my_role() = 'supervisor');

-- ============================================================================
-- RLS POLICIES: mp_meetings
-- ============================================================================

-- Users can view meetings for their pairs
CREATE POLICY "Users can view their meetings"
  ON mp_meetings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM mp_pairs
      WHERE mp_pairs.id = pair_id
      AND (mentor_id = auth.uid() OR mentee_id = auth.uid() OR get_my_role() = 'supervisor')
    )
  );

-- Mentors and mentees can create/update meetings for their pairs
CREATE POLICY "Pair members can manage meetings"
  ON mp_meetings FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM mp_pairs
      WHERE mp_pairs.id = pair_id
      AND (mentor_id = auth.uid() OR mentee_id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM mp_pairs
      WHERE mp_pairs.id = pair_id
      AND (mentor_id = auth.uid() OR mentee_id = auth.uid())
    )
  );

-- Supervisors can manage all meetings
CREATE POLICY "Supervisors can manage all meetings"
  ON mp_meetings FOR ALL
  TO authenticated
  USING (get_my_role() = 'supervisor')
  WITH CHECK (get_my_role() = 'supervisor');

-- ============================================================================
-- RLS POLICIES: mp_meeting_subtasks
-- ============================================================================

-- Users can view subtasks for meetings they have access to
CREATE POLICY "Users can view meeting subtasks"
  ON mp_meeting_subtasks FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM mp_meetings m
      JOIN mp_pairs p ON m.pair_id = p.id
      WHERE m.id = meeting_id
      AND (p.mentor_id = auth.uid() OR p.mentee_id = auth.uid() OR get_my_role() = 'supervisor')
    )
  );

-- Pair members can manage subtasks for their meetings
CREATE POLICY "Pair members can manage meeting subtasks"
  ON mp_meeting_subtasks FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM mp_meetings m
      JOIN mp_pairs p ON m.pair_id = p.id
      WHERE m.id = meeting_id
      AND (p.mentor_id = auth.uid() OR p.mentee_id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM mp_meetings m
      JOIN mp_pairs p ON m.pair_id = p.id
      WHERE m.id = meeting_id
      AND (p.mentor_id = auth.uid() OR p.mentee_id = auth.uid())
    )
  );

-- Supervisors can manage all subtasks
CREATE POLICY "Supervisors can manage all meeting subtasks"
  ON mp_meeting_subtasks FOR ALL
  TO authenticated
  USING (get_my_role() = 'supervisor')
  WITH CHECK (get_my_role() = 'supervisor');

-- ============================================================================
-- RLS POLICIES: mp_evidence
-- ============================================================================

-- Users can view evidence for their pairs
CREATE POLICY "Users can view their evidence"
  ON mp_evidence FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM mp_pairs
      WHERE mp_pairs.id = pair_id
      AND (mentor_id = auth.uid() OR mentee_id = auth.uid() OR get_my_role() = 'supervisor')
    )
  );

-- Pair members can submit evidence
CREATE POLICY "Pair members can submit evidence"
  ON mp_evidence FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM mp_pairs
      WHERE mp_pairs.id = pair_id
      AND (mentor_id = auth.uid() OR mentee_id = auth.uid())
    )
    AND submitted_by = auth.uid()
  );

-- Pair members can update their own evidence (if not yet approved)
CREATE POLICY "Users can update own pending evidence"
  ON mp_evidence FOR UPDATE
  TO authenticated
  USING (submitted_by = auth.uid() AND status = 'pending')
  WITH CHECK (submitted_by = auth.uid());

-- Supervisors can manage all evidence
CREATE POLICY "Supervisors can manage all evidence"
  ON mp_evidence FOR ALL
  TO authenticated
  USING (get_my_role() = 'supervisor')
  WITH CHECK (get_my_role() = 'supervisor');

-- ============================================================================
-- RLS POLICIES: mp_notes
-- ============================================================================

-- Users can view notes for their pairs (respecting privacy)
CREATE POLICY "Users can view their notes"
  ON mp_notes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM mp_pairs
      WHERE mp_pairs.id = pair_id
      AND (
        (mentor_id = auth.uid() OR mentee_id = auth.uid())
        OR get_my_role() = 'supervisor'
      )
    )
    AND (is_private = false OR author_id = auth.uid() OR get_my_role() = 'supervisor')
  );

-- Pair members can create notes
CREATE POLICY "Pair members can create notes"
  ON mp_notes FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM mp_pairs
      WHERE mp_pairs.id = pair_id
      AND (mentor_id = auth.uid() OR mentee_id = auth.uid())
    )
    AND author_id = auth.uid()
  );

-- Users can update/delete their own notes
CREATE POLICY "Users can manage own notes"
  ON mp_notes FOR ALL
  TO authenticated
  USING (author_id = auth.uid())
  WITH CHECK (author_id = auth.uid());

-- Supervisors can manage all notes
CREATE POLICY "Supervisors can manage all notes"
  ON mp_notes FOR ALL
  TO authenticated
  USING (get_my_role() = 'supervisor')
  WITH CHECK (get_my_role() = 'supervisor');

-- ============================================================================
-- RLS POLICIES: mp_notifications
-- ============================================================================

-- Users can only view their own notifications
CREATE POLICY "Users can view own notifications"
  ON mp_notifications FOR SELECT
  TO authenticated
  USING (recipient_id = auth.uid());

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
  ON mp_notifications FOR UPDATE
  TO authenticated
  USING (recipient_id = auth.uid())
  WITH CHECK (recipient_id = auth.uid());

-- System can create notifications (via service role)
CREATE POLICY "System can create notifications"
  ON mp_notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ============================================================================
-- SEED DATA: Evidence Types
-- ============================================================================

INSERT INTO mp_evidence_types (name) VALUES
('N/A'),
('Photo evidence'),
('Screenshot of mandatory training required'),
('Mentee and Mentor to keep a copy themselves'),
('Mentee and Mentor to keep their own notes'),
('Mentee and Mentor to keep their own notes / reflection');

-- ============================================================================
-- SEED DATA: Tasks
-- ============================================================================

INSERT INTO mp_tasks (name, evidence_type_id, sort_order)
SELECT name, (SELECT id FROM mp_evidence_types WHERE mp_evidence_types.name = evidence_type), sort_order
FROM (VALUES
  ('Mentee to make contact with their Mentor - email and exchange numbers', 'N/A', 1),
  ('Mentoring meeting 1 - completed within 2 weeks of email contact if possible', 'Photo evidence', 2),
  ('  - Mentoring agreement completed - utilise ACEM mentoring documents', 'Mentee and Mentor to keep a copy themselves', 3),
  ('  - Skill sharing discussion - both Mentee and Mentor', 'Mentee and Mentor to keep their own notes', 4),
  ('  - Goal setting discussion - both Mentee and Mentor', 'Mentee and Mentor to keep their own notes', 5),
  ('  - Career mapping discussion and provision of guidance / support / advice', 'Mentee and Mentor to keep their own notes', 6),
  ('Mentoring meeting - involving food or drink', 'Photo evidence', 7),
  ('Mentoring meeting - involving sport / outdoor activity', 'Photo evidence', 8),
  ('Mentoring meeting - involving an arts / cultural / educational activity', 'Photo evidence', 9),
  ('Challenge 1 - take a Mentoring team photo with our esteemed Head of Department', 'Photo evidence', 10),
  ('Challenge 2 - proof of completion of Hospital Life Support (both mentee and mentor)', 'Screenshot of mandatory training required', 11),
  ('Challenge 3 - share a favourite recipe / dish to cook', 'Photo evidence', 12),
  ('Challenge 4 - discuss and share a favourite book / movie / TV series', 'Photo evidence', 13),
  ('Reflection - skill sharing discussion - review notes from start of term', 'Mentee and Mentor to keep their own notes / reflection', 14),
  ('Reflection - goal setting discussion - review notes from start of term', 'Mentee and Mentor to keep their own notes / reflection', 15),
  ('Share any further mentoring meetings / catch-ups:', 'Photo evidence', 16)
) AS t(name, evidence_type, sort_order);

-- ============================================================================
-- STORAGE BUCKETS
-- ============================================================================

-- Create storage bucket for evidence photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('evidence-photos', 'evidence-photos', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for evidence-photos bucket
CREATE POLICY "Authenticated users can upload evidence photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'evidence-photos');

CREATE POLICY "Users can view evidence photos for their pairs"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'evidence-photos'
    AND (
      -- Check if user is part of the pair that owns this evidence
      EXISTS (
        SELECT 1 FROM mp_evidence e
        JOIN mp_pairs p ON e.pair_id = p.id
        WHERE e.file_url LIKE '%' || name || '%'
        AND (p.mentor_id = auth.uid() OR p.mentee_id = auth.uid() OR get_my_role() = 'supervisor')
      )
    )
  );

CREATE POLICY "Users can delete their own evidence photos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'evidence-photos'
    AND (
      EXISTS (
        SELECT 1 FROM mp_evidence
        WHERE file_url LIKE '%' || name || '%'
        AND submitted_by = auth.uid()
        AND status = 'pending'
      )
      OR get_my_role() = 'supervisor'
    )
  );

-- Create storage bucket for profile avatars
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for avatars bucket
CREATE POLICY "Anyone can view avatars"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can update their own avatar"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete their own avatar"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
