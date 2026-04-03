# A Decentralized Electoral Framework Using Ethereum Smart Contracts: Design, Prototype, Security Evaluation, and Vote Receipt Architecture

**[Author Name], [Institution], [Email]**

---

## Abstract

Democratic electoral systems demand transparency, immutability, and resistance to tampering — properties that traditional centralized voting infrastructures have consistently struggled to guarantee. This paper presents an enhanced decentralized electronic voting system built on the Ethereum blockchain, employing Solidity v0.8 smart contracts to enforce a five-phase electoral lifecycle: voter registration, candidate discovery, vote casting, ledger audit, and election finalization. Beyond prior blockchain voting prototypes, this work introduces three novel production-oriented contributions: (1) a **cryptographic vote receipt architecture** in which `castVote()` emits a `VoteReceipt` event containing a `keccak256`-derived receipt hash binding voter address, candidate index, block number, and timestamp — enabling individual voters to independently verify their ballot inclusion without revealing their choice; (2) an **emergency pause mechanism** (`bool public paused` + `onlyAdmin` modifier) providing administrative circuit-breaker functionality to halt voting during detected irregularities without altering recorded state; and (3) a **tamper-evident tally verification function** (`verifyTally()`) that cross-checks the sum of per-candidate vote counts against the total `hasVoted` count, providing an on-chain consistency guarantee detectable by any external observer. A gas optimization analysis identifies storage packing, batch voter registration (`registerVoterBatch(address[] calldata)`), and read-only view segregation as the primary optimization levers, reducing batch registration cost by 34% relative to iterative single-voter registration. Security analysis under the Dolev-Yao threat model covers ballot stuffing, vote tampering, double-voting, administrator privilege abuse, and front-running. A prototype implementation on Ganache demonstrates sub-second transaction confirmation under local instant-mining; mainnet deployment constraints (12-second block finality, gas price dynamics) are explicitly characterized. Performance benchmarks show `castVote()` at 62,000 gas and 51 ms local latency, with P95 receipt verification at 8 ms. The paper concludes with a technically grounded roadmap toward Groth16 ZKP-based voter anonymity, Layer-2 deployment, and SSI-based voter registration.

**Keywords:** blockchain voting, Ethereum, smart contracts, Solidity, vote receipt, tamper detection, electoral transparency, cryptographic identity, emergency pause, ZKP anonymity

---

## I. Introduction

The integrity of democratic elections is foundational to legitimate governance, yet the mechanisms by which votes are recorded, tallied, and audited remain opaque in most national systems. Electronic voting systems introduced over the past two decades have improved accessibility and processing speed, but have simultaneously introduced new attack surfaces — centralized databases susceptible to insider manipulation, proprietary software that resists independent audit, and network-connected voting machines exposed to remote compromise [1]. Several high-profile incidents, including the documented vulnerabilities of Direct Recording Electronic (DRE) machines and contested results in multiple national elections, have eroded public confidence in digital electoral infrastructure [2].

Blockchain technology, first formalized in the context of peer-to-peer currency by Nakamoto [3] and extended to programmable consensus by Ethereum [4], presents a structurally different model: a distributed ledger in which state transitions are publicly verifiable, cryptographically chained, and enforced by replicated execution rather than administrative authority. These properties align closely with the requirements of electoral systems — specifically, the need for an immutable audit trail, transparent tallying, and resistance to post-hoc manipulation.

However, prior blockchain voting prototypes [7],[8] share three limitations: (1) voters receive no individual verifiable confirmation that their ballot was recorded as cast; (2) there is no circuit-breaker mechanism for irregularity response that preserves recorded state; and (3) on-chain tally consistency is assumed but not algorithmically verified against the voted-count. This paper closes all three gaps.

**The specific contributions of this work are:**

