use clr_voting_programy_integrity::*;
use hdk::prelude::*;

#[hdk_extern]
pub fn create_vote_item(vote_item: VoteItem) -> ExternResult<Record> {
    let vote_item_hash = create_entry(&EntryTypes::VoteItem(vote_item.clone()))?;
    let record = get(vote_item_hash.clone(), GetOptions::default())?.ok_or(wasm_error!(
        WasmErrorInner::Guest("Could not find the newly created VoteItem".to_string())
    ))?;
    Ok(record)
}

#[hdk_extern]
pub fn get_latest_vote_item(original_vote_item_hash: ActionHash) -> ExternResult<Option<Record>> {
    let links = get_links(
        GetLinksInputBuilder::try_new(original_vote_item_hash.clone(), LinkTypes::VoteItemUpdates)?
            .build(),
    )?;
    let latest_link = links
        .into_iter()
        .max_by(|link_a, link_b| link_a.timestamp.cmp(&link_b.timestamp));
    let latest_vote_item_hash = match latest_link {
        Some(link) => {
            link.target
                .clone()
                .into_action_hash()
                .ok_or(wasm_error!(WasmErrorInner::Guest(
                    "No action hash associated with link".to_string()
                )))?
        }
        None => original_vote_item_hash.clone(),
    };
    get(latest_vote_item_hash, GetOptions::default())
}

#[hdk_extern]
pub fn get_original_vote_item(original_vote_item_hash: ActionHash) -> ExternResult<Option<Record>> {
    let Some(details) = get_details(original_vote_item_hash, GetOptions::default())? else {
        return Ok(None);
    };
    match details {
        Details::Record(details) => Ok(Some(details.record)),
        _ => Err(wasm_error!(WasmErrorInner::Guest(
            "Malformed get details response".to_string()
        ))),
    }
}

#[hdk_extern]
pub fn get_all_revisions_for_vote_item(
    original_vote_item_hash: ActionHash,
) -> ExternResult<Vec<Record>> {
    let Some(original_record) = get_original_vote_item(original_vote_item_hash.clone())? else {
        return Ok(vec![]);
    };
    let links = get_links(
        GetLinksInputBuilder::try_new(original_vote_item_hash.clone(), LinkTypes::VoteItemUpdates)?
            .build(),
    )?;
    let get_input: Vec<GetInput> = links
        .into_iter()
        .map(|link| {
            Ok(GetInput::new(
                link.target
                    .into_action_hash()
                    .ok_or(wasm_error!(WasmErrorInner::Guest(
                        "No action hash associated with link".to_string()
                    )))?
                    .into(),
                GetOptions::default(),
            ))
        })
        .collect::<ExternResult<Vec<GetInput>>>()?;
    let records = HDK.with(|hdk| hdk.borrow().get(get_input))?;
    let mut records: Vec<Record> = records.into_iter().flatten().collect();
    records.insert(0, original_record);
    Ok(records)
}

#[derive(Serialize, Deserialize, Debug)]
pub struct UpdateVoteItemInput {
    pub original_vote_item_hash: ActionHash,
    pub previous_vote_item_hash: ActionHash,
    pub updated_vote_item: VoteItem,
}

#[hdk_extern]
pub fn update_vote_item(input: UpdateVoteItemInput) -> ExternResult<Record> {
    let updated_vote_item_hash = update_entry(
        input.previous_vote_item_hash.clone(),
        &input.updated_vote_item,
    )?;
    create_link(
        input.original_vote_item_hash.clone(),
        updated_vote_item_hash.clone(),
        LinkTypes::VoteItemUpdates,
        (),
    )?;
    let record = get(updated_vote_item_hash.clone(), GetOptions::default())?.ok_or(wasm_error!(
        WasmErrorInner::Guest("Could not find the newly updated VoteItem".to_string())
    ))?;
    Ok(record)
}

#[hdk_extern]
pub fn delete_vote_item(original_vote_item_hash: ActionHash) -> ExternResult<ActionHash> {
    delete_entry(original_vote_item_hash)
}

#[hdk_extern]
pub fn get_all_deletes_for_vote_item(
    original_vote_item_hash: ActionHash,
) -> ExternResult<Option<Vec<SignedActionHashed>>> {
    let Some(details) = get_details(original_vote_item_hash, GetOptions::default())? else {
        return Ok(None);
    };
    match details {
        Details::Entry(_) => Err(wasm_error!(WasmErrorInner::Guest(
            "Malformed details".into()
        ))),
        Details::Record(record_details) => Ok(Some(record_details.deletes)),
    }
}

#[hdk_extern]
pub fn get_oldest_delete_for_vote_item(
    original_vote_item_hash: ActionHash,
) -> ExternResult<Option<SignedActionHashed>> {
    let Some(mut deletes) = get_all_deletes_for_vote_item(original_vote_item_hash)? else {
        return Ok(None);
    };
    deletes.sort_by(|delete_a, delete_b| {
        delete_a
            .action()
            .timestamp()
            .cmp(&delete_b.action().timestamp())
    });
    Ok(deletes.first().cloned())
}
