#!/bin/bash

# GameInfoFetching Setup Script
# This script automates the setup process for the GameInfoFetching project

set -e  # Exit on any error

echo "🎮 GameInfoFetching Setup Script"
echo "================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   print_error "This script should not be run as root"
   exit 1
fi

# Check prerequisites
print_status "Checking prerequisites..."

# Check Node.js
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js 18.0.0 or higher."
    print_status "Visit: https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    print_error "Node.js version 18.0.0 or higher is required. Current version: $(node --version)"
    exit 1
fi

print_success "Node.js $(node --version) is installed"

# Check npm
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed"
    exit 1
fi

print_success "npm $(npm --version) is installed"

# Check PostgreSQL
if ! command -v psql &> /dev/null; then
    print_warning "PostgreSQL is not installed or not in PATH"
    print_status "Please install PostgreSQL manually:"
    print_status "  Ubuntu/Debian: sudo apt-get install postgresql postgresql-contrib"
    print_status "  macOS: brew install postgresql"
    print_status "  Windows: Download from https://www.postgresql.org/download/windows/"
    print_status "After installation, run this script again."
    exit 1
fi

print_success "PostgreSQL is installed"

# Check if PostgreSQL is running
if ! pg_isready -q; then
    print_error "PostgreSQL is not running. Please start PostgreSQL service:"
    print_status "  Ubuntu/Debian: sudo systemctl start postgresql"
    print_status "  macOS: brew services start postgresql"
    exit 1
fi

print_success "PostgreSQL is running"

# Setup database
print_status "Setting up database..."

# Check if database exists
if psql -lqt | cut -d \| -f 1 | grep -qw retail_demo; then
    print_warning "Database 'retail_demo' already exists"
    read -p "Do you want to recreate it? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_status "Dropping existing database..."
        dropdb retail_demo 2>/dev/null || true
    else
        print_status "Using existing database"
    fi
fi

# Create database if it doesn't exist
if ! psql -lqt | cut -d \| -f 1 | grep -qw retail_demo; then
    print_status "Creating database 'retail_demo'..."
    createdb retail_demo
    print_success "Database created successfully"
fi

# Run schema
print_status "Running database schema..."
if [ -f "backend/schema.sql" ]; then
    psql -d retail_demo -f backend/schema.sql
    print_success "Database schema applied successfully"
else
    print_error "Schema file not found at backend/schema.sql"
    exit 1
fi

# Setup backend
print_status "Setting up backend..."

cd backend

# Install dependencies
print_status "Installing Node.js dependencies..."
npm install
print_success "Dependencies installed"

# Setup environment file
if [ ! -f ".env" ]; then
    print_status "Creating .env file from template..."
    cp env.example .env
    print_warning "Please edit backend/.env with your configuration:"
    print_status "  - SESSION_GUID: Your API session GUID"
    print_status "  - OPERATOR_GUID: Your API operator GUID"
    print_status "  - Other settings as needed"
else
    print_success ".env file already exists"
fi

cd ..

# Setup frontend
print_status "Setting up frontend..."
cd frontend

# Check if frontend files exist
if [ ! -f "index.html" ] || [ ! -f "app.js" ] || [ ! -f "styles.css" ]; then
    print_error "Frontend files are missing"
    exit 1
fi

print_success "Frontend files found"

cd ..

# Create startup script
print_status "Creating startup script..."
cat > start.sh << 'EOF'
#!/bin/bash

# GameInfoFetching Startup Script

echo "🎮 Starting GameInfoFetching..."

# Check if backend is already running
if pgrep -f "node.*server.js" > /dev/null; then
    echo "Backend is already running"
else
    echo "Starting backend server..."
    cd backend
    npm start &
    cd ..
    sleep 3
fi

# Check if backend is responding
if curl -s http://localhost:4000/healthz > /dev/null; then
    echo "✅ Backend is running on http://localhost:4000"
    echo "🌐 Open frontend/index.html in your browser"
    echo "📊 Health check: http://localhost:4000/healthz"
    echo "🧪 Test connections: http://localhost:4000/test"
else
    echo "❌ Backend failed to start"
    exit 1
fi

echo ""
echo "Press Ctrl+C to stop"
wait
EOF

chmod +x start.sh
print_success "Startup script created: ./start.sh"

# Create stop script
print_status "Creating stop script..."
cat > stop.sh << 'EOF'
#!/bin/bash

# GameInfoFetching Stop Script

echo "🛑 Stopping GameInfoFetching..."

# Stop backend processes
pkill -f "node.*server.js" || true

echo "✅ GameInfoFetching stopped"
EOF

chmod +x stop.sh
print_success "Stop script created: ./stop.sh"

# Final instructions
echo ""
echo "🎉 Setup completed successfully!"
echo "================================="
echo ""
echo "Next steps:"
echo "1. Edit backend/.env with your API credentials:"
echo "   - SESSION_GUID"
echo "   - OPERATOR_GUID"
echo "   - Other settings as needed"
echo ""
echo "2. Configure games in backend/config/games.json:"
echo "   - Set ENABLED: true for games you want to sync"
echo ""
echo "3. Start the application:"
echo "   ./start.sh"
echo ""
echo "4. Access the frontend:"
echo "   Open frontend/index.html in your browser"
echo ""
echo "5. Stop the application:"
echo "   ./stop.sh"
echo ""
echo "📚 For more information, see README.md"
echo ""
print_success "Setup completed! 🎮"