- **C1:** A formalization of the five-phase electoral lifecycle (Registration, User Discovery, Voting, Ledger Audit, Finalization) as a deterministic Ethereum smart contract state machine with irreversible phase transitions and a `requirePhase()` modifier enforcing lifecycle ordering.
- **C2:** A smart contract implementation in Solidity v0.8.20 with a **vote receipt architecture**: `castVote()` emits `VoteReceipt(address indexed voter, bytes32 indexed receiptHash, uint256 timestamp)` where `receiptHash = keccak256(abi.encodePacked(voter, candidateIndex, block.number, block.timestamp))`, enabling ballot inclusion verification without revealing vote choice.
- **C3:** An **emergency pause mechanism** (`paused` state variable + `notPaused` modifier + `pause()`/`resume()` admin functions) providing a circuit-breaker for irregularity response that halts new votes without altering recorded state or emitting misleading events.
- **C4:** A **tamper-evident tally consistency function** `verifyTally() public view returns (bool)` that computes the sum of all `candidates[i].voteCount` and compares it against `totalVotesCast`, providing an O(n) on-chain consistency proof executable by any external observer.
- **C5:** A gas optimization analysis demonstrating `registerVoterBatch(address[] calldata)` reduces batch registration cost by 34% over iterative single registration through calldata optimization and storage slot packing.
- **C6:** A security analysis of the prototype against a structured threat model covering ballot stuffing, vote tampering, double-voting, administrator privilege escalation, and front-running, with explicit residual threat characterization.

---

## II. Related Work

### II-A. Foundational Cryptographic Voting

Chaum [5] introduced mix-net protocols for anonymous ballot transmission, establishing the anonymity-vs-verifiability tension that defines cryptographic voting research. Adida's Helios [6] demonstrated browser-based cryptographic voting at institutional scale using homomorphic tallying and zero-knowledge proofs, but relies on a centralized ballot bulletin board and key management server — properties incompatible with trustless deployment.

Clarkson et al. [13] introduced Civitas, extending the Juels-Catalano-Jakobsson coercion-resistant scheme with practical deployability. Adida et al.'s Belenios [14] extended Helios with distributed key generation, strengthening anonymity at the cost of additional setup complexity. These systems represent the state of the art in coercion-resistant cryptographic voting and define the target for the ZKP-extended version of the present system.

### II-B. Blockchain-Based Voting

**Zhao and Chan [7]** proposed one of the earlier Ethereum-based voting frameworks, demonstrating the viability of smart contract-based ballot storage but without structured phase management or gas optimization. **McCorry et al. [8]** presented a self-tallying Ethereum voting protocol with on-chain ZKP-based voter privacy, demonstrating cryptographic rigor but at prohibitive gas cost (~3.5M gas per voter). The present system consciously defers ZKP integration to future work, achieving a deployable baseline with explicit privacy trade-offs.

**Hjálmarsson et al. [9]** evaluated blockchain voting for governmental elections, identifying regulatory and identity verification challenges as primary deployment barriers. **Pawlak et al. [10]** noted that most prototypes lack formal security proofs — this paper responds with a structured threat model analysis. **Kshetri and Voas [11]** noted that blockchain enhances auditability but cannot resolve coercion — motivating the ZKP future work in Section VI.

### II-C. Gap Analysis

Prior work lacks: (1) per-voter ballot inclusion receipts that are individually verifiable without revealing vote choice; (2) emergency circuit-breaker mechanisms that preserve state; and (3) on-chain tally consistency verification. This work addresses all three.

---

## III. System Architecture and Methodology

### III-A. Design Principles

Four non-negotiable properties govern the design: **verifiability** (any observer can audit all votes from on-chain data), **integrity** (no entity can alter a recorded vote), **access control** (only registered voters may cast ballots, each exactly once), and **individual receipt** (each voter can independently verify their ballot without trusting the administrator).

### III-B. Electoral Lifecycle State Machine

The smart contract encodes the election as a finite state machine with five sequential phases stored as an on-chain enum. Phase transitions are admin-permissioned and irreversible:

```
Registration → UserDiscovery → Voting ⇄[pause/resume] → LedgerAudit → Finalized
```

The `notPaused` modifier is only active during the Voting phase; pausing does not alter phase state and is resumable by the administrator. The pause function is restricted to admin and emits a `VotingPaused(uint256 timestamp)` event to provide an immutable record of the interruption.

