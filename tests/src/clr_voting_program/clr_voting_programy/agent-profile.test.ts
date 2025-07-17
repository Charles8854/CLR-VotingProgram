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

import { createAgentProfile, sampleAgentProfile } from "./common.js";

test("create AgentProfile", async () => {
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

    // Alice creates a AgentProfile
    const record: Record = await createAgentProfile(alice.cells[0]);
    assert.ok(record);
  });
});

test("create and read AgentProfile", async () => {
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

    const sample = await sampleAgentProfile(alice.cells[0]);

    // Alice creates a AgentProfile
    const record: Record = await createAgentProfile(alice.cells[0], sample);
    assert.ok(record);

    // Wait for the created entry to be propagated to the other node.
    await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

    // Bob gets the created AgentProfile
    const createReadOutput: Record = await bob.cells[0].callZome({
      zome_name: "clr_voting_programy",
      fn_name: "get_original_agent_profile",
      payload: record.signed_action.hashed.hash,
    });
    assert.deepEqual(sample, decode((createReadOutput.entry as any).Present.entry) as any);
  });
});

test("create and update AgentProfile", async () => {
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

    // Alice creates a AgentProfile
    const record: Record = await createAgentProfile(alice.cells[0]);
    assert.ok(record);

    const originalActionHash = record.signed_action.hashed.hash;

    // Alice updates the AgentProfile
    let contentUpdate: any = await sampleAgentProfile(alice.cells[0]);
    let updateInput = {
      original_agent_profile_hash: originalActionHash,
      previous_agent_profile_hash: originalActionHash,
      updated_agent_profile: contentUpdate,
    };

    let updatedRecord: Record = await alice.cells[0].callZome({
      zome_name: "clr_voting_programy",
      fn_name: "update_agent_profile",
      payload: updateInput,
    });
    assert.ok(updatedRecord);

    // Wait for the updated entry to be propagated to the other node.
    await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

    // Bob gets the updated AgentProfile
    const readUpdatedOutput0: Record = await bob.cells[0].callZome({
      zome_name: "clr_voting_programy",
      fn_name: "get_latest_agent_profile",
      payload: updatedRecord.signed_action.hashed.hash,
    });
    assert.deepEqual(contentUpdate, decode((readUpdatedOutput0.entry as any).Present.entry) as any);

    // Alice updates the AgentProfile again
    contentUpdate = await sampleAgentProfile(alice.cells[0]);
    updateInput = {
      original_agent_profile_hash: originalActionHash,
      previous_agent_profile_hash: updatedRecord.signed_action.hashed.hash,
      updated_agent_profile: contentUpdate,
    };

    updatedRecord = await alice.cells[0].callZome({
      zome_name: "clr_voting_programy",
      fn_name: "update_agent_profile",
      payload: updateInput,
    });
    assert.ok(updatedRecord);

    // Wait for the updated entry to be propagated to the other node.
    await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

    // Bob gets the updated AgentProfile
    const readUpdatedOutput1: Record = await bob.cells[0].callZome({
      zome_name: "clr_voting_programy",
      fn_name: "get_latest_agent_profile",
      payload: updatedRecord.signed_action.hashed.hash,
    });
    assert.deepEqual(contentUpdate, decode((readUpdatedOutput1.entry as any).Present.entry) as any);

    // Bob gets all the revisions for AgentProfile
    const revisions: Record[] = await bob.cells[0].callZome({
      zome_name: "clr_voting_programy",
      fn_name: "get_all_revisions_for_agent_profile",
      payload: originalActionHash,
    });
    assert.equal(revisions.length, 3);
    assert.deepEqual(contentUpdate, decode((revisions[2].entry as any).Present.entry) as any);
  });
});

test("create and delete AgentProfile", async () => {
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

    const sample = await sampleAgentProfile(alice.cells[0]);

    // Alice creates a AgentProfile
    const record: Record = await createAgentProfile(alice.cells[0], sample);
    assert.ok(record);

    await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

    // Alice deletes the AgentProfile
    const deleteActionHash = await alice.cells[0].callZome({
      zome_name: "clr_voting_programy",
      fn_name: "delete_agent_profile",
      payload: record.signed_action.hashed.hash,
    });
    assert.ok(deleteActionHash);

    // Wait for the entry deletion to be propagated to the other node.
    await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

    // Bob gets the oldest delete for the AgentProfile
    const oldestDeleteForAgentProfile: SignedActionHashed = await bob.cells[0].callZome({
      zome_name: "clr_voting_programy",
      fn_name: "get_oldest_delete_for_agent_profile",
      payload: record.signed_action.hashed.hash,
    });
    assert.ok(oldestDeleteForAgentProfile);

    // Bob gets the deletions for the AgentProfile
    const deletesForAgentProfile: SignedActionHashed[] = await bob.cells[0].callZome({
      zome_name: "clr_voting_programy",
      fn_name: "get_all_deletes_for_agent_profile",
      payload: record.signed_action.hashed.hash,
    });
    assert.equal(deletesForAgentProfile.length, 1);
  });
});
