-- Add title column to mp_notes
ALTER TABLE mp_notes ADD COLUMN title TEXT;

-- Update existing notes to have a default title if needed
UPDATE mp_notes SET title = 'Untitled Note' WHERE title IS NULL;
