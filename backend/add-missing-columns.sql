-- Add missing columns to bet_slips table
-- Run this to complete the schema for complex bet storage

-- Add missing columns to bet_slips table
ALTER TABLE bet_slips 
ADD COLUMN IF NOT EXISTS from_pending_bet BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS raw_payload JSONB,
ADD COLUMN IF NOT EXISTS redeem_code VARCHAR(255),
ADD COLUMN IF NOT EXISTS server_response JSONB,
ADD COLUMN IF NOT EXISTS validation_errors TEXT[],
ADD COLUMN IF NOT EXISTS is_expired BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS expired_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS last_validation_check TIMESTAMP;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_bet_slips_redeem_code ON bet_slips(redeem_code);
CREATE INDEX IF NOT EXISTS idx_bet_slips_raw_payload ON bet_slips USING GIN(raw_payload);
CREATE INDEX IF NOT EXISTS idx_bet_slips_server_response ON bet_slips USING GIN(server_response);

-- Add comments for documentation
COMMENT ON COLUMN bet_slips.from_pending_bet IS 'Whether this bet was from a pending bet';
COMMENT ON COLUMN bet_slips.raw_payload IS 'Complete original payload from frontend';
COMMENT ON COLUMN bet_slips.redeem_code IS 'Redeem code for the bet slip';
COMMENT ON COLUMN bet_slips.server_response IS 'Complete server response for debugging';
COMMENT ON COLUMN bet_slips.validation_errors IS 'Array of validation errors';
COMMENT ON COLUMN bet_slips.is_expired IS 'Whether bet has expired';
COMMENT ON COLUMN bet_slips.expired_at IS 'When bet expired';
COMMENT ON COLUMN bet_slips.last_validation_check IS 'Last validation check timestamp';
