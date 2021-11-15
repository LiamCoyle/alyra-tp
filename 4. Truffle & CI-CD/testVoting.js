const { BN, expectRevert, expectEvent } = require("@openzeppelin/test-helpers");
const { expect } = require("chai");
const Voting = artifacts.require("Voting");

contract("Voting", (accounts) => {
  const admin = accounts[0];
  const voter1 = accounts[1];

  beforeEach(async () => {
    this.votingInstance = await Voting.new({ from: admin });
  });

  it("addVoter(_addr) revert if sender is not admin", async () => {
    await expectRevert(
      this.votingInstance.addVoter(voter1, { from: voter1 }),
      "Ownable: caller is not the owner"
    );
  });

  it("addVoter(_addr) revert if workflow isn't status RegisteringVoters", async () => {
    await this.votingInstance.startProposalsRegistering({ from: admin });

    await expectRevert(
      this.votingInstance.addVoter(voter1, { from: admin }),
      "Voters registration is not open yet"
    );
  });

  it("addVoter(_addr) revert if addr already added", async () => {
    await this.votingInstance.addVoter(voter1, { from: admin });
    await expectRevert(
      this.votingInstance.addVoter(voter1, { from: admin }),
      "Already registered"
    );
  });

  it("addVoter(_addr) add addr to Voter and emit event VoterRegistered", async () => {
    const receipt = await this.votingInstance.addVoter(voter1, { from: admin });

    const voter = await this.votingInstance.getVoter(voter1, { from: voter1 });
    expect(voter.isRegistered).to.be.equal(true);
    expectEvent(receipt, "VoterRegistered", {
      voterAddress: voter1,
    });
  });

  it("addProposal(_desc) revert if voter is not registered", async () => {
    await this.votingInstance.startProposalsRegistering({ from: admin });
    await expectRevert(
      this.votingInstance.addProposal("test description", {
        from: voter1,
      }),
      "You're not a voter"
    );
  });

  it("addProposal(_desc) revert if desc is empty", async () => {
    await this.votingInstance.addVoter(voter1, { from: admin });
    await this.votingInstance.startProposalsRegistering({ from: admin });
    await expectRevert(
      this.votingInstance.addProposal("", {
        from: voter1,
      }),
      "Vous ne pouvez pas ne rien proposer"
    );
  });

  it("addProposal(_desc) add proposal  emit event ProposalRegistered", async () => {
    await this.votingInstance.addVoter(voter1, { from: admin });
    await this.votingInstance.startProposalsRegistering({ from: admin });
    const receipt = await this.votingInstance.addProposal("test description", {
      from: voter1,
    });

    expectEvent(receipt, "ProposalRegistered", {
      proposalId: "0",
    });
  });

  it("endProposalsRegistering() revert if sender is not admin", async () => {
    await expectRevert(
      this.votingInstance.endProposalsRegistering({ from: voter1 }),
      "Ownable: caller is not the owner"
    );
  });

  it("endProposalsRegistering() revert if status is not  ProposalsRegistrationStarted", async () => {
    await expectRevert(
      this.votingInstance.endProposalsRegistering({ from: admin }),
      "Registering proposals havent started yet"
    );
  });

  it("endProposalsRegistering() emit WorkflowStatusChange(1,2)", async () => {
    await this.votingInstance.startProposalsRegistering({ from: admin });
    const receipt = await this.votingInstance.endProposalsRegistering({
      from: admin,
    });
    expectEvent(receipt, "WorkflowStatusChange", {
      previousStatus: "1",
      newStatus: "2",
    });
  });

  it("startVotingSession() revert if sender is not admin", async () => {
    await expectRevert(
      this.votingInstance.startVotingSession({ from: voter1 }),
      "Ownable: caller is not the owner"
    );
  });

  it("startVotingSession() revert if status is not ProposalsRegistrationEnded", async () => {
    await expectRevert(
      this.votingInstance.startVotingSession({ from: admin }),
      "Registering proposals phase is not finished"
    );
  });

  it("startVotingSession() emit WorkflowStatusChange (2,3)", async () => {
    await this.votingInstance.addVoter(voter1, { from: admin });
    await this.votingInstance.startProposalsRegistering({ from: admin });
    await this.votingInstance.addProposal("proposition 1", {
      from: voter1,
    });
    await this.votingInstance.endProposalsRegistering({ from: admin });

    const receipt = await this.votingInstance.startVotingSession({
      from: admin,
    });

    expectEvent(receipt, "WorkflowStatusChange", {
      previousStatus: "2",
      newStatus: "3",
    });
  });

  it("setVote(proposalId) revert if voter is not registered", async () => {
    const proposalId = 0;

    await expectRevert(
      this.votingInstance.setVote(proposalId, { from: voter1 }),
      "You're not a voter"
    );
  });

  it("setVote(proposalId) revert if status is not VotingSessionStarted", async () => {
    const proposalId = 0;

    await this.votingInstance.addVoter(voter1, { from: admin });

    await expectRevert(
      this.votingInstance.setVote(proposalId, { from: voter1 }),
      "Voting session havent started yet"
    );
  });

  it("setVote(proposalId) revert if voter already voted", async () => {
    const proposalId = 0;
    await this.votingInstance.addVoter(voter1, { from: admin });
    await this.votingInstance.startProposalsRegistering({ from: admin });
    await this.votingInstance.addProposal("proposition 1", {
      from: voter1,
    });
    await this.votingInstance.endProposalsRegistering({ from: admin });
    await this.votingInstance.startVotingSession({ from: admin });
    await this.votingInstance.setVote(proposalId, { from: voter1 });

    await expectRevert(
      this.votingInstance.setVote(proposalId, { from: voter1 }),
      "You have already voted"
    );
  });

  it("setVote(proposalId) revert if proposalId is invalid", async () => {
    const proposalId = 2;
    await this.votingInstance.addVoter(voter1, { from: admin });
    await this.votingInstance.startProposalsRegistering({ from: admin });
    await this.votingInstance.endProposalsRegistering({ from: admin });
    await this.votingInstance.startVotingSession({ from: admin });

    await expectRevert(
      this.votingInstance.setVote(proposalId, { from: voter1 }),
      "Proposal not found"
    );
  });

  it("setVote(proposalId) increment vote of proposal", async () => {
    const proposalId = 0;
    await this.votingInstance.addVoter(voter1, { from: admin });
    await this.votingInstance.startProposalsRegistering({ from: admin });
    await this.votingInstance.addProposal("proposition 1", {
      from: voter1,
    });
    await this.votingInstance.endProposalsRegistering({ from: admin });
    await this.votingInstance.startVotingSession({ from: admin });
    const voteCountBefore = (await this.votingInstance.getOneProposal(0))
      .voteCount;

    const receipt = await this.votingInstance.setVote(proposalId, {
      from: voter1,
    });

    const voteCountAfter = (await this.votingInstance.getOneProposal(0))
      .voteCount;
    expect(voteCountAfter).to.be.bignumber.equal(new BN(voteCountBefore + 1));
    expectEvent(receipt, "Voted", {
      voter: voter1,
      proposalId: new BN(proposalId),
    });
  });

  it("endVotingSession() revert if sender is not admin", async () => {
    await expectRevert(
      this.votingInstance.endVotingSession({ from: voter1 }),
      "Ownable: caller is not the owner"
    );
  });

  it("endVotingSession() revert if status is not VotingSessionStarted", async () => {
    await expectRevert(
      this.votingInstance.endVotingSession({ from: admin }),
      "Voting session havent started yet"
    );
  });

  it("endVotingSession() emit WorkflowStatusChange(3,4)", async () => {
    await this.votingInstance.addVoter(voter1, { from: admin });
    await this.votingInstance.startProposalsRegistering({ from: admin });
    await this.votingInstance.addProposal("proposition 1", {
      from: voter1,
    });
    await this.votingInstance.endProposalsRegistering({ from: admin });
    await this.votingInstance.startVotingSession({ from: admin });
    await this.votingInstance.setVote(0, { from: voter1 });

    const receipt = await this.votingInstance.endVotingSession({ from: admin });

    expectEvent(receipt, "WorkflowStatusChange", {
      previousStatus: "3",
      newStatus: "4",
    });
  });

  it("tallyVotes() revert if not admin", async () => {
    await expectRevert(
      this.votingInstance.tallyVotes({ from: voter1 }),
      "Ownable: caller is not the owner"
    );
  });

  it("tallyVotes() revert if status is not VotingSessionEnded", async () => {
    await expectRevert(
      this.votingInstance.tallyVotes({ from: admin }),
      "Current status is not voting session ended"
    );
  });

  it("tallyVotes() emit WorkflowStatusChange(4,5)", async () => {
    await this.votingInstance.addVoter(voter1, { from: admin });
    await this.votingInstance.startProposalsRegistering({ from: admin });
    await this.votingInstance.addProposal("proposition 1", {
      from: voter1,
    });
    await this.votingInstance.endProposalsRegistering({ from: admin });
    await this.votingInstance.startVotingSession({ from: admin });
    await this.votingInstance.setVote(0, { from: voter1 });
    await this.votingInstance.endVotingSession({ from: admin });

    const receipt = await this.votingInstance.tallyVotes({ from: admin });

    const winningProposal = await this.votingInstance.getWinner();
    expect(winningProposal.voteCount).to.be.bignumber.equal(new BN(1));
    assert.equal(winningProposal.description, "proposition 1");
    expectEvent(receipt, "WorkflowStatusChange", {
      previousStatus: "4",
      newStatus: "5",
    });
  });
});
