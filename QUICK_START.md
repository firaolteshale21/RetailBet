# Quick Start Guide

## 🚀 Get Running in 5 Minutes

### Prerequisites
- Node.js 18+ 
- PostgreSQL
- Git

### 1. Clone & Setup
```bash
git clone <your-repo-url>
cd GameInfoFetching

# Run setup script (Linux/macOS)
chmod +x setup.sh
./setup.sh

# Or on Windows
setup.bat
```

### 2. Configure API Credentials
Edit `backend/.env`:
```env
SESSION_GUID=your_session_guid_here
OPERATOR_GUID=your_operator_guid_here
DATABASE_URL=postgres://postgres:postgres@localhost:5432/retail_demo
```

### 3. Enable Games
Edit `backend/config/games.json`:
```json
{
  "games": [
    {
      "TYPE_NAME": "SmartPlayKeno",
      "ENABLED": true
    }
  ]
}
```

### 4. Start & Access
```bash
# Start the application
./start.sh          # Linux/macOS
# or
start.bat           # Windows

# Open in browser
frontend/index.html
```

## 🎮 Available Commands

| Command | Description |
|---------|-------------|
| `./start.sh` | Start the application |
| `./stop.sh` | Stop the application |
| `npm start` (in backend/) | Start backend only |
| `curl http://localhost:4000/healthz` | Health check |

## 🔧 Common Issues

**Database Connection Failed:**
- Start PostgreSQL service
- Check `DATABASE_URL` in `.env`

**API Connection Failed:**
- Verify `SESSION_GUID` and `OPERATOR_GUID`
- Check network connectivity

**No Games Found:**
- Set `ENABLED: true` in `games.json`

## 📊 Monitoring URLs

- **Health Check:** http://localhost:4000/healthz
- **Test Connections:** http://localhost:4000/test
- **API Status:** http://localhost:4000/api/robust-auto-sync/status

## 🆘 Need Help?

1. Check console logs for errors
2. Verify all prerequisites are installed
3. See full README.md for detailed instructions
