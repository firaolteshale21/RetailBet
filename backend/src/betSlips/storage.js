import { query, pool } from '../db.js';
import { logger } from '../logger.js';

/**
 * Bet Slip Storage Module with Transaction Support
 * Handles storing bet slips and selections in the database using transactions
 */

/**
 * Store a complete bet slip with all its selections using a transaction
 * @param {Object} betObject - The bet object from frontend
 * @param {string} betslipId - Unique bet slip ID
 * @param {string} redeemCode - Redeem code for the bet slip
 * @param {string} sessionGuid - Session GUID from the bet object
 * @returns {Promise<Object>} - Result of the storage operation
 */
export async function storeBetSlip(betObject, betslipId, redeemCode, sessionGuid) {
  // Get a client from the pool for transaction
  const client = await pool.connect();
  
  try {
    logger.info(`📝 Storing bet slip with transaction: ${betslipId}`);

    // Start transaction
    await client.query('BEGIN');

    // Check if slip_id already exists
    const existingSlip = await client.query('SELECT slip_id FROM bet_slips WHERE slip_id = $1', [betslipId]);
    if (existingSlip.rows.length > 0) {
      throw new Error(`Bet slip with ID ${betslipId} already exists`);
    }

    // Extract the first bet to get common event information
    const firstBet = betObject.SingleBets[0];
    if (!firstBet) {
      throw new Error('No single bets found in bet object');
    }

    // Calculate totals
    const totalStake = betObject.SingleBets.reduce((sum, bet) => sum + (bet.Stake || 0), 0);
    const totalPotentialWin = betObject.SingleBets.reduce((sum, bet) => sum + (bet.PotentialWin || 0), 0);

    // Extract event information from the first bet
    const eventInfo = extractEventInfo(firstBet);

         // Store the main bet slip
     const betSlipData = {
       slip_id: betslipId,
       session_guid: sessionGuid,
       betslip_type_value: betObject.BetslipTypeValue || 1,
       event_id: eventInfo.eventId,
       game_name: eventInfo.gameName,
       game_number: eventInfo.gameNumber,
       game_type_value: eventInfo.gameTypeValue,
       total_stake: totalStake,
       total_potential_win: totalPotentialWin,
       global_single_stake: betObject.GlobalSingleStake || totalStake,
       status: 'pending',
       customer_id: betObject.CustomerId || null,
       shop_id: betObject.ShopId || null,
       redeem_code: redeemCode,
       raw_payload: betObject,
       placed_at: new Date(),
       // Complex bet fields
       from_pending_bet: betObject.FromPendingBet || false,
       retailer_guid: betObject.RetailerGuid || '',
       is_ssbt_retailer: betObject.IsSSBTRetailer || false
     };

    const betSlipResult = await insertBetSlipWithClient(client, betSlipData);
    logger.info(`✅ Bet slip stored with ID: ${betSlipResult.id}`);

         // Store all bet selections
     const selectionResults = [];
     for (const bet of betObject.SingleBets) {
       // Calculate potential win if not provided
       const potentialWin = bet.PotentialWin || (bet.Stake * bet.Odds);
       
       const selectionData = {
         slip_id: betslipId,
         bet_id: bet._id || bet.ID || 0,
         selection_id: bet.SelectionId || '',
         display_description: bet.DisplayDescription || '',
         selection_ids: bet.SelectionIds ? bet.SelectionIds.filter(Boolean) : [bet.SelectionId].filter(Boolean),
         market_class_value: bet.MarketClass?.value || bet.MarketClassValue || 0,
         market_class_name: bet.MarketClass?.name || 'Unknown',
         market_class_display: bet.MarketClass?.display || 'Unknown',
         stake: bet.Stake || 0,
         odds: bet.Odds || 0,
         potential_win: potentialWin || 0,
         bet_type_value: bet.BetTypeValue || 1,
         number_of_combinations: bet.NumberOfCombinations || 1,
         min_odds: bet.MinOdds || bet.Odds || 0,
         max_odds: bet.MaxOdds || bet.Odds || 0,
         notation: bet.Notation || '',
         element_id: bet.ElementId || '',
         extra_description: bet.ExtraDescription || '',
         // Complex bet fields
         combo_selections: bet.ComboSelections || null,
         bet_combination: bet.BetCombination || null,
         min_notation: bet.MinNotation || '',
         max_notation: bet.MaxNotation || '',
         betting_layout_value: bet.BettingLayoutValue || '',
         draw_count: bet.DrawCount || null,
         executing_feed_id: bet.ExecutingFeedId || '',
         event_start_date_time: bet.EventStartDateTime ? new Date(bet.EventStartDateTime) : null,
         event_start_time: bet.EventStartTime || '',
         event_type_value: bet.EventTypeValue || null
       };

      const selectionResult = await insertBetSelectionWithClient(client, selectionData);
      selectionResults.push(selectionResult);
      logger.info(`✅ Bet selection stored with ID: ${selectionResult.id}`);
    }

    // Store initial history record
    await insertBetSlipHistoryWithClient(client, {
      slip_id: betslipId,
      status_from: null,
      status_to: 'pending',
      changed_by: 'system',
      reason: 'Initial bet slip creation'
    });

    // Commit transaction
    await client.query('COMMIT');
    logger.info(`✅ Transaction committed successfully for bet slip: ${betslipId}`);

    return {
      success: true,
      betSlipId: betslipId,
      redeemCode: redeemCode,
      betSlip: betSlipResult,
      selections: selectionResults
    };

  } catch (error) {
    // Rollback transaction on error
    await client.query('ROLLBACK');
    logger.error(`❌ Transaction rolled back for bet slip ${betslipId}:`, error);
    
    // Log detailed error information
    logger.error('🔍 Detailed error info:', {
      errorName: error.name,
      errorMessage: error.message,
      errorCode: error.code,
      errorDetail: error.detail,
      errorHint: error.hint,
      errorWhere: error.where,
      errorStack: error.stack
    });
    
    // Log the full error object for debugging
    logger.error('🔍 Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
    
    throw error;
  } finally {
    // Always release the client back to the pool
    client.release();
  }
}

/**
 * Insert a bet slip into the database using provided client
 */
async function insertBetSlipWithClient(client, betSlipData) {
  const queryText = `
    INSERT INTO bet_slips (
      slip_id, session_guid, betslip_type_value, event_id, game_name, 
      game_number, game_type_value, total_stake, total_potential_win, 
      global_single_stake, status, customer_id, shop_id, redeem_code, 
      raw_payload, placed_at, from_pending_bet, retailer_guid, is_ssbt_retailer
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
    RETURNING id, slip_id, status
  `;

  const values = [
    betSlipData.slip_id,
    betSlipData.session_guid,
    betSlipData.betslip_type_value,
    betSlipData.event_id,
    betSlipData.game_name,
    betSlipData.game_number,
    betSlipData.game_type_value,
    betSlipData.total_stake,
    betSlipData.total_potential_win,
    betSlipData.global_single_stake,
    betSlipData.status,
    betSlipData.customer_id,
    betSlipData.shop_id,
    betSlipData.redeem_code,
    JSON.stringify(betSlipData.raw_payload),
    betSlipData.placed_at,
    betSlipData.from_pending_bet,
    betSlipData.retailer_guid,
    betSlipData.is_ssbt_retailer
  ];

  const result = await client.query(queryText, values);
  return result.rows[0];
}

/**
 * Insert a bet selection into the database using provided client
 */
async function insertBetSelectionWithClient(client, selectionData) {
  const queryText = `
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

  const values = [
    selectionData.slip_id,
    selectionData.bet_id,
    selectionData.selection_id,
    selectionData.display_description,
    selectionData.selection_ids,
    selectionData.market_class_value,
    selectionData.market_class_name,
    selectionData.market_class_display,
    selectionData.stake,
    selectionData.odds,
    selectionData.potential_win,
    selectionData.bet_type_value,
    selectionData.number_of_combinations,
    selectionData.min_odds,
    selectionData.max_odds,
    selectionData.notation,
    selectionData.element_id,
    selectionData.extra_description,
    selectionData.combo_selections ? JSON.stringify(selectionData.combo_selections) : null,
    selectionData.bet_combination ? JSON.stringify(selectionData.bet_combination) : null,
    selectionData.min_notation,
    selectionData.max_notation,
    selectionData.betting_layout_value,
    selectionData.draw_count,
    selectionData.executing_feed_id,
    selectionData.event_start_date_time,
    selectionData.event_start_time,
    selectionData.event_type_value
  ];

  const result = await client.query(queryText, values);
  return result.rows[0];
}

/**
 * Insert a bet slip history record using provided client
 */
async function insertBetSlipHistoryWithClient(client, historyData) {
  const queryText = `
    INSERT INTO bet_slip_history (
      slip_id, status_from, status_to, changed_by, reason
    ) VALUES ($1, $2, $3, $4, $5)
    RETURNING id
  `;

  const values = [
    historyData.slip_id,
    historyData.status_from,
    historyData.status_to,
    historyData.changed_by,
    historyData.reason
  ];

  const result = await client.query(queryText, values);
  return result.rows[0];
}

/**
 * Extract event information from a bet
 */
function extractEventInfo(bet) {
  // Handle different event ID formats
  let eventId = bet.FeedEventId;
  let gameName = 'Unknown';
  let gameNumber = null;
  let gameTypeValue = null;

  // Parse event ID format: "FeedId-TypeValue-EventId"
  if (eventId && eventId.includes('-')) {
    const parts = eventId.split('-');
    if (parts.length >= 3) {
      gameTypeValue = parseInt(parts[1]);
      gameNumber = parseInt(bet.EventNumber);
      
      // Map game type values to names
      const gameTypeMap = {
        1: 'DashingDerby',
        3: 'HarnessRacing',
        5: 'CycleRacing',
        6: 'MotorRacing',
        16: 'SteepleChase',
        17: 'SpeedSkating',
        18: 'SingleSeaterMotorRacing',
        19: 'SmartPlayKeno',
        24: 'SpinAndWin'
      };
      
      gameName = gameTypeMap[gameTypeValue] || 'Unknown';
    }
  }

  // Handle the actual frontend data structure
  if (bet.Event && bet.Event.type) {
    // Frontend uses lowercase 'type' with nested properties
    gameName = bet.Event.type.name || bet.Event.type.eventTypeCategoryEnum || gameName;
    gameTypeValue = bet.Event.type.value || gameTypeValue;
  } else if (bet.Event && bet.Event.Type) {
    // Our test data uses uppercase 'Type'
    gameName = bet.Event.Type.Name || gameName;
    gameTypeValue = bet.Event.Type.Value || gameTypeValue;
  }

  return {
    eventId,
    gameName,
    gameNumber,
    gameTypeValue
  };
}

/**
 * Get bet slip by ID
 */
export async function getBetSlip(slipId) {
  try {
    const queryText = `
      SELECT 
        bs.*,
        json_agg(
          json_build_object(
            'id', bse.id,
            'bet_id', bse.bet_id,
            'selection_id', bse.selection_id,
            'display_description', bse.display_description,
            'stake', bse.stake,
            'odds', bse.odds,
            'potential_win', bse.potential_win,
            'market_class_name', bse.market_class_name
          )
        ) as selections
      FROM bet_slips bs
      LEFT JOIN bet_selections bse ON bs.slip_id = bse.slip_id
      WHERE bs.slip_id = $1
      GROUP BY bs.id, bs.slip_id
    `;

    const result = await query(queryText, [slipId]);
    return result.rows[0] || null;
  } catch (error) {
    logger.error('❌ Error getting bet slip:', error);
    throw error;
  }
}

/**
 * Update bet slip status
 */
export async function updateBetSlipStatus(slipId, newStatus, changedBy = 'system', reason = '') {
  try {
    // Get current status
    const currentBetSlip = await getBetSlip(slipId);
    if (!currentBetSlip) {
      throw new Error(`Bet slip not found: ${slipId}`);
    }

    // Update status
    const updateQuery = `
      UPDATE bet_slips 
      SET status = $1, updated_at = NOW()
      WHERE slip_id = $2
      RETURNING id, slip_id, status
    `;

    const updateResult = await query(updateQuery, [newStatus, slipId]);

    // Add history record using regular query (not in transaction)
    const historyQuery = `
      INSERT INTO bet_slip_history (
        slip_id, status_from, status_to, changed_by, reason
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `;
    
    await query(historyQuery, [
      slipId,
      currentBetSlip.status,
      newStatus,
      changedBy,
      reason
    ]);

    return updateResult.rows[0];
  } catch (error) {
    logger.error('❌ Error updating bet slip status:', error);
    throw error;
  }
}
