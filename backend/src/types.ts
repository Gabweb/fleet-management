export interface ShellyDeviceExternal {
    shellyID: string;
    source: string | null;
    info: any;
    status: any;
    presence: 'online' | 'offline' | 'pending';
    settings: any;
    entities: string[];
}

export interface ShellyMessageData {
    jsonrpc: '2.0';
    id: number;
    src: string;
    method: string;
    params?: any;
}

export interface ShellyMessage {
    data_sent: ShellyMessageData;
    cb?: (result?: ShellyMessageIncoming, err?: any) => void;
}

export interface ShellyMessageIncoming {
    id?: number;
    src: string;
    dst: string;
    method: string;
    result?: any;
    params?: any;
    error?: any;
}

interface outgoing_jsonrpc_error {
    jsonrpc?: '2.0';
    id: number | null;
    src: string;
    dst?: string | undefined;
    result?: any;
    error: {
        code: number;
        message: string;
    };
}

export type ShellyResponseCallback = (
    resp: ShellyMessageIncoming | outgoing_jsonrpc_error,
    req?: ShellyMessageData
) => void;

export interface ShellyMessageUnsafe {
    method: string;
    id: number;
    src: string;
    params?: object;
}

export interface message_handler_t {
    resolve: (value: unknown) => void;
    reject: (reason?: any) => void;
    method: string;
}

export interface json_rpc_event {
    method: string;
    params: Record<string, any>;
}

export interface user_t {
    username: string;
    password: string;
    permissions: string[];
    group: string;
    enabled: boolean;
}

export interface PluginInfo {
    name: string;
    version: string;
    description: string;
    config?: {
        metadata?: boolean;
        menuItems: any[];
    } & Record<string, any>;
}

export interface PluginData {
    location: string;
    info: PluginInfo;
}

export type event_data_t = {
    device?: AbstractDevice;
    reason?: string;
};
export type shelly_presence_t = 'online' | 'offline' | 'pending';

export interface FleetManagerPlugin extends ReturnType<typeof require> {
    load?(properties?: any): void;
    on?(event: json_rpc_event, eventData?: event_data_t): void;
    unload?(): void;
    addMetadata?(
        event: json_rpc_event,
        additional: event_data_t
    ): any | Promise<any>;
}

export namespace FleetManagerEvent {
    export interface Config extends json_rpc_event {
        method: 'FleetManager.Config';
        params: {
            name: 'main';
            config: any;
        };
    }
}

export namespace ShellyEvent {
    export interface Basic extends json_rpc_event {
        method: string;
        params: {
            shellyID: string;
            metadata?: any;
        };
    }
    export interface Connect extends Basic {
        method: 'Shelly.Connect';
        params: {
            shellyID: string;
            device: ShellyDeviceExternal;
        };
    }
    export interface Disconnect extends Basic {
        method: 'Shelly.Disconnect';
        params: {
            shellyID: string;
        };
    }
    export interface Info extends Basic {
        method: 'Shelly.Info';
        params: {
            shellyID: string;
            info: any;
        };
    }
    export interface Status extends Basic {
        method: 'Shelly.Status';
        params: {
            shellyID: string;
            status: any;
        };
    }
    export interface Settings extends Basic {
        method: 'Shelly.Settings';
        params: {
            shellyID: string;
            settings: any;
        };
    }
    export interface Message extends Basic {
        method: 'Shelly.Message';
        params: {
            shellyID: string;
            message: ShellyMessageIncoming;
            req: ShellyMessageData | undefined;
        };
    }
    export interface KVS extends Basic {
        method: 'Shelly.KVS';
        params: {
            shellyID: string;
            kvs: Record<string, string>;
        };
    }

    export interface Presence extends Basic {
        method: 'Shelly.Presence';
        params: {
            shellyID: string;
            presence: shelly_presence_t;
        };
    }
}

export namespace EntityEvent {
    export interface Basic extends json_rpc_event {
        method: string;
        params: {
            entityId: string;
        };
    }

    export interface Added extends Basic {
        method: 'Entity.Added';
    }

    export interface Removed extends Basic {
        method: 'Entity.Removed';
    }

    export interface Event extends Basic {
        method: 'Entity.Event';
        params: {
            entityId: string;
            event: 'single_push' | 'double_push' | 'triple_push' | 'long_push';
        };
    }

