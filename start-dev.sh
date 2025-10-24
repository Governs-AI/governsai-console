#!/bin/bash

# GovernsAI Development Startup Script
# This script starts all services for development

set -e

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

# Function to check if a port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0  # Port is in use
    else
        return 1  # Port is free
    fi
}

# Function to wait for a service to be ready
wait_for_service() {
    local url=$1
    local service_name=$2
    local max_attempts=30
    local attempt=1

    print_status "Waiting for $service_name to be ready..."
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s "$url" >/dev/null 2>&1; then
            print_success "$service_name is ready!"
            return 0
        fi
        
        echo -n "."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    print_error "$service_name failed to start within 60 seconds"
    return 1
}

# Function to cleanup background processes
cleanup() {
    print_status "Cleaning up background processes..."
    
    # Kill platform process
    if [ ! -z "$PLATFORM_PID" ]; then
        kill $PLATFORM_PID 2>/dev/null || true
    fi
    
    # Kill websocket process
    if [ ! -z "$WEBSOCKET_PID" ]; then
        kill $WEBSOCKET_PID 2>/dev/null || true
    fi
    
    # Stop Docker services
    docker-compose -f docker-compose.dev.yml down 2>/dev/null || true
    
    print_success "Cleanup completed"
    exit 0
}

# Set up signal handlers for cleanup
trap cleanup SIGINT SIGTERM

echo "🚀 Starting GovernsAI Development Environment"
echo "=============================================="

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker Desktop and try again."
    exit 1
fi

# Check if required ports are available
if check_port 3002; then
    print_warning "Port 3002 is already in use. Platform may not start properly."
fi

if check_port 3000; then
    print_warning "Port 3000 is already in use. WebSocket service may not start properly."
fi

# Start Docker infrastructure
print_status "Starting Docker infrastructure services..."
docker compose -f docker-compose.dev.yml up -d

# Wait for PostgreSQL to be ready
print_status "Waiting for PostgreSQL to be ready..."
max_attempts=30
attempt=1

while [ $attempt -le $max_attempts ]; do
    if docker exec governs-postgres-dev pg_isready -U governs_user -d governs_ai_dev >/dev/null 2>&1; then
        print_success "PostgreSQL is ready!"
        break
    fi
    
    echo -n "."
    sleep 2
    attempt=$((attempt + 1))
    
    if [ $attempt -gt $max_attempts ]; then
        print_error "PostgreSQL failed to start within 60 seconds"
        exit 1
    fi
done

# Wait for Keycloak to be ready
wait_for_service "http://localhost:8080" "Keycloak" || {
    print_error "Keycloak failed to start"
    exit 1
}

print_success "Infrastructure services are ready!"

# Start Platform in background
print_status "Starting Platform service..."
cd "$(dirname "$0")"
pnpm run dev:platform > platform.log 2>&1 &
PLATFORM_PID=$!

# Start WebSocket service in background
print_status "Starting WebSocket service..."
pnpm run dev:websocket > websocket.log 2>&1 &
WEBSOCKET_PID=$!

# Wait a moment for services to initialize
sleep 5

# Check if services are running
if ! kill -0 $PLATFORM_PID 2>/dev/null; then
    print_error "Platform service failed to start. Check platform.log for details."
    exit 1
fi

if ! kill -0 $WEBSOCKET_PID 2>/dev/null; then
    print_error "WebSocket service failed to start. Check websocket.log for details."
    exit 1
fi

# Wait for services to be ready
wait_for_service "http://localhost:3002" "Platform" || {
    print_error "Platform service is not responding"
    exit 1
}

wait_for_service "http://localhost:3000/health" "WebSocket" || {
    print_error "WebSocket service is not responding"
    exit 1
}

echo ""
echo "🎉 All services are running!"
echo "============================"
echo ""
echo "📱 Platform:     http://localhost:3002"
echo "🔌 WebSocket:    http://localhost:3000"
echo "🗄️  Database:     localhost:5432"
echo "🔐 Keycloak:     http://localhost:8080"
echo ""
echo "📋 Logs:"
echo "  Platform:   tail -f platform.log"
echo "  WebSocket: tail -f websocket.log"
echo ""
echo "🛑 To stop all services: Ctrl+C"
echo ""

# Keep script running and show logs
print_status "Press Ctrl+C to stop all services..."

# Function to show recent logs
show_logs() {
    echo ""
    echo "📋 Recent logs:"
    echo "==============="
    echo "Platform (last 5 lines):"
    tail -n 5 platform.log 2>/dev/null || echo "No platform logs yet"
    echo ""
    echo "WebSocket (last 5 lines):"
    tail -n 5 websocket.log 2>/dev/null || echo "No websocket logs yet"
    echo ""
}

# Show initial logs
show_logs

# Keep running and show logs every 30 seconds
while true; do
    sleep 30
    show_logs
done
