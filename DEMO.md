# Blockchain Voting – Demo Day Guide

Use this guide to run a full project demo. All modules (Registration, Voting, Verification, Results) are **Available** from the dashboard.

---

## 1. Start the application

**Option A – Docker**
```bash
./run.sh
# or: sudo ./run.sh
```
Wait until you see: `Backend running at http://localhost:3000`

**Option B – Local**
```bash
npm run install:all   # once
npm start
```

Then open **http://localhost:3000** in your browser.

---

## 2. Demo users (wallet addresses)

- **No usernames or passwords.** The system uses **Ethereum wallet addresses** from the local blockchain (Ganache).
- On the **dashboard (home page)** you will see a **“Demo users”** section with all wallet addresses. **Click an address to copy it** for Registration / Verify.
- You can also get them in a terminal (with the app running):  
  `./run.sh demo` or `npm run demo`

| Role    | Use for |
|--------|---------|
| **Admin** | Used by the backend only (do not use for registration). |
| **Voter 1** | Main demo user: register, then vote, then verify. |
| **Voter 2** | Second voter to show multiple votes in Results. |
| **Voter 3** | Extra demo user if needed. |

Addresses are shown on the dashboard and change each time you start the app (new Ganache instance).

---

## 3. Full demo flow (step by step)

1. **Dashboard**  
   - Show the four modules: Registration, Cast Your Vote, Verify Vote, Live Results (all **Available**).  
   - Point out the **Demo users** section and copy **Voter 1** (click to copy).

2. **Registration**  
   - Go to **Voter Registration**.  
   - Paste **Voter 1** wallet address.  
   - Click **REGISTER CITIZEN**.  
   - Confirm success message.

3. **Start voting phase**  
   - Go back to **Home**.  
   - Click **START VOTING PHASE** (admin action).  
   - Confirm “Voting phase started”.

4. **Vote**  
   - Go to **Cast Your Vote**.  
   - The app remembers the wallet from registration.  
   - Select one candidate.  
   - Confirm “Vote recorded successfully”.

5. **Verify**  
   - Go to **Verify Vote**.  
   - Paste the same **Voter 1** address.  
   - Click **VERIFY VOTE**.  
   - Show “vote secured on ledger” (or equivalent success).

6. **Results**  
   - Go to **Live Results**.  
   - Show total votes and per-candidate counts.  
   - (Optional) Register **Voter 2**, vote with Voter 2, then refresh Results to show multiple votes.

---

## 4. Quick reference

| Step | Page        | Action |
|------|-------------|--------|
| 1    | Dashboard   | Copy Voter 1 address from Demo users. |
| 2    | Registration| Paste Voter 1 → REGISTER CITIZEN. |
| 3    | Home        | Click START VOTING PHASE. |
| 4    | Vote        | Select a candidate (wallet remembered). |
| 5    | Verify      | Paste Voter 1 → VERIFY VOTE. |
| 6    | Results     | Show live counts. |

---

## 5. Troubleshooting

- **“Registration is closed”**  
  Voting was already started. Restart the app (stop and run `./run.sh` or `npm start` again) to get a fresh Registration phase.

- **“Please Register or Verify first” on Vote**  
  Complete Registration with a demo wallet and use the same browser (wallet is stored in the app).

- **Demo users show “Start the app to see demo wallets”**  
  Backend is not running or not reachable. Start the app and refresh the dashboard.

---

© 2026 · Undergraduate Final Year Project · Blockchain Voting
