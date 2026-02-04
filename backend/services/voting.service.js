const { contract } = require("../config/contract");
const { provider } = require("../config/blockchain");

/*
  Internal helper:
  Uses a default signer for all transactions
*/
function getSigner() {
  return provider.getSigner(0);
}

/*
  Register a voter
*/
async function registerVoter(address) {
  const signer = getSigner();
  const tx = await contract.connect(signer).registerVoter(address);
  await tx.wait();
}

/*
  Start voting process
*/
async function startVoting() {
  const signer = getSigner();
  const tx = await contract.connect(signer).startVoting();
  await tx.wait();
}

/*
  End voting process
*/
async function endElection() {
  const signer = getSigner();
  const tx = await contract.connect(signer).endElection();
  await tx.wait();
}

/*
  Cast a vote
*/
async function castVote(candidate) {
  const signer = getSigner();
  const tx = await contract.connect(signer).castVote(candidate);
  await tx.wait();
}

/*
  Get voting results
*/
async function getResults() {
  return {
    candidate1: (await contract.getCandidateVotes(1)).toString(),
    candidate2: (await contract.getCandidateVotes(2)).toString(),
    candidate3: (await contract.getCandidateVotes(3)).toString(),
    total: (await contract.totalVotes()).toString()
  };
}

/*
  Check if a user has already voted
*/
async function hasVoted(address) {
  return contract.hasUserVoted(address);
}

module.exports = {
  registerVoter,
  startVoting,
  endElection,
  castVote,
  getResults,
  hasVoted
};
