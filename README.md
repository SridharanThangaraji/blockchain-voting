# Decentralized Blockchain Voting System

A secure, transparent blockchain-based voting application using Ethereum smart contracts, with a Node.js backend and a modern frontend.

## Features

- **Ethereum smart contract** — Registration, voting phases, and immutable vote recording
- **REST API** — Node.js/Express backend bridging frontend and blockchain
- **Single-command run** — Ganache, deploy, init, and app in one step
- **Glassmorphic UI** — Modern frontend for registration, verification, voting, and results
- **Documentation** — [docs/](docs/README.md) for setup, architecture, and API

## Tech stack

| Layer        | Stack                          |
|-------------|---------------------------------|
| Frontend    | HTML5, CSS (glassmorphism), ES modules |
| Backend     | Node.js, Express, Ethers.js     |
| Blockchain  | Solidity 0.8, Ganache (local)   |

## Quick start

```bash
# Install all dependencies (backend + smart-contracts)
npm run install:all

# Run everything: Ganache, compile & deploy contract, init demo, backend + frontend
npm start
```

Then open **http://localhost:3000** in your browser.

## Scripts (root)

| Command | Description |
|---------|-------------|
| `npm start` | Run Ganache, deploy contract, init demo, then backend (serves API + frontend) |
| `npm run install:all` | Install root, backend, and smart-contracts dependencies |
| `npm run backend` | Start backend only (expects Ganache + deployed contract; uses `backend/.env`) |
| `npm run contract:compile` | Compile Solidity contract (in `smart-contracts/`) |
| `npm run contract:deploy` | Deploy to Ganache and write `CONTRACT_ADDRESS` to `backend/.env` |
| `npm run init-demo` | Add demo candidates (run after deploy) |
| `npm test` | Run system tests (backend + Ganache must be running) |

## Project structure

```
blockchain-voting/
├── backend/           # Express API, voting service, config
├── frontend/          # Static HTML/CSS/JS
├── smart-contracts/   # Solidity contract + Hardhat
├── scripts/           # run-all.js, deploy-and-configure.js
├── tests/             # system-test.js
├── docs/              # Setup, architecture, API, references
├── package.json       # Root scripts
└── README.md
```

## Documentation

Full documentation is in **[docs/](docs/README.md)**:

- [Setup guide](docs/SETUP.md) — Installation and one-command vs manual run
- [Architecture](docs/ARCHITECTURE.md) — Components and data flow
- [API reference](docs/API.md) — REST endpoints
- [Smart contract](docs/smart-contract.md) — Contract behavior and phases
- [Conference paper](docs/conference-paper.md) — Research summary

## License

ISC
