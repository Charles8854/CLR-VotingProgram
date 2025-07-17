import { assert, test } from "vitest";

import {
  ActionHash,
  AppBundleSource,
  CreateLink,
  DeleteLink,
  fakeActionHash,
  fakeAgentPubKey,
  fakeEntryHash,
  Link,
  NewEntryAction,
  Record,
  SignedActionHashed,
} from "@holochain/client";
import { CallableCell, dhtSync, runScenario } from "@holochain/tryorama";
import { decode } from "@msgpack/msgpack";

import { createVoteItem, sampleVoteItem } from "./common.js";

test("create VoteItem", async () => {
  await runScenario(async scenario => {
    // Construct proper paths for your app.
    // This assumes app bundle created by the `hc app pack` command.
    const testAppPath = process.cwd() + "/../workdir/CLR-VotingProgram.happ";

    // Set up the app to be installed
    const appBundleSource: AppBundleSource = { type: "path", value: testAppPath };
    const appSource = { appBundleSource };

    // Add 2 players with the test app to the Scenario. The returned players
    // can be destructured.
    const [alice, bob] = await scenario.addPlayersWithApps([appSource, appSource]);

    // Shortcut peer discovery through gossip and register all agents in every
    // conductor of the scenario.
    await scenario.shareAllAgents();

    // Alice creates a VoteItem
    const record: Record = await createVoteItem(alice.cells[0]);
    assert.ok(record);
  });
});

test("create and read VoteItem", async () => {
  await runScenario(async scenario => {
    // Construct proper paths for your app.
    // This assumes app bundle created by the `hc app pack` command.
    const testAppPath = process.cwd() + "/../workdir/CLR-VotingProgram.happ";

    // Set up the app to be installed
    const appBundleSource: AppBundleSource = { type: "path", value: testAppPath };
    const appSource = { appBundleSource };

    // Add 2 players with the test app to the Scenario. The returned players
    // can be destructured.
    const [alice, bob] = await scenario.addPlayersWithApps([appSource, appSource]);

    // Shortcut peer discovery through gossip and register all agents in every
    // conductor of the scenario.
    await scenario.shareAllAgents();

    const sample = await sampleVoteItem(alice.cells[0]);

    // Alice creates a VoteItem
    const record: Record = await createVoteItem(alice.cells[0], sample);
    assert.ok(record);

    // Wait for the created entry to be propagated to the other node.
    await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

    // Bob gets the created VoteItem
    const createReadOutput: Record = await bob.cells[0].callZome({
      zome_name: "clr_voting_programy",
      fn_name: "get_original_vote_item",
      payload: record.signed_action.hashed.hash,
    });
    assert.deepEqual(sample, decode((createReadOutput.entry as any).Present.entry) as any);
  });
});

