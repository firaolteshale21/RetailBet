-- Add columns to bet_selections table for complex bet types
-- Run this after the initial bet_slips.sql has been executed

-- Add columns for complex bet handling
ALTER TABLE bet_selections 
ADD COLUMN IF NOT EXISTS combo_selections JSONB,
ADD COLUMN IF NOT EXISTS bet_combination JSONB,
ADD COLUMN IF NOT EXISTS min_notation VARCHAR(100),
ADD COLUMN IF NOT EXISTS max_notation VARCHAR(100),
ADD COLUMN IF NOT EXISTS betting_layout_value VARCHAR(10),
ADD COLUMN IF NOT EXISTS draw_count INTEGER,
ADD COLUMN IF NOT EXISTS executing_feed_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS event_start_date_time TIMESTAMP,
ADD COLUMN IF NOT EXISTS event_start_time VARCHAR(10),
ADD COLUMN IF NOT EXISTS event_type_value INTEGER,
ADD COLUMN IF NOT EXISTS market_class_value INTEGER;

-- Add columns to bet_slips table for complex bet handling
ALTER TABLE bet_slips 
ADD COLUMN IF NOT EXISTS from_pending_bet BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS retailer_guid VARCHAR(255),
ADD COLUMN IF NOT EXISTS is_ssbt_retailer BOOLEAN DEFAULT FALSE;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_bet_selections_market_class_value ON bet_selections(market_class_value);
CREATE INDEX IF NOT EXISTS idx_bet_selections_notation ON bet_selections(notation);
CREATE INDEX IF NOT EXISTS idx_bet_selections_combo_selections ON bet_selections USING GIN(combo_selections);
CREATE INDEX IF NOT EXISTS idx_bet_selections_bet_combination ON bet_selections USING GIN(bet_combination);

-- Add comments for documentation
COMMENT ON COLUMN bet_selections.combo_selections IS 'Complex bet selections array from frontend';
COMMENT ON COLUMN bet_selections.bet_combination IS 'Bet combination data for complex bets';
COMMENT ON COLUMN bet_selections.min_notation IS 'Minimum notation for complex bets';
COMMENT ON COLUMN bet_selections.max_notation IS 'Maximum notation for complex bets';
COMMENT ON COLUMN bet_selections.betting_layout_value IS 'Betting layout value from frontend';
COMMENT ON COLUMN bet_selections.draw_count IS 'Number of draws for the bet';
COMMENT ON COLUMN bet_selections.executing_feed_id IS 'Executing feed ID for the bet';
COMMENT ON COLUMN bet_selections.event_start_date_time IS 'Event start date and time';
COMMENT ON COLUMN bet_selections.event_start_time IS 'Event start time';
COMMENT ON COLUMN bet_selections.event_type_value IS 'Event type value';
COMMENT ON COLUMN bet_selections.market_class_value IS 'Market class value for complex bets';
