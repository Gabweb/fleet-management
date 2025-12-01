# Shelly Fleet Management - API

The method field of all the requests is not case-sensitive.

## Authentication

Obtain a JWT access token via the \`user.authenticate\` RPC method.

&nbsp;

**Request**

curl --location --request GET \\

&nbsp; "https://&lt;YOUR_HOST&gt;/rpc/user.authenticate?username=&lt;USERNAME&gt;&password=&lt;PASSWORD&gt;"

&nbsp;

**Response**

{

&nbsp; "access_token": "&lt;ACCESS_TOKEN&gt;",

&nbsp; "refresh_token": "&lt;REFRESH_TOKEN&gt;"

}

&nbsp;

Use the \`access_token\` as a Bearer token for all subsequent requests:

&nbsp;

\--header "Authorization: Bearer &lt;ACCESS_TOKEN&gt;"

## 1) Device module

### 1.1 \`Device.List\`

**Description**

- Returns all devices the caller can access. Optional top-level filters (e.g., app, model, presence) are applied BEFORE permission checks; only devices the caller is allowed to see are returned.

**Params**  
{  
"filters": { "app": "ProEM" } // optional; values must be string | number | boolean  
}

**Request**  
curl --location --request POST \\  
"&lt;https://<YOUR_HOST&gt;>/rpc/device.List" \\  
\--header "Authorization: Bearer &lt;ACCESS_TOKEN&gt;" \\  
\--header "Content-Type: application/json" \\  
\--data '{ "filters": { "app": "ProEM" } }'

**Response (example)**  
\[  
{  
"shellyID": "shellyproem50-AAAA",  
"id": 101,  
"source": "ws",  
"info": { /\* device info / },  
"status": { / device status / },  
"presence": "online",  
"settings": { / device config / },  
"entities": \["switch:0", "em:0"\],  
"meta": { "lastReportTs": 1696239000000 }  
},  
{  
"shellyID": "shellyem-BBBB",  
"id": 102,  
"source": "offline",  
"info": { / ... / },  
"status": { / ... / },  
"presence": "pending",  
"settings": { / ... \*/ },  
"entities": \[\],  
"meta": { "lastReportTs": 1696231000000 }  
}  
\]

Notes  
• Filters match only simple top-level keys; unknown keys are ignored.  
• After filtering, per-device access is enforced (devices you cannot access are omitted).

### 1.2 \`Device.GetInfo\`

**Description**

- Returns the info object for a specific device. If the device is not found or no id is provided, an empty object is returned.

**Params**  
{ "id": "shellyproem50-abc123" }

**Request**  
curl --location --request POST \\  
"&lt;https://<YOUR_HOST&gt;>/rpc/device.GetInfo" \\  
\--header "Authorization: Bearer &lt;ACCESS_TOKEN&gt;" \\  
\--header "Content-Type: application/json" \\  
\--data '{ "id": "shellyproem50-abc123" }'

**Response (example)**  
{  
"id": "shellyproem50-abc123",  
"mac": "A1:B2:C3:D4:E5:F6",  
"model": "SHEM-XYZ",  
"gen": 3,  
"fw_id": "20230910-123456/1.0.0@abcdef",  
"ver": "1.0.0",  
"app": "ProEM"  
}

### 1.3 \`Device.GetSetup\`

**Description**

Returns provisioning setup profiles from the internal "configs" registry. Two modes:  
• "json" (default): raw config profiles.  
• "rpc": arrays of prebuilt, stringified JSON-RPC requests (e.g., Switch.setconfig) you can send to a device.

**Params**  
{  
"shellyID": "shellyproem50-abc123",  
"mode": "json" // "json" (default) or "rpc"  
}

**Request (json mode)**  
curl --location --request POST \\  
"&lt;https://<YOUR_HOST&gt;>/rpc/device.GetSetup" \\  
\--header "Authorization: Bearer &lt;ACCESS_TOKEN&gt;" \\  
\--header "Content-Type: application/json" \\  
\--data '{ "shellyID": "shellyproem50-abc123", "mode": "json" }'

**Response (json mode example)**  
{  
"default": {  
"wifi": { "ssid": "MySSID", "pass": "\*\*\*\*\*\*" },  
"switch": { "id": 0, "initial_state": "on" }  
}  
}

Request (rpc mode)  
curl --location --request POST \\  
"&lt;https://<YOUR_HOST&gt;>/rpc/device.GetSetup" \\  
\--header "Authorization: Bearer &lt;ACCESS_TOKEN&gt;" \\  
\--header "Content-Type: application/json" \\  
\--data '{ "shellyID": "shellyproem50-abc123", "mode": "rpc" }'

Response (rpc mode example)  
{  
"default": {  
"wifi": \[  
"{\\"jsonrpc\\":\\"2.0\\",\\"id\\":1000,\\"method\\":\\"WiFi.setconfig\\",\\"params\\":{\\"config\\":{\\"ssid\\":\\"MySSID\\",\\"pass\\":\\"\*\*\*\*\*\*\\"}}}"  
\],  
"switch": \[  
"{\\"jsonrpc\\":\\"2.0\\",\\"id\\":1001,\\"method\\":\\"Switch.setconfig\\",\\"params\\":{\\"config\\":{\\"id\\":0,\\"initial_state\\":\\"on\\"}}}"  
\]  
}  
}

Notes  
• RPC mode increments request ids starting from 1000.  
• Returned RPC entries are strings; send them as-is to the device RPC endpoint if your client expects raw JSON strings.

### 1.4 \`Device.Call\`

**Description**

- Send a single JSON-RPC call directly to a specific device. Propagates the device's RPC response (or error).

**Params**  
{  
"shellyID": "shellyproem50-abc123",  
"method": "Switch.GetStatus",  
"params": { "id": 0 }  
}

**Request**  
curl --location --request POST \\  
"&lt;https://<YOUR_HOST&gt;>/rpc/device.Call" \\  
\--header "Authorization: Bearer &lt;ACCESS_TOKEN&gt;" \\  
\--header "Content-Type: application/json" \\  
\--data '{  
"shellyID": "shellyproem50-abc123",  
"method": "Switch.GetStatus",  
"params": { "id": 0 }  
}'

**Response (example)**  
{ "ison": true, "id": 0 }

**Errors**  
• DeviceNotFound - the device is not connected/known.  
• Any structured JSON-RPC error returned by the device will be passed through.

### 1.5 \`Device.Get\`

**Description**

- Return the full serialized device object (metadata + status + config snapshot) for the given ShellyID (or id). Throws if not found.

**Params (either form)**  
{ "shellyID": "shellyproem50-abc123" }  
or  
{ "id": "shellyproem50-abc123" }

**Request**  
curl --location --request POST \\  
"&lt;https://<YOUR_HOST&gt;>/rpc/device.Get" \\  
\--header "Authorization: Bearer &lt;ACCESS_TOKEN&gt;" \\  
\--header "Content-Type: application/json" \\  
\--data '{ "shellyID": "shellyproem50-abc123" }'

**Response (example)**  
{  
"shellyID": "shellyproem50-abc123",  
"id": 101,  
"source": "ws",  
"info": { /\* device info / },  
"status": { / device status / },  
"presence": "online",  
"settings": { / device config \*/ },  
"entities": \["switch:0", "em:0"\],  
"meta": { "lastReportTs": 1696239000000 }  
}

**Errors**  
• InvalidParams - when neither a valid "shellyID" nor "id" string is provided.  
• DeviceNotFound - when the device does not exist/online in the collector.

Not under the device component but relevant for this section:

### \***\*FleetManager.SendRPC\*\***

**Description**

- Send a JSON-RPC command to one or more devices. Returns a per-device result map. If a device is offline/unknown, a JSON-RPC-style error object is returned for that device.

**Params**  
{  
"dst": "shellyproem50-abc123", // string or string\[\] of Shelly IDs  
"method": "Switch.GetStatus", // required  
"params": { "id": 0 }, // optional; defaults to {}  
"silent": false // optional; forwarded to device RPC  
}

**Request**  
curl -X POST "&lt;https://<YOUR_HOST&gt;>/rpc/fleetmanager.SendRPC" \\  
\-H "Authorization: Bearer &lt;ACCESS_TOKEN&gt;" \\  
\-H "Content-Type: application/json" \\  
\-d '{  
"dst": \["shellyproem50-abc123", "shellyproem50-def456"\],  
"method": "Switch.GetStatus",  
"params": { "id": 0 }  
}'

**Response (example)**  
{  
"shellyproem50-abc123": { … },  
"shellyproem50-def456": { "code": -32002, "message": "Device offline or not found" }  
}

**Errors**  
• InvalidParams - when "method" is missing or not a string.  
• Per-device errors:

- { "code": -32002, "message": "Device offline or not found" } - target device not connected/unknown.
- { "code": -32603, "message": "&lt;text&gt;" } - unexpected internal error (when thrown error isn't already structured).
- Any structured error returned by the device RPC is passed through as-is.

## 2) WaitingRoom module

### 2.1 \`WaitingRoom.GetPending\`

**Description**

- Return devices that are currently waiting for approval.  
   The response is a map keyed by **id**(string) with the stored device JSON (jdoc) as the value.

**Params**  
{} // no params required

**Request**  
curl --location --request POST \\  
"&lt;https://<YOUR_HOST&gt;>/rpc/waitingroom.GetPending" \\  
\--header "Authorization: Bearer &lt;ACCESS_TOKEN&gt;" \\  
\--header "Content-Type: application/json" \\  
\--data '{}'

Notes  
• Keys are Shelly IDs (e.g., shellyproem50-XXXX).  
• Values are the stored jdoc snapshot for each device.

### 2.2 \`WaitingRoom.GetDenied\`

**Description**

- Return devices that were explicitly denied in the past.  
   The response is a map keyed by **id** with stored JSON (jdoc) as the value.

**Params**  
{} // no params required

**Request**  
curl --location --request POST \\  
"&lt;https://<YOUR_HOST&gt;>/rpc/waitingroom.GetDenied" \\  
\--header "Authorization: Bearer &lt;ACCESS_TOKEN&gt;" \\  
\--header "Content-Type: application/json" \\  
\--data '{}'

### 2.3 \`WaitingRoom.AcceptPendingById\`

Approve pending devices by **internal numeric IDs**.

**Params**  
{ "ids": number\[\] }

**Request**  
curl --location --request POST \\  
"&lt;https://<YOUR_HOST&gt;>/rpc/waitingroom.AcceptPendingById" \\  
\--header "Authorization: Bearer &lt;ACCESS_TOKEN&gt;" \\  
\--header "Content-Type: application/json" \\  
\--data '{  
"ids": \[1234, 1235\]  
}'

**Response**  
{ "success": \[1234, 1235\], "error": \[\] }

Errors  
• If a given ID has not been approved, it will appear in the error array.

### 2.4 \`WaitingRoom.AcceptPendingByExternalId\`

Approve pending devices by **external Shelly IDs** (string IDs).

**Params**  
{ "externalIds": string\[\] }

**Request**  
curl --location --request POST \\  
"&lt;https://<YOUR_HOST&gt;>/rpc/waitingroom.AcceptPendingByExternalId" \\  
\--header "Authorization: Bearer &lt;ACCESS_TOKEN&gt;" \\  
\--header "Content-Type: application/json" \\  
\--data '{  
"externalIds": \["shellyem-BBBB", "shellyproem50-CCCC"\]  
}'

**Response**  
{ "success": \["shellyem-BBBB", "shellyproem50-CCCC"\], "error": \[\] }

Errors  
• If an externalId cannot be resolved or approved, it will appear in the error array.

### 2.5 \`WaitingRoom.RejectPending\`

Reject pending devices by **external IDs** and remove them from the pending queue.

**Params**  
{ "shellyIDs": string\[\] }

**Request**  
curl --location --request POST \\  
"&lt;https://<YOUR_HOST&gt;>/rpc/waitingroom.RejectPending" \\  
\--header "Authorization: Bearer &lt;ACCESS_TOKEN&gt;" \\  
\--header "Content-Type: application/json" \\  
\--data '{  
"shellyIDs": \["shellyem-BBBB"\]  
}'

Notes  
• Returns success and error arrays with processed ShellyIDs.  
• Rejected devices are also removed from the active device collector.

## 3) Group module

### 3.1 \`Group.Create\`

Create a new device group. A group is identified by a unique numeric ID and can optionally include a list of devices at creation time.

**Params**  
{  
"name": string, // required, group name  
"devices": string\[\] // optional, list of ShellyIDs  
}

**Request**  
curl --location --request POST \\  
"\$HOST/rpc/group.Create" \\  
\--header "Authorization: Bearer \$TOKEN" \\  
\--header "Content-Type: application/json" \\  
\--data '{  
"name": "Kitchen",  
"devices": \["shellyproem50-abc123","shellyproem50-def456"\]  
}'

**Response**  
{  
"id": 1,  
"name": "Kitchen",  
"devices": \["shellyproem50-abc123","shellyproem50-def456"\]  
}

### 3.2 \`Group.Add\`

Add a device to an existing group by its ShellyID.

**Params**  
{  
"id": number, // required, ID of the group  
"shellyID": string // required, ShellyID of the device  
}

**Request**  
curl --location --request POST \\  
"\$HOST/rpc/group.Add" \\  
\--header "Authorization: Bearer \$TOKEN" \\  
\--header "Content-Type: application/json" \\  
\--data '{  
"id": 1,  
"shellyID": "shellyproem50-ghi789"  
}'

**Response**  
{ "added": true }

Notes  
• Returns { "added": false } if the device is already in the group or if the group does not exist.

### 3.3 \`Group.Remove\`

Remove a device from an existing group by its ShellyID.

**Params**  
{  
"id": number, // required, ID of the group  
"shellyID": string // required, ShellyID of the device  
}

**Request**  
curl --location --request POST \\  
"\$HOST/rpc/group.Remove" \\  
\--header "Authorization: Bearer \$TOKEN" \\  
\--header "Content-Type: application/json" \\  
\--data '{  
"id": 1,  
"shellyID": "shellyproem50-ghi789"  
}'

**Response**  
{ "removed": true }

Notes  
• Returns { "removed": false } if the group does not exist.

### 3.4 \`Group.Delete\`

Delete a group by its numeric ID.

**Params**  
{  
"id": number // required, ID of the group  
}

**Request**  
curl --location --request POST \\  
"\$HOST/rpc/group.Delete" \\  
\--header "Authorization: Bearer \$TOKEN" \\  
\--header "Content-Type: application/json" \\  
\--data '{  
"id": 1  
}'

**Response**  
{ "deleted": true }

Notes  
• Returns { "deleted": false } if the group does not exist.

### 3.5 \`Group.List\`

List all existing groups.  
Admins will see all groups.  
Non-admins will only see groups they have explicit permissions for.

**Params**  
{} // no parameters required

**Request**  
curl --location --request POST \\  
"\$HOST/rpc/group.List" \\  
\--header "Authorization: Bearer \$TOKEN" \\  
\--header "Content-Type: application/json" \\  
\--data '{}'

**Response**  
{  
"1": { "id": 1, "name": "Kitchen", "devices": \["shellyproem50-abc123"\] },  
"2": { "id": 2, "name": "Office", "devices": \["shellyproem50-xyz999"\] }  
}

Notes  
• Response is keyed by group IDs.  
• Each group includes its ID, name, and list of device ShellyIDs.

### 3.6 \`Group.Rename\`

Rename an existing group by its numeric ID.

**Params**  
{  
"id": number, // required, ID of the group  
"newName": string // required, new group name  
}

**Request**  
curl --location --request POST \\  
"\$HOST/rpc/group.Rename" \\  
\--header "Authorization: Bearer \$TOKEN" \\  
\--header "Content-Type: application/json" \\  
\--data '{  
"id": 1,  
"newName": "Kitchen Upstairs"  
}'

**Response**  
{ "renamed": true }

Notes  
• Returns { "renamed": false } if the group does not exist.

### \***\*FleetManager.Subscribe (minimal)\*\***

**Description**

- Subscribe to a core set of events. You must subscribe before you can receive any events.

**Params**  
{  
"events": string\[\] // required  
}

**Request**  
curl --location --request POST "&lt;https://<HOST&gt;>/rpc" \\  
\--header "Content-Type: application/json" \\  
\--data '{  
"jsonrpc": "2.0",  
"id": 1,  
"method": "FleetManager.Subscribe",  
"params": {  
"events": \[  
"Shelly.Connect",  
"Shelly.Disconnect",  
"Shelly.Status",  
"Entity.StatusChange",  
"NotifyStatus",  
"NotifyEvent"  
\]  
}  
}'

**Response (example)**  
{  
"jsonrpc": "2.0",  
"id": 1,  
"result": { "ids": \[101\] }  
}

Notes  
• Use the returned subscription IDs with FleetManager.Unsubscribe to stop receiving events.

### \***\*FleetManager.Subscribe (filtered with per-event deny list)\*\***

**Description**

- Subscribe to events but filter them to specific devices and exclude noisy keys per event.

**Params**  
{  
"events": string\[\], // required  
"options": {  
"shellyIDs"?: string\[\], // only these devices  
"events"?: { // per-event rules  
"&lt;EventName&gt;": {  
"deny": string\[\] // entity keys or patterns to exclude  
}  
}  
}  
}

**Request**  
curl --location --request POST "&lt;https://<HOST&gt;>/rpc" \\  
\--header "Content-Type: application/json" \\  
\--data '{  
"jsonrpc": "2.0",  
"id": 2,  
"method": "FleetManager.Subscribe",  
"params": {  
"events": \[  
"Shelly.Connect",  
"Shelly.Message",  
"Shelly.Disconnect",  
"Shelly.Status",  
"Shelly.Settings",  
"Shelly.KVS",  
"Shelly.Info",  
"Shelly.Presence",  
"Entity.Added",  
"Entity.Removed",  
"Entity.Event",  
"NotifyStatus",  
"NotifyEvent"  
\],  
"options": {  
"shellyIDs": \[  
"shellyproem50-AAA111BBB222",  
"shellypro3em-CCC333DDD444"  
\],  
"events": {  
"Shelly.Status": {  
"deny": \[  
":aenergy",  
":consumption",  
"em:",  
"em1:",  
"emdata:",  
"emdata1:",  
"wifi:\*"  
\]  
}  
}  
}  
}  
}'

**Response (example)**  
{  
"jsonrpc": "2.0",  
"id": 2,  
"result": { "ids": \[101, 102, 103, 104, 105, 106\] }  
}

Notes  
• Subscriptions are tied to the current connection/session.  
• Narrowing event scope reduces traffic.

### \***\*FleetManager.Unsubscribe\*\***

**Description**

- Cancel one or more active event subscriptions.

**Params**  
{  
"ids": number\[\] // required, subscription IDs returned by FleetManager.Subscribe  
}

**Request**  
curl --location --request POST "&lt;https://<HOST&gt;>/rpc" \\  
\--header "Content-Type: application/json" \\  
\--data '{  
"jsonrpc": "2.0",  
"id": 3,  
"method": "FleetManager.Unsubscribe",  
"params": {  
"ids": \[101, 102, 103\]  
}  
}'

# Events

There are two categories:

- Fleet Manager events
- Shelly device events

**Base type**  
interface Basic {  
jsonrpc: "2.0";  
method: string;  
params: any;  
}

**FleetManager.Config**

Description  
Emitted when Fleet Manager configuration changes.

Type definition (TS)  
interface FleetManagerConfig extends Basic {  
method: "FleetManager.Config";  
params: {  
\[k: string\]: any;  
};  
}

**Shelly.Connect**

Description  
A device connected. Includes a snapshot of device data on connect.

Type definition (TS)  
interface Connect extends Basic {  
method: "Shelly.Connect";  
params: {  
shellyID: string;  
device: {  
shellyID: string;  
source: string;  
info: any;  
status: any;  
settings: any;  
kvs: Record&lt;string, string&gt;;  
};  
};  
}

**Shelly.Disconnect**

Description  
A device disconnected.

Type definition (TS)  
interface Disconnect extends Basic {  
method: "Shelly.Disconnect";  
params: {  
shellyID: string;  
};  
}

**Shelly.Info**

Description  
Device info payload changed (e.g., firmware, model metadata).

Type definition (TS)  
interface Info extends Basic {  
method: "Shelly.Info";  
params: {  
shellyID: string;  
info: any;  
};  
}

**Shelly.Status**

Description  
Device status changed (telemetry, entity states, etc.).

Type definition (TS)  
interface Status extends Basic {  
method: "Shelly.Status";  
params: {  
shellyID: string;  
status: any;  
};  
}

**Shelly.Settings**

Description  
Device settings changed.

Type definition (TS)  
interface Settings extends Basic {  
method: "Shelly.Settings";  
params: {  
shellyID: string;  
settings: any;  
};  
}

**Shelly.Message**

Description  
A raw message from a device. If "req" is undefined, it's a device-originated notification; if present, it's a response to a command sent by Fleet Manager.

Type definition (TS)  
interface Message extends Basic {  
method: "Shelly.Message";  
params: {  
shellyID: string;  
message: ShellyMessageIncoming;  
req: ShellyMessageData | undefined;  
};  
}

**Shelly.Presence**

Description  
Device presence change (e.g., to/from online).

Type definition (TS)  
interface Presence extends Basic {  
method: "Shelly.Presence";  
params: {  
shellyID: string;  
presence: "online" | "offline" | "pending";  
};  
}

**Entity.Added**

Description  
A new entity (component/channel) was added to a device.

Type definition (TS)  
interface EntityAdded extends Basic {  
method: "Entity.Added";  
params: {  
shellyID: string;  
entity: {  
id: string;  
\[k: string\]: any;  
};  
};  
}

**Entity.Removed**

Description  
An entity was removed from a device.

Type definition (TS)  
interface EntityRemoved extends Basic {  
 method: "Entity.Removed";  
 params: {  
 shellyID: string;  
 entity: {  
 id: string;  
 \[k: string\]: any;  
 };  
 };  
}

**Entity.StatusChange**

Description  
An entity's status changed.

Type definition (TS)  
interface EntityStatusChange extends Basic {  
method: "Entity.StatusChange";  
params: {  
shellyID: string;  
entityId: string;  
status: any;  
};  
}

**NotifyStatus**

Description  
Generic status notification (system- or app-level).

Type definition (TS)  
interface NotifyStatus extends Basic {  
method: "NotifyStatus";  
params: any;  
}

**NotifyEvent**

Description  
Generic event notification (system- or app-level).

Type definition (TS)  
interface NotifyEvent extends Basic {  
method: "NotifyEvent";  
params: any;  
}

## Practical notes

- Subscriptions are bound to the underlying **WebSocket session**; if the socket closes, the subscription is gone. Re-subscribe after reconnects.
- Narrow your event scope up-front with \`options.shellyIDs\` and per-event rules (e.g., \`deny\` keys for \`Shelly.Status\`) to reduce traffic.
