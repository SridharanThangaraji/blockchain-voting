const votingService = require("./services/voting.service");

async function init() {
    console.log("Initializing System State...");

    try {
        // 1. Add Candidates
        console.log("Adding candidates...");
        await votingService.addCandidate("Dr. Alice Smith (Cyber Party)");
        await votingService.addCandidate("Capt. Robert Frost (Digital Union)");
        await votingService.addCandidate("Sarah Jenkins (Innovation Bloc)");

        // 2. Start Voting Phase (Commented out for demo so user can register first)
        // console.log("Starting voting phase...");
        // await votingService.startVoting();

        const candidates = await votingService.getCandidates();
        console.log("------------------------------------------");
        console.log("System Initialized Successfully!");
        console.log("Candidates:", candidates.map(c => `${c.name} (ID: ${c.id})`).join(", "));
        console.log("------------------------------------------");

    } catch (error) {
        console.error("Initialization Failed:", error.message);
    }
}

init();
