import { useDevicesStore } from '@/stores/devices';
import { FLEET_MANAGER_WEBSOCKET } from '../constants';
import { ShellyEvent, entity_t, json_rpc_event } from '@/types';
import { useEntityStore } from '@/stores/entities';
import { USE_LOGIN_ZITADEL } from '@/constants';
import zitadelAuth from '@/helpers/zitadelAuth';

let connected = false;
let client = undefined as WebSocket | undefined;

interface json_rpc_result {
    id: number;
    src: string;
    dst: string;
    error?: any;
    result?: any;
}

function is_rpc_response(data: any): data is json_rpc_result {
    return (
        typeof data === 'object' &&
        (typeof data.result === 'object' || typeof data.result === 'undefined') &&
        (typeof data.error === 'object' || typeof data.error === 'undefined') &&
        typeof data.id === 'number' &&
        typeof data.src === 'string' &&
        typeof data.dst === 'string'
    );
}

function is_json_rpc_event(data: any): data is json_rpc_event {
    return typeof data === 'object' && typeof data.method === 'string' && typeof data.params === 'object';
}

let id = 2;
const waiting = new Map<number, { resolve: (value: unknown) => void; reject: (reason?: any) => void }>();

const sendQueue: any[] = [];

export function sendRPC<T = any>(dst: string | string[], method: string, params?: any): Promise<T> {
    if (client == undefined || client.readyState !== client.OPEN) {
        console.warn('websocket not connecting, fallback to http :(');
        return new Promise((resolve, reject) => {
            sendQueue.push({ dst, method, params, resolve, reject });
        });
    }

    client.send(
        JSON.stringify({
            jsonrpc: '2.0',
            id,
            method,
            src: 'FLEET_MANAGER_UI',
            dst,
            params,
        })
    );

    const response = new Promise((resolve, reject) => {
        waiting.set(id, { resolve, reject });
    });

    const timeout = new Promise((_, reject) => setTimeout(reject, 10_000));

    id = id + 1;
    return Promise.race([response, timeout]) as Promise<T>;
}

function handleRpcResponse(response: json_rpc_result) {
    const { id } = response;
    if (waiting.has(id)) {
        const { resolve, reject } = waiting.get(id)!;
        if (typeof response.result !== 'undefined') {
            resolve(response.result);
            return;
        }
        reject(response.error ?? response);
    }
}

function handleShellyEvents(event: json_rpc_event, devicesStore: ReturnType<typeof useDevicesStore>) {
    const shellyID = event.params.shellyID;
    const method = event.method;
    if (typeof shellyID !== 'string') {
        console.error('bad event, no shellyID', method);
        return;
    }

    switch (method) {
        case 'Shelly.Connect': {
            const connectEvent = event as ShellyEvent.Connect;
            devicesStore.deviceConnected(connectEvent.params.device);
            break;
        }
        case 'Shelly.Disconnect': {
            devicesStore.deviceDisconnected(shellyID);
            break;
        }
        case 'Shelly.Info': {
            const infoEvent = event as ShellyEvent.Info;
            devicesStore.patchInfo(shellyID, infoEvent.params.info);
            break;
        }
        case 'Shelly.Status': {
            const statusEvent = event as ShellyEvent.Status;
            devicesStore.patchStatus(shellyID, statusEvent.params.status);
            break;
        }
        case 'Shelly.Settings': {
            const settingsEvent = event as ShellyEvent.Settings;
            devicesStore.patchSettings(shellyID, settingsEvent.params.settings);
            break;
        }
        // case "Shelly.KVS": {
        //     const groupEvent = event as ShellyEvent.KVS;
        //     devicesStore.patchKVS(shellyID, groupEvent.params.kvs);
        //     break;
        // }
        case 'Shelly.Presence': {
            const presenceEvent = event as ShellyEvent.Presence;
            devicesStore.patchPresence(shellyID, presenceEvent.params.presence);
            break;
        }

        case 'Shelly.KVS':
            // do nothing
            break;

        default:
            console.error('Unknown event', event);
            break;
    }
}

function handleEntityEvents(event: json_rpc_event, entitiesStore: ReturnType<typeof useEntityStore>) {
    const method = event.method;
    const entityId = event.params.entityId;

    switch (true) {
        case /\.added$/i.test(method): {
            entitiesStore.addEntity(entityId);

            break;
        }

        case /\.removed$/i.test(method): {
            entitiesStore.removeEntities([entityId]);

            break;
        }

        case /\.event$/i.test(method): {
            const _event = event.params.event;

            if (!_event) {
                console.error('Entity event without event data', event);
                break;
            }

            entitiesStore.notifyEvent(entityId, _event);

            break;
        }

        default: {
            console.error('Unknown event', event);
            break;
        }
    }
}

const temporarySubscriptions = new Set<number>();

export async function clearTemporarySubscriptions() {
    if (temporarySubscriptions.size == 0) return;
    await sendRPC('FLEET_MANAGER', 'FleetManager.Unsubscribe', {
        ids: [...temporarySubscriptions],
    });
    temporarySubscriptions.clear();
}

