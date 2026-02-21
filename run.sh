#!/usr/bin/env bash
# Single script: starts Ganache, deploys contract, then Backend (API + Frontend on :3000)
# Usage: ./run.sh   or: npm start
cd "$(dirname "$0")"
exec node scripts/run-all.js
