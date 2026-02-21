require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const { ethers } = require("ethers");
const path = require("path");

const artifactPath = path.join(
  __dirname,
  "../../smart-contracts/artifacts/contracts/Voting.sol/Voting.json"
);

const VotingArtifact = require(artifactPath);

const RPC_URL = process.env.RPC_URL || "http://127.0.0.1:8545";
const CONTRACT_ADDRESS =
  process.env.CONTRACT_ADDRESS || "0x363253524B7ca325f0FD5bB38D9CaCABADe7022F";

const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
const signer = provider.getSigner(0); // Ganache account #0

const contract = new ethers.Contract(
  CONTRACT_ADDRESS,
  VotingArtifact.abi,
  signer
);

module.exports = { contract };
