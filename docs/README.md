# Blockchain Voting — Documentation

Documentation for the decentralized blockchain-based voting system.

## Contents

| Document | Description |
|----------|-------------|
| [Setup Guide](SETUP.md) | Installation, one-command run, and manual steps |
| [Architecture](ARCHITECTURE.md) | System overview, components, and data flow |
| [API Reference](API.md) | REST API endpoints and request/response formats |
| [Smart Contract](smart-contract.md) | Voting contract behavior and phases |
| [Blockchain Basics](blockchain-basics.md) | Short intro to blockchain and Ethereum in this project |
| [Conference Paper](conference-paper.md) | Research abstract and architecture summary |
| [Review-1 Summary](review-1.md) | Review-1 implementation summary |

## Quick Start

From the project root:

```bash
npm run install:all   # install backend + smart-contracts deps
npm start             # run Ganache, deploy contract, init demo, backend + frontend
```

Then open **http://localhost:3000** in your browser.

See [SETUP.md](SETUP.md) for full details.
