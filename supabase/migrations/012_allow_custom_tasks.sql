-- Make master_task_id nullable to allow for custom pair-specific tasks
ALTER TABLE mp_pair_tasks ALTER COLUMN master_task_id DROP NOT NULL;

-- Make master_subtask_id nullable to allow for custom pair-specific subtasks
ALTER TABLE mp_pair_subtasks ALTER COLUMN master_subtask_id DROP NOT NULL;

-- Also update the trigger function to handle potential nulls (though it usually won't have them)
-- No changes needed to mp_handle_new_user as it doesn't touch these tables.
