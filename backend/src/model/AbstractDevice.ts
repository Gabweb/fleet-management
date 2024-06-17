/* eslint-disable no-dupe-class-members */
import RpcTransport from './transport/RpcTransport';
import * as ShellyEvents from '../modules/ShellyEvents';
import { ShellyDeviceExternal, entity_t, shelly_presence_t } from '../types';
import { ERROR_CODES, buildOutgoingJsonRpcError } from '../tools/jsonrpc';

interface DeviceInfo extends Record<string, string | number> {
    id: string;
    mac: string;
    model: string;
    gen: number;
    fw_id: string;
    ver: string;
    app: string;
}

export default abstract class AbstractDevice {
    public readonly shellyID: string;
    #reconnected: boolean;
    #transport?: RpcTransport;
    #presence: shelly_presence_t;
    #status: Record<string, any>;
    #info: DeviceInfo;
    #config: Record<string, any>;
    #entities: entity_t[];
    protected _meta: Record<string, any>;

    constructor(
        shellyID: string,
        transport: RpcTransport | undefined,
        presence: shelly_presence_t,
        info: DeviceInfo,
        status: Record<string, any>,
        config: Record<string, any>,
        reconnected: boolean
    ) {
        this.shellyID = shellyID;
        this.#presence = presence;
        this.#info = info;
        this.#status = status;
        this.#config = config;
        this.#reconnected = reconnected;
        this._meta = {};
        this.#entities = this.generateEntities();
        // this emits online event
        this.setTransport(transport);
    }

    protected abstract onStateChange(): void;
    protected abstract onMessage(message: any, request?: any): void;

    // ----------------------------------------------------
    // Remote Procedure Call logic
    // ----------------------------------------------------

    sendRPC(method: string, params?: any, silent?: boolean): Promise<any> {
        const NOT_FOUND = buildOutgoingJsonRpcError(
            ERROR_CODES.DEVICE_NOT_FOUND_ERROR,
            null
        );

        if (!this.#transport) {
            return Promise.reject(NOT_FOUND);
        }

        return this.#transport.sendRPC(method, params, silent);
    }

    sendUnsafe(message: any) {
        return this.#transport?.sendUnsafe(message);
    }

    destroy() {
        if (this.#transport) {
            this.#transport.destroy();
            this.setTransport(undefined);
        }
    }

    // ----------------------------------------------------
    // Entities
    // ----------------------------------------------------

    addEntity(entity: entity_t) {
        if (this.#entities.some((en) => en.id === entity.id)) {
            return;
        }

        this.#entities.push(entity);
        ShellyEvents.emitEntityAdded(entity);
    }

    removeEntity(entity: entity_t) {
        const index = this.#entities.findIndex((en) => en.id === entity.id);
        if (index === -1) {
            return;
        }

        this.#entities.splice(index, 1);
        ShellyEvents.emitEntityRemoved(entity);
    }

    protected abstract generateEntities(): entity_t[];
    protected abstract findMessageReason(key: string, message: any): string;

    // ----------------------------------------------------
    // Components
    // ----------------------------------------------------

    setComponentConfig(key: string, config: any) {
        this.#config[key] = config;
        ShellyEvents.emitShellySettings(this);
        this.onStateChange();
    }

    setComponentStatus(key: string, status: any) {
        this.#status[key] = mergeStatusObjects(this.status?.[key], status);

        // Emit the whole status for each component update in order to have the correct reason
        const reason = this.findMessageReason(key, status);
        ShellyEvents.emitShellyStatus(this, reason);

        this.onStateChange();
    }

    public removeComponent(key: string) {
        delete this.#status[key];
        delete this.#config[key];
        this.onStateChange();
        ShellyEvents.emitShellySettings(this);
        ShellyEvents.emitShellyStatus(this, 'shelly:generic');
    }

    // ----------------------------------------------------
    // Getters and Setters
    // ----------------------------------------------------

    public setTransport(transport: RpcTransport | undefined) {
        if (transport === undefined) {
            if (!this.#transport) {
                // we are already offline, do nothing
                return;
            }
            this.#transport = undefined;
            this.#presence = 'offline';
            ShellyEvents.emitShellyDisconnected(this);
            return;
        }
        // Send online event
        ShellyEvents.emitShellyConnected(this);

        // remove all from old transport
        this.#transport?.eventemitter.removeAllListeners();
        // add new transport and subscribe to transport's events
        this.#transport = transport;
        this.#transport.eventemitter.on('close', () => {
            if (!this.#reconnected) {
                this.setPresence('offline');
            }
            this.#reconnected = false;
            this.setTransport(undefined);
        });
        this.#transport.eventemitter.on('message', (msg, req) => {
            this.onMessage(msg, req);
        });
        this.#transport.eventemitter.on('error', (e) => {
            console.warn('Internal Transport Error shellyID:[%s]', this.shellyID, e);
        });
    }

    setStatus(status: any, reason = 'shelly:generic') {
        for (const key in status) {
            this.#status[key] = mergeStatusObjects(this.#status?.[key], status[key]);
        }
        this.onStateChange();
        ShellyEvents.emitShellyStatus(this, reason);
    }

    setConfig(config: any) {
        this.#config = config;
        this.onStateChange();
        ShellyEvents.emitShellySettings(this);
    }

    setPresence(presence: shelly_presence_t) {
        this.#presence = presence;
        this.onStateChange();
        ShellyEvents.emitShellyPresence(this);
    }

    setInfo(info: DeviceInfo) {
        this.#info = info;
        this.onStateChange();
        ShellyEvents.emitShellyDeviceInfo(this);
    }

    toJSON(): ShellyDeviceExternal {
        return {
            shellyID: this.shellyID,
            source: this.transport?.name || 'offline',
            info: this.#info,
            status: this.#status,
            presence: this.#presence,
            settings: this.#config,
            entities: this.#entities.map((entity) => entity.id),
        };
    }

    get meta() {
        return structuredClone(this._meta);
    }

    get presence() {
        return this.#presence;
    }

    set reconnected(reconnected: boolean) {
        this.#reconnected = reconnected;
    }

    get entities() {
        return Array.from(this.#entities);
    }

    get info() {
        return structuredClone(this.#info);
    }

    get status() {
        return structuredClone(this.#status);
    }

    get config() {
        return structuredClone(this.#config);
    }

    get source() {
        return this.#transport?.name;
    }

    get transport() {
        return this.#transport;
    }

    get online() {
        return !!this.#transport;
    }
}

//#region Helpers

export function mergeStatusObjects(original: any, patch: any) {
    if (original == undefined) return patch;
    if (typeof original === 'object' && typeof patch === 'object' && patch != null) {
        for (const key in patch) {
            if (typeof original[key] === 'object') {
                original[key] = mergeStatusObjects(original[key], patch[key]);
            } else {
                original[key] = patch[key];
            }
        }
    }
    return original;
}

//#endregion
