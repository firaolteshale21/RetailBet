# GameInfoFetching Project

A real-time game data synchronization system that fetches and processes game information from betting APIs. The project consists of a Node.js backend that handles API communication and data storage, and a simple HTML/CSS/JavaScript frontend for monitoring and controlling the sync process.

## 🏗️ Project Structure

```
GameInfoFetching/
├── backend/                 # Node.js backend server
│   ├── config/
│   │   └── games.json      # Game configurations
│   ├── src/
│   │   ├── api.js          # API communication
│   │   ├── config.js       # Configuration management
│   │   ├── db.js           # Database operations
│   │   ├── games.js        # Game management
│   │   ├── ingest.js       # Data ingestion
│   │   ├── logger.js       # Logging utilities
│   │   ├── map.js          # Data mapping utilities
│   │   ├── process-finished-games.js  # Game result processing
│   │   ├── robust-auto-sync.js        # Auto-sync functionality
│   │   └── server.js       # Express server
│   ├── env.example         # Environment variables template
│   └── package.json        # Backend dependencies
├── frontend/               # Simple web interface
│   ├── app.js             # Frontend JavaScript
│   ├── index.html         # Main HTML page
│   └── styles.css         # CSS styling
└── README.md              # This file
```

## 🚀 Quick Start Guide

### Prerequisites

Before setting up the project, ensure you have the following installed:

- **Node.js** (version 18.0.0 or higher)
- **PostgreSQL** (version 12 or higher)
- **Git** (for cloning the repository)

### Step 1: Clone and Navigate to Project

```bash
# Clone the repository (replace with your actual repository URL)
git clone <your-repository-url>
cd GameInfoFetching
```

### Step 2: Database Setup

