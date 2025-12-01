import * as log4js from 'log4js';
import * as ShellyEvents from '../modules/ShellyEvents';
import RpcError from '../rpc/RpcError';
import type {ShellyDeviceExternal, entity_t, shelly_presence_t} from '../types';
/* eslint-disable no-dupe-class-members */
import type RpcTransport from './transport/RpcTransport';

const logger = log4js.getLogger('AbstractDevice');

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
    public readonly id: number;
    #reconnected: boolean;
    #transport?: RpcTransport;
    #presence: shelly_presence_t;
    #status: Record<string, any>;
    #info: DeviceInfo;
    #config: Record<string, any>;
    #entities: entity_t[];
    protected _meta: Record<string, any>;
    #lastReportTs: number;

    constructor(
        shellyID: string,
        transport: RpcTransport | undefined,
        presence: shelly_presence_t,
        info: DeviceInfo,
        status: Record<string, any>,
        config: Record<string, any>,
        reconnected: boolean,
        id: number,
        lastReportTs = Date.now()
    ) {
        this.shellyID = shellyID;
        this.id = id;
        this.#presence = presence;
        this.#info = info;
        this.#status = status;
        this.#config = config;
        this.#reconnected = reconnected;
        this._meta = {};
        this.#entities = this.generateEntities();
        this.#lastReportTs = lastReportTs;
        // this emits online event
        this.setTransport(transport);
    }

    protected abstract onStateChange(): void;
    protected abstract onMessage(message: any, request?: any): void;

    // ----------------------------------------------------
    // Remote Procedure Call logic
    // ----------------------------------------------------

    sendRPC(method: string, params?: any, silent?: boolean): Promise<any> {
        if (!this.#transport) {
            throw RpcError.DeviceNotFound();
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
            logger.warn('Entity already exists', entity);
            return;
        }

        logger.info('Entity added', entity);

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
            this.#lastReportTs = Date.now();
            this.onMessage(msg, req);
        });
        this.#transport.eventemitter.on('err', (e) => {
            console.warn(
                'Internal Transport Error shellyID:[%s]',
                this.shellyID,
                e
            );
        });
    }

    setStatus(status: any, reason = 'shelly:generic') {
        for (const key in status) {
            this.#status[key] = mergeStatusObjects(
                this.#status?.[key],
                status[key]
            );
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
        const meta = {
            lastReportTs: this.#lastReportTs
        };

        return {
            shellyID: this.shellyID,
            id: this.id,
            source: this.transport?.name || 'offline',
            info: this.#info,
            status: this.#status,
            presence: this.#presence,
            settings: this.#config,
            entities: this.#entities.map((entity) => entity.id),
            meta
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

export function mergeStatusObjects(original: any, patch: any): any {
    if (patch === undefined) return original;

    const origIsObj = typeof original === 'object' && original != null;
    const patchIsObj = typeof patch === 'object' && patch != null;

    if (origIsObj && patchIsObj) {
        for (const key of Object.keys(patch)) {
            original[key] = mergeStatusObjects(original[key], patch[key]);
        }
        return original;
    }

    return patch;
}

//#endregion