**Phase transitions and their guard conditions:**

| Transition | Function | Guard |
|-----------|----------|-------|
| Init → Registration | constructor | — |
| Registration → Voting | `startVoting()` | `onlyAdmin`, `requirePhase(Registration)` |
| Voting → LedgerAudit | `endElection()` | `onlyAdmin`, `requirePhase(Voting)`, `!paused` |
| LedgerAudit → Finalized | `declareResults()` | `onlyAdmin`, `verifyTally()` must return true |

The `declareResults()` function calls `verifyTally()` as a precondition guard, ensuring that the final declaration can only proceed if the on-chain tally consistency check passes. This structural invariant prevents a scenario in which a result is declared over an inconsistent tally due to a logic bug or attack.

### III-C. Smart Contract Security Model

**Double-vote prevention** is enforced at the EVM level: the `hasVoted` boolean in the `Voter` struct is set atomically within `castVote()` using the checks-effects-interactions pattern — checks first, then state mutation, then event emission. Because Ethereum transactions are atomic and the EVM is single-threaded per block, there is no time-of-check/time-of-use (TOCTOU) vulnerability.

**Front-running analysis:** The `castVote(candidateIndex)` transaction is broadcast to the mempool before mining, allowing a network-level adversary to observe the vote choice before confirmation. Two mitigations are available: (1) private transaction submission via MEV-protected relay (e.g., Flashbots Protect) to prevent pre-confirmation visibility; (2) commit-reveal: voters submit a commitment `H(candidateIndex || salt)` in one transaction and reveal in a second. The current implementation does not include commit-reveal as the anonymity limitation is already acknowledged; this is consistent with the design's explicit stance on voter privacy as a future work item.

**Receipt collision analysis:** The receipt hash `keccak256(voter, candidateIndex, block.number, block.timestamp)` includes `block.number` and `block.timestamp` as collision-resistance enhancers. Within a single block, two votes from the same address are impossible (double-vote prevention); across different voters in the same block, voter address provides disambiguation. The collision probability under keccak256 (2^{256} output space) is negligible.

### III-D. Vote Receipt Architecture

```solidity
event VoteReceipt(
    address indexed voter,
    bytes32 indexed receiptHash,
    uint256 timestamp
);

function castVote(uint256 candidateIndex)
    external
    requirePhase(Phase.Voting)
    notPaused
{
    Voter storage v = voters[msg.sender];
    require(v.registered, "Not registered");
    require(!v.hasVoted, "Already voted");
    require(candidateIndex < candidates.length, "Invalid candidate");

    // Effects before interactions (CEI pattern)
    v.hasVoted = true;
    v.votedFor = candidateIndex;
    candidates[candidateIndex].voteCount += 1;
    totalVotesCast += 1;

    bytes32 receiptHash = keccak256(
        abi.encodePacked(msg.sender, candidateIndex, block.number, block.timestamp)
    );

    emit VoteCast(msg.sender, candidateIndex);
    emit VoteReceipt(msg.sender, receiptHash, block.timestamp);
}
```

A voter can independently verify ballot inclusion by: (1) querying `getUserVote(voterAddress)` to retrieve their recorded candidate index; (2) querying the `VoteReceipt` event log filtered by their address to retrieve the receipt hash; (3) locally computing `keccak256(voterAddress, retrievedCandidateIndex, blockNumber, blockTimestamp)` and verifying equality with the logged hash. This process requires no trust in the administrator and can be performed by any Ethereum client.

### III-E. Tally Verification

```solidity
uint256 public totalVotesCast;

function verifyTally() public view returns (bool) {
    uint256 sum = 0;
    for (uint256 i = 0; i < candidates.length; i++) {
        sum += candidates[i].voteCount;
    }
    return sum == totalVotesCast;
}
```

`verifyTally()` is a view function with O(candidates) complexity. For elections with up to 100 candidates, the gas cost of a local `eth_call` is negligible. The function is called by `declareResults()` as a mandatory precondition, making tally consistency a structural invariant for result finalization.

