import { pool } from './src/db.js';

async function debugSimpleInsert() {
  console.log('🔍 Debugging simple database insert...\n');

  const client = await pool.connect();
  
  try {
    console.log('📝 Starting transaction...');
    await client.query('BEGIN');

    // Test 1: Simple bet slip insert
    console.log('📝 Testing bet slip insert...');
    const betSlipQuery = `
      INSERT INTO bet_slips (
        slip_id, session_guid, betslip_type_value, event_id, game_name, 
        game_number, game_type_value, total_stake, total_potential_win, 
        global_single_stake, status, customer_id, shop_id, redeem_code, 
        raw_payload, placed_at, from_pending_bet, retailer_guid, is_ssbt_retailer
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      RETURNING id, slip_id, status
    `;

    const betSlipValues = [
      'test-slip-123',
      'test-session',
      1,
      'test-event-123',
      'TestGame',
      123,
      1,
      10.00,
      150.00,
      10.00,
      'pending',
      null,
      null,
      'TEST123',
      JSON.stringify({ test: 'data' }),
      new Date(),
      false,
      '',
      false
    ];

    console.log('📝 Executing bet slip insert...');
    const betSlipResult = await client.query(betSlipQuery, betSlipValues);
    console.log('✅ Bet slip inserted with ID:', betSlipResult.rows[0].id);

    // Test 2: Simple bet selection insert
    console.log('📝 Testing bet selection insert...');
    const selectionQuery = `
      INSERT INTO bet_selections (
        slip_id, bet_id, selection_id, display_description, selection_ids,
        market_class_value, market_class_name, market_class_display,
        stake, odds, potential_win, bet_type_value, number_of_combinations,
        min_odds, max_odds, notation, element_id, extra_description,
        combo_selections, bet_combination, min_notation, max_notation,
        betting_layout_value, draw_count, executing_feed_id,
        event_start_date_time, event_start_time, event_type_value
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28)
      RETURNING id, slip_id, selection_id
    `;

    const selectionValues = [
      'test-slip-123',
      1,
      'test-selection',
      'Test Selection',
      ['1', '2'],
      4,
      'ReverseForecast',
      '1st Two Any Order',
      10.00,
      32.00,
      320.00,
      3,
      1,
      32.00,
      32.00,
      '[1-2]',
      'test-element',
      '',
      JSON.stringify([{ test: 'combo' }]),
      JSON.stringify([{ test: 'combination' }]),
      '[1-2]',
      '[1-2]',
      '1',
      null,
      'test-feed',
      new Date(),
      '20:41',
      2
    ];

    console.log('📝 Executing bet selection insert...');
    const selectionResult = await client.query(selectionQuery, selectionValues);
    console.log('✅ Bet selection inserted with ID:', selectionResult.rows[0].id);

    console.log('📝 Committing transaction...');
    await client.query('COMMIT');
    console.log('✅ Transaction committed successfully!');

  } catch (error) {
    console.error('❌ Error occurred:');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
    console.error('Error detail:', error.detail);
    console.error('Error hint:', error.hint);
    console.error('Error where:', error.where);
    console.error('Error stack:', error.stack);
    
    console.log('📝 Rolling back transaction...');
    await client.query('ROLLBACK');
    console.log('❌ Transaction rolled back');
    
  } finally {
    client.release();
  }
}

// Run the debug
debugSimpleInsert();
