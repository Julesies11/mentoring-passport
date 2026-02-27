create table public.mp_evidence_uploads (
  id uuid not null default extensions.uuid_generate_v4 (),
  pair_id uuid not null,
  master_task_id uuid null,
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
  sub_task_id uuid null,
  constraint mp_evidence_pkey primary key (id),
  constraint mp_evidence_uploads_submitted_by_fkey foreign KEY (submitted_by) references mp_profiles (id) on delete CASCADE,
  constraint mp_evidence_uploads_sub_task_id_fkey foreign KEY (sub_task_id) references mp_pair_subtasks (id) on delete set null,
  constraint mp_evidence_master_task_id_fkey foreign KEY (master_task_id) references mp_tasks_master (id) on delete set null,
  constraint mp_evidence_uploads_meeting_id_fkey foreign KEY (meeting_id) references mp_meetings (id) on delete set null,
  constraint mp_evidence_uploads_pair_id_fkey foreign KEY (pair_id) references mp_pairs (id) on delete CASCADE,
  constraint mp_evidence_uploads_reviewed_by_fkey foreign KEY (reviewed_by) references mp_profiles (id) on delete set null,
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
  ),
  constraint mp_evidence_type_check check ((type = any (array['photo'::text, 'text'::text])))
) TABLESPACE pg_default;

create index IF not exists idx_mp_evidence_master_task_id on public.mp_evidence_uploads using btree (master_task_id) TABLESPACE pg_default;

create index IF not exists idx_mp_evidence_uploads_pair on public.mp_evidence_uploads using btree (pair_id) TABLESPACE pg_default;

create index IF not exists idx_mp_evidence_uploads_status on public.mp_evidence_uploads using btree (status) TABLESPACE pg_default;

create index IF not exists idx_mp_evidence_pair on public.mp_evidence_uploads using btree (pair_id) TABLESPACE pg_default;

create index IF not exists idx_mp_evidence_status on public.mp_evidence_uploads using btree (status) TABLESPACE pg_default;

create trigger mp_update_evidence_uploads_updated_at BEFORE
update on mp_evidence_uploads for EACH row
execute FUNCTION mp_update_updated_at_column ();