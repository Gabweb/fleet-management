export type presence = 'online' | 'offline' | 'pending';

export interface shelly_device_t {
    shellyID: string;
    status: any;
    settings: any;
    info: any;
    online: boolean;
    loading: boolean;
    selected: boolean;
    entities: string[];
}

interface ShellyMessageIncoming {
    id?: number;
    src: string;
    dst: string;
    method: string;
    result?: any;
    params?: any;
    error?: any;
}

interface ShellyMessageData {
    jsonrpc: '2.0';
    id: number;
    src: string;
    method: string;
    params?: any;
}

export interface ShellyDeviceExternal {
    presence: presence;
    shellyID: string;
    source: string;
    info: any;
    status: any;
    _statusTs: number | undefined;
    settings: any;
    _settingsTs: number | undefined;
    selected: boolean;
    kvs: Record<string, string>;
    entities: string[];
}

export interface json_rpc_event {
    method: string;
    params: Record<string, any>;
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
        };
    }
    export interface Connect extends Basic {
        method: 'Shelly.Connect';
        params: {
            shellyID: string;
            device: ShellyDeviceExternal;
        };
    }
    export interface Disonnect extends Basic {
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
            presence: presence;
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
        params: {
            entityId: string;
        };
    }

    export interface Removed extends Basic {
        method: 'Entity.Removed';
        params: {
            entityId: string;
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

export type build_t = 'discovered' | 'devices' | 'report';

export interface discovered_t {
    node_name: string;
    name: string;
    app: string;
    ver: string;
    gen: string;
}

export interface event_t {
    timestamp: number;
    shellyID: string;
    method: string;
    data: object;
}

export interface shelly_device {
    mac: string;
    selected: boolean;
    status?: any;
    setting?: any;
}

export interface rpc_req_t {
    method: string;
    rowData: [string, string][];
}

export interface history_t {
    timestamp: number;
    device_mac: string;
    request: rpc_req_t;
    response: string;
}

export type notifcation_type_t = 'success' | 'info' | 'warning' | 'error';

export interface rpc_interface_group {
    name: string;
    method: string;
    rowData: [string, string][];
}

export interface rpc_template {
    [key: string]: rpc_interface_group[];
}

export interface response_t {
    mac: string;
    response: string;
}

export interface tag_t {
    [key: string]: {
        label: string;
        addon?: { label: string; color: string };
        click_cb?: () => void;
    };
}

export interface input_entity {
    name: string;
    id: string;
    type: 'input';
    source: string;
    properties: {
        id: number;
        type: 'button' | 'analog' | 'switch' | 'count';
        unit?: string;
    };
}

interface switch_entity {
    name: string;
    id: string;
    type: 'switch';
    source: string;
    properties: {
        id: number;
    };
}

interface temperature_entity {
    name: string;
    id: string;
    type: 'temperature';
    source: string;
    properties: {
        id: number;
    };
}

interface em1_entity {
    name: string;
    id: string;
    type: 'em1';
    source: string;
    properties: {
        id: number;
    };
}

export interface em_entity {
    name: string;
    id: string;
    type: 'em';
    source: string;
    properties: {
        id: number;
    };
}

export interface light_entity {
    name: string;
    id: string;
    type: 'light';
    source: string;
    properties: {
        id: number;
    };
}

export interface bthomesensor_entity {
    name: string;
    id: string;
    type: 'bthomesensor';
    source: string;
    properties: {
        id: number;
        unit: string;
        sensorType?: string;
    };
}

export interface virtual_boolean_entity {
    name: string;
    id: string;
    type: 'boolean' | string;
    source: string;
    properties: {
        id: number;
        view: string;
        labelTrue: string;
        labelFalse: string;
    };
}

export interface virtual_number_entity {
    name: string;
    id: string;
    type: 'number' | string;
    source: string;
    properties: {
        id: number;
        view: string;
        unit: string;
        min: number;
        max: number;
    };
}

export interface virtual_text_entity {
    name: string;
    id: string;
    type: 'text' | string;
    source: string;
    properties: {
        id: number;
        view: string;
        maxLength: number;
    };
}

export interface virtual_enum_entity {
    name: string;
    id: string;
    type: 'enum' | string;
    source: string;
    properties: {
        id: number;
        view: string;
        options: Record<string, string>;
    };
}

export interface virtual_button_entity {
    name: string;
    id: string;
    type: 'button' | string;
    source: string;
    properties: {
        id: number;
        view: string;
    };
}

export type virtual_component_t =
    | virtual_boolean_entity
    | virtual_number_entity
    | virtual_text_entity
    | virtual_enum_entity
    | virtual_button_entity;

export interface cover_entity {
    name: string;
    id: string;
    type: 'cover';
    source: string;
    properties: {
        id: number;
        favorites: number[];
    };
}

export interface virtual_component_entity {
    name: string;
    id: string;
    type: 'boolean' | 'number' | 'text' | 'enum' | 'button' | string;
    source: string;
    properties: {
        id: number;
        view: string;
        unit?: string;
    };
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
    | cover_entity;

export interface dashboard_t {
    name: string;
    id: number;
    items: any[];
}

export interface dashboard_entry_t {
    type: 'entity' | 'iframe' | 'group' | 'device';
    col_width: number;
    col_height: number;
    data: any;
}

export interface action_t {
    name: string;
    id: string;
    type: string;
    actions: object[];
}
