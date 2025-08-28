import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { logger } from './logger.js';
import { testConnection, getRows, query } from './db.js';
import { testApiConnection } from './api.js';
import { getEvents, getEvent, upsertGameResult, getGameResult, getGameResults, getEventsWithResults } from './db.js';
import { gameManager } from './games.js';
import { ingestDetail } from './ingest.js';
import { processGameResult } from './map.js';

import { 
  startRobustAutoSync, 
  stopRobustAutoSync, 
  getRobustAutoSyncStatus, 
  manualRobustGameSync,
  getRobustSyncStats 
} from './robust-auto-sync.js';

// Import bet slip booking handler
import { handleBooking } from './booking-endpoint.js';
import { getBetSlip, updateBetSlipStatus } from './betSlips/storage.js';

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  logger.info({
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  next();
});

// Health check endpoint
app.get('/healthz', (req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

// Test connections endpoint
app.get('/test', async (req, res) => {
  try {
    const dbOk = await testConnection();
    const apiOk = await testApiConnection();
    
    res.json({
      database: dbOk ? 'connected' : 'error',
      api: apiOk ? 'connected' : 'error',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Test endpoint error:', error);
    res.status(500).json({ error: error.message });
  }
});


// Data retrieval endpoints
app.get('/events', async (req, res) => {
  try {
    const { from, to, finished } = req.query;
    
    // Parse finished parameter
    let finishedBool = null;
    if (finished !== undefined && finished !== '') {
      finishedBool = finished === 'true' || finished === '1';
    }
    
    const events = await getEvents(from, to, finishedBool);
    
    res.json({
      success: true,
      count: events.length,
      events
    });
  } catch (error) {
    logger.error('Get events endpoint error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/events/:eventId', async (req, res) => {
  try {
    const { eventId } = req.params;
    const event = await getEvent(eventId);
    
    if (!event) {
      return res.status(404).json({
        success: false,
        error: 'Event not found'
      });
    }
    
    res.json({
      success: true,
      event,
      raw: event.raw_payload
    });
  } catch (error) {
    logger.error('Get event endpoint error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});





// Add missing endpoints for frontend
// GET /games - Returns game configuration for the frontend
// This endpoint provides the current game settings and defaults that the frontend needs
// to configure itself (game type, duration, API credentials, etc.)
app.get('/api/games', (req, res) => {
  try {
    const games = gameManager.getEnabledGames();
    res.json({
      success: true,
      games,
      currentGame: gameManager.getCurrentGame(),
      defaults: {
        SESSION_GUID: config.api.sessionGuid,
        OPERATOR_GUID: config.api.operatorGuid,
        API_BASE: config.api.base,
        OFFSET_SECONDS: config.api.offsetSeconds,
        PRIMARY_MARKET_CLASS_IDS: config.api.primaryMarketClassIds,
        LANGUAGE_CODE: "en",
        BETTING_LAYOUT_ENUM_VALUE: "1"
      }
    });
  } catch (error) {
    logger.error('Get games endpoint error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});







// ===== BET SLIP BOOKING ENDPOINT =====

app.post('/booking', async (req, res) => {
  // Temporary: Log the exact request data for debugging
  logger.info('🔍 FRONTEND REQUEST CAPTURED:');
  logger.info('📋 Headers:', JSON.stringify(req.headers, null, 2));
  logger.info('📋 Body:', JSON.stringify(req.body, null, 2));
  logger.info('📋 Body type:', typeof req.body);
  logger.info('📋 BetObject type:', typeof req.body.BetObject);
  logger.info('📋 BetObject length:', req.body.BetObject ? req.body.BetObject.length : 'null');
  
  await handleBooking(req, res);
});

// Get bet slip by ID
app.get('/api/betslips/:slipId', async (req, res) => {
  try {
    const { slipId } = req.params;
    const betSlip = await getBetSlip(slipId);
    
    if (!betSlip) {
      return res.status(404).json({
        success: false,
        error: 'Bet slip not found'
      });
    }
    
    res.json({
      success: true,
      betSlip
    });
  } catch (error) {
    logger.error('Get bet slip endpoint error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Update bet slip status
app.put('/api/betslips/:slipId/status', async (req, res) => {
  try {
    const { slipId } = req.params;
    const { status, changedBy, reason } = req.body;
    
    if (!status) {
      return res.status(400).json({
        success: false,
        error: 'Status is required'
      });
    }
    
    const result = await updateBetSlipStatus(slipId, status, changedBy, reason);
    
    res.json({
      success: true,
      result
    });
  } catch (error) {
    logger.error('Update bet slip status endpoint error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get all bet slips (for monitoring)
app.get('/api/betslips', async (req, res) => {
  try {
    const { status, limit = 50 } = req.query;
    
    let query = `
      SELECT 
        bs.slip_id,
        bs.game_name,
        bs.game_number,
        bs.total_stake,
        bs.status,
        bs.redeem_code,
        bs.placed_at,
        COUNT(bse.id) as selection_count
      FROM bet_slips bs
      LEFT JOIN bet_selections bse ON bs.slip_id = bse.slip_id
    `;
    
    const params = [];
    if (status) {
      query += ` WHERE bs.status = $1`;
      params.push(status);
    }
    
    query += ` GROUP BY bs.id, bs.slip_id ORDER BY bs.placed_at DESC LIMIT $${params.length + 1}`;
    params.push(parseInt(limit));
    
    const result = await query(query, params);
    
    res.json({
      success: true,
      count: result.rows.length,
      betSlips: result.rows
    });
  } catch (error) {
    logger.error('Get bet slips endpoint error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ===== ROBUST AUTO-SYNC ENDPOINTS =====

app.post('/api/robust-auto-sync/start', async (req, res) => {
  try {
    const result = startRobustAutoSync();
    res.json(result);
  } catch (error) {
    logger.error('Start robust auto-sync endpoint error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/robust-auto-sync/stop', async (req, res) => {
  try {
    const result = stopRobustAutoSync();
    res.json(result);
  } catch (error) {
    logger.error('Stop robust auto-sync endpoint error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/robust-auto-sync/status', async (req, res) => {
  try {
    const status = getRobustAutoSyncStatus();
    res.json({
      success: true,
      ...status
    });
  } catch (error) {
    logger.error('Get robust auto-sync status endpoint error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/api/robust-auto-sync/stats', async (req, res) => {
  try {
    const stats = getRobustSyncStats();
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    logger.error('Get robust auto-sync stats endpoint error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/api/robust-auto-sync/manual/:gameType', async (req, res) => {
  try {
    const { gameType } = req.params;
    const result = await manualRobustGameSync(gameType);
    res.json(result);
  } catch (error) {
    logger.error('Manual robust game sync endpoint error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  logger.error('Unhandled error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

// Start server
const startServer = async () => {
  try {
    // Test connections on startup
    logger.info('Testing connections...');
    const dbOk = await testConnection();
    const apiOk = await testApiConnection();
    
    if (!dbOk) {
      logger.error('Database connection failed - server will not start');
      process.exit(1);
    }
    
    if (!apiOk) {
      logger.warn('API connection failed - ingestion may not work');
    }
    
    app.listen(config.server.port, () => {
      logger.info(`Server running on port ${config.server.port}`);
      logger.info(`Health check: http://localhost:${config.server.port}/healthz`);
      logger.info(`Test connections: http://localhost:${config.server.port}/test`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Start the server
startServer();
