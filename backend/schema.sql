-- GameInfoFetching Database Schema
-- This file contains all the necessary SQL statements to set up the database

-- Create events table
CREATE TABLE IF NOT EXISTS events (
    id SERIAL PRIMARY KEY,
    event_id VARCHAR(255) UNIQUE NOT NULL,
    game_name VARCHAR(100),
    game_number INTEGER,
    start_time TIMESTAMP,
    finish_time TIMESTAMP,
    is_finished BOOLEAN DEFAULT FALSE,
    status_value INTEGER,
    raw_payload JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create game_results table
CREATE TABLE IF NOT EXISTS game_results (
    id SERIAL PRIMARY KEY,
    event_id VARCHAR(255) UNIQUE NOT NULL,
    game_name VARCHAR(100),
    result_type VARCHAR(50),
    winning_values JSONB,
    result_data JSONB,
    game_number INTEGER,
    declared_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create raw_events table
CREATE TABLE IF NOT EXISTS raw_events (
    id SERIAL PRIMARY KEY,
    event_id VARCHAR(255),
    game_name VARCHAR(100),
    source_endpoint VARCHAR(100),
    payload JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_events_event_id ON events(event_id);
CREATE INDEX IF NOT EXISTS idx_events_game_name ON events(game_name);
CREATE INDEX IF NOT EXISTS idx_events_start_time ON events(start_time);
CREATE INDEX IF NOT EXISTS idx_events_is_finished ON events(is_finished);
CREATE INDEX IF NOT EXISTS idx_events_game_number ON events(game_number);
CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at);

CREATE INDEX IF NOT EXISTS idx_game_results_event_id ON game_results(event_id);
CREATE INDEX IF NOT EXISTS idx_game_results_game_name ON game_results(game_name);
CREATE INDEX IF NOT EXISTS idx_game_results_game_number ON game_results(game_number);
CREATE INDEX IF NOT EXISTS idx_game_results_declared_at ON game_results(declared_at);

CREATE INDEX IF NOT EXISTS idx_raw_events_event_id ON raw_events(event_id);
CREATE INDEX IF NOT EXISTS idx_raw_events_game_name ON raw_events(game_name);
CREATE INDEX IF NOT EXISTS idx_raw_events_source_endpoint ON raw_events(source_endpoint);
CREATE INDEX IF NOT EXISTS idx_raw_events_created_at ON raw_events(created_at);

-- Add comments for documentation
COMMENT ON TABLE events IS 'Stores game events with their metadata and status';
COMMENT ON TABLE game_results IS 'Stores winning values and results for finished games';
COMMENT ON TABLE raw_events IS 'Stores raw API responses for debugging and analysis';

COMMENT ON COLUMN events.event_id IS 'Unique identifier for the game event';
COMMENT ON COLUMN events.game_name IS 'Name of the game type (e.g., SmartPlayKeno)';
COMMENT ON COLUMN events.game_number IS 'Sequential number of the game';
COMMENT ON COLUMN events.start_time IS 'When the game starts';
COMMENT ON COLUMN events.finish_time IS 'When the game is expected to finish';
COMMENT ON COLUMN events.is_finished IS 'Whether the game has completed';
COMMENT ON COLUMN events.status_value IS 'Game status (1=upcoming, 2=in progress, 3=finished, 4=cancelled)';
COMMENT ON COLUMN events.raw_payload IS 'Raw API response data (JSONB)';

COMMENT ON COLUMN game_results.event_id IS 'Reference to the event';
COMMENT ON COLUMN game_results.result_type IS 'Type of result (winner, finished, cancelled, etc.)';
COMMENT ON COLUMN game_results.winning_values IS 'Winning numbers/values (JSONB)';
COMMENT ON COLUMN game_results.result_data IS 'Full result data (JSONB)';

COMMENT ON COLUMN raw_events.event_id IS 'Reference to the event (nullable for list responses)';
COMMENT ON COLUMN raw_events.source_endpoint IS 'API endpoint that generated this response';
COMMENT ON COLUMN raw_events.payload IS 'Raw API response (JSONB)';
