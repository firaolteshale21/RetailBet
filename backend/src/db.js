import pg from "pg";
import { config } from "./config.js";
import { logger } from "./logger.js";

const { Pool } = pg;

// Create connection pool
export const pool = new Pool({
  connectionString: config.database.url,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test database connection
export const testConnection = async () => {
  try {
    const client = await pool.connect();
    const result = await client.query("SELECT NOW()");
    client.release();
    logger.info("Database connection successful");
    return true;
  } catch (error) {
    logger.error("Database connection failed:", error);
    return false;
  }
};

// Helper to execute queries with error handling
export const query = async (text, params = []) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    logger.debug("Executed query", { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    logger.error("Query error:", { text, params, error: error.message });
    throw error;
  }
};

// Helper to get a single row
export const getRow = async (text, params = []) => {
  const res = await query(text, params);
  return res.rows[0] || null;
};

// Helper to get multiple rows
export const getRows = async (text, params = []) => {
  const res = await query(text, params);
  return res.rows;
};

// Helper to parse .NET date format "/Date(1756268580942)/" to ISO string
export const parseDotNetDate = (dotNetDate) => {
  if (!dotNetDate || typeof dotNetDate !== "string") {
    return null;
  }

  // Match pattern like "/Date(1756268580942)/"
  // Note: raw_payload is being stored as null (see comments above - "STORING CLEAN DATA: rawPayload is null")
  const match = dotNetDate.match(/\/Date\((\d+)\)\//);
  if (match) {
    const timestamp = parseInt(match[1]);
    return new Date(timestamp).toISOString();
  }

  return null;
};

// Insert raw event
// 🗄️ JSONB SAVE LOCATION #4: Saves raw API response as JSONB in 'payload' column of 'raw_events' table
// ✅ STORING CLEAN DATA: payload is null (no junk data)
export const insertRawEvent = async (
  eventId,
  gameName,
  sourceEndpoint,
  payload
) => {
  const text = `
    INSERT INTO raw_events (event_id, game_name, source_endpoint, payload)
    VALUES ($1, $2, $3, $4)
    RETURNING id
  `;
  const result = await query(text, [eventId, gameName, sourceEndpoint, null]);
  return result.rows[0].id;
};

// Upsert event (insert or update) - Enhanced for robust auto-sync
// 🗄️ JSONB SAVE LOCATION #1: Saves raw API response as JSONB in 'raw_payload' column of 'events' table
// ✅ STORING CLEAN DATA: rawPayload is null (no junk data)
export const upsertEvent = async (
  eventId,
  gameName,
  startTime,
  finishTime,
  isFinished,
  statusValue,
  rawPayload,
  gameNumber = null
) => {
  const text = `
    INSERT INTO events (event_id, game_name, start_time, finish_time, is_finished, status_value, raw_payload, game_number)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    ON CONFLICT (event_id) 
    DO UPDATE SET
      game_name = EXCLUDED.game_name,
      start_time = EXCLUDED.start_time,
      finish_time = EXCLUDED.finish_time,
      is_finished = EXCLUDED.is_finished,
      status_value = EXCLUDED.status_value,
      raw_payload = EXCLUDED.raw_payload,
      game_number = EXCLUDED.game_number,
      updated_at = now()
    RETURNING event_id
  `;

  // Parse .NET date format to ISO string
  const parsedStartTime = parseDotNetDate(startTime);
  const parsedFinishTime = parseDotNetDate(finishTime);

  const result = await query(text, [
    eventId,
    gameName,
    parsedStartTime,
    parsedFinishTime,
    isFinished,
    statusValue,
    null,
    gameNumber,
  ]);
  return result.rows[0].event_id;
};

// Enhanced upsert event with flexible parameters for robust auto-sync
export const upsertEventFlexible = async (eventId, eventData) => {
  const text = `
    INSERT INTO events (event_id, game_name, status_value, is_finished, start_time, finish_time, raw_payload, game_number)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    ON CONFLICT (event_id) 
    DO UPDATE SET
      game_name = EXCLUDED.game_name,
      status_value = EXCLUDED.status_value,
      is_finished = EXCLUDED.is_finished,
      start_time = EXCLUDED.start_time,
      finish_time = EXCLUDED.finish_time,
      raw_payload = EXCLUDED.raw_payload,
      game_number = EXCLUDED.game_number,
      updated_at = now()
    RETURNING event_id
  `;

  // Parse .NET date format to ISO string
  const startTime = parseDotNetDate(eventData.start_time);
  const finishTime = parseDotNetDate(eventData.finish_time);

  const result = await query(text, [
    eventId,
    eventData.game_name || null,
    eventData.status_value || null,
    eventData.is_finished || false,
    startTime,
    finishTime,
    null,
    eventData.game_number || null,
  ]);

  return result.rows[0].event_id;
};

// Get events with filters
export const getEvents = async (from, to, finished) => {
  let conditions = [];
  let params = [];
  let paramIndex = 1;

  if (from) {
    conditions.push(`start_time >= $${paramIndex++}`);
    params.push(from);
  }

  if (to) {
    conditions.push(`start_time <= $${paramIndex++}`);
    params.push(to);
  }

  if (finished !== undefined && finished !== null) {
    conditions.push(`is_finished = $${paramIndex++}`);
    params.push(finished);
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const text = `
    SELECT event_id, game_name, game_number, start_time, is_finished, status_value
    FROM events
    ${whereClause}
    ORDER BY start_time DESC
    LIMIT 100
  `;

  return await getRows(text, params);
};

// Get single event with raw payload
export const getEvent = async (eventId) => {
  return await getRow("SELECT * FROM events WHERE event_id = $1", [eventId]);
};

// ===== GAME RESULTS FUNCTIONS =====

// Insert or update game result
// 🗄️ JSONB SAVE LOCATION #2: Saves winning values as JSONB in 'winning_values' column of 'game_results' table
// ✅ STORING WINNING VALUES ONLY: winningValues are saved, resultData is null (no junk data)
export const upsertGameResult = async (
  eventId,
  gameName,
  resultType,
  winningValues,
  resultData,
  gameNumber
) => {
  const text = `
    INSERT INTO game_results (event_id, game_name, result_type, winning_values, result_data, game_number)
    VALUES ($1, $2, $3, $4, $5, $6)
    ON CONFLICT (event_id) 
    DO UPDATE SET
      game_name = EXCLUDED.game_name,
      result_type = EXCLUDED.result_type,
      winning_values = EXCLUDED.winning_values,
      result_data = EXCLUDED.result_data,
      game_number = EXCLUDED.game_number,
      updated_at = now()
    RETURNING id, event_id
  `;
  const result = await query(text, [
    eventId,
    gameName,
    resultType,
    winningValues,
    null,
    gameNumber,
  ]);
  return result.rows[0];
};

// Get game result by event ID
export const getGameResult = async (eventId) => {
  return await getRow("SELECT * FROM game_results WHERE event_id = $1", [
    eventId,
  ]);
};

// Get recent game results with optional filters
export const getGameResults = async (gameName = null, limit = 50) => {
  let conditions = [];
  let params = [];
  let paramIndex = 1;

  if (gameName) {
    conditions.push(`gr.game_name = $${paramIndex++}`);
    params.push(gameName);
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const text = `
    SELECT gr.*, e.start_time, e.finish_time, e.game_number
    FROM game_results gr
    LEFT JOIN events e ON gr.event_id = e.event_id
    ${whereClause}
    ORDER BY gr.declared_at DESC
    LIMIT $${paramIndex}
  `;
  params.push(limit);

  return await getRows(text, params);
};

// Get events with their results (for frontend display)
export const getEventsWithResults = async (from, to, finished) => {
  let conditions = [];
  let params = [];
  let paramIndex = 1;

  if (from) {
    conditions.push(`e.start_time >= $${paramIndex++}`);
    params.push(from);
  }

  if (to) {
    conditions.push(`e.start_time <= $${paramIndex++}`);
    params.push(to);
  }

  if (finished !== undefined && finished !== null) {
    conditions.push(`e.is_finished = $${paramIndex++}`);
    params.push(finished);
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const text = `
    SELECT 
      e.event_id, 
      e.game_name, 
      e.game_number,
      e.start_time, 
      e.finish_time,
      e.is_finished, 
      e.status_value,
      e.raw_payload,
      gr.result_type,
      gr.winning_values,
      gr.result_data,
      gr.declared_at
    FROM events e
    LEFT JOIN game_results gr ON e.event_id = gr.event_id
    ${whereClause}
    ORDER BY e.start_time DESC
    LIMIT 100
  `;

  return await getRows(text, params);
};

export default {
  pool,
  testConnection,
  query,
  getRow,
  getRows,
  insertRawEvent,
  upsertEvent,
  getEvents,
  getEvent,
  upsertGameResult,
  getGameResult,
  getGameResults,
  getEventsWithResults,
};
