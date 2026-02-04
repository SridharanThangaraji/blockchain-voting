// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract Voting {
    /* ========== ADMIN ========== */
    address public admin;

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin");
        _;
    }

    constructor() {
        admin = msg.sender;
    }

    /* ========== ELECTION STATE ========== */
    enum Phase {
        Registration,
        Voting,
        Ended
    }

    Phase public currentPhase = Phase.Registration;

    /* ========== VOTERS ========== */
    struct Voter {
        bool registered;
        bool hasVoted;
        uint8 vote;
    }

    mapping(address => Voter) public voters;

    uint256 public totalVotes;

    /* ========== CANDIDATES ========== */
    mapping(uint8 => uint256) private candidateVotes;

    /* ========== EVENTS ========== */
    event VoterRegistered(address voter);
    event VoteCast(address voter, uint8 candidate);
    event PhaseChanged(Phase newPhase);

    /* ========== ADMIN CONTROLS ========== */
    function startVoting() external onlyAdmin {
        require(currentPhase == Phase.Registration, "Invalid phase");
        currentPhase = Phase.Voting;
        emit PhaseChanged(currentPhase);
    }

    function endElection() external onlyAdmin {
        require(currentPhase == Phase.Voting, "Invalid phase");
        currentPhase = Phase.Ended;
        emit PhaseChanged(currentPhase);
    }

    /* ========== REGISTRATION ========== */
    function registerVoter(address _voter) external onlyAdmin {
        require(currentPhase == Phase.Registration, "Registration closed");
        require(!voters[_voter].registered, "Already registered");

        voters[_voter] = Voter({
            registered: true,
            hasVoted: false,
            vote: 0
        });

        emit VoterRegistered(_voter);
    }

    /* ========== VOTING ========== */
    function castVote(uint8 _candidate) external {
        require(currentPhase == Phase.Voting, "Voting not active");
        require(voters[msg.sender].registered, "Not registered");
        require(!voters[msg.sender].hasVoted, "Already voted");
        require(_candidate >= 1 && _candidate <= 3, "Invalid candidate");

        voters[msg.sender].hasVoted = true;
        voters[msg.sender].vote = _candidate;

        candidateVotes[_candidate]++;
        totalVotes++;

        emit VoteCast(msg.sender, _candidate);
    }

    /* ========== RESULTS (READ-ONLY) ========== */
    function getCandidateVotes(uint8 _candidate)
        external
        view
        returns (uint256)
    {
        require(_candidate >= 1 && _candidate <= 3, "Invalid candidate");
        return candidateVotes[_candidate];
    }

    function hasUserVoted(address _voter) external view returns (bool) {
        return voters[_voter].hasVoted;
    }

    function getUserVote(address _voter) external view returns (uint8) {
        require(currentPhase == Phase.Ended, "Election not ended");
        require(voters[_voter].hasVoted, "User did not vote");
        return voters[_voter].vote;
    }
}