export async function addTemporarySubscription(shellyIDs: string[]) {
    const response = await sendRPC('FLEET_MANAGER', 'FleetManager.Subscribe', {
        events: ['Shelly.Status'],
        options: {
            shellyIDs,
        },
    });
    for (const id of response.ids) {
        temporarySubscriptions.add(id);
    }
}

function getConnectionParams() {
    return {
        events: [
            'Shelly.Connect',
            'Shelly.Disconnect',
            'Shelly.Status',
            'Shelly.Settings',
            'Shelly.KVS',
            'Shelly.Info',
            'Shelly.Presence',
            'Entity.Added',
            'Entity.Removed',
            'Entity.Event',
            'NotifyStatus',
            'NotifyEvent',
        ],
        options: {
            events: {
                'Shelly.Status': {
                    deny: ['*:aenergy', '*:consumption', 'em:*', 'em1:*', 'emdata:*', 'emdata1:*', 'wifi:*'],
                },
            },
        },
    };
}

export async function connect() {
    if (connected) return;

    let token: string | undefined | null = undefined;

    if (USE_LOGIN_ZITADEL && zitadelAuth) {
        token = await zitadelAuth.oidcAuth.mgr.getUser().then((usr) => usr?.access_token);
    } else {
        token = localStorage.getItem('fleet-management-token');
    }

    if (!token || token.length == 0) return;

    const devicesStore = useDevicesStore();
    const entitiesStore = useEntityStore();

    client = new WebSocket(FLEET_MANAGER_WEBSOCKET, token);

    client.onclose = () => {
        console.log('ws closed');
        connected = false;
        onClose();
    };
    client.onerror = (e) => {
        console.error('ws error: ', e);
        connected = false;
    };
    client.onopen = () => {
        console.log('ws connected');
        connected = true;
        // send subscribe event
        client?.send(
            JSON.stringify({
                jsonrpc: '2.0',
                id: 1,
                method: 'FleetManager.Subscribe',
                src: 'FLEET_MANAGER_UI',
                dst: 'FLEET_MANAGER',
                params: getConnectionParams(),
            })
        );

        sendQueue.forEach((item) => {
            const { dst, method, params, resolve, reject } = item;
            sendRPC(dst, method, params).then(resolve, reject);
        });

        onConnect();
    };
    client.onmessage = (e) => {
        try {
            const parsed = JSON.parse(e.data);
            if (is_rpc_response(parsed)) {
                handleRpcResponse(parsed);
                return;
            }

            if (!is_json_rpc_event(parsed)) {
                return;
            }

            const { method } = parsed;

            switch (true) {
                case method.startsWith('Shelly.'):
                    handleShellyEvents(parsed, devicesStore);
                    break;

                case /^entity\./i.test(method):
                    handleEntityEvents(parsed, entitiesStore);
                    break;

                default:
                    console.error('skipping ws event', parsed);
                    break;
            }
        } catch (error) {
            console.error('error in ws event', error);
        }
    };
}

export function close() {
    if (client != undefined) {
        client.close();
    }
}

export function getRegistry(name: string) {
    return {
        getItem: async <T>(key: string) => {
            return sendRPC<T>('FLEET_MANAGER', 'Storage.GetItem', {
                registry: name,
                key,
            });
        },
        setItem: async (key: string, value: any) => {
            return sendRPC('FLEET_MANAGER', 'Storage.SetItem', {
                registry: name,
                key,
                value,
            });
        },
        removeItem: async (key: string) => {
            return sendRPC('FLEET_MANAGER', 'Storage.RemoveItem', {
                registry: name,
                key,
            });
        },
        keys: async () => {
            return sendRPC('FLEET_MANAGER', 'Storage.Keys', { registry: name });
        },
    };
}

export async function listDevices(): Promise<Record<string, any>> {
    return sendRPC('FLEET_MANAGER', 'device.list');
}

export async function listEntities(): Promise<Record<string, entity_t>> {
    return sendRPC('FLEET_MANAGER', 'entity.list');
}

export async function enablePlugin(name: string, value: boolean) {
    return sendRPC('FLEET_MANAGER', `plugin:${name}.setconfig`, {
        config: { enable: value },
    });
}

export async function listPlugins() {
    return sendRPC('FLEET_MANAGER', 'fleetmanager.listplugins');
}

export async function getSavedTemplates() {
    return await sendRPC('FLEET_MANAGER', 'fleetmanager.listrpc');
}

export async function getServerConfig() {
    return sendRPC('FLEET_MANAGER', 'fleetmanager.getconfig');
}

export async function getEntityInfo(id: string): Promise<entity_t | null> {
    return await sendRPC('FLEET_MANAGER', 'entity.getinfo', { id });
}

function onConnect() {
    console.log('WS ON CONNECT CALLED');
    useDevicesStore().fetchDevices();
    useEntityStore().fetchEntities();
}

function onClose() {
    console.log('WS ON CLOSE CALLED');
}

setInterval(() => {
    if (!connected) {
        connect();
    }
}, 5000);
