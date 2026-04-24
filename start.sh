#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_DIR"

echo -e "${PURPLE}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║           TelecomGuard - Data Residency Platform            ║"
echo "║       Multinational Telecom AI Operations Center            ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Load env
if [ ! -f .env ]; then
  echo -e "${RED}[ERROR]${NC} .env file not found!"
  exit 1
fi
set -a
source .env
set +a
echo -e "${GREEN}[OK]${NC} Environment variables loaded"

BACKEND_PORT=${BACKEND_PORT:-3001}
FRONTEND_PORT=${FRONTEND_PORT:-3000}
DB_NAME=${DB_NAME:-telecom_residency}
DB_USER=${DB_USER:-postgres}
DB_PASSWORD=${DB_PASSWORD:-postgres}
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}

BACKEND_PID=""
FRONTEND_PID=""

# Function to clean up ports
cleanup_ports() {
  echo -e "${YELLOW}[CLEANUP]${NC} Checking for processes on ports $BACKEND_PORT and $FRONTEND_PORT..."
  for PORT in $BACKEND_PORT $FRONTEND_PORT; do
    PIDS=$(lsof -ti:$PORT 2>/dev/null || true)
    if [ -n "$PIDS" ]; then
      echo -e "${YELLOW}[CLEANUP]${NC} Killing processes on port $PORT (PIDs: $(echo $PIDS | tr '\n' ' '))"
      echo "$PIDS" | xargs kill -9 2>/dev/null || true
    fi
  done
  sleep 2
  echo -e "${GREEN}[OK]${NC} Ports cleaned"
}

# Function to cleanup on exit
cleanup() {
  echo -e "\n${YELLOW}[SHUTDOWN]${NC} Stopping all services..."
  [ -n "$BACKEND_PID" ] && kill $BACKEND_PID 2>/dev/null || true
  [ -n "$FRONTEND_PID" ] && kill $FRONTEND_PID 2>/dev/null || true
  # Kill any remaining children
  pkill -P $$ 2>/dev/null || true
  sleep 1
  for PORT in $BACKEND_PORT $FRONTEND_PORT; do
    PIDS=$(lsof -ti:$PORT 2>/dev/null || true)
    [ -n "$PIDS" ] && echo "$PIDS" | xargs kill -9 2>/dev/null || true
  done
  echo -e "${GREEN}[OK]${NC} All services stopped. Goodbye!"
  exit 0
}

trap cleanup SIGINT SIGTERM EXIT

# Step 1: Clean ports
cleanup_ports

# Step 2: Check PostgreSQL
echo -e "${CYAN}[DB]${NC} Checking PostgreSQL connection..."
if ! command -v psql &> /dev/null; then
  echo -e "${RED}[ERROR]${NC} psql not found. Please install PostgreSQL."
  exit 1
fi

if ! PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -c "SELECT 1" &>/dev/null; then
  echo -e "${RED}[ERROR]${NC} Cannot connect to PostgreSQL. Make sure it's running."
  echo -e "${YELLOW}[HINT]${NC} Try: brew services start postgresql"
  exit 1
fi
echo -e "${GREEN}[OK]${NC} PostgreSQL is running"

# Step 3: Create database if not exists
echo -e "${CYAN}[DB]${NC} Ensuring database exists..."
DB_EXISTS=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -tAc "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME'" 2>/dev/null || true)
if [ "$DB_EXISTS" != "1" ]; then
  PGPASSWORD="$DB_PASSWORD" createdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME"
  echo -e "${GREEN}[OK]${NC} Database '$DB_NAME' created"
else
  echo -e "${GREEN}[OK]${NC} Database '$DB_NAME' already exists"
fi

# Step 4: Install backend dependencies
echo -e "${CYAN}[BACKEND]${NC} Installing dependencies..."
cd "$PROJECT_DIR/backend"
npm install 2>&1 | tail -3
echo -e "${GREEN}[OK]${NC} Backend dependencies installed"

# Step 5: Seed database
echo -e "${CYAN}[DB]${NC} Seeding database with initial data..."
node seed.js
echo -e "${GREEN}[OK]${NC} Database seeded with data for all features"

# Step 6: Install frontend dependencies
echo -e "${CYAN}[FRONTEND]${NC} Installing dependencies..."
cd "$PROJECT_DIR/frontend"
npm install 2>&1 | tail -3
echo -e "${GREEN}[OK]${NC} Frontend dependencies installed"

cd "$PROJECT_DIR"

# Step 7: Start backend with auto-reload (nodemon)
echo -e "${CYAN}[BACKEND]${NC} Starting backend on port $BACKEND_PORT with auto-reload..."
cd "$PROJECT_DIR/backend"
npx nodemon --quiet server.js &
BACKEND_PID=$!
cd "$PROJECT_DIR"

# Wait for backend to be ready
echo -e "${YELLOW}[WAIT]${NC} Waiting for backend to start..."
READY=0
for i in $(seq 1 30); do
  if curl -s "http://localhost:$BACKEND_PORT/api/health" > /dev/null 2>&1; then
    echo -e "${GREEN}[OK]${NC} Backend is running on port $BACKEND_PORT"
    READY=1
    break
  fi
  sleep 1
done
if [ "$READY" -ne 1 ]; then
  echo -e "${RED}[ERROR]${NC} Backend failed to start within 30 seconds"
  exit 1
fi

# Step 8: Start frontend with hot-reload
echo -e "${CYAN}[FRONTEND]${NC} Starting frontend on port $FRONTEND_PORT with hot-reload..."
cd "$PROJECT_DIR/frontend"
PORT=$FRONTEND_PORT BROWSER=none npm start &
FRONTEND_PID=$!
cd "$PROJECT_DIR"

# Wait for frontend to compile
echo -e "${YELLOW}[WAIT]${NC} Waiting for frontend to compile..."
for i in $(seq 1 60); do
  if curl -s "http://localhost:$FRONTEND_PORT" > /dev/null 2>&1; then
    echo -e "${GREEN}[OK]${NC} Frontend is running on port $FRONTEND_PORT"
    break
  fi
  sleep 2
done

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                    ALL SERVICES RUNNING                     ║${NC}"
echo -e "${GREEN}╠══════════════════════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║${NC}  Frontend:  ${BLUE}http://localhost:${FRONTEND_PORT}${NC}                        ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}  Backend:   ${BLUE}http://localhost:${BACKEND_PORT}${NC}                        ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}  Database:  ${BLUE}${DB_NAME} @ localhost:${DB_PORT}${NC}             ${GREEN}║${NC}"
echo -e "${GREEN}╠══════════════════════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║${NC}  Login:     ${CYAN}admin@telecom.com / password123${NC}              ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}  AI Model:  ${PURPLE}${OPENROUTER_MODEL}${NC}            ${GREEN}║${NC}"
echo -e "${GREEN}╠══════════════════════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║${NC}  Auto-reload enabled for both backend and frontend         ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}  Press ${RED}Ctrl+C${NC} to stop all services                         ${GREEN}║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Keep running - wait for any child to exit
wait
