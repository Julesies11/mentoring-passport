-- Add evidence_type_id to mp_evidence_uploads if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mp_evidence_uploads' AND column_name = 'evidence_type_id') THEN
    ALTER TABLE mp_evidence_uploads ADD COLUMN evidence_type_id UUID REFERENCES mp_evidence_types(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_mp_evidence_uploads_evidence_type_id ON mp_evidence_uploads(evidence_type_id);
