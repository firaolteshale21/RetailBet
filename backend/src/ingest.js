import { getEventsByType, getEventDetail } from './api.js';
import { insertRawEvent, upsertEvent } from './db.js';
import { mapListResponseToEvents, mapApiEventToEvent } from './map.js';
import { logger } from './logger.js';

// Ingest list of events (GetEventsByType)
export const ingestList = async () => {
  try {
    logger.info('Starting list ingestion...');
    
    // Call the API
    const response = await getEventsByType();
    
    // Store raw response
    // 💡 OPTION 2: Pass null instead of response if you don't want to store the junk :)
    const rawEventId = await insertRawEvent(
      null, // No specific event ID for list response
      null, // No specific game name for list response
      'GetEventsByType',
      response
    );
    
    logger.info(`Stored raw list response with ID: ${rawEventId}`);
    
    // Map and upsert individual events
    const events = mapListResponseToEvents(response);
    logger.info(`Found ${events.length} events in response`);
    
    let upsertedCount = 0;
    for (const event of events) {
      try {
        // 💡 OPTION 2: Pass null instead of event.rawPayload if you don't want to store the junk :)
        await upsertEvent(
          event.eventId,
          event.gameName,
          event.startTime,
          event.finishTime,
          event.isFinished,
          event.statusValue,
          event.rawPayload,
          event.gameNumber
        );
        upsertedCount++;
      } catch (error) {
        logger.error(`Failed to upsert event ${event.eventId}:`, error.message);
      }
    }
    
    logger.info(`Successfully upserted ${upsertedCount} events`);
    return {
      rawEventId,
      eventsProcessed: events.length,
      eventsUpserted: upsertedCount
    };
    
  } catch (error) {
    logger.error('List ingestion failed:', error.message);
    throw error;
  }
};

// Ingest single event detail (GetEventDetail)
export const ingestDetail = async (eventId) => {
  try {
    if (!eventId) {
      throw new Error('Event ID is required');
    }
    
    logger.info(`Starting detail ingestion for event: ${eventId}`);
    
    // Call the API
    const response = await getEventDetail(eventId);
    
    // Store raw response
    // 💡 OPTION 2: Pass null instead of response if you don't want to store the junk :)
    const rawEventId = await insertRawEvent(
      eventId,
      null, // Will be extracted from response
      'GetEventDetail',
      response
    );
    
    logger.info(`Stored raw detail response with ID: ${rawEventId}`);
    
    // Map the response
    const event = mapApiEventToEvent(response);
    
    if (!event.eventId) {
      logger.warn('No event ID found in detail response');
      return { rawEventId, eventUpserted: false };
    }
    
    // Upsert the event with detailed payload
    // 💡 OPTION 2: Pass null instead of event.rawPayload if you don't want to store the junk :)
    await upsertEvent(
      event.eventId,
      event.gameName,
      event.startTime,
      event.finishTime,
      event.isFinished,
      event.statusValue,
      event.rawPayload,
      event.gameNumber
    );
    
    logger.info(`Successfully upserted event detail: ${event.eventId}`);
    return {
      rawEventId,
      eventUpserted: true,
      eventId: event.eventId
    };
    
  } catch (error) {
    logger.error(`Detail ingestion failed for ${eventId}:`, error.message);
    throw error;
  }
};

// Batch ingest details for multiple events
export const ingestDetails = async (eventIds) => {
  if (!Array.isArray(eventIds)) {
    throw new Error('Event IDs must be an array');
  }
  
  logger.info(`Starting batch detail ingestion for ${eventIds.length} events`);
  
  const results = [];
  let successCount = 0;
  let errorCount = 0;
  
  for (const eventId of eventIds) {
    try {
      const result = await ingestDetail(eventId);
      results.push({ eventId, success: true, result });
      successCount++;
    } catch (error) {
      results.push({ eventId, success: false, error: error.message });
      errorCount++;
    }
  }
  
  logger.info(`Batch ingestion completed: ${successCount} success, ${errorCount} errors`);
  return {
    total: eventIds.length,
    success: successCount,
    errors: errorCount,
    results
  };
};

// CLI entry point for direct execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const command = process.argv[2];
  const eventId = process.argv[3];
  
  if (command === 'list') {
    ingestList()
      .then(result => {
        console.log('List ingestion completed:', result);
        process.exit(0);
      })
      .catch(error => {
        console.error('List ingestion failed:', error.message);
        process.exit(1);
      });
  } else if (command === 'detail' && eventId) {
    ingestDetail(eventId)
      .then(result => {
        console.log('Detail ingestion completed:', result);
        process.exit(0);
      })
      .catch(error => {
        console.error('Detail ingestion failed:', error.message);
        process.exit(1);
      });
  } else {
    console.log('Usage: node ingest.js [list|detail <eventId>]');
    process.exit(1);
  }
}

export default {
  ingestList,
  ingestDetail,
  ingestDetails
};