test("create and update VoteItem", async () => {
  await runScenario(async scenario => {
    // Construct proper paths for your app.
    // This assumes app bundle created by the `hc app pack` command.
    const testAppPath = process.cwd() + "/../workdir/CLR-VotingProgram.happ";

    // Set up the app to be installed
    const appBundleSource: AppBundleSource = { type: "path", value: testAppPath };
    const appSource = { appBundleSource };

    // Add 2 players with the test app to the Scenario. The returned players
    // can be destructured.
    const [alice, bob] = await scenario.addPlayersWithApps([appSource, appSource]);

    // Shortcut peer discovery through gossip and register all agents in every
    // conductor of the scenario.
    await scenario.shareAllAgents();

    // Alice creates a VoteItem
    const record: Record = await createVoteItem(alice.cells[0]);
    assert.ok(record);

    const originalActionHash = record.signed_action.hashed.hash;

    // Alice updates the VoteItem
    let contentUpdate: any = await sampleVoteItem(alice.cells[0]);
    let updateInput = {
      original_vote_item_hash: originalActionHash,
      previous_vote_item_hash: originalActionHash,
      updated_vote_item: contentUpdate,
    };

    let updatedRecord: Record = await alice.cells[0].callZome({
      zome_name: "clr_voting_programy",
      fn_name: "update_vote_item",
      payload: updateInput,
    });
    assert.ok(updatedRecord);

    // Wait for the updated entry to be propagated to the other node.
    await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

    // Bob gets the updated VoteItem
    const readUpdatedOutput0: Record = await bob.cells[0].callZome({
      zome_name: "clr_voting_programy",
      fn_name: "get_latest_vote_item",
      payload: updatedRecord.signed_action.hashed.hash,
    });
    assert.deepEqual(contentUpdate, decode((readUpdatedOutput0.entry as any).Present.entry) as any);

    // Alice updates the VoteItem again
    contentUpdate = await sampleVoteItem(alice.cells[0]);
    updateInput = {
      original_vote_item_hash: originalActionHash,
      previous_vote_item_hash: updatedRecord.signed_action.hashed.hash,
      updated_vote_item: contentUpdate,
    };

    updatedRecord = await alice.cells[0].callZome({
      zome_name: "clr_voting_programy",
      fn_name: "update_vote_item",
      payload: updateInput,
    });
    assert.ok(updatedRecord);

    // Wait for the updated entry to be propagated to the other node.
    await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

    // Bob gets the updated VoteItem
    const readUpdatedOutput1: Record = await bob.cells[0].callZome({
      zome_name: "clr_voting_programy",
      fn_name: "get_latest_vote_item",
      payload: updatedRecord.signed_action.hashed.hash,
    });
    assert.deepEqual(contentUpdate, decode((readUpdatedOutput1.entry as any).Present.entry) as any);

    // Bob gets all the revisions for VoteItem
    const revisions: Record[] = await bob.cells[0].callZome({
      zome_name: "clr_voting_programy",
      fn_name: "get_all_revisions_for_vote_item",
      payload: originalActionHash,
    });
    assert.equal(revisions.length, 3);
    assert.deepEqual(contentUpdate, decode((revisions[2].entry as any).Present.entry) as any);
  });
});

test("create and delete VoteItem", async () => {
  await runScenario(async scenario => {
    // Construct proper paths for your app.
    // This assumes app bundle created by the `hc app pack` command.
    const testAppPath = process.cwd() + "/../workdir/CLR-VotingProgram.happ";

    // Set up the app to be installed
    const appBundleSource: AppBundleSource = { type: "path", value: testAppPath };
    const appSource = { appBundleSource };

    // Add 2 players with the test app to the Scenario. The returned players
    // can be destructured.
    const [alice, bob] = await scenario.addPlayersWithApps([appSource, appSource]);

    // Shortcut peer discovery through gossip and register all agents in every
    // conductor of the scenario.
    await scenario.shareAllAgents();

    const sample = await sampleVoteItem(alice.cells[0]);

    // Alice creates a VoteItem
    const record: Record = await createVoteItem(alice.cells[0], sample);
    assert.ok(record);

    await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

    // Alice deletes the VoteItem
    const deleteActionHash = await alice.cells[0].callZome({
      zome_name: "clr_voting_programy",
      fn_name: "delete_vote_item",
      payload: record.signed_action.hashed.hash,
    });
    assert.ok(deleteActionHash);

    // Wait for the entry deletion to be propagated to the other node.
    await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

    // Bob gets the oldest delete for the VoteItem
    const oldestDeleteForVoteItem: SignedActionHashed = await bob.cells[0].callZome({
      zome_name: "clr_voting_programy",
      fn_name: "get_oldest_delete_for_vote_item",
      payload: record.signed_action.hashed.hash,
    });
    assert.ok(oldestDeleteForVoteItem);

    // Bob gets the deletions for the VoteItem
    const deletesForVoteItem: SignedActionHashed[] = await bob.cells[0].callZome({
      zome_name: "clr_voting_programy",
      fn_name: "get_all_deletes_for_vote_item",
      payload: record.signed_action.hashed.hash,
    });
    assert.equal(deletesForVoteItem.length, 1);
  });
});
