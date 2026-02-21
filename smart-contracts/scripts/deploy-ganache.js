const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

async function main() {
    // Connect to Ganache
    const provider = new ethers.providers.JsonRpcProvider("http://127.0.0.1:8545");
    const signer = provider.getSigner(0);

    console.log("Deploying contract with account:", await signer.getAddress());

    // Load contract artifact
    const artifactPath = path.join(__dirname, "../artifacts/contracts/Voting.sol/Voting.json");
    if (!fs.existsSync(artifactPath)) {
        console.error("Artifact not found! Run 'npx hardhat compile' first.");
        return;
    }
    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

    // Create ContractFactory
    const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, signer);

    // Deploy
    const contract = await factory.deploy();
    await contract.deployed();

    console.log("------------------------------------------");
    console.log("Voting contract deployed to:", contract.address);
    console.log("------------------------------------------");
    console.log("Update backend/config/contract.js with this address.");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
