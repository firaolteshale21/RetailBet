# Troubleshooting Guide

## 🔍 Common Issues and Solutions

### Database Issues

#### 1. PostgreSQL Connection Failed
**Error:** `ECONNREFUSED` or `password authentication failed`

**Solutions:**
```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql    # Linux
brew services list | grep postgres  # macOS
# Windows: Check Services app

# Start PostgreSQL if not running
sudo systemctl start postgresql     # Linux
brew services start postgresql      # macOS
# Windows: Start from Services app

# Verify connection
psql -h localhost -U postgres -d retail_demo
```

#### 2. Database Doesn't Exist
**Error:** `database "retail_demo" does not exist`

**Solutions:**
```bash
# Create database
createdb retail_demo

# Or connect as superuser and create
sudo -u postgres createdb retail_demo
```

#### 3. Permission Denied
**Error:** `permission denied for database`

**Solutions:**
```bash
# Grant permissions
sudo -u postgres psql
GRANT ALL PRIVILEGES ON DATABASE retail_demo TO postgres;
\q
```

### Node.js Issues

#### 1. Node.js Version Too Old
**Error:** `Node.js version 18.0.0 or higher is required`

**Solutions:**
```bash
# Check current version
node --version

# Install/update Node.js
# Visit: https://nodejs.org/
# Or use nvm:
nvm install 18
nvm use 18
```

#### 2. npm Install Fails
**Error:** `npm ERR!` or dependency issues

**Solutions:**
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Check for network issues
npm config get registry
```

### API Issues

#### 1. API Connection Failed
**Error:** `API connection test failed`

**Solutions:**
- Verify `SESSION_GUID` and `OPERATOR_GUID` in `.env`
- Check `API_BASE` URL is accessible
- Test network connectivity: `curl https://retail2.pleybetman.com`
- Check firewall settings

#### 2. Authentication Errors
**Error:** `401 Unauthorized` or `403 Forbidden`

**Solutions:**
- Double-check API credentials
- Verify account is active
- Check API rate limits
- Contact API provider for support

### Frontend Issues

#### 1. Frontend Not Loading
**Error:** Blank page or JavaScript errors

**Solutions:**
- Check browser console for errors
- Verify backend is running on port 4000
- Check CORS settings
- Try different browser
- Clear browser cache

#### 2. Backend Not Responding
**Error:** `Failed to fetch` or connection refused

**Solutions:**
```bash
# Check if backend is running
curl http://localhost:4000/healthz

# Check port availability
netstat -tulpn | grep :4000    # Linux/macOS
netstat -an | findstr :4000    # Windows

# Restart backend
cd backend
npm start
```

### Game Sync Issues

#### 1. No Games Found
**Error:** `No enabled games found`

**Solutions:**
- Check `backend/config/games.json`
- Set `ENABLED: true` for desired games
- Verify game configuration is correct

#### 2. Sync Not Working
**Error:** Games not syncing or updating

**Solutions:**
- Check API credentials
- Verify game is enabled
- Check logs for specific errors
- Test manual sync first

#### 3. Winning Numbers Not Extracted
**Error:** Games finish but no results

**Solutions:**
- Check if game is marked as finished
- Verify API response contains winning data
- Check game-specific extraction logic
- Review logs for processing errors

## 🛠️ Debugging Commands

### Check System Status
```bash
# Check all services
ps aux | grep -E "(node|postgres)"

# Check ports
netstat -tulpn | grep -E "(4000|5432)"

# Check disk space
df -h

# Check memory
free -h
```

### Test Individual Components
```bash
# Test database
psql -d retail_demo -c "SELECT NOW();"

# Test API
curl -X POST http://localhost:4000/api/robust-auto-sync/manual/SmartPlayKeno

# Test backend health
curl http://localhost:4000/healthz

# Check logs
tail -f backend/logs/app.log  # if logging to file
```

### Database Queries for Debugging
```sql
-- Check recent events
SELECT * FROM events ORDER BY created_at DESC LIMIT 10;

-- Check game results
SELECT * FROM game_results ORDER BY declared_at DESC LIMIT 10;

-- Check sync status
SELECT game_name, COUNT(*) as count, 
       MAX(created_at) as latest 
FROM events 
GROUP BY game_name;
```

## 📋 Environment Checklist

Before reporting issues, verify:

- [ ] Node.js 18+ installed
- [ ] PostgreSQL installed and running
- [ ] Database created and schema applied
- [ ] `.env` file configured with valid credentials
- [ ] Games enabled in `games.json`
- [ ] Backend starts without errors
- [ ] Frontend loads without JavaScript errors
- [ ] API credentials are valid and active

## 🆘 Getting Help

### Information to Include
When asking for help, include:

1. **Error messages** (exact text)
2. **Operating system** and version
3. **Node.js version**: `node --version`
4. **PostgreSQL version**: `psql --version`
5. **Steps to reproduce** the issue
6. **Console logs** from backend
7. **Browser console** errors (if frontend issue)

### Useful Logs
```bash
# Backend logs
cd backend
npm start 2>&1 | tee backend.log

# Database logs (location varies by OS)
# Linux: /var/log/postgresql/
# macOS: /usr/local/var/log/
# Windows: PostgreSQL installation directory
```

## 🔧 Advanced Troubleshooting

### Performance Issues
- Check database indexes are created
- Monitor memory usage
- Check for memory leaks in Node.js
- Optimize database queries

### Security Issues
- Verify `.env` file is not committed to git
- Check file permissions
- Use HTTPS in production
- Implement proper authentication

### Production Deployment
- Use PM2 or similar process manager
- Set up proper logging
- Configure reverse proxy (nginx)
- Set up monitoring and alerts
- Use environment-specific configurations

---

**Still having issues?** Check the main README.md for more detailed information or create an issue with the information requested above.
