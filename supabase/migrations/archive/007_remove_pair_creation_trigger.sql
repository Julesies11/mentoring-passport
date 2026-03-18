-- Remove database trigger and move pair_tasks creation to application layer
-- This improves testability, visibility, and debugging

-- Drop the trigger
DROP TRIGGER IF EXISTS mp_on_pair_created ON mp_pairs;

-- Drop the trigger function (no longer needed)
DROP FUNCTION IF EXISTS mp_create_pair_tasks_for_new_pair();

-- Note: The mp_on_pair_created_notify trigger remains for notifications
-- The pair_tasks creation logic will now be handled in the application layer (src/lib/api/pairs.ts)
