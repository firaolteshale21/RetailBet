import { logger } from './logger.js';
import { getEventsByType, getEventDetail } from './api.js';
import { getEvent, upsertGameResult, upsertEventFlexible } from './db.js';
import { gameManager } from './games.js';
import { processGameResult } from './map.js';
import { runFinishedGamesProcessing } from './process-finished-games.js';

// Robust Auto-Sync State Management
let autoSyncActive = false;
let gameSyncTimers = new Map(); // Map of gameType -> timer
let gameLastSyncTimes = new Map(); // Map of gameType -> last sync time
let gameSyncStatus = new Map(); // Map of gameType -> sync status
let syncStats = {
  totalCycles: 0,
  totalGamesProcessed: 0,
  totalNewGames: 0,
  totalUpdatedGames: 0,
  totalResultsProcessed: 0,
  totalErrors: 0,
  startTime: null
};

/**
 * Robust game sync function that handles both new and existing games
 * @param {Object} gameConfig - Game configuration
 * @returns {Object} Sync result
 */
export const performRobustGameSync = async (gameConfig) => {
  const gameType = gameConfig.TYPE_NAME;
  const syncCycleId = ++syncStats.totalCycles;
  
  try {
    logger.info(`🔄 [Cycle ${syncCycleId}] Starting robust sync for ${gameType}...`);
    const startTime = Date.now();
    
    // Fetch current games from API for this specific game type
    const response = await getEventsByType(gameConfig);
    const games = response.Data || [];
    
    logger.info(`📊 [Cycle ${syncCycleId}] Found ${games.length} games to sync for ${gameType}`);
    
    let newGames = 0;
    let updatedGames = 0;
    let resultsProcessed = 0;
    let errors = 0;
    let skipped = 0;
    
    // Process each game with robust error handling
    for (const game of games) {
      try {
        const eventId = game.ID || game.Event?.ID;
        if (!eventId) {
          logger.warn(`⚠️ [Cycle ${syncCycleId}] Game missing event ID for ${gameType}, skipping`);
          skipped++;
          continue;
        }
        
        const eventData = game.Event || game;
        const gameNumber = eventData.Number;
        
        // Check if game already exists in database
        const existingEvent = await getEvent(eventId);
        
        if (existingEvent) {
          // UPDATE EXISTING GAME
          logger.debug(`🔄 [Cycle ${syncCycleId}] Updating existing game: ${eventId} (Number: ${gameNumber})`);
          
          // Update the event with latest data
          await upsertEventFlexible(eventId, {
            game_name: eventData.TypeName,
            status_value: eventData.StatusValue,
            is_finished: eventData.IsFinished,
            start_time: eventData.AdjustedStartTime,
            finish_time: eventData.AdjustedFinishTime,
            game_number: eventData.Number,
            result_data: game // Store full response for reference
          });
          
          updatedGames++;
          syncStats.totalUpdatedGames++;
          
          logger.debug(`✅ [Cycle ${syncCycleId}] Updated existing game: ${eventId}`);
        } else {
          // INSERT NEW GAME
          logger.info(`🆕 [Cycle ${syncCycleId}] Inserting new game: ${eventId} (Number: ${gameNumber})`);
          
          // Insert new event
          await upsertEventFlexible(eventId, {
            game_name: eventData.TypeName,
            status_value: eventData.StatusValue,
            is_finished: eventData.IsFinished,
            start_time: eventData.AdjustedStartTime,
            finish_time: eventData.AdjustedFinishTime,
            game_number: eventData.Number,
            result_data: game // Store full response for reference
          });
          
          newGames++;
          syncStats.totalNewGames++;
          
          logger.info(`✅ [Cycle ${syncCycleId}] Inserted new game: ${eventId}`);
        }
        
        // Process winning values for finished games
        // Check if game is finished OR if it has winning numbers (alternative detection)
        const hasWinningNumbers = eventData.Markets && eventData.Markets.some(market => 
          market.KenoSelections && market.KenoSelections.some(selection => selection.IsWinner === true)
        );
        
        const isGameFinished = eventData.IsFinished === true || hasWinningNumbers;
        
        logger.debug(`🎯 [Cycle ${syncCycleId}] Game ${eventId} - IsFinished: ${eventData.IsFinished}, HasWinningNumbers: ${hasWinningNumbers}, Processing: ${isGameFinished}`);
        
        if (isGameFinished) {
          try {
            let processedResult;
            
            // 🎰 SPECIAL HANDLING FOR SMART PLAY KENO: Use GetEventDetail for detailed winning number extraction
            if (gameType === 'SmartPlayKeno') {
              logger.info(`🎰 [Cycle ${syncCycleId}] SmartPlayKeno detected - fetching detailed game info for ${eventId}`);
              
              try {
                // Fetch detailed game information from API for SmartPlayKeno
                const gameDetail = await getEventDetail(eventId);
                
                if (!gameDetail || !gameDetail.Event) {
                  logger.warn(`⚠️ [Cycle ${syncCycleId}] No detailed game info found for SmartPlayKeno ${eventId}`);
                  errors++;
                  continue;
                }
                
                // Process the game result with detailed data from GetEventDetail
                processedResult = processGameResult(gameDetail);
                logger.info(`🎰 [Cycle ${syncCycleId}] Successfully fetched detailed info for SmartPlayKeno ${eventId}`);
                
              } catch (detailError) {
                logger.warn(`⚠️ [Cycle ${syncCycleId}] Failed to fetch detailed info for SmartPlayKeno ${eventId}: ${detailError.message}`);
                // Fallback to processing with list data
                processedResult = processGameResult(game);
              }
            } else {
              // For all other games, use the existing logic with list data
              processedResult = processGameResult(game);
            }
            
            if (processedResult && processedResult.winningValues) {
              // Check if we already have a result for this game
              const existingResult = await getEvent(eventId);
              
              if (!existingResult || !existingResult.winning_values) {
                // Store winning values
                await upsertGameResult(
                  processedResult.eventId,
                  processedResult.gameName,
                  processedResult.resultType,
                  processedResult.winningValues,
                  processedResult.resultData,
                  processedResult.gameNumber
                );
                
                resultsProcessed++;
                syncStats.totalResultsProcessed++;
                
                logger.info(`🏆 [Cycle ${syncCycleId}] Processed winning values for ${gameType}: ${eventId} (Number: ${gameNumber})`);
                logger.info(`   Winning Values: ${JSON.stringify(processedResult.winningValues)}`);
              } else {
                logger.debug(`🏆 [Cycle ${syncCycleId}] Winning values already exist for: ${eventId}`);
              }
            }
          } catch (resultError) {
            logger.warn(`⚠️ [Cycle ${syncCycleId}] Failed to process winning values for ${eventId}: ${resultError.message}`);
            errors++;
          }
        }
        
        syncStats.totalGamesProcessed++;
        
      } catch (error) {
        logger.error(`❌ [Cycle ${syncCycleId}] Failed to sync game ${game.ID || game.Event?.ID}: ${error.message}`);
        errors++;
        syncStats.totalErrors++;
      }
    }
    
    const duration = Date.now() - startTime;
    const syncTime = new Date();
    gameLastSyncTimes.set(gameType, syncTime);
    
    // Update sync status
    gameSyncStatus.set(gameType, {
      cycleId: syncCycleId,
      lastSync: syncTime,
      newGames,
      updatedGames,
      resultsProcessed,
      errors,
      skipped,
      total: games.length,
      duration,
      success: true
    });
    
    // Process finished games for winning numbers
    logger.info(`🔄 [Cycle ${syncCycleId}] Processing finished games for ${gameType}...`);
    try {
      const finishedResult = await runFinishedGamesProcessing();
      logger.info(`🏆 [Cycle ${syncCycleId}] Finished games processing: ${finishedResult.marked} marked, ${finishedResult.processed} processed, ${finishedResult.errors} errors`);
    } catch (finishedError) {
      logger.warn(`⚠️ [Cycle ${syncCycleId}] Finished games processing failed: ${finishedError.message}`);
    }
    
    logger.info(`🏁 [Cycle ${syncCycleId}] Robust sync completed for ${gameType} in ${duration}ms:`);
    logger.info(`   📊 New: ${newGames}, Updated: ${updatedGames}, Results: ${resultsProcessed}, Errors: ${errors}, Skipped: ${skipped}`);
    
    return {
      success: true,
      cycleId: syncCycleId,
      gameType,
      newGames,
      updatedGames,
      resultsProcessed,
      errors,
      skipped,
      total: games.length,
      duration,
      timestamp: syncTime.toISOString()
    };
    
  } catch (error) {
    logger.error(`❌ [Cycle ${syncCycleId}] Robust sync cycle failed for ${gameType}:`, error.message);
    
    const syncTime = new Date();
    gameSyncStatus.set(gameType, {
      cycleId: syncCycleId,
      lastSync: syncTime,
      error: error.message,
      success: false
    });
    
    syncStats.totalErrors++;
    
    return {
      success: false,
      cycleId: syncCycleId,
      gameType,
      error: error.message,
      timestamp: syncTime.toISOString()
    };
  }
};

