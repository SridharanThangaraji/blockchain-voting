// scripts/deploy.js
const { ethers } = require("ethers");
const fs = require("fs");

async function deploy() {
  const provider = new ethers.providers.JsonRpcProvider("http://127.0.0.1:8545");
  const signer = provider.getSigner(0);

  const artifact = JSON.parse(
    fs.readFileSync(
      "./artifacts/contracts/Voting.sol/Voting.json",
      "utf8"
    )
  );

  const factory = new ethers.ContractFactory(
    artifact.abi,
    artifact.bytecode,
    signer
  );

  const contract = await factory.deploy();
  await contract.deployed();

  console.log("Voting deployed at:", contract.address);
}

deploy();
