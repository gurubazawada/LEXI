#!/bin/bash

echo "🚀 LEX Setup Script"
echo "==================="
echo ""

# Check if Redis is installed
echo "Checking Redis installation..."
if ! command -v redis-cli &> /dev/null; then
    echo "❌ Redis is not installed."
    echo ""
    echo "Please install Redis:"
    echo "  macOS: brew install redis"
    echo "  Linux: sudo apt-get install redis-server"
    echo "  Windows: Use WSL or download from redis.io"
    exit 1
fi

# Check if Redis is running
echo "Checking if Redis is running..."
if ! redis-cli ping &> /dev/null; then
    echo "⚠️  Redis is not running. Starting Redis..."
    if [[ "$OSTYPE" == "darwin"* ]]; then
        brew services start redis
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        sudo systemctl start redis
    fi
    sleep 2
fi

if redis-cli ping &> /dev/null; then
    echo "✓ Redis is running"
else
    echo "❌ Could not start Redis. Please start it manually."
    exit 1
fi

echo ""
echo "Installing dependencies..."
echo ""

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend
if [ ! -d "node_modules" ]; then
    npm install
else
    echo "✓ Backend dependencies already installed"
fi

# Create backend .env if it doesn't exist
if [ ! -f ".env" ]; then
    echo "Creating backend .env file..."
    cp .env.example .env
    echo "✓ Created backend/.env"
else
    echo "✓ Backend .env already exists"
fi

cd ..

# Install frontend dependencies
echo ""
echo "📦 Installing frontend dependencies..."
cd my-first-mini-app
if [ ! -d "node_modules" ]; then
    npm install --legacy-peer-deps
else
    echo "✓ Frontend dependencies already installed"
fi

# Create frontend .env.local if it doesn't exist
if [ ! -f ".env.local" ]; then
    echo "Creating frontend .env.local file..."
    echo "NEXT_PUBLIC_SOCKET_URL=http://localhost:4000" > .env.local
    echo "✓ Created my-first-mini-app/.env.local"
else
    echo "✓ Frontend .env.local already exists"
fi

cd ..

echo ""
echo "✅ Setup complete!"
echo ""
echo "To start the application:"
echo ""
echo "  Terminal 1 (Backend):"
echo "    cd backend && npm run dev"
echo ""
echo "  Terminal 2 (Frontend):"
echo "    cd my-first-mini-app && npm run dev"
echo ""
echo "Then open http://localhost:3000 in your browser"
echo ""