/**
 * Start robust multi-game auto-sync
 * @returns {Object} Start result
 */
export const startRobustAutoSync = () => {
  if (autoSyncActive) {
    logger.warn('⚠️ Robust auto-sync is already active');
    return { success: false, error: 'Robust auto-sync already active' };
  }
  
  const enabledGames = gameManager.getEnabledGames();
  if (enabledGames.length === 0) {
    logger.error('❌ No enabled games found for robust auto-sync');
    return { success: false, error: 'No enabled games found' };
  }
  
  logger.info(`🚀 Starting robust multi-game auto-sync for ${enabledGames.length} games`);
  
  // Initialize sync stats
  syncStats = {
    totalCycles: 0,
    totalGamesProcessed: 0,
    totalNewGames: 0,
    totalUpdatedGames: 0,
    totalResultsProcessed: 0,
    totalErrors: 0,
    startTime: new Date()
  };
  
  // Start sync timer for each enabled game
  for (const gameConfig of enabledGames) {
    const gameType = gameConfig.TYPE_NAME;
    const syncIntervalMs = gameConfig.GAME_DURATION_VALUE * 1000; // Use exact game duration
    
    logger.info(`🔄 Setting up robust auto-sync for ${gameType} every ${syncIntervalMs/1000} seconds`);
    
    // Perform initial sync immediately
    performRobustGameSync(gameConfig);
    
    // Set up recurring sync with proper error handling
    const timer = setInterval(async () => {
      if (autoSyncActive) {
        try {
          await performRobustGameSync(gameConfig);
        } catch (error) {
          logger.error(`❌ Timer error for ${gameType}: ${error.message}`);
        }
      }
    }, syncIntervalMs);
    
    gameSyncTimers.set(gameType, timer);
    gameLastSyncTimes.set(gameType, new Date());
  }
  
  autoSyncActive = true;
  
  logger.info(`✅ Robust auto-sync started successfully for ${enabledGames.length} games`);
  
  return {
    success: true,
    message: `Robust auto-sync started for ${enabledGames.length} games`,
    games: enabledGames.map(g => ({
      type: g.TYPE_NAME,
      duration: g.GAME_DURATION_VALUE,
      syncInterval: g.GAME_DURATION_VALUE
    })),
    startTime: syncStats.startTime.toISOString()
  };
};

