const { ethers } = require("ethers");

const RPC_URL = process.env.RPC_URL || "http://127.0.0.1:8545";
const provider = new ethers.providers.JsonRpcProvider(RPC_URL);

module.exports = { provider };
