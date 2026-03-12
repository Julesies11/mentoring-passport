# Mentoring Passport Database Schema (Source of Truth)

This document serves as the primary reference for all database tables, fields, and relationships in the Mentoring Passport application.

## Core Tables

### `mp_profiles`
Stores user profile information, linked to `auth.users`.
- `id` (UUID, PK): References `auth.users(id)`.
- `email` (TEXT, UNIQUE)
- `role` (TEXT): 'supervisor', 'mentor', 'mentee', 'program-member', or 'administrator'.
- `full_name` (TEXT)
- `organisation_id` (UUID): References `mp_organisations(id)`.
- `department` (TEXT)
- `job_title` (TEXT)
- `bio` (TEXT)
- `avatar_url` (TEXT)
- `phone` (TEXT)
- `status` (TEXT): 'active' or 'archived'.
- `must_change_password` (BOOLEAN)

### `mp_organisations`
Stores organization details.
- `id` (UUID, PK)
- `name` (TEXT)
- `logo_url` (TEXT)

### `mp_memberships`
Junction table linking users to multiple organisations with a specific role.
- `id` (UUID, PK)
- `user_id` (UUID): References `auth.users(id)`.
- `organisation_id` (UUID): References `mp_organisations(id)`.
- `role` (TEXT): 'org-admin', 'supervisor', 'program-member'.
- `status` (TEXT): 'active', 'archived'.

### `mp_supervisor_programs`
Junction table linking supervisors to specific programs within their organisation.
- `id` (UUID, PK)
- `user_id` (UUID): References `auth.users(id)`.
- `program_id` (UUID): References `mp_programs(id)`.

### `mp_programs`
Stores mentoring program details within an organization.
- `id` (UUID, PK)
- `organisation_id` (UUID): References `mp_organisations(id)`.
- `task_list_id` (UUID): References `mp_task_lists_master(id)`.
- `name` (TEXT)
- `start_date` (DATE)
- `end_date` (DATE)
- `status` (TEXT): 'active' or 'archived'.

### `mp_pairs`
Stores mentor-mentee pairings within a program.
- `id` (UUID, PK)
- `mentor_id` (UUID): References `mp_profiles(id)`.
- `mentee_id` (UUID): References `mp_profiles(id)`.
- `program_id` (UUID): References `mp_programs(id)`.
- `organisation_id` (UUID): References `mp_organisations(id)`.
- `status` (TEXT): 'active', 'completed', or 'archived'.

---

## Tasks & Sub-tasks System

### `mp_task_lists_master`
Master task lists created by Org Admins as templates for programs.
- `id` (UUID, PK)
- `organisation_id` (UUID): References `mp_organisations(id)`.
- `name` (TEXT)
- `description` (TEXT)
- `is_active` (BOOLEAN)

### `mp_tasks_master`
Template for tasks, linked to a task list.
- `id` (UUID, PK)
- `organisation_id` (UUID): References `mp_organisations(id)`.
- `task_list_id` (UUID): References `mp_task_lists_master(id)`.
- `name` (TEXT)
- `evidence_type_id` (UUID): References `mp_evidence_types(id)`.
- `sort_order` (INTEGER)
- `is_active` (BOOLEAN)

### `mp_subtasks_master`
Template for sub-tasks, linked to a master task.
- `id` (UUID, PK)
- `task_id` (UUID): References `mp_tasks_master(id)`.
- `name` (TEXT)
- `evidence_type_id` (UUID)
- `sort_order` (INTEGER)

### `mp_program_tasks`
Snapshot copies of master tasks for a specific program. Can be edited by supervisors without affecting the master list.
- `id` (UUID, PK)
- `program_id` (UUID): References `mp_programs(id)`.
- `organisation_id` (UUID): References `mp_organisations(id)`.
- `master_task_id` (UUID): References `mp_tasks_master(id)`.
- `name` (TEXT)
- `evidence_type_id` (UUID)
- `sort_order` (INTEGER)
- `is_active` (BOOLEAN)