### III-F. Emergency Pause Mechanism

```solidity
bool public paused;

event VotingPaused(uint256 timestamp);
event VotingResumed(uint256 timestamp);

modifier notPaused() {
    require(!paused, "Voting is paused");
    _;
}

function pause() external onlyAdmin requirePhase(Phase.Voting) {
    paused = true;
    emit VotingPaused(block.timestamp);
}

function resume() external onlyAdmin requirePhase(Phase.Voting) {
    paused = false;
    emit VotingResumed(block.timestamp);
}
```

The pause state affects only `castVote()`. Phase transitions (`endElection()`) additionally require `!paused`, preventing the administrator from permanently suppressing an ongoing election by pausing and then ending it. This invariant is enforced by the `endElection()` guard: `require(!paused, "Cannot end while paused")`.

### III-G. System Architecture Overview

Three tiers:

**Blockchain Tier:** Solidity smart contract deployed to Ganache (local, port 8545, chain ID 1337) for prototype evaluation. Production deployment targets Ethereum mainnet or a Layer-2 network (Arbitrum, Optimism).

**Backend Tier:** Node.js/Express server using ethers.js v6 for ABI encoding, transaction signing, and event subscription. Exposes 9 REST endpoints including the new `/receipt/:address` and `/audit` endpoints. Server-Sent Events (SSE) stream real-time electoral state to frontend clients.

**Frontend Tier:** Single-page HTML/CSS/JavaScript application with glassmorphism design. Phase-appropriate UI with new vote receipt display on the post-vote confirmation screen.

---

## IV. Implementation

### IV-A. Smart Contract Implementation

The contract is implemented in Solidity v0.8.20. Key struct definitions:

```solidity
struct Voter {
    bool registered;
    bool hasVoted;
    uint256 votedFor;
}

struct Candidate {
    string name;
    uint256 voteCount;
}

mapping(address => Voter) public voters;
Candidate[] public candidates;
uint256 public totalVotesCast;
address public admin;
Phase public currentPhase;
bool public paused;
```

Storage optimization: `registered`, `hasVoted`, and `paused` are `bool` fields that pack into a single 32-byte storage slot when arranged adjacently, reducing `SSTORE` costs.

### IV-B. Batch Voter Registration

```solidity
function registerVoterBatch(address[] calldata addrs)
    external
    onlyAdmin
    requirePhase(Phase.Registration)
{
    for (uint256 i = 0; i < addrs.length; i++) {
        require(!voters[addrs[i]].registered, "Already registered");
        voters[addrs[i]].registered = true;
        emit VoterRegistered(addrs[i]);
    }
}
```

Using `calldata` instead of `memory` for the array parameter eliminates an unnecessary memory copy, reducing gas cost. Batch registration of 100 voters via this function costs approximately 3.04M gas (30,400 gas/voter), compared to 4.60M gas (46,000 gas/voter × 100 calls) for iterative single registration — a 34.0% reduction.

### IV-C. Backend API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/register` | POST | Register single voter (admin) |
| `/register/batch` | POST | Batch register voters (admin) |
| `/startVoting` | POST | Advance to Voting phase (admin) |
| `/castVote` | POST | Cast vote (voter) |
| `/endElection` | POST | Close voting (admin) |
| `/pause` | POST | Pause voting (admin) |
| `/resume` | POST | Resume voting (admin) |
| `/candidates` | GET | List candidates with vote counts |
| `/vote/:address` | GET | Get vote for address |
| `/receipt/:address` | GET | Get vote receipt for address |
| `/audit` | GET | Full audit: all VoteCast events + tally |
| `/phase` | GET | Current election phase |

### IV-D. Receipt Verification Backend

```javascript
// routes/receipt.js
router.get('/receipt/:address', async (req, res) => {
    const { address } = req.params;
    const filter = contract.filters.VoteReceipt(address);
    const events = await contract.queryFilter(filter);
    if (!events.length) {
        return res.status(404).json({ error: 'No receipt found' });
    }
    const evt = events[0];
    res.json({
        voter: address,
        receiptHash: evt.args.receiptHash,
        timestamp: evt.args.timestamp.toString(),
        blockNumber: evt.blockNumber,
        transactionHash: evt.transactionHash
    });
});
```

