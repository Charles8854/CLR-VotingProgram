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

import { createBallot, sampleBallot } from "./common.js";

test("create Ballot", async () => {
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

    // Alice creates a Ballot
    const record: Record = await createBallot(alice.cells[0]);
    assert.ok(record);
  });
});

test("create and read Ballot", async () => {
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

    const sample = await sampleBallot(alice.cells[0]);

    // Alice creates a Ballot
    const record: Record = await createBallot(alice.cells[0], sample);
    assert.ok(record);

    // Wait for the created entry to be propagated to the other node.
    await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

    // Bob gets the created Ballot
    const createReadOutput: Record = await bob.cells[0].callZome({
      zome_name: "clr_voting_programy",
      fn_name: "get_original_ballot",
      payload: record.signed_action.hashed.hash,
    });
    assert.deepEqual(sample, decode((createReadOutput.entry as any).Present.entry) as any);
  });
});

test("create and update Ballot", async () => {
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

    // Alice creates a Ballot
    const record: Record = await createBallot(alice.cells[0]);
    assert.ok(record);

    const originalActionHash = record.signed_action.hashed.hash;

    // Alice updates the Ballot
    let contentUpdate: any = await sampleBallot(alice.cells[0]);
    let updateInput = {
      original_ballot_hash: originalActionHash,
      previous_ballot_hash: originalActionHash,
      updated_ballot: contentUpdate,
    };

    let updatedRecord: Record = await alice.cells[0].callZome({
      zome_name: "clr_voting_programy",
      fn_name: "update_ballot",
      payload: updateInput,
    });
    assert.ok(updatedRecord);

    // Wait for the updated entry to be propagated to the other node.
    await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

    // Bob gets the updated Ballot
    const readUpdatedOutput0: Record = await bob.cells[0].callZome({
      zome_name: "clr_voting_programy",
      fn_name: "get_latest_ballot",
      payload: updatedRecord.signed_action.hashed.hash,
    });
    assert.deepEqual(contentUpdate, decode((readUpdatedOutput0.entry as any).Present.entry) as any);

    // Alice updates the Ballot again
    contentUpdate = await sampleBallot(alice.cells[0]);
    updateInput = {
      original_ballot_hash: originalActionHash,
      previous_ballot_hash: updatedRecord.signed_action.hashed.hash,
      updated_ballot: contentUpdate,
    };

    updatedRecord = await alice.cells[0].callZome({
      zome_name: "clr_voting_programy",
      fn_name: "update_ballot",
      payload: updateInput,
    });
    assert.ok(updatedRecord);

    // Wait for the updated entry to be propagated to the other node.
    await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

    // Bob gets the updated Ballot
    const readUpdatedOutput1: Record = await bob.cells[0].callZome({
      zome_name: "clr_voting_programy",
      fn_name: "get_latest_ballot",
      payload: updatedRecord.signed_action.hashed.hash,
    });
    assert.deepEqual(contentUpdate, decode((readUpdatedOutput1.entry as any).Present.entry) as any);

    // Bob gets all the revisions for Ballot
    const revisions: Record[] = await bob.cells[0].callZome({
      zome_name: "clr_voting_programy",
      fn_name: "get_all_revisions_for_ballot",
      payload: originalActionHash,
    });
    assert.equal(revisions.length, 3);
    assert.deepEqual(contentUpdate, decode((revisions[2].entry as any).Present.entry) as any);
  });
});

test("create and delete Ballot", async () => {
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

    const sample = await sampleBallot(alice.cells[0]);

    // Alice creates a Ballot
    const record: Record = await createBallot(alice.cells[0], sample);
    assert.ok(record);

    await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

    // Alice deletes the Ballot
    const deleteActionHash = await alice.cells[0].callZome({
      zome_name: "clr_voting_programy",
      fn_name: "delete_ballot",
      payload: record.signed_action.hashed.hash,
    });
    assert.ok(deleteActionHash);

    // Wait for the entry deletion to be propagated to the other node.
    await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

    // Bob gets the oldest delete for the Ballot
    const oldestDeleteForBallot: SignedActionHashed = await bob.cells[0].callZome({
      zome_name: "clr_voting_programy",
      fn_name: "get_oldest_delete_for_ballot",
      payload: record.signed_action.hashed.hash,
    });
    assert.ok(oldestDeleteForBallot);

    // Bob gets the deletions for the Ballot
    const deletesForBallot: SignedActionHashed[] = await bob.cells[0].callZome({
      zome_name: "clr_voting_programy",
      fn_name: "get_all_deletes_for_ballot",
      payload: record.signed_action.hashed.hash,
    });
    assert.equal(deletesForBallot.length, 1);
  });
});