### `mp_program_subtasks`
Snapshot copies of master sub-tasks for a specific program task.
- `id` (UUID, PK)
- `program_task_id` (UUID): References `mp_program_tasks(id)`.
- `master_subtask_id` (UUID): References `mp_subtasks_master(id)`.
- `name` (TEXT)
- `sort_order` (INTEGER)

### `mp_pair_tasks`
Snapshot copies of program tasks or custom tasks for a specific pair.
- `id` (UUID, PK)
- `pair_id` (UUID): References `mp_pairs(id)`.
- `master_task_id` (UUID): References `mp_tasks_master(id)`. (Legacy reference)
- `program_task_id` (UUID): References `mp_program_tasks(id)`.
- `program_id` (UUID): References `mp_programs(id)`.
- `organisation_id` (UUID): References `mp_organisations(id)`.
- `name` (TEXT)
- `evidence_type_id` (UUID)
- `sort_order` (INTEGER)
- `status` (TEXT): 'not_submitted', 'awaiting_review', 'completed'.
- `rejection_reason` (TEXT)
- `is_custom` (BOOLEAN): True if added directly by mentor/mentee/supervisor.
- `completed_at` (TIMESTAMPTZ)
- `completed_by_user_id` (UUID): References `mp_profiles(id)`.

### `mp_pair_subtasks`
Snapshot copies of sub-tasks for a specific pair task.
- `id` (UUID, PK)
- `pair_task_id` (UUID): References `mp_pair_tasks(id)`.
- `master_subtask_id` (UUID): References `mp_subtasks_master(id)`.
- `name` (TEXT)
- `is_completed` (BOOLEAN)
- `is_custom` (BOOLEAN): True if added directly by mentor/mentee/supervisor.
- `completed_at` (TIMESTAMPTZ)
- `completed_by_id` (UUID)

---

## Meetings & Evidence

### `mp_meetings`
Stores scheduled and completed meetings for a pair.
- `id` (UUID, PK)
- `pair_id` (UUID): References `mp_pairs(id)`.
- `program_id` (UUID): References `mp_programs(id)`.
- `organisation_id` (UUID): References `mp_organisations(id)`.
- `title` (TEXT)
- `date_time` (TIMESTAMPTZ)
- `location_type` (TEXT): 'in-person', 'video', 'phone', 'other'.
- `status` (TEXT): 'upcoming', 'completed', 'cancelled'.
- `notes` (TEXT)

### `mp_evidence_uploads`
Stores files and text submitted as evidence for tasks or meetings.
- `id` (UUID, PK)
- `pair_id` (UUID): References `mp_pairs(id)`.
- `program_id` (UUID): References `mp_programs(id)`.
- `organisation_id` (UUID): References `mp_organisations(id)`.
- `task_id` (UUID): References `mp_pair_tasks(id)`.
- `sub_task_id` (UUID): References `mp_pair_subtasks(id)`.
- `meeting_id` (UUID): References `mp_meetings(id)`.
- `submitted_by` (UUID): References `mp_profiles(id)`.
- `type` (TEXT): 'photo' or 'text'.
- `file_url` (TEXT)
- `description` (TEXT)
- `status` (TEXT): 'pending', 'approved', 'rejected'.
- `reviewed_by` (UUID): References `mp_profiles(id)`.
- `reviewed_at` (TIMESTAMPTZ)

---

## System Tables

### `mp_evidence_types`
- `id` (UUID, PK)
- `name` (TEXT)
- `requires_submission` (BOOLEAN)

### `mp_notifications` (Unified System)
- `id` (UUID, PK)
- `recipient_id` (UUID)
- `sender_id` (UUID)
- `type` (TEXT)
- `title` (TEXT)
- `content` (TEXT)
- `action_url` (TEXT)
- `related_id` (UUID)
- `is_read` (BOOLEAN)
- `is_system` (BOOLEAN)
- `metadata` (JSONB)
