#!/bin/bash

# Start GovernsAI Platform with WebSocket Server
echo "🚀 Starting GovernsAI Platform..."

# Function to kill background processes on exit
cleanup() {
    echo "🛑 Shutting down services..."
    kill $WEBSOCKET_PID 2>/dev/null
    kill $NEXTJS_PID 2>/dev/null
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Start WebSocket server in background
echo "📡 Starting WebSocket server on port 3003..."
cd server && npm install && npm start &
WEBSOCKET_PID=$!

# Wait a bit for WebSocket server to start
sleep 3

# Start Next.js development server
echo "🌐 Starting Next.js app on port 3002..."
cd ..
pnpm run dev &
NEXTJS_PID=$!

echo "✅ Both servers started!"
echo "📊 Dashboard: http://localhost:3002"
echo "🔌 WebSocket: ws://localhost:3003/api/ws/gateway"
echo ""
echo "Press Ctrl+C to stop both servers"

# Wait for either process to exit
wait