/**
 * Stop robust auto-sync
 * @returns {Object} Stop result
 */
export const stopRobustAutoSync = () => {
  if (!autoSyncActive) {
    logger.warn('⚠️ Robust auto-sync is not active');
    return { success: false, error: 'Robust auto-sync not active' };
  }
  
  // Stop all timers
  for (const [gameType, timer] of gameSyncTimers) {
    clearInterval(timer);
    logger.info(`⏹️ Stopped robust auto-sync for ${gameType}`);
  }
  
  gameSyncTimers.clear();
  autoSyncActive = false;
  
  const endTime = new Date();
  const runtime = endTime - syncStats.startTime;
  
  logger.info('⏹️ Robust auto-sync stopped');
  logger.info(`📊 Final Stats: ${syncStats.totalCycles} cycles, ${syncStats.totalGamesProcessed} games processed`);
  logger.info(`   New: ${syncStats.totalNewGames}, Updated: ${syncStats.totalUpdatedGames}, Results: ${syncStats.totalResultsProcessed}, Errors: ${syncStats.totalErrors}`);
  logger.info(`   Runtime: ${Math.round(runtime / 1000)} seconds`);
  
  return {
    success: true,
    message: 'Robust auto-sync stopped',
    finalStats: {
      ...syncStats,
      endTime: endTime.toISOString(),
      runtime: runtime
    }
  };
};

