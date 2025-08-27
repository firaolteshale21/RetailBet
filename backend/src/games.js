import { config } from './config.js';
import { logger } from './logger.js';

// Game management class
export class GameManager {
  constructor() {
    this.games = config.games;
    this.currentGame = config.game;
    this.syncTimers = new Map(); // Track sync timers for each game
  }

  // Get all enabled games
  getEnabledGames() {
    return this.games.filter(game => game.ENABLED);
  }

  // Get game configuration by type name
  getGameConfig(typeName) {
    return this.games.find(game => game.TYPE_NAME === typeName);
  }

  // Get current game configuration
  getCurrentGame() {
    return this.currentGame;
  }

  // Calculate sync timing based on game duration
  calculateSyncTiming(gameConfig) {
    const durationSeconds = gameConfig.GAME_DURATION_VALUE;
    const bufferSeconds = 30; // Buffer time after game ends
    return (durationSeconds + bufferSeconds) * 1000; // Convert to milliseconds
  }

  // Start auto-sync for a specific game
  startAutoSync(gameType, syncFunction) {
    const gameConfig = this.getGameConfig(gameType);
    if (!gameConfig) {
      throw new Error(`Game configuration not found for: ${gameType}`);
    }

    if (!gameConfig.ENABLED) {
      throw new Error(`Game ${gameType} is not enabled`);
    }

    // Stop existing timer if any
    this.stopAutoSync(gameType);

    const syncInterval = this.calculateSyncTiming(gameConfig);
    logger.info(`🔄 Starting auto-sync for ${gameType} every ${syncInterval/1000} seconds`);

    const timer = setInterval(async () => {
      try {
        await syncFunction(gameConfig);
        logger.info(`✅ Auto-sync completed for ${gameType}`);
      } catch (error) {
        logger.error(`❌ Auto-sync failed for ${gameType}:`, error);
      }
    }, syncInterval);

    this.syncTimers.set(gameType, timer);
    return timer;
  }

  // Stop auto-sync for a specific game
  stopAutoSync(gameType) {
    const timer = this.syncTimers.get(gameType);
    if (timer) {
      clearInterval(timer);
      this.syncTimers.delete(gameType);
      logger.info(`⏹️  Stopped auto-sync for ${gameType}`);
    }
  }

  // Stop all auto-sync timers
  stopAllAutoSync() {
    for (const [gameType, timer] of this.syncTimers) {
      clearInterval(timer);
      logger.info(`⏹️  Stopped auto-sync for ${gameType}`);
    }
    this.syncTimers.clear();
  }

  // Get sync status for all games
  getSyncStatus() {
    const status = {};
    for (const game of this.games) {
      status[game.TYPE_NAME] = {
        enabled: game.ENABLED,
        hasTimer: this.syncTimers.has(game.TYPE_NAME),
        durationSeconds: game.GAME_DURATION_VALUE,
        syncIntervalSeconds: this.calculateSyncTiming(game) / 1000
      };
    }
    return status;
  }


}

// Export singleton instance
export const gameManager = new GameManager();
