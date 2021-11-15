// SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.7.0 <0.9.0;


import "@openzeppelin/contracts/access/Ownable.sol";





//SMART-Contrat capable de gérer plusieurs sessions de Vote simultanément

contract  Voter is Ownable {
    
    enum WorkflowStatus {
        RegisteringVoters,
        ProposalsRegistrationStarted,
        ProposalsRegistrationEnded,
        VotingSessionStarted,
        VotingSessionEnded,
        VotesTallied
    }
    
    
    
    //chaque session a un id, qui est a gauche du mapping
    mapping(uint => WorkflowStatus) private status;
    mapping(uint => Proposal[]) private proposals;
    mapping(uint => mapping(address => Voter)) private voters;
    Session[] private sessions;
    
    
    struct Voter {
        bool isRegistered;
        bool hasVoted;
        uint votedProposalId;
    }
    
    struct Proposal {
        string description;
        uint voteCount;
    }
    
    struct Session {
        string name;
        uint id; 
    }
    
    event VoterRegistered(address voterAddress); 
    event WorkflowStatusChange(WorkflowStatus previousStatus, WorkflowStatus newStatus);
    event ProposalRegistered(uint proposalId);
    event Voted (address voter, uint proposalId);
    
    event NewSession(uint idSession);
    
    /**
     * @dev add a new Voting Session
     * @param _sessionName name of session
     */
    function newSession(string memory _sessionName) public onlyOwner{
        sessions.push(Session(_sessionName, sessions.length));
        status[sessions.length-1] =  WorkflowStatus.RegisteringVoters;
        emit NewSession(sessions.length-1);
    }
    
    
    
    /**
     * @dev Start the voter registrations
     * @param _sessionId id of targeted Session
     */
    function startRegisteringVoters(uint32 _sessionId) public onlyOwner {
        require(status[_sessionId] == WorkflowStatus.RegisteringVoters, "Cannot start Voter Registration");
        
        status[_sessionId] =  WorkflowStatus.RegisteringVoters;
        emit WorkflowStatusChange(WorkflowStatus.RegisteringVoters, WorkflowStatus.RegisteringVoters); // prout
    }
    
    
    
    
    /**
     * @dev Whitelist and register voter
     * @param _addr eth adress of voter
     * @param _sessionId id of targeted Session
     */
    function registerVoter(address _addr, uint32 _sessionId) public onlyOwner {
        require(!voters[_sessionId][_addr].isRegistered, "Already registered");
        
        voters[_sessionId][_addr] =Voter(true, false, 0);
        emit VoterRegistered(_addr);
    }
    
    
    
    
    
    /**
     * @dev Start Proposal registration
     * @param _sessionId id of targeted Session
     */
    function startRegisteringProposal(uint32 _sessionId) public onlyOwner {
        require(status[_sessionId] == WorkflowStatus.RegisteringVoters, "Cannot start Proposal Registration");
        
        status[_sessionId] =  WorkflowStatus.ProposalsRegistrationStarted;
        emit WorkflowStatusChange(WorkflowStatus.RegisteringVoters, WorkflowStatus.ProposalsRegistrationStarted);
    }
    
    
    
    
    /**
     * @dev Submit proposal
     * @param _description description of proposal
     * @param _sessionId id of targeted Session
     */
    function submitProposal(string memory _description, uint32 _sessionId) public {
        require(voters[_sessionId][msg.sender].isRegistered, "Not on the whitelist");
        require(status[_sessionId] == WorkflowStatus.ProposalsRegistrationStarted, "Proposal registration has not started");
        
        proposals[_sessionId].push(Proposal(_description, 0));
        emit ProposalRegistered(proposals[_sessionId].length - 1);
    }
    
    
    
    
    
    /**
     * @dev Start Proposal registration
     * @param _sessionId id of targeted Session
     */
    function endRegisteringProposal(uint32 _sessionId) public onlyOwner {
        require(status[_sessionId] == WorkflowStatus.ProposalsRegistrationStarted, "Cannot end Proposal Registration");
        
        status[_sessionId] =  WorkflowStatus.ProposalsRegistrationEnded; 
        emit WorkflowStatusChange(WorkflowStatus.ProposalsRegistrationStarted, WorkflowStatus.ProposalsRegistrationEnded);
    }
    
    
    
    
    
    
    /**
     * @dev Start Voting
     * @param _sessionId id of targeted Session
     */
    function startVoting(uint32 _sessionId) public onlyOwner {
        require(status[_sessionId] == WorkflowStatus.ProposalsRegistrationEnded, "Cannot start Voting");
       
        status[_sessionId] =  WorkflowStatus.VotingSessionStarted;
        emit WorkflowStatusChange(WorkflowStatus.ProposalsRegistrationEnded, WorkflowStatus.VotingSessionStarted);
    }
    
    
    
    
    
    /**
     * @dev Vote
     * @param _idProp id of targeted Session
     * @param _sessionId id of targeted Session
     */
    function vote(uint _idProp, uint32 _sessionId) public {
        require(voters[_sessionId][msg.sender].isRegistered, "You are not on the whitelist");
        require(status[_sessionId] == WorkflowStatus.VotingSessionStarted, "Voting is not yet enabled");
        require(!voters[_sessionId][msg.sender].hasVoted, "You have already voted");
        
        voters[_sessionId][msg.sender].votedProposalId = _idProp;
        voters[_sessionId][msg.sender].hasVoted = true;
        
        proposals[_sessionId][_idProp].voteCount++; 
        
        emit Voted (msg.sender, _idProp);
    }
    
    
    
    
    /**
     * @dev end vote
     * @param _sessionId id of targeted Session
     */
    function endVoting(uint32 _sessionId) public onlyOwner {
        require(status[_sessionId] == WorkflowStatus.VotingSessionStarted, "Cannot end Voting");
        
        status[_sessionId] =  WorkflowStatus.VotingSessionEnded;
        
        emit WorkflowStatusChange(WorkflowStatus.VotingSessionStarted, WorkflowStatus.VotingSessionEnded);
    }
    
    
    /**
     * @dev tally votes
     * @param _sessionId id of targeted Session
     */
    function tallyVotes(uint32 _sessionId) public onlyOwner { 
        require(status[_sessionId] == WorkflowStatus.VotingSessionEnded, "Cannot tally Voting");
        
        status[_sessionId] =  WorkflowStatus.VotesTallied;
        
        emit WorkflowStatusChange(WorkflowStatus.VotingSessionEnded, WorkflowStatus.VotesTallied);
    }
    
    /**
     * @dev get id of most recent session
     * @return id of lastet session
     */
    function getLatestSessionId() public view returns(uint){
        return sessions.length-1;
    }
    
    
    
    /**
     * @dev list of sessions
     * @return list of sessions
     */
    function getSessions() public view returns(string[] memory){
        string[] memory str ;
        for(uint i=0; i<=sessions.length-1; i++){
            str[i] = string(abi.encodePacked(sessions[i].id,":",sessions[i].name));
        }
        return str;
    }
    
    
    /**
     * @dev get proposals
     * @param _sessionId id of targeted Session
     * @return list of proposals
     */
    function getProposals(uint32 _sessionId) public view returns(Proposal[] memory){
        return proposals[_sessionId];
    }
    
    /**
     * @dev get status of session
     * @param _sessionId id of targeted Session
     * @return status of session
     */
    function getStatus(uint32 _sessionId) public view returns(WorkflowStatus){
        return status[_sessionId];
    }
    
    
    /**
     * @dev get winner of lastest session
     * @return winner session
     */
    function getWinner() public view returns(Proposal memory){
        require(status[sessions.length - 1] == WorkflowStatus.VotingSessionEnded, "Voting not yet finished");
        
        Proposal memory propWinner;
        uint maxVote;
        
        for(uint i =0; i<= proposals[sessions.length - 1].length -1 ; i++ ){
            if(proposals[sessions.length - 1][i].voteCount>maxVote){
                maxVote = proposals[sessions.length - 1][i].voteCount;
                propWinner = proposals[sessions.length - 1][i];
            }
        }
        
        return propWinner;
    }
    
    /**
     * @dev get winner of prop
     * @param _idSession id session of targeted session
     * @return winner session
     */
    function getWinnerBySession(uint32 _idSession) public view returns(Proposal memory){
        require(status[_idSession] == WorkflowStatus.VotingSessionEnded, "Voting not yet finished");
        
        Proposal memory propWinner;
        uint maxVote;
        
        for(uint i =0; i<= proposals[_idSession].length - 1 ; i++ ){
            if(proposals[_idSession][i].voteCount>maxVote){
                maxVote = proposals[_idSession][i].voteCount;
                propWinner = proposals[_idSession][i];
            }
        }
        
        return propWinner;
    }
}


