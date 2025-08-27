import { logger } from './logger.js';
import { getEventDetail } from './api.js';
import { query, upsertGameResult } from './db.js';
import { processGameResult } from './map.js';

/**
 * Process finished games to extract and store winning numbers
 * This function fetches individual game details for finished games that don't have winning numbers yet
 */
export const processFinishedGames = async () => {
    try {
        logger.info('🔄 Processing finished games for winning numbers...');
        
        // Get finished games without winning numbers
        const finishedGames = await query(`
            SELECT event_id, game_name, game_number, start_time, is_finished
            FROM events 
            WHERE game_name = 'SmartPlayKeno' 
              AND is_finished = true 
              AND event_id NOT IN (
                SELECT event_id FROM game_results WHERE event_id IS NOT NULL
              )
            ORDER BY start_time DESC
            LIMIT 10
        `);
        
        if (!finishedGames || finishedGames.rows.length === 0) {
            logger.info('✅ No finished games without winning numbers found');
            return { processed: 0, errors: 0 };
        }
        
        logger.info(`📊 Found ${finishedGames.rows.length} finished games to process`);
        
        let processed = 0;
        let errors = 0;
        
        for (const game of finishedGames.rows) {
            try {
                logger.info(`🎯 Processing finished game: ${game.event_id} (Number: ${game.game_number})`);
                
                // Fetch detailed game information from API
                const gameDetail = await getEventDetail(game.event_id);
                
                if (!gameDetail || !gameDetail.Event) {
                    logger.warn(`⚠️ No game detail found for ${game.event_id}`);
                    errors++;
                    continue;
                }
                
                // Process the game result with detailed data
                const processedResult = processGameResult(gameDetail);
                
                if (processedResult && processedResult.winningValues && processedResult.winningValues.winningNumbers.length > 0) {
                    // Store winning values
                    await upsertGameResult(
                        processedResult.eventId,
                        processedResult.gameName,
                        processedResult.resultType,
                        processedResult.winningValues,
                        processedResult.resultData,
                        processedResult.gameNumber
                    );
                    
                    logger.info(`🏆 Successfully processed winning numbers for ${game.event_id}:`);
                    logger.info(`   - Game Number: ${processedResult.gameNumber}`);
                    logger.info(`   - Winning Numbers: ${processedResult.winningValues.winningNumbers.join(', ')}`);
                    logger.info(`   - Total Numbers: ${processedResult.winningValues.totalWinningNumbers}`);
                    
                    processed++;
                } else {
                    logger.warn(`⚠️ No winning numbers found for ${game.event_id}`);
                    errors++;
                }
                
                // Add a small delay to avoid overwhelming the API
                await new Promise(resolve => setTimeout(resolve, 100));
                
            } catch (error) {
                logger.error(`❌ Failed to process game ${game.event_id}: ${error.message}`);
                errors++;
            }
        }
        
        logger.info(`🏁 Finished processing games: ${processed} processed, ${errors} errors`);
        
        return { processed, errors };
        
    } catch (error) {
        logger.error('❌ Failed to process finished games:', error.message);
        throw error;
    }
};

/**
 * Check for games that should be finished based on their finish time
 * and mark them as finished if they're past their finish time
 */
export const checkAndMarkFinishedGames = async () => {
    try {
        logger.info('🔄 Checking for games that should be marked as finished...');
        
        // Find games that are past their finish time but not marked as finished
        const gamesToMarkFinished = await query(`
            SELECT event_id, game_name, game_number, start_time, finish_time, is_finished
            FROM events 
            WHERE game_name = 'SmartPlayKeno' 
              AND is_finished = false 
              AND finish_time IS NOT NULL 
              AND finish_time < NOW()
            ORDER BY finish_time DESC
            LIMIT 20
        `);
        
        if (!gamesToMarkFinished || gamesToMarkFinished.rows.length === 0) {
            logger.info('✅ No games need to be marked as finished');
            return { marked: 0 };
        }
        
        logger.info(`📊 Found ${gamesToMarkFinished.rows.length} games to mark as finished`);
        
        let marked = 0;
        
        for (const game of gamesToMarkFinished.rows) {
            try {
                // Update the game to mark it as finished
                await query(`
                    UPDATE events 
                    SET is_finished = true, updated_at = NOW()
                    WHERE event_id = $1
                `, [game.event_id]);
                
                logger.info(`✅ Marked game as finished: ${game.event_id} (Number: ${game.game_number})`);
                marked++;
                
            } catch (error) {
                logger.error(`❌ Failed to mark game ${game.event_id} as finished: ${error.message}`);
            }
        }
        
        logger.info(`🏁 Marked ${marked} games as finished`);
        
        return { marked };
        
    } catch (error) {
        logger.error('❌ Failed to check and mark finished games:', error.message);
        throw error;
    }
};

/**
 * Main function to run the finished games processing
 * This should be called periodically to process finished games
 */
export const runFinishedGamesProcessing = async () => {
    try {
        logger.info('🚀 Starting finished games processing...');
        
        // First, check and mark games as finished
        const markResult = await checkAndMarkFinishedGames();
        
        // Then, process finished games for winning numbers
        const processResult = await processFinishedGames();
        
        logger.info('🏁 Finished games processing completed');
        logger.info(`📊 Results: ${markResult.marked} marked as finished, ${processResult.processed} processed for winning numbers, ${processResult.errors} errors`);
        
        return {
            marked: markResult.marked,
            processed: processResult.processed,
            errors: processResult.errors
        };
        
    } catch (error) {
        logger.error('❌ Finished games processing failed:', error.message);
        throw error;
    }
};

export default {
    processFinishedGames,
    checkAndMarkFinishedGames,
    runFinishedGamesProcessing
};
