# Setup Guide

## Prerequisites

- **Node.js** (v16 or later recommended)
- **npm** (comes with Node)

## One-Command Run (Recommended)

From the project root:

```bash
npm run install:all
npm start
```

This will:

1. Start **Ganache** on port 8545 (in-memory Ethereum chain).
2. **Compile** the Solidity contract and **deploy** it to Ganache.
3. Write the contract address to `backend/.env`.
4. Run **init-system.js** to add demo candidates.
5. Start the **backend** on port 3000, serving both the **API** and the **frontend**.

Open **http://localhost:3000** in your browser. Press `Ctrl+C` to stop.

## Manual Setup (Optional)

Use this if you want to run components separately (e.g. for development).

### 1. Install dependencies

```bash
npm run install:all
```

Or per component:

```bash
cd backend && npm install
cd ../smart-contracts && npm install
```

### 2. Start Ganache

```bash
cd backend && npx ganache --port 8545
```

Keep this terminal open.

### 3. Compile and deploy the contract

In a new terminal:

```bash
npm run contract:deploy
```

This compiles the contract, deploys to Ganache, and updates `backend/.env` with `CONTRACT_ADDRESS`.

### 4. Initialize demo data (candidates)

```bash
npm run init-demo
```

### 5. Start the backend (serves API + frontend)

```bash
npm run backend
```

Or:

```bash
cd backend && npm start
```

Open **http://localhost:3000**.

## Environment (backend)

Optional: create or edit `backend/.env`:

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Backend and frontend server port |
| `RPC_URL` | `http://127.0.0.1:8545` | Ganache RPC URL |
| `CONTRACT_ADDRESS` | (from deploy) | Deployed Voting contract address |

`npm start` and `npm run contract:deploy` write `CONTRACT_ADDRESS` (and optionally `RPC_URL`, `PORT`) to `backend/.env` automatically.

## Running tests

With Ganache and the backend running (e.g. after `npm start`), in another terminal:

```bash
npm test
```

This runs `tests/system-test.js` (registration, verification, voting, double-vote rejection, results).

Test dependencies: use backend’s `node_modules` (axios, ethers) by running from project root after `npm run install:all`, or install axios in the root if needed.