/**
 * Get robust auto-sync status
 * @returns {Object} Status information
 */
export const getRobustAutoSyncStatus = () => {
  const enabledGames = gameManager.getEnabledGames();
  const status = {
    active: autoSyncActive,
    startTime: syncStats.startTime?.toISOString() || null,
    totalStats: { ...syncStats },
    games: []
  };
  
  for (const gameConfig of enabledGames) {
    const gameType = gameConfig.TYPE_NAME;
    const lastSyncTime = gameLastSyncTimes.get(gameType);
    const syncStatus = gameSyncStatus.get(gameType);
    const hasTimer = gameSyncTimers.has(gameType);
    
    let nextSyncTime = null;
    if (autoSyncActive && lastSyncTime && hasTimer) {
      const syncIntervalMs = gameConfig.GAME_DURATION_VALUE * 1000;
      nextSyncTime = new Date(lastSyncTime.getTime() + syncIntervalMs);
    }
    
    status.games.push({
      type: gameType,
      enabled: gameConfig.ENABLED,
      durationSeconds: gameConfig.GAME_DURATION_VALUE,
      syncIntervalSeconds: gameConfig.GAME_DURATION_VALUE,
      hasTimer,
      lastSyncTime: lastSyncTime?.toISOString() || null,
      nextSyncTime: nextSyncTime?.toISOString() || null,
      syncStatus: syncStatus || null
    });
  }
  
  return status;
};

/**
 * Manual sync for a specific game
 * @param {string} gameType - Game type to sync
 * @returns {Object} Sync result
 */
export const manualRobustGameSync = async (gameType) => {
  const gameConfig = gameManager.getGameConfig(gameType);
  if (!gameConfig) {
    throw new Error(`Game configuration not found for: ${gameType}`);
  }
  
  if (!gameConfig.ENABLED) {
    throw new Error(`Game ${gameType} is not enabled`);
  }
  
  logger.info(`🔄 Manual robust sync requested for ${gameType}`);
  return await performRobustGameSync(gameConfig);
};

/**
 * Get detailed sync statistics
 * @returns {Object} Detailed statistics
 */
export const getRobustSyncStats = () => {
  return {
    ...syncStats,
    startTime: syncStats.startTime?.toISOString() || null,
    runtime: syncStats.startTime ? Date.now() - syncStats.startTime.getTime() : 0,
    averageGamesPerCycle: syncStats.totalCycles > 0 ? Math.round(syncStats.totalGamesProcessed / syncStats.totalCycles) : 0,
    successRate: syncStats.totalGamesProcessed > 0 ? 
      Math.round(((syncStats.totalGamesProcessed - syncStats.totalErrors) / syncStats.totalGamesProcessed) * 100) : 0
  };
};

export default {
  performRobustGameSync,
  startRobustAutoSync,
  stopRobustAutoSync,
  getRobustAutoSyncStatus,
  manualRobustGameSync,
  getRobustSyncStats
};