    export interface StatusChange extends Basic {
        method: 'Entity.StatusChange';
        params: {
            entityId: string;
            status: any;
        };
    }
}

// BEGIN: Entity

interface entity {
    name: string;
    id: string;
    type: string;
    source: string;
    properties: { id: number } & object;
}

export interface input_entity extends entity {
    type: 'input';
    properties: entity['properties'] & {
        type: 'button' | 'analog' | 'switch' | 'count';
        unit?: string;
    };
}

export interface switch_entity extends entity {
    type: 'switch';
}

export interface temperature_entity extends entity {
    type: 'temperature';
}

export interface em1_entity extends entity {
    type: 'em1';
}

export interface em_entity extends entity {
    type: 'em';
}

export interface light_entity extends entity {
    type: 'light';
}

export interface rgb_entity extends entity {
    type: 'rgb';
}

export interface rgbw_entity extends entity {
    type: 'rgbw';
}

export interface bthomesensor_entity extends entity {
    type: 'bthomesensor';
    properties: entity['properties'] & {
        unit: string;
        sensorType?: string;
    };
}

export interface virtual_boolean_entity extends entity {
    type: 'boolean' | string;
    properties: entity['properties'] & {
        view: string;
        labelTrue: string;
        labelFalse: string;
    };
}

export interface virtual_number_entity extends entity {
    type: 'number' | string;
    properties: entity['properties'] & {
        view: string;
        unit: string;
        min: number;
        max: number;
    };
}

export interface virtual_text_entity extends entity {
    type: 'text' | string;
    properties: entity['properties'] & {
        view: string;
        maxLength: number;
    };
}

export interface virtual_enum_entity extends entity {
    type: 'enum' | string;
    properties: entity['properties'] & {
        view: string;
        options: Record<string, string>;
    };
}

export interface virtual_button_entity extends entity {
    type: 'button' | string;
    properties: entity['properties'] & {
        view: string;
    };
}

export type virtual_component_t =
    | virtual_boolean_entity
    | virtual_number_entity
    | virtual_text_entity
    | virtual_enum_entity
    | virtual_button_entity;

export interface cover_entity extends entity {
    type: 'cover';
    properties: entity['properties'] & {
        favorites: number[];
    };
}

export function isInputEntity(obj: any): obj is input_entity {
    return (
        typeof obj === 'object' &&
        typeof obj.name === 'string' &&
        typeof obj.id === 'string' &&
        typeof obj.type === 'string' &&
        obj.type === 'input' &&
        typeof obj.source === 'string' &&
        typeof obj.properties === 'object' &&
        typeof obj.properties.id === 'number'
    );
}

export function isSwitchEntity(obj: any): obj is switch_entity {
    return (
        typeof obj === 'object' &&
        typeof obj.name === 'string' &&
        typeof obj.id === 'string' &&
        typeof obj.type === 'string' &&
        obj.type === 'switch' &&
        typeof obj.source === 'string' &&
        typeof obj.properties === 'object' &&
        typeof obj.properties.id === 'number'
    );
}

export function isTemperatureEntity(obj: any): obj is temperature_entity {
    return (
        typeof obj === 'object' &&
        typeof obj.name === 'string' &&
        typeof obj.id === 'string' &&
        typeof obj.type === 'string' &&
        obj.type === 'temperature' &&
        typeof obj.source === 'string' &&
        typeof obj.properties === 'object' &&
        typeof obj.properties.id === 'number'
    );
}

export type entity_t =
    | input_entity
    | switch_entity
    | temperature_entity
    | em1_entity
    | em_entity
    | light_entity
    | bthomesensor_entity
    | virtual_component_t
    | rgb_entity
    | rgbw_entity
    | cover_entity;

export function isValidEntity(obj: any): obj is entity_t {
    return isInputEntity(obj) || isSwitchEntity(obj) || isTemperatureEntity(obj);
}

// END: Entity

declare module 'express-serve-static-core' {
    interface Request {
        token?: string;
        user?: user_t;
    }
}

import ws from 'ws';
import AbstractDevice from './model/AbstractDevice';
declare module 'ws' {
    export interface WebSocket extends ws {
        isAlive: boolean;
    }
}
