-- Add is_active flag to Job Titles for soft-deactivation
ALTER TABLE public.mp_job_titles 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- Update RLS if necessary (though existing ones should be fine)
-- If we want to restrict selection to active ones via RLS we could, 
-- but it's better handled in the application logic for data consistency.
