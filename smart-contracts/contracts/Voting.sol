// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title Secure Voting System
 * @dev A blockchain-based voting system with dynamic candidate management and admin controls.
 */
contract Voting {
    /* ========== STATE VARIABLES ========== */
    address public admin;
    
    enum Phase { Registration, Voting, Ended }
    Phase public currentPhase;

    struct Candidate {
        uint256 id;
        string name;
        uint256 voteCount;
    }

    struct Voter {
        bool registered;
        bool hasVoted;
        uint256 votedCandidateId;
    }

    mapping(address => Voter) public voters;
    Candidate[] public candidates;
    uint256 public totalVotes;

    /* ========== EVENTS ========== */
    event VoterRegistered(address indexed voter);
    event CandidateAdded(uint256 indexed id, string name);
    event VoteCast(address indexed voter, uint256 indexed candidateId);
    event PhaseChanged(Phase newPhase);

    /* ========== ACCESS CONTROL ========== */
    modifier onlyAdmin() {
        require(msg.sender == admin, "Access restricted to admin");
        _;
    }

    constructor() {
        admin = msg.sender;
        currentPhase = Phase.Registration;
    }

    /* ========== ADMIN FUNCTIONS ========== */

    /**
     * @dev Adds a new candidate. Can only be done during registration phase.
     */
    function addCandidate(string memory _name) external onlyAdmin {
        require(currentPhase == Phase.Registration, "Candidates can only be added during registration");
        uint256 candidateId = candidates.length + 1;
        candidates.push(Candidate({
            id: candidateId,
            name: _name,
            voteCount: 0
        }));
        emit CandidateAdded(candidateId, _name);
    }

    function startVoting() external onlyAdmin {
        require(currentPhase == Phase.Registration, "Can only start voting from registration phase");
        require(candidates.length > 0, "At least one candidate required");
        currentPhase = Phase.Voting;
        emit PhaseChanged(currentPhase);
    }

    function endElection() external onlyAdmin {
        require(currentPhase == Phase.Voting, "Can only end from voting phase");
        currentPhase = Phase.Ended;
        emit PhaseChanged(currentPhase);
    }

    function registerVoter(address _voter) external onlyAdmin {
        require(currentPhase == Phase.Registration, "Registration period closed");
        require(!voters[_voter].registered, "Voter already registered");

        voters[_voter].registered = true;
        emit VoterRegistered(_voter);
    }

    /* ========== PUBLIC FUNCTIONS ========== */

    /**
     * @dev Casts a vote for a specific candidate.
     */
    function castVote(uint256 _candidateId) external {
        require(currentPhase == Phase.Voting, "Voting is not active");
        require(voters[msg.sender].registered, "Voter is not registered");
        require(!voters[msg.sender].hasVoted, "Voter has already cast a vote");
        require(_candidateId > 0 && _candidateId <= candidates.length, "Invalid candidate ID");

        voters[msg.sender].hasVoted = true;
        voters[msg.sender].votedCandidateId = _candidateId;
        
        candidates[_candidateId - 1].voteCount++;
        totalVotes++;

        emit VoteCast(msg.sender, _candidateId);
    }

    /* ========== VIEW FUNCTIONS ========== */

    function getCandidatesCount() external view returns (uint256) {
        return candidates.length;
    }

    function getCandidate(uint256 _index) external view returns (uint256 id, string memory name, uint256 voteCount) {
        require(_index < candidates.length, "Candidate index out of bounds");
        Candidate memory c = candidates[_index];
        return (c.id, c.name, c.voteCount);
    }

    function hasUserVoted(address _voter) external view returns (bool) {
        return voters[_voter].hasVoted;
    }

    function getUserVote(address _voter) external view returns (uint256) {
        require(currentPhase == Phase.Ended, "Election results are not yet public");
        require(voters[_voter].hasVoted, "User has not voted");
        return voters[_voter].votedCandidateId;
    }
}
