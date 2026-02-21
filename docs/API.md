# API Reference

Base URL when using the bundled app: `http://localhost:3000/api` (or same origin as the frontend).

All request bodies are JSON. Responses are JSON.

---

## Registration

### `POST /api/register`

Register a voter by wallet address. Only allowed during the **Registration** phase.

**Request body:**

```json
{ "wallet": "0x..." }
```

**Success (200):**

```json
{ "success": true, "message": "Voter registered successfully" }
```

**Errors:** `400` missing wallet; `500` e.g. already registered or wrong phase.

---

## Verification

### `POST /api/verify`

Check if a wallet is registered and whether it has already voted.

**Request body:**

```json
{ "wallet": "0x..." }
```

**Success (200):**

```json
{
  "success": true,
  "registered": true,
  "verified": false
}
```

`verified: true` means the wallet has cast a vote.

**Errors:** `400` wallet required; `500` server/contract error.

---

## Voting

### `POST /api/vote`

Cast a vote for a candidate. Requires **Voting** phase and the wallet must be registered and not have voted yet.

**Request body:**

```json
{ "candidate": 1, "wallet": "0x..." }
```

`candidate` is the candidate ID (integer). `wallet` is the voter’s address.

**Success (200):**

```json
{ "success": true, "message": "Vote cast successfully" }
```

**Errors:** `400` missing candidate or wallet; `500` e.g. already voted, wrong phase, or revert.

---

## Results

### `GET /api/results`

Get current vote counts and phase.

**Success (200):**

```json
{
  "success": true,
  "data": {
    "totalVotes": "5",
    "phase": 1,
    "candidates": [
      { "id": 1, "name": "Candidate A", "voteCount": "3" },
      { "id": 2, "name": "Candidate B", "voteCount": "2" }
    ]
  }
}
```

`phase`: 0 = Registration, 1 = Voting, 2 = Ended.

---

## Candidates

### `GET /api/candidates`

List all candidates (id and name; no vote counts).

**Success (200):**

```json
{
  "success": true,
  "data": [
    { "id": 1, "name": "Candidate A", "voteCount": "0" },
    { "id": 2, "name": "Candidate B", "voteCount": "0" }
  ]
}
```

---

## Status

### `GET /api/status`

Short status: current phase and total votes.

**Success (200):**

```json
{
  "success": true,
  "phase": 1,
  "totalVotes": "5"
}
```

---

## Admin

All admin endpoints require the contract owner (in dev, the Ganache account used by the backend).

### `POST /api/admin/start`

Transition from **Registration** to **Voting** phase.

**Success (200):** `{ "success": true, "message": "Voting started" }`

### `POST /api/admin/end`

Transition from **Voting** to **Ended** phase.

**Success (200):** `{ "success": true, "message": "Voting ended" }`

### `POST /api/admin/register`

Register a voter (same as `POST /api/register` but under admin route).

**Request body:** `{ "address": "0x..." }`

### `POST /api/admin/candidate`

Add a candidate (admin only).

**Request body:** `{ "name": "Candidate Name" }`

**Success (200):** `{ "success": true, "message": "Candidate ... added successfully" }`