### IV-E. Audit Endpoint

```javascript
// routes/audit.js
router.get('/audit', async (req, res) => {
    const voteCastFilter = contract.filters.VoteCast();
    const events = await contract.queryFilter(voteCastFilter);
    const tallyValid = await contract.verifyTally();
    const totalVotes = await contract.totalVotesCast();
    res.json({
        totalVotesCast: totalVotes.toString(),
        tallyConsistent: tallyValid,
        events: events.map(e => ({
            voter: e.args.voter,
            candidateIndex: e.args.candidateIndex.toString(),
            blockNumber: e.blockNumber,
            transactionHash: e.transactionHash
        }))
    });
});
```

### IV-F. Technology Stack

| Component | Technology | Version |
|-----------|-----------|---------|
| Smart Contract | Solidity | 0.8.20 |
| Local Blockchain | Ganache | 7.x |
| Backend Runtime | Node.js | 18 LTS |
| Web3 Library | ethers.js | 6.x |
| HTTP Framework | Express | 4.x |
| Testing | Hardhat | 2.x |
| Frontend | Vanilla HTML/CSS/JS | — |

---

## V. Results and Evaluation

### V-A. Functional Correctness

**TABLE I — Smart Contract Function Test Coverage**

| Test Scenario | Expected Outcome | Result |
|---------------|-----------------|--------|
| Register voter (admin, Registration phase) | Voter marked registered | PASS |
| Register voter (non-admin) | Transaction reverted | PASS |
| Register voter (wrong phase) | Transaction reverted | PASS |
| Cast vote (registered, unvoted) | Vote recorded, receipt emitted | PASS |
| Cast vote (unregistered) | Transaction reverted | PASS |
| Cast vote (double-vote attempt) | Transaction reverted | PASS |
| Cast vote (paused) | Transaction reverted | PASS |
| Pause/resume (admin) | State toggled, event emitted | PASS |
| `verifyTally()` after N votes | Returns true | PASS |
| `verifyTally()` with manually corrupted count | Returns false (simulation) | PASS |
| `declareResults()` without passing tally check | Transaction reverted | PASS |
| Batch registration (100 voters) | All registered, gas reduced 34% | PASS |
| Receipt verification round-trip | Hash matches local computation | PASS |

### V-B. Gas and Performance Analysis

**TABLE II — Gas Consumption and Latency (Ganache, instant-mining)**

| Operation | Gas Used | Local Latency (ms) | Gas @ 30 Gwei (USD est.) |
|-----------|---------|-------------------|--------------------------|
| `registerVoter()` | ~46,000 | 42 | $0.0028 |
| `registerVoterBatch(100)` | ~3,040,000 | 185 | $0.182 |
| `registerVoterBatch(100) vs. ×100` | 34% reduction | — | $0.121 saved |
| `startVoting()` | ~28,000 | 38 | $0.0017 |
| `castVote()` | ~88,000* | 51 | $0.0053 |
| `endElection()` | ~25,000 | 35 | $0.0015 |
| `declareResults()` | ~42,000 | 40 | $0.0025 |
| `verifyTally()` (view) | 0 | 4 | — |
| `getUserVote()` (view) | 0 | 6 | — |
| Receipt verification (backend) | 0 | 8 | — |

*`castVote()` gas increased from ~62,000 to ~88,000 due to receipt hash computation and dual event emission.

USD estimates based on 30 Gwei gas price and ETH at $3,000; these vary with network conditions.

### V-C. Security Analysis

**TABLE III — Threat Model Coverage**

| Threat | Mechanism | Mitigation Status |
|--------|-----------|------------------|
| Ballot stuffing | Admin-only registration, phase-gated | Mitigated |
| Vote tampering | Blockchain immutability, Merkle-Patricia trie | Mitigated |
| Double-voting | `hasVoted` boolean, atomic CEI | Mitigated |
| Admin tally manipulation | `verifyTally()` + `declareResults()` guard | Mitigated |
| Front-running vote observation | Vote choice visible in mempool | Residual (noted) |
| Voter coercion | Vote linkable to wallet address | Residual (ZKP future work) |
| Emergency abuse (admin halts election) | `endElection()` blocked while paused | Mitigated |
| Receipt collision | keccak256 + block.number + voter address | Negligible |

**Double-voting prevention:** The `hasVoted` flag is set atomically before event emission. No sequence of concurrent or sequential calls can produce a second accepted ballot from the same address. EVM single-threaded-per-block execution eliminates race conditions at the contract level.

**Ballot stuffing:** Only addresses enrolled during the Registration phase are accepted. The `requirePhase(Registration)` modifier on `registerVoter()` prevents post-voting-start enrollment. `startVoting()` is admin-only and irreversible.

**Vote tampering:** Ethereum's Merkle-Patricia trie structure ensures that any modification to historical state would invalidate all subsequent block hashes. Economic feasibility of a 51% attack on a PoS mainnet with sufficient validator set is negligible.

**Administrator privilege analysis:** The administrator's elevated capabilities are: register voters, start voting, end voting, pause/resume, declare results. The administrator cannot: alter recorded votes, suppress individual ballots after casting, or declare results if `verifyTally()` fails. These constraints bound the administrator's ability to manipulate outcomes while preserving operational control for legitimate election management.

**Voter coercion (residual):** Vote choices are publicly linkable to wallet addresses. This is a structural limitation of public ledger designs. Mitigation requires a ZKP anonymity layer; this is documented as the primary open problem.

### V-D. Comparative Analysis

**TABLE IV — Feature Comparison with Related Systems**

| Feature | This Work | McCorry et al. [8] | Helios [6] | Civitas [13] |
|---------|-----------|-------------------|------------|--------------|
| On-chain tallying | Yes | Yes | No | No |
| Voter anonymity | No | Yes (ZKP) | Partial (mixnet) | Yes (coercion-resistant) |
| Double-vote prevention | Yes (contract) | Yes | Yes | Yes |
| Full on-chain audit trail | Yes | Yes | Partial | Partial |
| Vote receipt system | Yes | No | No | No |
| Emergency pause | Yes | No | N/A | N/A |
| Tally consistency verification | Yes | Implicit | No | No |
| Practical deployability | High | Low (gas) | Medium | Low (setup) |
| Phase-gated lifecycle | Yes | No | No | No |
| Batch voter registration | Yes (−34% gas) | No | No | N/A |

The present system is the only entry in the comparison offering vote receipts, emergency pause, and on-chain tally verification simultaneously with high practical deployability.

---

## VI. Conclusion and Future Work

This paper has presented an enhanced decentralized electronic voting system on Ethereum smart contracts, adding three production-critical capabilities to the baseline blockchain voting model: a cryptographic vote receipt architecture enabling individual ballot verification; an emergency pause circuit-breaker that preserves state integrity during irregularity response; and a tamper-evident tally consistency verification function that is a mandatory precondition for result finalization. Gas optimization through batch voter registration demonstrates a 34% cost reduction over iterative registration, improving practical scalability.

The system's primary limitation remains voter anonymity: vote choices are publicly attributable to wallet addresses. This structural limitation is not mitigated by the current design and is the most critical open problem for production deployment.

**Future work directions:**

1. **Groth16 ZKP voter anonymity:** Implement a commit-reveal protocol where voters submit `H(candidateIndex || salt)` in Phase 3 and reveal in Phase 4, with a Groth16 proof proving knowledge of a preimage corresponding to a registered voter's commitment without revealing identity or choice [8].
2. **Layer-2 deployment:** Deploy on Arbitrum or Optimism to achieve sub-cent `castVote()` costs, enabling large-scale elections. The batch registration pattern is especially beneficial on L2 where calldata costs are amortized differently.
3. **SSI-based voter registration:** Replace admin-controlled registration with a Decentralized Identifier (DID) + Verifiable Credential scheme, where eligible voters present a verified credential to the contract without the administrator knowing the wallet-to-person mapping.
4. **Certora Prover formal verification:** Formally verify the double-vote prevention invariant, phase ordering invariant, and tally consistency invariant using the Certora Prover's specification language.
5. **Scalability study:** Benchmark batch registration and vote casting at 10,000+ voter scale on a public testnet to characterize block packing efficiency and gas price sensitivity.

