const { ethers } = require("ethers");
const path = require("path");

const artifactPath = path.join(
  __dirname,
  "../../smart-contracts/artifacts/contracts/Voting.sol/Voting.json"
);

const VotingArtifact = require(artifactPath);

const provider = new ethers.providers.JsonRpcProvider(
  "http://127.0.0.1:8545"
);

const signer = provider.getSigner(0); // Ganache account #0

const CONTRACT_ADDRESS = "0x..."; // deployed via Ganache

const contract = new ethers.Contract(
  CONTRACT_ADDRESS,
  VotingArtifact.abi,
  signer
);

module.exports = { contract };
