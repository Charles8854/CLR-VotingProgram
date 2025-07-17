import {
  ActionHash,
  AppBundleSource,
  fakeActionHash,
  fakeAgentPubKey,
  fakeDnaHash,
  fakeEntryHash,
  hashFrom32AndType,
  NewEntryAction,
  Record,
} from "@holochain/client";
import { CallableCell } from "@holochain/tryorama";

export async function sampleAgentProfile(cell: CallableCell, partialAgentProfile = {}) {
  return {
    ...{
      name: "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
      email: "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
      password: "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
      region: "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
    },
    ...partialAgentProfile,
  };
}

export async function createAgentProfile(cell: CallableCell, agentProfile = undefined): Promise<Record> {
  return cell.callZome({
    zome_name: "clr_voting_programy",
    fn_name: "create_agent_profile",
    payload: agentProfile || await sampleAgentProfile(cell),
  });
}

export async function sampleBallot(cell: CallableCell, partialBallot = {}) {
  return {
    ...{
      title: "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
      description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
      created_by: (await fakeAgentPubKey()),
      created_at: 1674053334548000,
    },
    ...partialBallot,
  };
}

export async function createBallot(cell: CallableCell, ballot = undefined): Promise<Record> {
  return cell.callZome({
    zome_name: "clr_voting_programy",
    fn_name: "create_ballot",
    payload: ballot || await sampleBallot(cell),
  });
}

export async function sampleVoteItem(cell: CallableCell, partialVoteItem = {}) {
  return {
    ...{
      ballot_name: "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
      vote_weight: 10,
    },
    ...partialVoteItem,
  };
}

export async function createVoteItem(cell: CallableCell, voteItem = undefined): Promise<Record> {
  return cell.callZome({
    zome_name: "clr_voting_programy",
    fn_name: "create_vote_item",
    payload: voteItem || await sampleVoteItem(cell),
  });
}
