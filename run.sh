#!/usr/bin/env bash
# Blockchain Voting – local runner (no Docker)
# Usage:
#   ./run.sh          Start full stack (Ganache + contract deploy + backend + frontend)
#   ./run.sh start    Same as above
#   ./run.sh backend  Start backend only (expects Ganache + deployed contract)
#   ./run.sh test     Run end-to-end tests
#   ./run.sh check    Health check (Ganache + API + frontend)
#   ./run.sh demo     Print demo wallet addresses (Ganache must be running)
#   ./run.sh install  Install all dependencies (root + backend + smart-contracts)
set -e
cd "$(dirname "$0")"
ROOT="$PWD"

case "${1:-start}" in
  start)
    echo "Starting full stack locally (Ganache + contract + backend + frontend)..."
    node scripts/run-all.js
    ;;
  backend)
    echo "Starting backend only on http://localhost:3000 (expects Ganache + CONTRACT_ADDRESS in backend/.env)..."
    node backend/index.js
    ;;
  test)
    echo "Running system tests..."
    NODE_PATH="$ROOT/backend/node_modules" node "$ROOT/tests/system-test.js"
    ;;
  check)
    node scripts/check.js
    ;;
  demo)
    echo "Demo credentials (Ganache must be running, e.g. ./run.sh)..."
    NODE_PATH="$ROOT/backend/node_modules" node "$ROOT/scripts/demo-credentials.js"
    ;;
  install)
    npm run install:all
    ;;
  *)
    echo "Usage: $0 {start|backend|test|check|demo|install}"
    echo "  start   - Full stack: Ganache + contract deploy + backend + frontend"
    echo "  backend - Backend only (requires existing Ganache + deployed contract)"
    echo "  test    - Run end-to-end tests"
    echo "  check   - Health check: Ganache, API, frontend"
    echo "  demo    - Print demo wallet addresses"
    echo "  install - Install root, backend, and smart-contracts dependencies"
    exit 1
    ;;
esac
