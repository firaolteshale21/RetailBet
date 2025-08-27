import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

// Load .env file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

// Load games configuration
const loadGamesConfig = () => {
  try {
    const gamesConfigPath = join(__dirname, '..', 'config', 'games.json');
    const gamesConfig = JSON.parse(readFileSync(gamesConfigPath, 'utf8'));
    return gamesConfig;
  } catch (error) {
    //this is a temporary fix to allow the app to run without the games.json file
    console.warn('⚠️  Could not load games.json, using default MotorRacing config');
    return {
      games: [{
        TYPE_NAME: "MotorRacing",
        FEED_ID: 90,
        GAME_DURATION_VALUE: 240,
        DESCRIPTION: "Motor Racing - 4 minute games",
        ENABLED: true
      }],
      defaults: {
        SESSION_GUID: process.env.SESSION_GUID,
        OPERATOR_GUID: process.env.OPERATOR_GUID,
        API_BASE: process.env.API_BASE || "https://retail2.pleybetman.com",
        OFFSET_SECONDS: parseInt(process.env.OFFSET_SECONDS) || 10800,
        PRIMARY_MARKET_CLASS_IDS: (process.env.PRIMARY_MARKET_CLASS_IDS || "1,2").split(","),
        LANGUAGE_CODE: "en",
        BETTING_LAYOUT_ENUM_VALUE: "1"
      }
    };
  }
};

const gamesConfig = loadGamesConfig();

// Get current game configuration (defaults to first enabled game)
const getCurrentGameConfig = () => {
  // Filter games to find only those marked as ENABLED: true in games.json
  const enabledGames = gamesConfig.games.filter(game => game.ENABLED);
  if (enabledGames.length === 0) {
    throw new Error('No enabled games found in configuration');
  }
  
  // For now, return the first enabled game (MotorRacing)
  // Later this can be made configurable via environment variable
  return enabledGames[0];
};

const currentGame = getCurrentGameConfig();

export const config = {
  // Database
  database: {
    url: process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5432/retail_demo",
  },

  // API Configuration
  api: {
    base: gamesConfig.defaults.API_BASE,
    sessionGuid: gamesConfig.defaults.SESSION_GUID,
    operatorGuid: gamesConfig.defaults.OPERATOR_GUID,
    typeName: currentGame.TYPE_NAME,
    feedId: currentGame.FEED_ID,
    offsetSeconds: gamesConfig.defaults.OFFSET_SECONDS,
    primaryMarketClassIds: gamesConfig.defaults.PRIMARY_MARKET_CLASS_IDS,
    extraHeaders: process.env.EXTRA_HEADERS_JSON
      ? JSON.parse(process.env.EXTRA_HEADERS_JSON)
      : {},
  },

  // Game Configuration
  game: {
    typeName: currentGame.TYPE_NAME,
    feedId: currentGame.FEED_ID,
    durationSeconds: currentGame.GAME_DURATION_VALUE,
    description: currentGame.DESCRIPTION,
    enabled: currentGame.ENABLED
  },

  // All Games Configuration
  games: gamesConfig.games,

  // Server
  server: {
    port: parseInt(process.env.PORT) || 4000,
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || "info",
  },
};

// Validate required config
//const required = ['SESSION_GUID', 'OPERATOR_GUID'];
//for (const key of required) {
  //if (!process.env[key]) {
    //console.warn(`⚠️  Missing required environment variable: ${key}`);
  //}
//}

export default config;
