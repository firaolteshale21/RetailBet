import pino from 'pino';
import { config } from './config.js';

// Redact sensitive information from logs
const redact = {
  paths: [
    'req.headers.authorization',
    'req.headers.cookie',
    'req.body.sessionGuid',
    'req.body.operatorGuid',
    '*.sessionGuid',
    '*.operatorGuid',
    '*.password',
    '*.token'
  ],
  remove: true
};

export const logger = pino({
  level: config.logging.level,
  redact,
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname'
    }
  }
});

// Helper to log API requests with redacted secrets
export const logApiRequest = (endpoint, body, headers = {}) => {
  const redactedBody = { ...body };
  if (redactedBody.sessionGuid) redactedBody.sessionGuid = '[REDACTED]';
  if (redactedBody.operatorGuid) redactedBody.operatorGuid = '[REDACTED]';
  
  const redactedHeaders = { ...headers };
  if (redactedHeaders.Cookie) redactedHeaders.Cookie = '[REDACTED]';
  if (redactedHeaders.Authorization) redactedHeaders.Authorization = '[REDACTED]';
  
  logger.info({
    msg: 'API Request',
    endpoint,
    body: redactedBody,
    headers: redactedHeaders
  });
};

export default logger;
