# Blockchain Voting System

**Decentralised, Tamper-Proof Voting on Ethereum**

A secure, transparent voting application built on Ethereum smart contracts. Voters are identified by wallet addresses — no usernames, no passwords, no central authority. Every vote is recorded immutably on a local Ganache blockchain. The system covers the full lifecycle: voter registration, phase control, vote casting, cryptographic verification, and live results — all through a modern glassmorphic web UI.

---

## Table of Contents

1. [What It Does](#what-it-does)
2. [How It Works](#how-it-works)
3. [Architecture](#architecture)
4. [Smart Contract](#smart-contract)
5. [Tech Stack](#tech-stack)
6. [Project Structure](#project-structure)
7. [Requirements](#requirements)
8. [Installation](#installation)
9. [Running the Application](#running-the-application)
10. [Demo Walkthrough](#demo-walkthrough)
11. [npm Scripts Reference](#npm-scripts-reference)
12. [API Reference](#api-reference)
13. [Frontend Pages](#frontend-pages)
14. [Feature Flags](#feature-flags)
15. [Testing](#testing)
16. [Environment Variables](#environment-variables)
17. [Documentation](#documentation)

---

## What It Does

The Blockchain Voting System solves the core problem of conventional electronic voting: who do you trust to count the votes honestly? By recording every registration and vote directly on an Ethereum smart contract, the system makes it cryptographically impossible to alter results after the fact. Anyone can verify any vote by inspecting the blockchain.

Given a set of candidates and a pool of voters, the system:

1. Deploys a `Voting` Solidity contract to a local Ganache chain
2. Seeds demo candidates via a backend initialisation script
3. Lets voters register using their Ganache wallet address
4. Allows the contract owner to open and close voting phases
5. Records each vote as a blockchain transaction — immutable, verifiable
6. Displays live results without any intermediary tallying

---

## How It Works

### The Voting Pipeline

```
Ganache (local Ethereum chain — 10 test wallets)
    │
    ▼
npm start
  ├─ starts Ganache on port 8545
  ├─ compiles Voting.sol (Hardhat)
  ├─ deploys contract → writes CONTRACT_ADDRESS to backend/.env
  ├─ runs init-system.js → seeds candidates via /api/admin/init
  └─ starts Express backend on port 3000
         │
         ▼
    Browser opens http://localhost:3000
         │
    ┌────┴─────────────────────────────────────────────────┐
    │                                                      │
    ▼                                                      ▼
Register page                                       Admin controls
Voter pastes Ganache wallet address            (contract owner only)
    │                                         Open Registration phase
    ▼                                         Open Voting phase
POST /api/voter/register                      Close Voting
    │
    ▼
Vote page
Voter selects candidate → POST /api/voter/vote
    │
    ▼
Smart contract records vote as on-chain transaction
    │
    ▼
Verify page
Paste wallet address → GET /api/voter/status/:address
Returns: registered, voted, candidate choice, tx hash
    │
    ▼
Results page
GET /api/results → live vote counts per candidate
```

### Blockchain Interaction

The Express backend connects to Ganache over `http://127.0.0.1:8545` using **Ethers.js**. Every significant action (register, vote) calls a smart contract function, which:
- Returns a transaction hash
- Emits a contract event
- Updates immutable on-chain state

The backend stores the wallet address → session mapping in memory (scoped to the current demo run). The source of truth is always the blockchain.

### No Passwords

Authentication is entirely wallet-based. After registering with a Ganache address, the frontend remembers the address in `sessionStorage`. There is no login form, no password hash, no JWT — the wallet address is the identity.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    BROWSER  :3000                               │
│                                                                 │
│  pages/home.html    — landing, phase status, admin buttons      │
│  pages/register.html — wallet address input → register          │
│  pages/vote.html    — candidate list → cast vote                │
│  pages/verify.html  — verify any address on-chain               │
│  pages/results.html — live vote counts, bar chart               │
└────────────────────────────┬────────────────────────────────────┘
                             │  HTTP REST (fetch)
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│              EXPRESS BACKEND  :3000                             │
│                                                                 │
│  routes/voter.js   — /api/voter/*  (register, vote, status)    │
│  routes/admin.js   — /api/admin/*  (init, phase control)       │
│  routes/results.js — /api/results  (live tallies)              │
│  routes/health.js  — /api/health   (Ganache + contract check)  │
│                                                                 │
│  services/votingService.js                                      │
│    └─ Ethers.js contract interface                              │
│    └─ reads CONTRACT_ADDRESS, PRIVATE_KEY from backend/.env     │
│                                                                 │
│  index.js          — Express app, static frontend serve         │
└────────────────────────────┬────────────────────────────────────┘
                             │  JSON-RPC (Ethers.js)
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│              GANACHE  :8545  (10 test wallets)                  │
│                                                                 │
│  Voting.sol contract                                            │
│    struct Candidate { name, voteCount }                         │
│    struct Voter { registered, voted, candidateIndex }           │
│    phases: Registration → Voting → Closed                       │
│    functions: registerVoter, castVote, getResults, getPhase     │
│    events: VoterRegistered, VoteCast, PhaseChanged              │
└─────────────────────────────────────────────────────────────────┘
```

### Startup sequence (npm start)

```
run-all.js
  │
  ├─[1] spawn: ganache --port 8545 --deterministic
  │       wait for RPC to be available
  │
  ├─[2] spawn: npx hardhat compile   (in smart-contracts/)
  │
  ├─[3] spawn: node scripts/deploy.js
  │       deploys Voting.sol
  │       writes CONTRACT_ADDRESS=0x... to backend/.env
  │
  ├─[4] spawn: node backend/init-system.js
  │       POST /api/admin/init → seeds 4 default candidates
  │
  └─[5] spawn: node backend/index.js
          serves API + static frontend on :3000
```

---

## Smart Contract

**File:** `smart-contracts/contracts/Voting.sol`
**Compiler:** Solidity 0.8.x
**Network:** Ganache (local, deterministic, port 8545)

### Phases

The contract enforces a linear phase progression that the owner controls:

| Phase | Value | What is allowed |
|---|---|---|
| `Registration` | 0 | Voters can register; no voting yet |
| `Voting` | 1 | Registered voters can cast one vote each |
| `Closed` | 2 | No registration or voting; results are final |

Phase transitions are one-way. The owner calls `openVoting()` to move from Registration → Voting, and `closeVoting()` to move to Closed.

### Key Functions

| Function | Caller | Description |
|---|---|---|
| `addCandidate(name)` | Owner only | Adds a candidate; only before voting opens |
| `openRegistration()` | Owner only | Starts the Registration phase |
| `openVoting()` | Owner only | Starts the Voting phase |
| `closeVoting()` | Owner only | Finalises the election |
| `registerVoter(address)` | Owner only | Registers a voter during Registration phase |
| `castVote(candidateIndex)` | Registered voters | Records one vote; reverts if already voted |
| `getResults()` | Anyone | Returns arrays of candidate names and vote counts |
| `getPhase()` | Anyone | Returns current phase as uint |
| `hasVoted(address)` | Anyone | Returns true if address has voted |
| `isRegistered(address)` | Anyone | Returns true if address is registered |

### Events

| Event | Emitted when |
|---|---|
| `VoterRegistered(address voter)` | A voter is successfully registered |
| `VoteCast(address voter, uint candidateIndex)` | A vote is recorded on-chain |
| `PhaseChanged(Phase newPhase)` | The owner changes the election phase |
| `CandidateAdded(string name, uint index)` | A new candidate is added |

### Immutability guarantee

Once `castVote` is called, the vote is encoded in the transaction and in the block. Neither the contract owner nor the backend server can modify it. Anyone with access to the Ganache RPC can independently verify results by calling `getResults()` directly.

---

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Smart contract | Solidity 0.8, Hardhat | Immutable voting logic on Ethereum |
| Blockchain | Ganache (deterministic) | Local Ethereum chain with 10 test wallets |
| Backend | Node.js 18+, Express 4 | REST API, bridges frontend ↔ blockchain |
| Blockchain client | Ethers.js 6 | JSON-RPC interaction with Ganache |
| Frontend | HTML5, CSS3 (glassmorphism), ES modules | Browser UI, no framework |
| Testing | Node.js test runner (`node:test`) | System-level integration tests |
| Build tooling | Hardhat, npm workspaces | Contract compile, deploy, scripts |

---

## Project Structure

```
blockchain-voting/
│
├── backend/
│   ├── index.js              Express app — mounts routes, serves frontend
│   ├── init-system.js        Seeds demo candidates on startup
│   ├── config/
│   │   └── review.js         Feature flags (REVIEW level 1/2/3)
│   ├── routes/
│   │   ├── voter.js          POST /register, POST /vote, GET /status/:addr
│   │   ├── admin.js          POST /init, POST /open-voting, POST /close
│   │   ├── results.js        GET /results
│   │   └── health.js         GET /health
│   └── services/
│       └── votingService.js  Ethers.js contract wrapper
│
├── frontend/
│   ├── index.html            Landing → redirects to pages/home.html
│   ├── assets/               Images, icons
│   ├── css/
│   │   └── style.css         Glassmorphism theme, animations
│   └── pages/
│       ├── home.html         Phase display, admin phase controls
│       ├── register.html     Voter wallet address registration
│       ├── vote.html         Candidate list, vote submission
│       ├── verify.html       Verify any wallet address on-chain
│       └── results.html      Live candidate vote count display
│
├── smart-contracts/
│   ├── contracts/
│   │   └── Voting.sol        The Voting contract (Solidity 0.8)
│   ├── scripts/
│   │   ├── deploy.js         Deploys contract, writes address to backend/.env
│   │   └── deploy-and-configure.js   Deploy + seed candidates in one step
│   ├── test/
│   │   └── Voting.test.js    Hardhat contract unit tests
│   ├── hardhat.config.js     Hardhat config (network: localhost:8545)
│   └── artifacts/            Compiled ABI + bytecode (gitignored)
│
├── scripts/
│   └── run-all.js            Orchestrates Ganache → compile → deploy → init → backend
│
├── tests/
│   └── system-test.js        Integration tests (API + blockchain)
│
├── docs/
│   ├── README.md             Docs index
│   ├── SETUP.md              Detailed setup guide
│   ├── ARCHITECTURE.md       Component and data-flow diagrams
│   ├── API.md                Full REST API reference
│   └── smart-contract.md     Contract behaviour and phase reference
│
├── package.json              Root — npm scripts, workspace config
├── .env.example              Environment variable template
└── run.sh                    Shell wrapper for npm start
```

---

## Requirements

| Requirement | Version | Notes |
|---|---|---|
| Node.js | 18 or newer | Required for ES module support and built-in test runner |
| npm | 9 or newer | Comes with Node.js 18+ |
| Ganache CLI | via npx or global | Installed automatically through `smart-contracts/package.json` |

No external blockchain node, no MetaMask, no mainnet ETH needed. Everything runs locally.

---

## Installation

### Step 1 — Clone the repository

```bash
git clone https://github.com/your-username/blockchain-voting.git
cd blockchain-voting
```

### Step 2 — Install all dependencies

This installs dependencies for the root, `backend/`, and `smart-contracts/` in one command:

```bash
npm run install:all
```

What this runs under the hood:

```bash
npm install                           # root devDependencies (concurrently, etc.)
cd backend && npm install             # Express, Ethers.js, etc.
cd smart-contracts && npm install     # Hardhat, solc, etc.
```

### Step 3 — Configure environment (optional)

The deployment script writes `CONTRACT_ADDRESS` to `backend/.env` automatically. You only need to edit `.env` manually if you want to change the Ganache port or use a different private key:

```bash
cp .env.example backend/.env
```

Default `backend/.env` after deployment:

```env
GANACHE_URL=http://127.0.0.1:8545
CONTRACT_ADDRESS=0x...           # written automatically by deploy.js
OWNER_PRIVATE_KEY=0x...          # Ganache deterministic wallet #0
PORT=3000
```

---

## Running the Application

### Single command (recommended)

```bash
npm start
```

This single command:
1. Starts Ganache on port 8545 with 10 deterministic wallets
2. Compiles `Voting.sol` with Hardhat
3. Deploys the contract and writes the address to `backend/.env`
4. Seeds 4 demo candidates via the backend API
5. Starts the Express server on port 3000

Open **http://localhost:3000** in your browser.

### Shell wrapper

```bash
chmod +x run.sh
./run.sh
```

Equivalent to `npm start` — useful if you prefer a shell script entry point.

### Manual step-by-step (for development)

If you want to run each step separately for debugging:

```bash
# Terminal 1 — start Ganache
npx ganache --port 8545 --deterministic --quiet

# Terminal 2 — compile and deploy
cd smart-contracts
npx hardhat compile
node scripts/deploy.js        # writes CONTRACT_ADDRESS to backend/.env

# Terminal 3 — init demo data, then start backend
cd backend
node ../backend/init-system.js   # seed candidates
node index.js                    # start Express on :3000
```

### Backend only (contract already deployed)

```bash
npm run backend
```

Use this when Ganache is already running and `backend/.env` already contains a valid `CONTRACT_ADDRESS`.

---

## Demo Walkthrough

### Step 1 — Get wallet addresses

In a second terminal, after `npm start` has fully started:

```bash
npm run demo
```

This prints the 10 deterministic Ganache wallets. Copy **Voter 1**'s address (the second address in the list — address index 1). The first address (index 0) is the contract owner.

Example output:
```
Demo Wallets:
  Owner  (0): 0x90F8bf6A479f320ead074411a4B0e7944Ea8c9C1
  Voter1 (1): 0xFFcf8FDEE72ac11b5c542428B35EEF5769C409f0
  Voter2 (2): 0x22d491Bde2303f2f43325b2108D26f1eAbA1e32b
  ...
```

### Step 2 — Register

1. Go to **http://localhost:3000/pages/register.html**
2. Paste the Voter 1 address into the input field
3. Click **REGISTER CITIZEN**
4. You should see a success message with a transaction hash

### Step 3 — Open voting (admin action)

1. Go to **http://localhost:3000/pages/home.html**
2. You will see the current phase (Registration)
3. Click **Start Voting** (this calls the contract as the owner)
4. The phase changes to Voting

### Step 4 — Vote

1. Go to **http://localhost:3000/pages/vote.html**
2. The registered address is remembered in sessionStorage
3. Select a candidate and click **CAST VOTE**
4. A transaction hash confirms the vote is on-chain

### Step 5 — Verify

1. Go to **http://localhost:3000/pages/verify.html**
2. Paste the same wallet address
3. The page shows: registered ✓, voted ✓, candidate chosen, transaction hash

### Step 6 — Results

1. Go to **http://localhost:3000/pages/results.html**
2. Live vote counts are displayed per candidate
3. Add more votes from Voter 2, 3, etc. and refresh to see counts update

---

## npm Scripts Reference

Run all scripts from the project root (`blockchain-voting/`):

| Script | Command | Description |
|---|---|---|
| `npm start` | `node scripts/run-all.js` | Full stack: Ganache → compile → deploy → init → backend |
| `npm run install:all` | installs root + backend + smart-contracts | One-time dependency install |
| `npm run backend` | `node backend/index.js` | Start backend only (contract already deployed) |
| `npm run contract:compile` | `cd smart-contracts && npx hardhat compile` | Compile Voting.sol |
| `npm run contract:deploy` | `node smart-contracts/scripts/deploy.js` | Deploy to Ganache |
| `npm run init-demo` | `node backend/init-system.js` | Seed 4 demo candidates |
| `npm test` | `node tests/system-test.js` | Run 32-test integration suite |
| `npm run check` | health check script | Verify Ganache, API, and frontend routes |
| `npm run demo` | `node scripts/print-wallets.js` | Print Ganache demo wallet addresses |

---

## API Reference

All routes are prefixed with `/api`. The backend serves the static frontend at `/` (root).

### Voter Routes — `/api/voter`

#### `POST /api/voter/register`

Register a voter on-chain.

**Request body:**
```json
{ "address": "0xFFcf8FDEE72ac11b5c542428B35EEF5769C409f0" }
```

**Response (success):**
```json
{
  "success": true,
  "txHash": "0xabc123...",
  "message": "Voter registered on blockchain"
}
```

**Response (error):**
```json
{ "success": false, "error": "Already registered" }
```

---

#### `POST /api/voter/vote`

Cast a vote for a candidate.

**Request body:**
```json
{ "address": "0xFFcf8...", "candidateIndex": 0 }
```

**Response (success):**
```json
{
  "success": true,
  "txHash": "0xdef456...",
  "message": "Vote recorded on blockchain"
}
```

**Response (error):**
```json
{ "success": false, "error": "Address has already voted" }
```

---

#### `GET /api/voter/status/:address`

Check voter and vote status for any wallet address.

**Response:**
```json
{
  "address": "0xFFcf8...",
  "isRegistered": true,
  "hasVoted": true,
  "candidateIndex": 2,
  "candidateName": "Candidate C",
  "txHash": "0xdef456..."
}
```

---

### Admin Routes — `/api/admin`

#### `POST /api/admin/init`

Seed the default candidates (called automatically by `init-system.js`).

**Response:**
```json
{ "success": true, "candidates": ["Alice", "Bob", "Charlie", "Diana"] }
```

#### `POST /api/admin/open-registration`

Move contract to Registration phase.

#### `POST /api/admin/open-voting`

Move contract to Voting phase.

#### `POST /api/admin/close`

Close the election.

All admin routes respond with `{ "success": true, "txHash": "0x..." }` or `{ "success": false, "error": "..." }`.

---

### Results — `/api/results`

#### `GET /api/results`

Returns live vote counts for all candidates.

**Response:**
```json
{
  "phase": "Voting",
  "candidates": [
    { "name": "Alice",   "voteCount": 3 },
    { "name": "Bob",     "voteCount": 1 },
    { "name": "Charlie", "voteCount": 2 },
    { "name": "Diana",   "voteCount": 0 }
  ],
  "totalVotes": 6
}
```

---

### Health — `/api/health`

#### `GET /api/health`

Check Ganache connectivity and contract deployment status.

**Response:**
```json
{
  "status": "ok",
  "ganache": "connected",
  "contract": "0x5b1869D9A4C187F2EAa108f3062412ecf0526b34",
  "phase": "Registration"
}
```

---

## Frontend Pages

| Page | URL | Description |
|---|---|---|
| Home | `/pages/home.html` | Phase display, admin phase control buttons, system status |
| Register | `/pages/register.html` | Paste wallet address to register as a voter |
| Vote | `/pages/vote.html` | Candidate cards with vote buttons; one vote per wallet |
| Verify | `/pages/verify.html` | Verify any address: registration, vote, candidate, tx hash |
| Results | `/pages/results.html` | Live vote counts per candidate, auto-refreshing |

All pages share the same glassmorphism CSS theme (`css/style.css`) and communicate with the backend via `fetch()`. No framework — pure ES module JavaScript.

---

## Feature Flags

`backend/config/review.js` contains a `REVIEW` level flag and a `FEATURES` object that controls which contract features are active. This was used during phased academic reviews:

```js
module.exports = {
  REVIEW: 1,   // change to 2 or 3 for later review phases

  FEATURES: {
    REGISTRATION: false,    // voter self-registration (vs owner-only)
    VERIFICATION: false,    // on-chain verification page enabled
    COMMIT_REVEAL: false,   // commit-reveal voting scheme
    LIVE_RESULTS: true      // real-time results endpoint enabled
  }
};
```

For a standard demo, leave `REVIEW: 1` and `LIVE_RESULTS: true`. The other flags enable research features that require additional contract functions.

---

## Testing

The test suite runs 32 integration tests covering the full API and blockchain interaction:

```bash
# Ganache and backend must be running
npm start     # in Terminal 1

# In Terminal 2
npm test
```

**What is tested:**

| Category | Tests |
|---|---|
| Health check | Ganache connectivity, contract address present |
| Phase management | Open registration, open voting, close election |
| Voter registration | Success, duplicate, invalid address |
| Voting | Success, double vote, unregistered voter, wrong phase |
| Results | Correct counts, all candidates present |
| Verification | Registered + voted, registered + not voted, unregistered |
| Edge cases | Empty address, missing fields, out-of-range candidate index |

### Hardhat contract unit tests

```bash
cd smart-contracts
npx hardhat test
```

Tests the Solidity contract directly without the Express layer — covers all contract functions, phase transitions, and revert conditions.

---

## Environment Variables

All backend configuration is in `backend/.env` (created automatically by `deploy.js`):

| Variable | Default | Description |
|---|---|---|
| `GANACHE_URL` | `http://127.0.0.1:8545` | Ganache JSON-RPC endpoint |
| `CONTRACT_ADDRESS` | (set by deploy.js) | Deployed Voting contract address |
| `OWNER_PRIVATE_KEY` | (Ganache wallet #0) | Private key used for admin transactions |
| `PORT` | `3000` | Express server port |

Never commit `backend/.env` to version control — it contains a private key (test only, but still good practice).

---

## Documentation

Full documentation is in the `docs/` directory:

| File | Contents |
|---|---|
| `docs/README.md` | Documentation index |
| `docs/SETUP.md` | Detailed installation and manual run guide |
| `docs/ARCHITECTURE.md` | Component diagrams and data flow |
| `docs/API.md` | Full REST API reference with request/response schemas |
| `docs/smart-contract.md` | Contract functions, phases, events, and ABI reference |

Academic write-ups and presentation slides are in `backend/` and `smart-contracts/` (`.pptx` files from review sessions).

---

## Legal

This project uses a local Ganache blockchain with test accounts. No real ETH is used. The system is intended for **educational and research purposes** — demonstrating how blockchain properties (immutability, transparency, decentralisation) can be applied to electronic voting.