1. **Install PostgreSQL** (if not already installed):
   - **Windows**: Download from [PostgreSQL official website](https://www.postgresql.org/download/windows/)
   - **macOS**: `brew install postgresql`
   - **Linux**: `sudo apt-get install postgresql postgresql-contrib`

2. **Create Database**:
   ```bash
   # Connect to PostgreSQL as superuser
   sudo -u postgres psql
   
   # Create database and user
   CREATE DATABASE retail_demo;
   CREATE USER postgres WITH PASSWORD 'postgres';
   GRANT ALL PRIVILEGES ON DATABASE retail_demo TO postgres;
   
   # Exit PostgreSQL
   \q
   ```

3. **Initialize Database Schema**:
   ```bash
   # Navigate to backend directory
   cd backend
   
   # Connect to database and run schema (you'll need to create this)
   psql -h localhost -U postgres -d retail_demo -f schema.sql
   ```

### Step 3: Backend Setup

1. **Navigate to Backend Directory**:
   ```bash
   cd backend
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   ```bash
   # Copy the environment template
   cp env.example .env
   
   # Edit the .env file with your configuration
   nano .env
   ```

   **Required Environment Variables**:
   ```env
   # Database Configuration
   DATABASE_URL=postgres://postgres:postgres@localhost:5432/retail_demo
   
   # Server Configuration
   PORT=4000
   
   # API Configuration (get these from your betting provider)
   SESSION_GUID=your_session_guid_here
   OPERATOR_GUID=your_operator_guid_here
   API_BASE=https://retail2.pleybetman.com
   OFFSET_SECONDS=10800
   PRIMARY_MARKET_CLASS_IDS=1,2
   
   # Logging
   LOG_LEVEL=info
   ```

4. **Configure Games**:
   Edit `config/games.json` to enable/disable specific games:
   ```json
   {
     "games": [
       {
         "TYPE_NAME": "SmartPlayKeno",
         "FEED_ID": 90,
         "GAME_DURATION_VALUE": 240,
         "DESCRIPTION": "SmartPlayKeno - 4 minute games",
         "ENABLED": true
       }
       // ... other games
     ]
   }
   ```

### Step 4: Frontend Setup

1. **Navigate to Frontend Directory**:
   ```bash
   cd ../frontend
   ```

2. **No Build Process Required**:
   The frontend is a simple HTML/CSS/JS application that can be served directly.

### Step 5: Start the Application

1. **Start the Backend Server**:
   ```bash
   # From the backend directory
   cd backend
   npm start
   ```

   The server will start on `http://localhost:4000`

2. **Access the Frontend**:
   - Open `frontend/index.html` in your web browser
   - Or serve it using a simple HTTP server:
     ```bash
     # From the frontend directory
     cd frontend
     python -m http.server 8000  # Python 3
     # or
     npx serve .                 # Node.js serve package
     ```

3. **Verify Setup**:
   - Backend health check: `http://localhost:4000/healthz`
   - Test connections: `http://localhost:4000/test`

## 📋 Database Schema

You'll need to create the following database tables. Create a file called `schema.sql` in the backend directory:

```sql
-- Create events table
CREATE TABLE IF NOT EXISTS events (
    id SERIAL PRIMARY KEY,
    event_id VARCHAR(255) UNIQUE NOT NULL,
    game_name VARCHAR(100),
    game_number INTEGER,
    start_time TIMESTAMP,
    finish_time TIMESTAMP,
    is_finished BOOLEAN DEFAULT FALSE,
    status_value INTEGER,
    raw_payload JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create game_results table
CREATE TABLE IF NOT EXISTS game_results (
    id SERIAL PRIMARY KEY,
    event_id VARCHAR(255) UNIQUE NOT NULL,
    game_name VARCHAR(100),
    result_type VARCHAR(50),
    winning_values JSONB,
    result_data JSONB,
    game_number INTEGER,
    declared_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create raw_events table
CREATE TABLE IF NOT EXISTS raw_events (
    id SERIAL PRIMARY KEY,
    event_id VARCHAR(255),
    game_name VARCHAR(100),
    source_endpoint VARCHAR(100),
    payload JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_events_event_id ON events(event_id);
CREATE INDEX IF NOT EXISTS idx_events_game_name ON events(game_name);
CREATE INDEX IF NOT EXISTS idx_events_start_time ON events(start_time);
CREATE INDEX IF NOT EXISTS idx_events_is_finished ON events(is_finished);
CREATE INDEX IF NOT EXISTS idx_game_results_event_id ON game_results(event_id);
CREATE INDEX IF NOT EXISTS idx_game_results_game_name ON game_results(game_name);
```

## 🎮 Available Games

The system supports multiple game types:

- **SmartPlayKeno** (4-minute games) - Keno-style number games
- **MotorRacing** (4-minute games) - Motor racing events
- **SteepleChase** (8-minute games) - Horse racing with obstacles
- **SpeedSkating** (8-minute games) - Speed skating events
- **DashingDerby** (10-minute games) - Horse racing derby
- **HarnessRacing** (12-minute games) - Harness horse racing
- **HorseRacing** (3-minute games) - Standard horse racing
- **PlatinumHounds** (10-minute games) - Dog racing
- **HorseRacingRouletteV2** (8-minute games) - Roulette-style horse racing
- **CycleRacing** (4-minute games) - Bicycle racing
- **SingleSeaterMotorRacing** (8-minute games) - Formula-style racing
- **SpinAndWin** (4-minute games) - Spinning wheel games

## 🔧 Configuration

### Game Configuration (`config/games.json`)

Enable/disable games and set their parameters:

```json
{
  "games": [
    {
      "TYPE_NAME": "SmartPlayKeno",
      "FEED_ID": 90,
      "GAME_DURATION_VALUE": 240,
      "DESCRIPTION": "SmartPlayKeno - 4 minute games",
      "ENABLED": true
    }
  ],
  "defaults": {
    "SESSION_GUID": "MAJAS",
    "OPERATOR_GUID": "titest",
    "API_BASE": "https://retail2.pleybetman.com",
    "OFFSET_SECONDS": 10800,
    "PRIMARY_MARKET_CLASS_IDS": ["1", "2"],
    "LANGUAGE_CODE": "en",
    "BETTING_LAYOUT_ENUM_VALUE": "1"
  }
}
```

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `DATABASE_URL` | PostgreSQL connection string | `postgres://postgres:postgres@localhost:5432/retail_demo` | Yes |
| `PORT` | Backend server port | `4000` | No |
| `SESSION_GUID` | API session identifier | - | Yes |
| `OPERATOR_GUID` | API operator identifier | - | Yes |
| `API_BASE` | Base URL for betting API | `https://retail2.pleybetman.com` | Yes |
| `OFFSET_SECONDS` | Timezone offset in seconds | `10800` | No |
| `PRIMARY_MARKET_CLASS_IDS` | Market class IDs (comma-separated) | `1,2` | No |
| `LOG_LEVEL` | Logging level | `info` | No |

## 🚀 Usage

### Starting the System

1. **Start Backend**:
   ```bash
   cd backend
   npm start
   ```

2. **Access Frontend**:
   Open `frontend/index.html` in your browser

### Frontend Features

- **Manual Sync**: Trigger a one-time sync for the current game
- **Multi-Game Auto-Sync**: Start/stop automatic synchronization for all enabled games
- **Real-time Status**: View sync status and countdown timers for each game
- **Live Updates**: Status updates every 5 seconds

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/healthz` | GET | Health check |
| `/test` | GET | Test database and API connections |
| `/events` | GET | Get events with optional filters |
| `/events/:eventId` | GET | Get specific event details |
| `/api/games` | GET | Get game configuration |
| `/api/robust-auto-sync/start` | POST | Start auto-sync |
| `/api/robust-auto-sync/stop` | POST | Stop auto-sync |
| `/api/robust-auto-sync/status` | GET | Get sync status |
| `/api/robust-auto-sync/stats` | GET | Get sync statistics |
| `/api/robust-auto-sync/manual/:gameType` | POST | Manual sync for specific game |

## 🔍 Troubleshooting

### Common Issues

1. **Database Connection Failed**:
   - Verify PostgreSQL is running
   - Check `DATABASE_URL` in `.env`
   - Ensure database and user exist

2. **API Connection Failed**:
   - Verify `SESSION_GUID` and `OPERATOR_GUID` are correct
   - Check `API_BASE` URL is accessible
   - Ensure network connectivity

3. **No Games Found**:
   - Check `config/games.json` has enabled games
   - Verify `ENABLED: true` for desired games

4. **Frontend Not Connecting**:
   - Ensure backend is running on port 4000
   - Check browser console for CORS errors
   - Verify `backendUrl` in `frontend/app.js`

### Logs

Backend logs are available in the console. Set `LOG_LEVEL=debug` for detailed logging.

### Testing

```bash
# Test database connection
npm run test:connectivity

# Test API connection
curl http://localhost:4000/test

# Test manual sync
curl -X POST http://localhost:4000/api/robust-auto-sync/manual/SmartPlayKeno
```

## 📊 Monitoring

The system provides real-time monitoring through:

- **Frontend Dashboard**: Visual status and controls
- **API Endpoints**: Programmatic access to status
- **Database Tables**: Persistent data storage
- **Console Logs**: Detailed operation logs

## 🔒 Security Notes

- Store sensitive credentials in environment variables
- Use HTTPS in production
- Implement proper authentication for production use
- Regularly update dependencies

## 📝 Development

### Adding New Games

1. Add game configuration to `config/games.json`
2. Update game processing logic in `src/map.js` if needed
3. Test with manual sync before enabling auto-sync

### Extending Functionality

- **New API Endpoints**: Add to `src/server.js`
- **Database Operations**: Add to `src/db.js`
- **Game Processing**: Extend `src/map.js`
- **Frontend Features**: Modify `frontend/app.js`

## 📄 License

This project is licensed under the MIT License.

## 🤝 Support

For issues and questions:
1. Check the troubleshooting section
2. Review console logs for error details
3. Verify configuration settings
4. Test individual components

---

**Happy Gaming! 🎮**
