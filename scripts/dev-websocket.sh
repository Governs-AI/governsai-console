#!/bin/bash

# Development script for GovernsAI WebSocket Service
echo "🚀 Starting GovernsAI WebSocket Service Development Environment"
echo ""

# Function to kill background processes on exit
cleanup() {
    echo ""
    echo "🛑 Shutting down services..."
    kill $WEBSOCKET_PID 2>/dev/null
    kill $PLATFORM_PID 2>/dev/null
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Check if we're in the right directory
if [ ! -d "apps/websocket-service" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Start WebSocket service
echo "📡 Starting WebSocket service on port ... ${PORT}"
cd apps/websocket-service
npm install > /dev/null 2>&1
npm run dev &
WEBSOCKET_PID=$!
cd ../..

# Wait for WebSocket service to start
sleep 3

# Start Platform (optional)
if [ "$1" = "--with-platform" ]; then
    echo "🌐 Starting Platform on port ... ${PLATFORM_PORT}"
    cd apps/platform
    pnpm run dev &
    PLATFORM_PID=$!
    cd ../..
    sleep 2
fi

echo ""
echo "✅ Services started successfully!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📡 WebSocket Service: ws://localhost:3000/ws"
echo "🏥 Health Check: http://localhost:3000/health"
echo "📊 Service Info: http://localhost:3000/info"

if [ "$1" = "--with-platform" ]; then
    echo "🌐 Platform Dashboard: http://localhost:3002"
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🧪 To test the WebSocket service:"
echo "   cd apps/websocket-service"
echo "   node test-client.js"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for services to run
wait
