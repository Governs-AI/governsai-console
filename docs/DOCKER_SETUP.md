# Docker Development Setup

This project uses Docker for infrastructure services (PostgreSQL, Keycloak) while running applications locally for development.

## Quick Start

### Start Development Environment
```bash
./start-dev.sh
```

### Stop Development Environment
```bash
./stop-dev.sh
```

## Services

### Infrastructure (Docker)
- **PostgreSQL**: `localhost:5432`
  - Database: `governs_ai_dev`
  - User: `governs_user`
  - Password: `governs_password`

- **Keycloak**: `http://localhost:8080`
  - Admin: `admin` / `admin`

### Applications (Local)
- **Platform**: `http://localhost:3002`
- **WebSocket**: `http://localhost:3000`

## Manual Commands

### Start Infrastructure Only
```bash
docker compose -f docker-compose.dev.yml up -d
```

### Stop Infrastructure
```bash
docker compose -f docker-compose.dev.yml down
```

### View Logs
```bash
docker logs governs-postgres-dev
docker logs governs-keycloak-dev
```

### Connect to Database
```bash
docker exec -it governs-postgres-dev psql -U governs_user -d governs_ai_dev
```

## Environment Variables

The applications will connect to the Docker services using these default values:
- `DATABASE_URL=postgresql://governs_user:governs_password@localhost:5432/governs_ai_dev`
- `KEYCLOAK_URL=http://localhost:8080`

## Troubleshooting

### Port Conflicts
If ports are already in use:
```bash
# Check what's using the ports
lsof -i :3002  # Platform
lsof -i :3000  # WebSocket
lsof -i :5432  # PostgreSQL
lsof -i :8080  # Keycloak

# Kill processes if needed
kill -9 <PID>
```

### Reset Database
```bash
docker compose -f docker-compose.dev.yml down -v
./start-dev.sh
```

### View Application Logs
```bash
tail -f platform.log    # Platform logs
tail -f websocket.log   # WebSocket logs
```
