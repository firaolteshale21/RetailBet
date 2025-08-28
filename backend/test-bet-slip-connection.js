import { pool, query } from './src/db.js';

/**
 * Test script to verify bet slip connection with existing event/game tables
 */

// Sample bet slip data from your payloads
const sampleBetSlip = {
  session_guid: "chbera",
  betslip_type_value: 1,
  event_id: "90-19-1629319", // From Keno payload
  game_name: "SmartPlayKeno",
  game_number: 63138,
  game_type_value: 19,
  total_stake: 10.00,
  total_potential_win: 150.00,
  global_single_stake: 10.00,
  status: "pending",
  customer_id: "test_customer",
  shop_id: "test_shop",
  raw_payload: {
    SessionGuid: "chbera",
    BetslipTypeValue: 1,
    SingleBets: [
      {
        _id: 2,
        FeedEventId: "90-19-1629319",
        DisplayDescription: "1,2",
        SelectionId: "1,2",
        EventNumber: "63138",
        Stake: 10,
        Odds: 15
      }
    ]
  }
};

const sampleBetSelection = {
  bet_id: 2,
  selection_id: "1,2",
  display_description: "1,2",
  selection_ids: ["1,2"],
  market_class_value: 119,
  market_class_name: "KenoWin",
  market_class_display: "Win",
  stake: 10.00,
  odds: 15.00,
  potential_win: 150.00,
  bet_type_value: 1,
  number_of_combinations: 1,
  min_odds: 15.00,
  max_odds: 15.00,
  notation: "",
  element_id: "SmartPlayKeno_90-19-1629319_AddToSlipBtn",
  extra_description: ""
};

async function testBetSlipConnection() {
  try {
    console.log('🧪 Testing bet slip connection with existing tables...');

    // Step 1: Check if we have any existing events
    const existingEvents = await query(`
      SELECT event_id, game_name, game_number, is_finished, status_value 
      FROM events 
      ORDER BY updated_at DESC 
      LIMIT 5
    `);
    
    console.log(`📊 Found ${existingEvents.rows.length} existing events`);
    if (existingEvents.rows.length > 0) {
      console.log('Sample events:', existingEvents.rows[0]);
    }

    // Step 2: Check if we have any existing game results
    const existingResults = await query(`
      SELECT event_id, game_name, result_type, winning_values 
      FROM game_results 
      ORDER BY declared_at DESC 
      LIMIT 5
    `);
    
    console.log(`🏆 Found ${existingResults.rows.length} existing game results`);
    if (existingResults.rows.length > 0) {
      console.log('Sample results:', existingResults.rows[0]);
    }

    // Step 3: Test inserting a bet slip
    console.log('📝 Testing bet slip insertion...');
    
    const slipId = `SLIP_${Date.now()}`;
    
    const insertBetSlip = await query(`
      INSERT INTO bet_slips (
        slip_id, session_guid, betslip_type_value, event_id, game_name, 
        game_number, game_type_value, total_stake, total_potential_win, 
        global_single_stake, status, customer_id, shop_id, raw_payload
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING id, slip_id
    `, [
      slipId, sampleBetSlip.session_guid, sampleBetSlip.betslip_type_value,
      sampleBetSlip.event_id, sampleBetSlip.game_name, sampleBetSlip.game_number,
      sampleBetSlip.game_type_value, sampleBetSlip.total_stake, sampleBetSlip.total_potential_win,
      sampleBetSlip.global_single_stake, sampleBetSlip.status, sampleBetSlip.customer_id,
      sampleBetSlip.shop_id, JSON.stringify(sampleBetSlip.raw_payload)
    ]);

    console.log(`✅ Bet slip inserted with ID: ${insertBetSlip.rows[0].id}, Slip ID: ${insertBetSlip.rows[0].slip_id}`);

    // Step 4: Test inserting a bet selection
    console.log('🎯 Testing bet selection insertion...');
    
    const insertBetSelection = await query(`
      INSERT INTO bet_selections (
        slip_id, bet_id, selection_id, display_description, selection_ids,
        market_class_value, market_class_name, market_class_display,
        stake, odds, potential_win, bet_type_value, number_of_combinations,
        min_odds, max_odds, notation, element_id, extra_description
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      RETURNING id, slip_id
    `, [
      slipId, sampleBetSelection.bet_id, sampleBetSelection.selection_id,
      sampleBetSelection.display_description, sampleBetSelection.selection_ids,
      sampleBetSelection.market_class_value, sampleBetSelection.market_class_name,
      sampleBetSelection.market_class_display, sampleBetSelection.stake,
      sampleBetSelection.odds, sampleBetSelection.potential_win, sampleBetSelection.bet_type_value,
      sampleBetSelection.number_of_combinations, sampleBetSelection.min_odds,
      sampleBetSelection.max_odds, sampleBetSelection.notation, sampleBetSelection.element_id,
      sampleBetSelection.extra_description
    ]);

    console.log(`✅ Bet selection inserted with ID: ${insertBetSelection.rows[0].id}`);

    // Step 5: Test joining with existing tables
    console.log('🔗 Testing joins with existing tables...');
    
    const joinedData = await query(`
      SELECT 
        bs.slip_id,
        bs.event_id,
        bs.game_name,
        bs.game_number,
        bs.status,
        bs.total_stake,
        e.is_finished,
        e.status_value as event_status,
        gr.result_type,
        gr.winning_values,
        bse.selection_id,
        bse.market_class_name,
        bse.stake,
        bse.odds
      FROM bet_slips bs
      LEFT JOIN events e ON bs.event_id = e.event_id
      LEFT JOIN game_results gr ON bs.event_id = gr.event_id
      LEFT JOIN bet_selections bse ON bs.slip_id = bse.slip_id
      WHERE bs.slip_id = $1
    `, [slipId]);

    console.log(`🔗 Joined data found: ${joinedData.rows.length} records`);
    if (joinedData.rows.length > 0) {
      console.log('Sample joined data:', joinedData.rows[0]);
    }

    // Step 6: Test bet slip history
    console.log('📜 Testing bet slip history...');
    
    const insertHistory = await query(`
      INSERT INTO bet_slip_history (
        slip_id, status_from, status_to, changed_by, reason
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `, [slipId, null, 'pending', 'system', 'Initial bet slip creation']);

    console.log(`✅ History record inserted with ID: ${insertHistory.rows[0].id}`);

    // Step 7: Show final counts
    console.log('📊 Final database counts:');
    const finalBetSlips = await query('SELECT COUNT(*) as count FROM bet_slips');
    const finalBetSelections = await query('SELECT COUNT(*) as count FROM bet_selections');
    const finalHistory = await query('SELECT COUNT(*) as count FROM bet_slip_history');
    
    console.log(`   - Bet slips: ${finalBetSlips.rows[0].count}`);
    console.log(`   - Bet selections: ${finalBetSelections.rows[0].count}`);
    console.log(`   - History records: ${finalHistory.rows[0].count}`);

    console.log('🎉 All connection tests passed successfully!');
    console.log(`💡 Test data created with slip_id: ${slipId}`);
    console.log('💡 You can check the data in your database or run cleanup manually');
    
    return {
      success: true,
      message: 'Bet slip connection test completed successfully',
      slipId: slipId,
      existingEvents: existingEvents.rows.length,
      existingResults: existingResults.rows.length
    };

  } catch (error) {
    console.error('❌ Bet slip connection test failed:', error.message);
    throw error;
  }
}

// Run the test
testBetSlipConnection()
  .then(result => {
    console.log('✅ Test completed:', result);
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });
