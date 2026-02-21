const { contract } = require("../config/contract");
const { provider } = require("../config/blockchain");

/**
 * Internal helper to get signer.
 */
function getSigner() {
  return provider.getSigner(0);
}

/**
 * Register a voter address.
 */
async function registerVoter(address) {
  const signer = getSigner();
  const tx = await contract.connect(signer).registerVoter(address);
  await tx.wait();
}

/**
 * Add a new candidate (Admin only).
 */
async function addCandidate(name) {
  const signer = getSigner();
  const tx = await contract.connect(signer).addCandidate(name);
  await tx.wait();
}

/**
 * Transitions from Registration to Voting phase.
 */
async function startVoting() {
  const signer = getSigner();
  const tx = await contract.connect(signer).startVoting();
  await tx.wait();
}

/**
 * Transitions from Voting to Ended phase.
 */
async function endElection() {
  const signer = getSigner();
  const tx = await contract.connect(signer).endElection();
  await tx.wait();
}

/**
 * Fetch all candidates and their vote counts.
 */
async function getCandidates() {
  const count = await contract.getCandidatesCount();
  const candidates = [];
  for (let i = 0; i < count; i++) {
    const [id, name, voteCount] = await contract.getCandidate(i);
    candidates.push({
      id: id.toNumber(),
      name,
      voteCount: voteCount.toString(),
    });
  }
  return candidates;
}

/**
 * Cast a vote for a candidate by ID.
 * Uses the provided wallet address to sign the transaction (Ganache only).
 */
async function castVote(candidateId, walletAddress) {
  const signer = walletAddress ? provider.getSigner(walletAddress) : getSigner();
  const tx = await contract.connect(signer).castVote(candidateId);
  await tx.wait();
}

/**
 * Get overall voting stats.
 */
async function getResults() {
  const totalVotes = await contract.totalVotes();
  const candidates = await getCandidates();
  return {
    totalVotes: totalVotes.toString(),
    candidates,
    phase: await contract.currentPhase(),
  };
}

/**
 * Check if a voter has cast their vote.
 */
async function hasVoted(address) {
  return await contract.hasUserVoted(address);
}

/**
 * Check if a voter is registered.
 */
async function isRegistered(address) {
  const voter = await contract.voters(address);
  return voter.registered;
}

module.exports = {
  registerVoter,
  addCandidate,
  startVoting,
  endElection,
  getCandidates,
  castVote,
  getResults,
  hasVoted,
  isRegistered,
};
