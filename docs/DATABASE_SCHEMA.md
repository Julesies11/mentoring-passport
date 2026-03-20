# Mentoring Passport Database Schema (Source of Truth)

This document serves as the primary reference for all database tables, fields, and relationships in the Mentoring Passport application. The system is a **Single Organisation Instance** with Role-Based Access Control (RBAC) enforced via JWT metadata.

## Core Tables

### `mp_profiles`
Stores user profile information, linked to `auth.users`.
- `id` (UUID, PK): References `auth.users(id)`.
- `email` (TEXT, UNIQUE)
- `role` (TEXT): 'administrator', 'org-admin', 'supervisor', or 'program-member'. **(Source of Truth for RBAC, synced to auth.users.app_metadata.role)**
- `full_name` (TEXT)
- `department` (TEXT)
- `job_title_id` (UUID, NULLable): References `mp_job_titles(id)`.
- `bio` (TEXT)
- `avatar_url` (TEXT)
- `phone` (TEXT)
- `status` (TEXT): 'active' or 'archived'.
- `must_change_password` (BOOLEAN)

### `mp_job_titles`
Lookup table for managed job titles, controlled by Org Admins.
- `id` (UUID, PK)
- `organisation_id` (UUID): References `mp_organisations(id)`.
- `title` (TEXT)
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

### `mp_organisations`
Stores the single organization's details.
- `id` (UUID, PK)
- `name` (TEXT)
- `logo_url` (TEXT)

### `mp_supervisor_programs`
Junction table linking supervisors to specific programs within the instance.
- `id` (UUID, PK)
- `user_id` (UUID): References `auth.users(id)`.
- `program_id` (UUID): References `mp_programs(id)`.

### `mp_programs`
Stores mentoring program details.
- `id` (UUID, PK)
- `task_list_id` (UUID): References `mp_task_lists_master(id)`.
- `name` (TEXT)
- `description` (TEXT)
- `start_date` (DATE)
- `end_date` (DATE)
- `status` (TEXT): 'active', 'inactive', or 'archived'.

### `mp_pairs`
Stores mentor-mentee pairings within a program.
- `id` (UUID, PK)
- `mentor_id` (UUID): References `mp_profiles(id)`.
- `mentee_id` (UUID): References `mp_profiles(id)`.
- `program_id` (UUID): References `mp_programs(id)`.
- `status` (TEXT): 'active', 'completed', or 'archived'.

---

## Tasks & Sub-tasks System

### `mp_task_lists_master`
Master task lists created by Admins as templates for programs.
- `id` (UUID, PK)
- `name` (TEXT)
- `description` (TEXT)
- `is_active` (BOOLEAN)

### `mp_tasks_master`
Template for tasks, linked to a task list.
- `id` (UUID, PK)
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
- `sort_order` (INTEGER)

### `mp_program_tasks`
Snapshot copies of master tasks for a specific program. Can be edited by supervisors without affecting the master list.
- `id` (UUID, PK)
- `program_id` (UUID): References `mp_programs(id)`.
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
- `program_task_id` (UUID): References `mp_program_tasks(id)`.
- `program_id` (UUID): References `mp_programs(id)`.
- `name` (TEXT)
- `evidence_type_id` (UUID)
- `sort_order` (INTEGER)
- `status` (TEXT): 'not_submitted', 'awaiting_review', 'completed'.
- `rejection_reason` (TEXT)
- `is_custom` (BOOLEAN): True if added directly by mentor/mentee/supervisor.
- `submitted_at` (TIMESTAMPTZ): When the task was first moved to 'awaiting_review'.
- `submitted_by_id` (UUID): References `mp_profiles(id)`. The user who submitted for review.
- `completed_at` (TIMESTAMPTZ): When the task was moved to 'completed'.
- `completed_by_user_id` (UUID): References `mp_profiles(id)`. The supervisor who approved the task.
- `last_reviewed_at` (TIMESTAMPTZ): Timestamp of the last approval/rejection.
- `last_reviewed_by_id` (UUID): References `mp_profiles(id)`. The supervisor who last acted on the task.
- `last_action` (TEXT): 'submitted', 'approved', or 'rejected'.

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
