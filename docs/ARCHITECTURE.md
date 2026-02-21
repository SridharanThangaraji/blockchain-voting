# Architecture

## Overview

The system is a **decentralized voting application** with three main parts:

1. **Smart contract** (Solidity) — voting logic and state on-chain.
2. **Backend** (Node.js/Express) — bridge between frontend and blockchain; serves API and frontend.
3. **Frontend** (HTML/CSS/JS) — user interface for registration, verification, voting, and results.

Votes and voter registration are stored on the **blockchain** (Ganache in development) so they are transparent and immutable.

## Components

```
┌─────────────┐     HTTP      ┌─────────────────────────────────────┐     ethers.js      ┌──────────────┐
│   Browser   │ ◄────────────► │  Backend (Express)                   │ ◄────────────────► │   Ganache    │
│  (Frontend) │   :3000       │  - REST API (/api/*)                 │   JSON-RPC :8545  │  (Ethereum)  │
└─────────────┘                │  - Static files (frontend/)          │                    │  + Voting.sol │
                               └─────────────────────────────────────┘                    └──────────────┘
```

### Smart contract (`smart-contracts/contracts/Voting.sol`)

- **Phases**: Registration → Voting → Ended.
- **Admin** (deployer): add candidates, start/end voting.
- **Voters**: register (in Registration phase), cast one vote per wallet (in Voting phase).
- **State**: candidates (id, name, vote count), registered voters, voted set.
- **Events**: e.g. `VoteCast` for auditing.

### Backend (`backend/`)

- **Express** app: CORS, JSON body parser.
- **Routes** under `/api`: register, verify, vote, results, candidates, status, admin (start/end, add candidate).
- **Voting service** (`services/voting.service.js`): uses ethers.js to call the contract (same RPC as Ganache).
- **Config**: contract address and RPC URL from `backend/config/contract.js` and `blockchain.js` (env-aware).
- **Static**: serves `frontend/` at `/` so one process serves both API and UI.

### Frontend (`frontend/`)

- Static HTML pages (e.g. `index.html`, `pages/register.html`, `vote.html`, `verify.html`, `results.html`).
- **Config** (`scripts/config.js`): review phase (1–5) toggles which features are enabled (registration, verification, voting, results).
- **API** (`scripts/api.js`): `fetch` wrapper for `/api` using current origin (works when served from backend).

## Data flow (typical)

1. **Registration**: User submits wallet → Backend → Contract `registerVoter(wallet)`.
2. **Verification**: User submits wallet → Backend → Contract `voters(wallet)`, `hasUserVoted(wallet)` → Backend returns registered/voted.
3. **Voting**: User submits candidate id + wallet → Backend uses that wallet’s signer → Contract `castVote(candidateId)`.
4. **Results**: Backend reads contract (candidates, vote counts, totalVotes) → Returns JSON to frontend.

## Security notes

- **Admin key**: Ganache account #0 is the contract owner; keep it secure in production.
- **Wallet usage**: In dev, the backend uses Ganache accounts to sign; in production you’d use proper wallet connectivity (e.g. MetaMask) and backend would not hold private keys.
- **Immutability**: Once a vote is on-chain, it cannot be changed or deleted.
