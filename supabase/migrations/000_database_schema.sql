create table public.mp_evidence_uploads (
  id uuid not null default extensions.uuid_generate_v4 (),
  pair_id uuid not null,
  pair_task_id uuid null,
  meeting_id uuid null,
  submitted_by uuid not null,
  type text not null,
  file_url text null,
  description text null,
  status text not null default 'pending'::text,
  reviewed_by uuid null,
  reviewed_at timestamp with time zone null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  pair_subtask_id uuid null,
  evidence_type_id uuid null,
  file_name text null,
  mime_type text null,
  file_size bigint null,
  constraint mp_evidence_pkey primary key (id),
  constraint mp_evidence_uploads_submitted_by_fkey foreign KEY (submitted_by) references mp_profiles (id) on delete CASCADE,
  constraint mp_evidence_uploads_pair_task_id_fkey foreign KEY (pair_task_id) references mp_pair_tasks (id) on delete set null,
  constraint mp_evidence_uploads_reviewed_by_fkey foreign KEY (reviewed_by) references mp_profiles (id) on delete set null,
  constraint mp_evidence_uploads_evidence_type_id_fkey foreign KEY (evidence_type_id) references mp_evidence_types (id) on delete set null,
  constraint mp_evidence_uploads_meeting_id_fkey foreign KEY (meeting_id) references mp_meetings (id) on delete set null,
  constraint mp_evidence_uploads_pair_id_fkey foreign KEY (pair_id) references mp_pairs (id) on delete CASCADE,
  constraint mp_evidence_uploads_pair_subtask_id_fkey foreign KEY (pair_subtask_id) references mp_pair_subtasks (id) on delete set null,
  constraint mp_evidence_type_check check (
    (
      type = any (array['photo'::text, 'text'::text, 'file'::text])
    )
  ),
  constraint mp_evidence_status_check check (
    (
      status = any (
        array[
          'pending'::text,
          'approved'::text,
          'rejected'::text
        ]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_mp_evidence_master_task_id on public.mp_evidence_uploads using btree (pair_task_id) TABLESPACE pg_default;

create index IF not exists idx_mp_evidence_uploads_evidence_type_id on public.mp_evidence_uploads using btree (evidence_type_id) TABLESPACE pg_default;

create index IF not exists idx_mp_evidence_uploads_pair on public.mp_evidence_uploads using btree (pair_id) TABLESPACE pg_default;

create index IF not exists idx_mp_evidence_uploads_status on public.mp_evidence_uploads using btree (status) TABLESPACE pg_default;

create index IF not exists idx_mp_evidence_pair on public.mp_evidence_uploads using btree (pair_id) TABLESPACE pg_default;

create index IF not exists idx_mp_evidence_status on public.mp_evidence_uploads using btree (status) TABLESPACE pg_default;

create index IF not exists idx_mp_evidence_uploads_pair_task_id on public.mp_evidence_uploads using btree (pair_task_id) TABLESPACE pg_default;

create index IF not exists idx_mp_evidence_uploads_pair_subtask_id on public.mp_evidence_uploads using btree (pair_subtask_id) TABLESPACE pg_default;

create trigger mp_update_evidence_uploads_updated_at BEFORE
update on mp_evidence_uploads for EACH row
execute FUNCTION mp_update_updated_at_column ();

create table public.mp_profiles (
  id uuid not null,
  email text not null,
  role text not null,
  full_name text null,
  department text null,
  bio text null,
  avatar_url text null,
  phone text null,
  status text not null default 'active'::text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  must_change_password boolean not null default false,
  job_title text null,
  constraint mp_profiles_pkey primary key (id),
  constraint mp_profiles_email_key unique (email),
  constraint mp_profiles_id_fkey foreign KEY (id) references auth.users (id) on delete CASCADE,
  constraint mp_profiles_role_check check (
    (
      role = any (array['supervisor'::text, 'program-member'::text])
    )
  ),
  constraint mp_profiles_status_check check (
    (
      status = any (array['active'::text, 'archived'::text])
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_mp_profiles_role on public.mp_profiles using btree (role) TABLESPACE pg_default;

create index IF not exists idx_mp_profiles_status on public.mp_profiles using btree (status) TABLESPACE pg_default;

create trigger mp_update_profiles_updated_at BEFORE
update on mp_profiles for EACH row
execute FUNCTION mp_update_updated_at_column ();

create table public.mp_meetings (
  id uuid not null default extensions.uuid_generate_v4 (),
  pair_id uuid not null,
  title text not null,
  date_time timestamp with time zone not null,
  status text not null default 'upcoming'::text,
  notes text null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  pair_task_id uuid null,
  constraint mp_meetings_pkey primary key (id),
  constraint mp_meetings_pair_id_fkey foreign KEY (pair_id) references mp_pairs (id) on delete CASCADE,
  constraint mp_meetings_pair_task_id_fkey foreign KEY (pair_task_id) references mp_pair_tasks (id) on delete set null,
  constraint mp_meetings_status_check check (
    (
      status = any (
        array[
          'upcoming'::text,
          'completed'::text,
          'cancelled'::text
        ]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_mp_meetings_pair_task_id on public.mp_meetings using btree (pair_task_id) TABLESPACE pg_default;

create index IF not exists idx_mp_meetings_pair on public.mp_meetings using btree (pair_id) TABLESPACE pg_default;

create index IF not exists idx_mp_meetings_date on public.mp_meetings using btree (date_time) TABLESPACE pg_default;

create trigger mp_on_meeting_created
after INSERT on mp_meetings for EACH row
execute FUNCTION mp_notify_meeting_created ();

create trigger mp_update_meetings_updated_at BEFORE
update on mp_meetings for EACH row
execute FUNCTION mp_update_updated_at_column ();

create table public.mp_pairs (
  id uuid not null default extensions.uuid_generate_v4 (),
  mentor_id uuid not null,
  mentee_id uuid not null,
  status text not null default 'active'::text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint mp_pairs_pkey primary key (id),
  constraint mp_pairs_mentee_id_fkey foreign KEY (mentee_id) references mp_profiles (id) on delete CASCADE,
  constraint mp_pairs_mentor_id_fkey foreign KEY (mentor_id) references mp_profiles (id) on delete CASCADE,
  constraint different_users check ((mentor_id <> mentee_id)),
  constraint mp_pairs_status_check check (
    (
      status = any (
        array[
          'active'::text,
          'completed'::text,
          'archived'::text
        ]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_mp_pairs_mentor on public.mp_pairs using btree (mentor_id) TABLESPACE pg_default;

create index IF not exists idx_mp_pairs_mentee on public.mp_pairs using btree (mentee_id) TABLESPACE pg_default;

create index IF not exists idx_mp_pairs_status on public.mp_pairs using btree (status) TABLESPACE pg_default;

create unique INDEX IF not exists idx_mp_pairs_active_uniqueness on public.mp_pairs using btree (mentor_id, mentee_id) TABLESPACE pg_default
where
  (status = 'active'::text);

create trigger mp_on_pair_created_notify
after INSERT on mp_pairs for EACH row
execute FUNCTION mp_notify_pair_created ();

create trigger mp_update_pairs_updated_at BEFORE
update on mp_pairs for EACH row
execute FUNCTION mp_update_updated_at_column ();

create table public.mp_meeting_subtasks (
  id uuid not null default extensions.uuid_generate_v4 (),
  meeting_id uuid not null,
  name text not null,
  completed boolean not null default false,
  sort_order integer not null,
  created_at timestamp with time zone not null default now(),
  constraint mp_meeting_subtasks_pkey primary key (id),
  constraint mp_meeting_subtasks_meeting_id_fkey foreign KEY (meeting_id) references mp_meetings (id) on delete CASCADE
) TABLESPACE pg_default;

create table public.mp_meetings (
  id uuid not null default extensions.uuid_generate_v4 (),
  pair_id uuid not null,
  title text not null,
  date_time timestamp with time zone not null,
  notes text null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  pair_task_id uuid null,
  location text null,
  meeting_type text null default 'virtual'::text,
  constraint mp_meetings_pkey primary key (id),
  constraint mp_meetings_pair_id_fkey foreign KEY (pair_id) references mp_pairs (id) on delete CASCADE,
  constraint mp_meetings_pair_task_id_fkey foreign KEY (pair_task_id) references mp_pair_tasks (id) on delete set null,
  constraint mp_meetings_meeting_type_check check (
    (
      meeting_type = any (
        array['in_person'::text, 'virtual'::text, 'phone'::text]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_mp_meetings_pair_task_id on public.mp_meetings using btree (pair_task_id) TABLESPACE pg_default;

create index IF not exists idx_mp_meetings_pair on public.mp_meetings using btree (pair_id) TABLESPACE pg_default;

create index IF not exists idx_mp_meetings_date on public.mp_meetings using btree (date_time) TABLESPACE pg_default;

create trigger mp_on_meeting_created
after INSERT on mp_meetings for EACH row
execute FUNCTION mp_notify_meeting_created ();

create trigger mp_update_meetings_updated_at BEFORE
update on mp_meetings for EACH row
execute FUNCTION mp_update_updated_at_column ();

create table public.mp_error_logs (
  id uuid not null default extensions.uuid_generate_v4 (),
  user_id uuid null,
  message text not null,
  stack text null,
  url text null,
  component_name text null,
  metadata jsonb null default '{}'::jsonb,
  severity text null default 'error'::text,
  created_at timestamp with time zone not null default now(),
  constraint mp_error_logs_pkey primary key (id),
  constraint mp_error_logs_user_id_fkey foreign KEY (user_id) references mp_profiles (id) on delete set null
) TABLESPACE pg_default;

create index IF not exists idx_error_logs_created_at on public.mp_error_logs using btree (created_at desc) TABLESPACE pg_default;

create index IF not exists idx_error_logs_severity on public.mp_error_logs using btree (severity) TABLESPACE pg_default;

create table public.mp_pair_tasks (
  id uuid not null default extensions.uuid_generate_v4 (),
  pair_id uuid not null,
  master_task_id uuid null,
  status text not null default 'not_submitted'::text,
  completed_at timestamp with time zone null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  completed_by_user_id uuid null,
  name text not null,
  evidence_type_id uuid not null,
  sort_order integer not null,
  last_feedback text null,
  rejection_reason text null,
  constraint mp_pair_tasks_pkey primary key (id),
  constraint mp_pair_tasks_completed_by_user_id_fkey foreign KEY (completed_by_user_id) references mp_profiles (id) on delete set null,
  constraint mp_pair_tasks_evidence_type_id_fkey foreign KEY (evidence_type_id) references mp_evidence_types (id) on delete RESTRICT,
  constraint mp_pair_tasks_master_task_id_fkey foreign KEY (master_task_id) references mp_tasks_master (id) on delete CASCADE,
  constraint mp_pair_tasks_pair_id_fkey foreign KEY (pair_id) references mp_pairs (id) on delete CASCADE,
  constraint mp_pair_tasks_status_check check (
    (
      status = any (
        array[
          'not_submitted'::text,
          'awaiting_review'::text,
          'completed'::text,
          'revision_required'::text
        ]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_mp_pair_tasks_master_task_id on public.mp_pair_tasks using btree (master_task_id) TABLESPACE pg_default;

create index IF not exists idx_mp_pair_tasks_evidence_type_id on public.mp_pair_tasks using btree (evidence_type_id) TABLESPACE pg_default;

create index IF not exists idx_mp_pair_tasks_pair on public.mp_pair_tasks using btree (pair_id) TABLESPACE pg_default;

create index IF not exists idx_mp_pair_tasks_status on public.mp_pair_tasks using btree (status) TABLESPACE pg_default;

create unique INDEX IF not exists idx_mp_pair_tasks_pair_master_task on public.mp_pair_tasks using btree (pair_id, master_task_id) TABLESPACE pg_default
where
  (master_task_id is not null);

create index IF not exists idx_mp_pair_tasks_completed_by_user_id on public.mp_pair_tasks using btree (completed_by_user_id) TABLESPACE pg_default;

create trigger mp_on_task_completed
after
update on mp_pair_tasks for EACH row
execute FUNCTION mp_notify_task_completed ();

create trigger mp_update_pair_tasks_updated_at BEFORE
update on mp_pair_tasks for EACH row
execute FUNCTION mp_update_updated_at_column ();