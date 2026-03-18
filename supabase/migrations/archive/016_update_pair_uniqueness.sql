-- Migration 016: Update mp_pairs uniqueness constraint
-- Allow multiple pairs between same mentor and mentee, but only one can be 'active'

-- Drop the strict unique constraint that prevents any duplicate (mentor, mentee) combination
ALTER TABLE mp_pairs DROP CONSTRAINT IF EXISTS unique_pair;

-- Create a partial unique index that only enforces uniqueness for 'active' pairs
-- This allows having historical 'completed' or 'archived' pairs between the same people
-- while starting a new 'active' one.
CREATE UNIQUE INDEX idx_mp_pairs_active_uniqueness 
ON mp_pairs (mentor_id, mentee_id) 
WHERE (status = 'active');

COMMENT ON INDEX idx_mp_pairs_active_uniqueness IS 'Ensures only one active pair exists between the same mentor and mentee';
