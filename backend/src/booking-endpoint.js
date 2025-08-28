import { v4 as uuidv4 } from 'uuid';
import { storeBetSlip } from './betSlips/storage.js';
import { logger } from './logger.js';

/**
 * Generate a random redeem code
 * @param {number} length - Length of the redeem code
 * @returns {string} - Random redeem code
 */
function generateRedeemCode(length = 8) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Booking endpoint handler
 * Stores bet slips in the database and returns the expected response format
 */
export async function handleBooking(req, res) {
  try {
    logger.info('📝 Processing booking request...');

    // Parse the bet object from request body
    logger.info('📋 Request body received:', {
      hasBetObject: !!req.body.BetObject,
      betObjectType: typeof req.body.BetObject,
      betObjectLength: req.body.BetObject ? req.body.BetObject.length : 0
    });
    
    let betObject;
    try {
      betObject = JSON.parse(req.body.BetObject);
      logger.info('✅ Bet object parsed successfully:', {
        sessionGuid: betObject.SessionGuid,
        singleBetsCount: betObject.SingleBets?.length || 0,
        multiGroupsCount: betObject.MultiGroups?.length || 0
      });
    } catch (parseError) {
      logger.error('❌ Failed to parse BetObject:', parseError);
      logger.error('❌ Raw BetObject:', req.body.BetObject);
      return res.status(400).json({
        StatusCode: 1,
        Error: 'Invalid bet object format',
        Warning: null,
        Content: {
          ID: null,
          RedeemCode: null,
          ExpiredBets: [],
          FailedBets: [],
          ValidBets: [],
          Multiples: [],
          PendingRefreshPeriod: 30,
          RegulationModel: {
            CustomMessage: "",
            RealityCheck: 0,
            StopGamePlay: false,
          },
        },
      });
    }
    const betslipId = uuidv4();
    const redeemCode = generateRedeemCode(8);

    logger.info(`🎯 Generated bet slip ID: ${betslipId}`);
    logger.info(`🎫 Generated redeem code: ${redeemCode}`);

    // Store the bet slip in the database
    const storageResult = await storeBetSlip(
      betObject, 
      betslipId, 
      redeemCode, 
      betObject.SessionGuid
    );

    logger.info('✅ Bet slip stored successfully');

    // Process individual bets for validation
    let expiredBets = [];
    let failedBets = [];
    let validBets = [];

    // Validate each bet
    (betObject.SingleBets || []).forEach((bet, i) => {
      const betId = bet.ID || `bet_${i}`;

      // Basic validation - check stake amount
      if (!bet.Stake || bet.Stake <= 0) {
        failedBets.push({
          ID: betId,
          HasErrorOccured: true,
          ErrorMessage: "Invalid stake amount",
        });
        validBets.push({
          ID: betId,
          HasErrorOccured: true,
          ErrorMessage: "Invalid stake amount",
        });
      } else {
        validBets.push({
          ID: betId,
          HasErrorOccured: false,
          ErrorMessage: "",
        });
      }
    });

    // Prepare the response
    const response = {
      StatusCode: failedBets.length > 0 ? 1 : 0, // 0 = success, 1 = failure
      Error: failedBets.length > 0 ? "Some bets failed" : null,
      Warning: null,
      Content: {
        ID: betslipId,
        RedeemCode: redeemCode,
        ExpiredBets: expiredBets,
        FailedBets: failedBets,
        ValidBets: validBets,
        Multiples: (betObject.MultiGroups || []).map((m, idx) => ({
          Level: idx + 1,
          HasErrorOccured: false,
          ErrorMessage: "",
        })),
        PendingRefreshPeriod: 30,
        RegulationModel: {
          CustomMessage: "",
          RealityCheck: 0,
          StopGamePlay: false,
        },
      },
    };

    logger.info("✅ Booking response prepared:", {
      betslipId,
      redeemCode,
      totalBets: betObject.SingleBets?.length || 0,
      failedBets: failedBets.length,
      validBets: validBets.length
    });

    res.json(response);

  } catch (error) {
    logger.error('❌ Error in booking endpoint:', error);
    logger.error('❌ Error details:', {
      name: error.name,
      message: error.message,
      code: error.code,
      detail: error.detail,
      hint: error.hint,
      where: error.where,
      stack: error.stack
    });
    
    // Return error response
    res.status(500).json({
      StatusCode: 1,
      Error: "Internal server error",
      Warning: null,
      Content: {
        ID: null,
        RedeemCode: null,
        ExpiredBets: [],
        FailedBets: [],
        ValidBets: [],
        Multiples: [],
        PendingRefreshPeriod: 30,
        RegulationModel: {
          CustomMessage: "",
          RealityCheck: 0,
          StopGamePlay: false,
        },
      },
    });
  }
}
