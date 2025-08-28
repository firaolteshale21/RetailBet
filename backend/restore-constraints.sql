-- Restore Foreign Key Constraints for Bet Slip Tables
-- Run this script to restore data integrity constraints

-- Add foreign key constraint for bet_selections table
ALTER TABLE bet_selections 
ADD CONSTRAINT fk_bet_selections_slip_id 
FOREIGN KEY (slip_id) REFERENCES bet_slips(slip_id) ON DELETE CASCADE;

-- Add foreign key constraint for bet_slip_history table
ALTER TABLE bet_slip_history 
ADD CONSTRAINT fk_bet_slip_history_slip_id 
FOREIGN KEY (slip_id) REFERENCES bet_slips(slip_id) ON DELETE CASCADE;

-- Verify constraints are added
SELECT 
    tc.table_name, 
    tc.constraint_name, 
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name IN ('bet_selections', 'bet_slip_history')
ORDER BY tc.table_name, tc.constraint_name;

