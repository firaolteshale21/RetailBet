-- Bet Slip Database Schema
-- Complete schema for storing and tracking bet slips across all game types

-- 1. Bet Slips Table (Main bet slip information)
CREATE TABLE IF NOT EXISTS bet_slips (
    id SERIAL PRIMARY KEY,
    slip_id VARCHAR(255) UNIQUE NOT NULL,           -- Generated unique slip ID
    session_guid VARCHAR(255) NOT NULL,             -- From payload SessionGuid
    betslip_type_value INTEGER NOT NULL,            -- From payload BetslipTypeValue
    
    -- Event Information (links to existing tables)
    event_id VARCHAR(255) NOT NULL,                 -- FeedEventId from payload
    game_name VARCHAR(100) NOT NULL,                -- Event.type.name (SmartPlayKeno, DashingDerby, etc.)
    game_number INTEGER NOT NULL,                   -- EventNumber from payload (as INTEGER)
    game_type_value INTEGER NOT NULL,               -- Event.type.value
    
    -- Bet Details
    total_stake DECIMAL(15,2) NOT NULL,             -- Sum of all stakes
    total_potential_win DECIMAL(15,2) NOT NULL,     -- Sum of all potential winnings
    global_single_stake DECIMAL(15,2),              -- GlobalSingleStake from payload
    
    -- Status Tracking
    status VARCHAR(20) DEFAULT 'pending',           -- pending, placed, won, lost, cancelled, claimed
    placed_at TIMESTAMP,                            -- When bet was placed
    settled_at TIMESTAMP,                           -- When bet was settled
    claimed_at TIMESTAMP,                           -- When winnings were claimed
    cancelled_at TIMESTAMP,                         -- When bet was cancelled
    cancelled_reason VARCHAR(255),                  -- Reason for cancellation
    
    -- Settlement Details
    settlement_amount DECIMAL(15,2),                -- Actual amount won/lost
    settlement_reason VARCHAR(255),                 -- Reason for settlement
    
    -- Customer/Shop Information
    customer_id VARCHAR(255),                       -- Customer identifier
    shop_id VARCHAR(255),                           -- Shop/cashier identifier
    
    -- Server Response Tracking
    redeem_code VARCHAR(255),                       -- RedeemCode from server response
    server_response JSONB,                          -- Complete server response for debugging
    validation_errors TEXT[],                       -- Array of validation errors
    is_expired BOOLEAN DEFAULT FALSE,               -- Whether bet has expired
    expired_at TIMESTAMP,                           -- When bet expired
    last_validation_check TIMESTAMP,                -- Last validation check timestamp
    
    -- Additional Payload Fields
    from_pending_bet BOOLEAN DEFAULT FALSE,         -- FromPendingBet from payload
    retailer_guid VARCHAR(255),                     -- RetailerGuid from payload
    is_ssbt_retailer BOOLEAN DEFAULT FALSE,         -- IsSSBTRetailer from payload
    
    -- Metadata
    raw_payload JSONB,                              -- Complete original payload
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. Bet Selections Table (Individual selections within a bet slip)
CREATE TABLE IF NOT EXISTS bet_selections (
    id SERIAL PRIMARY KEY,
    slip_id VARCHAR(255) NOT NULL,                  -- Links to bet_slips table
    bet_id INTEGER NOT NULL,                        -- _id from payload SingleBets array
    
    -- Selection Details
    selection_id VARCHAR(255) NOT NULL,             -- SelectionId from payload
    display_description VARCHAR(255),               -- DisplayDescription from payload
    selection_ids TEXT[],                           -- SelectionIds array from payload
    
    -- Market Information
    market_class_value INTEGER NOT NULL,            -- MarketClass.value
    market_class_name VARCHAR(100) NOT NULL,        -- MarketClass.name (Win, Place, Forecast, etc.)
    market_class_display VARCHAR(100) NOT NULL,     -- MarketClass.display
    
    -- Bet Details
    stake DECIMAL(15,2) NOT NULL,                   -- Stake for this selection
    odds DECIMAL(10,4) NOT NULL,                    -- Odds for this selection
    potential_win DECIMAL(15,2) NOT NULL,           -- Stake * Odds
    
    -- Complex Bet Details
    bet_type_value INTEGER,                         -- TypeValue for complex bets
    number_of_combinations INTEGER,                 -- NumberOfCombinations for forecasts
    min_odds DECIMAL(10,4),                         -- MinOdds for complex bets
    max_odds DECIMAL(10,4),                         -- MaxOdds for complex bets
    notation VARCHAR(100),                          -- Notation for complex bets
    
    -- Selection Status
    is_winner BOOLEAN DEFAULT FALSE,                -- Whether this selection won
    payout_amount DECIMAL(15,2),                    -- Payout for this selection
    
    -- Additional Payload Fields
    validation_error TEXT,                          -- Validation error for this selection
    is_expired BOOLEAN DEFAULT FALSE,               -- Whether this selection expired
    draw_count INTEGER,                             -- DrawCount from payload
    executing_feed_id VARCHAR(255),                 -- ExecutingFeedId from payload
    betting_layout_value INTEGER,                   -- BettingLayoutValue from payload
    combo_selections JSONB,                         -- ComboSelections array from payload
    
    -- Metadata
    element_id VARCHAR(255),                        -- ElementId from payload
    extra_description TEXT,                         -- ExtraDescription from payload
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Foreign Key Constraint
    CONSTRAINT fk_bet_selections_slip_id FOREIGN KEY (slip_id) REFERENCES bet_slips(slip_id) ON DELETE CASCADE
);

-- 3. Bet Slip History Table (Audit trail for status changes)
CREATE TABLE IF NOT EXISTS bet_slip_history (
    id SERIAL PRIMARY KEY,
    slip_id VARCHAR(255) NOT NULL,                  -- Links to bet_slips table
    status_from VARCHAR(20),                        -- Previous status
    status_to VARCHAR(20) NOT NULL,                 -- New status
    changed_by VARCHAR(255),                        -- Who made the change
    reason VARCHAR(255),                            -- Reason for status change
    metadata JSONB,                                 -- Additional context
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    
    -- Foreign Key Constraint
    CONSTRAINT fk_bet_slip_history_slip_id FOREIGN KEY (slip_id) REFERENCES bet_slips(slip_id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_bet_slips_slip_id ON bet_slips(slip_id);
CREATE INDEX IF NOT EXISTS idx_bet_slips_event_id ON bet_slips(event_id);
CREATE INDEX IF NOT EXISTS idx_bet_slips_game_name ON bet_slips(game_name);
CREATE INDEX IF NOT EXISTS idx_bet_slips_status ON bet_slips(status);
CREATE INDEX IF NOT EXISTS idx_bet_slips_placed_at ON bet_slips(placed_at);
CREATE INDEX IF NOT EXISTS idx_bet_slips_session_guid ON bet_slips(session_guid);
CREATE INDEX IF NOT EXISTS idx_bet_slips_redeem_code ON bet_slips(redeem_code);
CREATE INDEX IF NOT EXISTS idx_bet_slips_is_expired ON bet_slips(is_expired);

CREATE INDEX IF NOT EXISTS idx_bet_selections_slip_id ON bet_selections(slip_id);
CREATE INDEX IF NOT EXISTS idx_bet_selections_bet_id ON bet_selections(bet_id);
CREATE INDEX IF NOT EXISTS idx_bet_selections_selection_id ON bet_selections(selection_id);
CREATE INDEX IF NOT EXISTS idx_bet_selections_market_class_name ON bet_selections(market_class_name);
CREATE INDEX IF NOT EXISTS idx_bet_selections_is_winner ON bet_selections(is_winner);
CREATE INDEX IF NOT EXISTS idx_bet_selections_is_expired ON bet_selections(is_expired);

CREATE INDEX IF NOT EXISTS idx_bet_slip_history_slip_id ON bet_slip_history(slip_id);
CREATE INDEX IF NOT EXISTS idx_bet_slip_history_created_at ON bet_slip_history(created_at);

-- Add comments for documentation
COMMENT ON TABLE bet_slips IS 'Main bet slip information with links to game events';
COMMENT ON TABLE bet_selections IS 'Individual selections within bet slips';
COMMENT ON TABLE bet_slip_history IS 'Audit trail for bet slip status changes';

COMMENT ON COLUMN bet_slips.slip_id IS 'Generated unique bet slip identifier';
COMMENT ON COLUMN bet_slips.event_id IS 'FeedEventId from payload - links to events table';
COMMENT ON COLUMN bet_slips.game_name IS 'Event.type.name from payload (SmartPlayKeno, DashingDerby, etc.)';
COMMENT ON COLUMN bet_slips.game_number IS 'EventNumber from payload (as INTEGER)';
COMMENT ON COLUMN bet_slips.status IS 'Bet status: pending, placed, won, lost, cancelled, claimed';
COMMENT ON COLUMN bet_slips.redeem_code IS 'RedeemCode from server response for claiming winnings';
COMMENT ON COLUMN bet_slips.server_response IS 'Complete server response for debugging and tracking';
COMMENT ON COLUMN bet_slips.validation_errors IS 'Array of validation errors if bet placement failed';

COMMENT ON COLUMN bet_selections.bet_id IS '_id from payload SingleBets array';
COMMENT ON COLUMN bet_selections.selection_id IS 'SelectionId from payload';
COMMENT ON COLUMN bet_selections.market_class_name IS 'MarketClass.name (Win, Place, Forecast, etc.)';
COMMENT ON COLUMN bet_selections.is_winner IS 'Whether this selection won';
COMMENT ON COLUMN bet_selections.combo_selections IS 'ComboSelections array for complex bets';
COMMENT ON COLUMN bet_selections.draw_count IS 'DrawCount for games with multiple draws';