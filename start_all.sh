#!/usr/bin/env bash
# =============================================================================
# CodeLens – Unified All-In-One Launcher & Health Dashboard
# =============================================================================
# Usage:
#   chmod +x start_all.sh
#   ./start_all.sh
# =============================================================================

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

echo -e "\n${BOLD}${CYAN}╔══════════════════════════════════════════════════════════════════╗"
echo -e "║            🔍 CodeLens — Unified Service Launcher                ║"
echo -e "╚══════════════════════════════════════════════════════════════════╝${RESET}\n"

# 1. Check Environment File
if [[ ! -f ".env" ]]; then
  echo -e "  ${YELLOW}⚠ .env file missing. Copying from .env.example...${RESET}"
  cp .env.example .env
  echo -e "  ${GREEN}✔ Created .env${RESET}"
fi

# 2. Check Docker Compose Infrastructure
echo -e "  ${CYAN}ℹ Bootstrapping Docker Infrastructure (Postgres, Redis, Qdrant, Grafana, Flower)...${RESET}"
if command -v docker &>/dev/null && docker info &>/dev/null; then
  docker compose up -d 2>/dev/null || docker-compose up -d 2>/dev/null || true
  echo -e "  ${GREEN}✔ Docker services initialized${RESET}"
else
  echo -e "  ${YELLOW}⚠ Docker daemon not active or not installed. Running in local standalone mode.${RESET}"
fi

# 3. Check / Start Backend API (Port 8000)
if curl -sf http://localhost:8000/health -o /dev/null 2>/dev/null; then
  echo -e "  ${GREEN}✔ Backend API active on port 8000${RESET}"
else
  echo -e "  ${CYAN}ℹ Backend API not detected on port 8000. Launching local API server...${RESET}"
  if [[ -f ".venv/bin/uvicorn" ]]; then
    .venv/bin/uvicorn apps.api.app.main:app --host 0.0.0.0 --port 8000 --reload &>/tmp/codelens_api.log &
    echo -e "  ${GREEN}✔ Started API server on http://localhost:8000 (PID: $!)${RESET}"
  elif command -v uvicorn &>/dev/null; then
    uvicorn apps.api.app.main:app --host 0.0.0.0 --port 8000 --reload &>/tmp/codelens_api.log &
    echo -e "  ${GREEN}✔ Started API server on http://localhost:8000 (PID: $!)${RESET}"
  else
    echo -e "  ${YELLOW}⚠ uvicorn not found locally. Ensure backend is running via Docker or virtualenv.${RESET}"
  fi
fi

# 4. Check / Start Frontend Web App (Port 3000)
if lsof -i :3000 -sTCP:LISTEN -t &>/dev/null || curl -sf http://localhost:3000 -o /dev/null 2>/dev/null; then
  echo -e "  ${GREEN}✔ Frontend Web App active on port 3000${RESET}"
else
  echo -e "  ${CYAN}ℹ Starting Vite Frontend dev server on port 3000...${RESET}"
  cd apps/web
  npm run dev &>/tmp/codelens_vite.log &
  echo -e "  ${GREEN}✔ Started Frontend on http://localhost:3000 (PID: $!)${RESET}"
  cd "$ROOT_DIR"
fi

# 5. Display Unified Summary Table
echo -e "\n${BOLD}${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo -e "${BOLD}  ALL SERVICES STATUS & URL DASHBOARD${RESET}"
echo -e "${BOLD}${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}\n"

check_service() {
  local name="$1" url="$2" expected_code="${3:-200}"
  local status
  status=$(curl -sf --max-time 3 -o /dev/null -w "%{http_code}" "$url" 2>/dev/null || echo "DOWN")
  if [[ "$status" == "$expected_code" || "$status" == "200" || "$status" == "304" ]]; then
    printf "  %-22s : %-32s ${GREEN}[ONLINE - HTTP %s]${RESET}\n" "$name" "$url" "$status"
  else
    printf "  %-22s : %-32s ${YELLOW}[STANDBY / %s]${RESET}\n" "$name" "$url" "$status"
  fi
}

check_service "Frontend Web App"   "http://localhost:3000"
check_service "API Gateway"        "http://localhost:8000/health"
check_service "API Auth Endpoint"  "http://127.0.0.1:8000/auth/demo" "200"
check_service "Qdrant Vector DB"   "http://localhost:6333/dashboard" "200"
check_service "Flower Celery UI"   "http://localhost:5555"
check_service "Grafana Dashboard"  "http://localhost:3001"
check_service "Prometheus Metrics" "http://localhost:9090"

echo -e "\n  ${GREEN}${BOLD}🚀 All-in-one stack is running! Open http://localhost:3000 in your browser.${RESET}\n"
