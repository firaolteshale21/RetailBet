import axios from 'axios';
import { config } from './config.js';
import { logger, logApiRequest } from './logger.js';

// Create axios instance with base configuration
const apiClient = axios.create({
  baseURL: config.api.base,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'User-Agent': 'RetailDemo/1.0',
    ...config.api.extraHeaders
  }
});

// Request interceptor to log requests (with redacted secrets)
apiClient.interceptors.request.use((config) => {
  logApiRequest(
    config.url,
    config.data,
    config.headers
  );
  return config;
});

// Response interceptor to log responses
apiClient.interceptors.response.use(
  (response) => {
    logger.info({
      msg: 'API Response',
      url: response.config.url,
      status: response.status,
      dataSize: JSON.stringify(response.data).length
    });
    return response;
  },
  (error) => {
    logger.error({
      msg: 'API Error',
      url: error.config?.url,
      status: error.response?.status,
      message: error.message,
      data: error.response?.data
    });
    return Promise.reject(error);
  }
);

// Helper to build request body for GetEventsByType
export const buildListRequestBody = (gameConfig = null) => {
  return {
    sessionGuid: config.api.sessionGuid,
    operatorGuid: config.api.operatorGuid,
    name: gameConfig ? gameConfig.TYPE_NAME : config.api.typeName,
    feedId: gameConfig ? gameConfig.FEED_ID : config.api.feedId,
    userInitiated: true,
    offset: config.api.offsetSeconds,
    languageCode: "en",
    bettingLayoutEnumValue: "1",
    primaryMarketClassIds: config.api.primaryMarketClassIds,
    nextEventCount: ""
  };
};

// Helper to build request body for GetEventDetail
// This function creates the payload needed to fetch detailed information about a specific event
// including markets, odds, selections, and other betting-related data for that event
export const buildDetailRequestBody = (eventId) => {
  return {
    id: eventId,                          // The specific event ID to get details for
    userInitiated: false,                 // Indicates this is an automated/system request
    offset: config.api.offsetSeconds,     // Timezone offset for proper time display
    languageCode: "en",                   // Language for localized content
    excludePlayerDetails: true,           // Skip player-specific info to reduce payload size
    bettingLayoutEnumValue: "1",          // UI layout preference for betting display
    primaryMarketClassIds: config.api.primaryMarketClassIds  // Which market types to include
  };
};

// Make request to GetEventsByType endpoint
export const getEventsByType = async (gameConfig = null) => {
  try {
    const body = buildListRequestBody(gameConfig);
    const response = await apiClient.post('/Home/GetEventsByType', body);
    return response.data;
  } catch (error) {
    logger.error('Failed to get events by type:', error.message);
    throw error;
  }
};

// Make request to GetEventDetail endpoint
export const getEventDetail = async (eventId) => {
  try {
    const body = buildDetailRequestBody(eventId);
    const response = await apiClient.post('/Home/GetEventDetail', body);
    return response.data;
  } catch (error) {
    logger.error('Failed to get event detail:', error.message);
    throw error;
  }
};

// Test API connection
export const testApiConnection = async () => {
  try {
    const response = await apiClient.get('/');
    logger.info('API connection test successful');
    return true;
  } catch (error) {
    logger.error('API connection test failed:', error.message);
    return false;
  }
};

export default {
  apiClient,
  getEventsByType,
  getEventDetail,
  testApiConnection,
  buildListRequestBody,
  buildDetailRequestBody
};
