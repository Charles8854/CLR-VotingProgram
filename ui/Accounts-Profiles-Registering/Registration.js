// registration.js
import { AppWebsocket } from "@holochain/client";

let appWebsocket;

async function getHolochainClient() {
if (!appWebsocket) {
try {
appWebsocket = await AppWebsocket.connect();
console.log("Connected to Holochain!");
} catch (err) {
console.error("Failed to connect to Holochain backend:", err);
throw err;
}
}
return appWebsocket;
}

export async function handleRegistrationSubmit(e) {
e.preventDefault();

const form = e.target;
const formdata = new FormData(form);
const payload = {
name: formdata.get("name"),
email: formdata.get("email"),
password: formdata.get("password"),
region: formdata.get("region"),
};
console.log("form.data:", payload);

const appWebsocket = await getHolochainClient();

try {
const appInfo = await appWebsocket.appInfo({ installed_app_id: "CLR-VotingProgram" });
console.log("appinfo", appInfo);

// Replace 'clr_voting_program' with the correct cell role id from your conductor config
const cell = appInfo.cell_info["clr_voting_program"][0];
const cell_id = cell.provisioned.cell_id;

// Call zome function (fix zome_name as needed!)
const result = await appWebsocket.callZome({
cap_secret: null,
cell_id: cell_id,
zome_name: "clr_voting_program", // <-- fix typo if needed!
fn_name: "create_agent_profile",
payload: payload,
provenance: cell_id[1],
timeout: 10000,
});

console.log("Registration successful:", result);
alert("Registration successful! Please check your email for confirmation.");
} catch (err) {
console.error(err);
alert("An error occurred during registration. " + (err.message || ""));
}
}