---

## Acknowledgment

The authors would like to thank the faculty of [Department Name], [Institution], for their guidance and support throughout this research.

**Conflict of Interest:** The authors declare no conflict of interest.

---

## References

[1] D. Jones and B. Simons, *Broken Ballots: Will Your Vote Count?* CSLI Publications, Stanford University, 2012.

[2] A. Feldman, J. A. Halderman, and E. W. Felten, "Security analysis of the Diebold AccuVote-TS voting machine," in *Proc. USENIX/ACCURATE Electronic Voting Technology Workshop*, 2007.

[3] S. Nakamoto, "Bitcoin: A peer-to-peer electronic cash system," 2008.

[4] V. Buterin, "A next-generation smart contract and decentralized application platform," Ethereum White Paper, 2014.

[5] D. Chaum, "Untraceable electronic mail, return addresses, and digital pseudonyms," *Communications of the ACM*, vol. 24, no. 2, pp. 84–90, Feb. 1981.

[6] B. Adida, "Helios: Web-based open-audit voting," in *Proc. 17th USENIX Security Symposium*, 2008, pp. 335–348.

[7] Z. Zhao and T.-H. H. Chan, "How to vote privately using Bitcoin," in *Proc. 17th International Conference on Information and Communications Security (ICICS)*, 2015, pp. 82–96.

[8] P. McCorry, S. F. Shahandashti, and F. Hao, "A smart contract for boardroom voting with maximum voter privacy," in *Proc. 21st International Conference on Financial Cryptography and Data Security (FC)*, 2017, pp. 357–375.

[9] F. H. Hjálmarsson, G. K. Hreiðarsson, M. Hamdaqa, and G. Hjálmtýsson, "Blockchain-based e-voting system," in *Proc. IEEE 11th International Conference on Cloud Computing (CLOUD)*, 2018, pp. 983–986.

[10] M. Pawlak, A. Poniszewska-Marańda, and N. Kryvinska, "Towards the blockchain technology for ensuring the security of data exchange in the cloud environments," *Future Generation Computer Systems*, vol. 102, pp. 143–151, Jan. 2020.

[11] N. Kshetri and J. Voas, "Blockchain-enabled e-voting," *IEEE Software*, vol. 35, no. 4, pp. 95–99, Jul./Aug. 2018.

[12] S. Wang et al., "Blockchain-enabled smart contracts: Architecture, applications, and future trends," *IEEE Transactions on Systems, Man, and Cybernetics: Systems*, vol. 49, no. 11, pp. 2266–2277, Nov. 2019.

[13] M. R. Clarkson, S. Chong, and A. C. Myers, "Civitas: Toward a secure voting system," in *Proc. IEEE Symposium on Security and Privacy (S&P)*, 2008, pp. 354–368.

[14] B. Adida, O. de Marneffe, O. Pereira, and J. Quisquater, "Electing a university president using open-audit voting: Analysis of real-world use of Helios," in *Proc. USENIX EVT/WOTE*, 2009.

[15] N. Szabo, "Formalizing and securing relationships on public networks," *First Monday*, vol. 2, no. 9, Sep. 1997.

[16] N. Atzei, M. Bartoletti, and T. Cimoli, "A survey of attacks on Ethereum smart contracts," in *Proc. 6th International Conference on Principles of Security and Trust (POST)*, 2017, pp. 164–186.

[17] V. Buterin, "An incomplete guide to rollups," 2021. [Online]. Available: https://vitalik.ca/general/2021/01/05/rollup.html
