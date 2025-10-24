#!/bin/bash

# GovernsAI Development Stop Script
# This script stops all development services

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

echo "🛑 Stopping GovernsAI Development Environment"
echo "==========================================="

# Stop Docker services
print_status "Stopping Docker services..."
docker compose -f docker-compose.dev.yml down

# Kill any running Node.js processes on our ports
print_status "Stopping application services..."

# Kill processes on port 3002 (Platform)
if lsof -Pi :3002 -sTCP:LISTEN -t >/dev/null 2>&1; then
    PLATFORM_PID=$(lsof -Pi :3002 -sTCP:LISTEN -t)
    kill $PLATFORM_PID 2>/dev/null || true
    print_status "Stopped Platform service (PID: $PLATFORM_PID)"
fi

# Kill processes on port 3000 (WebSocket)
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    WEBSOCKET_PID=$(lsof -Pi :3000 -sTCP:LISTEN -t)
    kill $WEBSOCKET_PID 2>/dev/null || true
    print_status "Stopped WebSocket service (PID: $WEBSOCKET_PID)"
fi

# Clean up log files
if [ -f "platform.log" ]; then
    rm platform.log
    print_status "Removed platform.log"
fi

if [ -f "websocket.log" ]; then
    rm websocket.log
    print_status "Removed websocket.log"
fi

print_success "All development services stopped!"
echo ""
echo "💡 To start again, run: ./start-dev.sh"
