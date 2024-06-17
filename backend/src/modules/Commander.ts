import { ERROR_CODES } from '../tools/jsonrpc';
import { WebSocket } from 'ws';
import log4js from 'log4js';
import UserComponent from '../model/component/UserComponent';
import Component from '../model/component/Component';
import StorageComponent from '../model/component/StorageComponent';
import GroupComponent from '../model/component/GroupComponent';
import MailComponent from '../model/component/MailComponent';
import WebComponent from '../model/component/WebComponent';
import FleetManagerComponent from '../model/component/FleetManagerComponent';
import EntityComponent from '../model/component/EntityComponent';
import DeviceComponent from '../model/component/DeviceComponent';
import MdnsComponent from '../model/component/MdnsComponent';
const logger = log4js.getLogger('Commander');

export interface CommandSender {
    permissions: string[];
    group: string;
    additional?: {
        socket?: WebSocket;
    };
}
const components: Map<string, Component> = new Map();
const pluginComponents: Set<PluginGeneratedComponent> = new Set();

export const COMMAND_SENDER_INTERNAL: CommandSender = {
    permissions: ['*'],
    group: 'admin',
};

export async function exec(
    sender: CommandSender,
    method: string,
    params?: any
): Promise<any> {
    method = method.toLowerCase();

    if (!method.includes('.')) {
        return Promise.reject({
            error_code: ERROR_CODES.INVALID_REQUEST,
        });
    }

    const [componentName, submethod] = method.split('.', 2);

    if (!components.has(componentName)) {
        return Promise.reject({
            error_code: ERROR_CODES.METHOD_NOT_FOUND,
        });
    }

    const component = components.get(componentName);

    if (component == undefined) {
        return Promise.reject({
            error_code: ERROR_CODES.METHOD_NOT_FOUND,
        });
    }

    if (!component.checkParams(submethod, params)) {
        return Promise.reject({
            error_code: ERROR_CODES.INVALID_PARAMS,
        });
    }

    return component.call(sender, submethod, params);
}

export function execInternal(method: string, params?: any) {
    return exec(COMMAND_SENDER_INTERNAL, method, params);
}

export function registerComponent<T extends Component>(
    component: T,
    allowOverride = false
) {
    if (components.has(component.name)) {
        if (!allowOverride) return;
        logger.warn('Overriding component %s', component.name);
    }
    logger.info(
        "Registering component '%s' with methods:[%s]",
        component.name,
        String(component.listMethods())
    );
    components.set(component.name.toLowerCase(), component);
}

export function registerComponentFromPlugin(
    name: string,
    methods: Map<string, (params: any, sender: CommandSender) => Promise<any>>
) {
    const component = new PluginGeneratedComponent(name, methods);
    registerComponent(component);
    pluginComponents.add(component);
}

export function deleteComponent(name: string) {
    components.delete(name);
}

export function getComponent(name: string) {
    return components.get(name);
}

export function getComponents() {
    return components;
}

export function getPluginComponents() {
    return pluginComponents;
}

export function listCommands() {
    return Array.from(components.keys());
}

export async function getConfig(name: string) {
    const component = getComponent(name);
    if (component == undefined) {
        return {};
    }
    return component.getConfig();
}

export async function getStatus(name: string) {
    const component = getComponent(name);
    if (component == undefined) {
        return {};
    }
    return component.getStatus();
}

// ------------------------------------------------------------------------------------------------
// Register default components
// ------------------------------------------------------------------------------------------------

registerComponent(new StorageComponent());
registerComponent(new UserComponent());
registerComponent(new GroupComponent());
registerComponent(new MailComponent());
registerComponent(new WebComponent());
registerComponent(new FleetManagerComponent());
registerComponent(new EntityComponent());
registerComponent(new DeviceComponent());
registerComponent(new MdnsComponent());

// ------------------------------------------------------------------------------------------------
// Helper class
// ------------------------------------------------------------------------------------------------

class PluginGeneratedComponent extends Component {
    constructor(
        name: string,
        methods: Map<string, (params: any, sender: CommandSender) => Promise<any>>
    ) {
        super(name, {
            set_config_methods: false,
            auto_apply_config: false,
        });
        // appends methods
        for (const [name, fn] of methods.entries()) {
            this.methods.set(name, fn);
        }
    }

    override async getConfig(params?: any) {
        if (this.methods.has('getconfig')) {
            return this.call(COMMAND_SENDER_INTERNAL, 'getconfig');
        }
        return {};
    }

    override async getStatus(params?: any) {
        if (this.methods.has('getstatus')) {
            return this.call(COMMAND_SENDER_INTERNAL, 'getstatus');
        }
        return {};
    }

    override checkParams(method: string, params?: any): boolean {
        return true;
    }

    override async setConfig(config: Record<string, any>) {
        if (!this.methods.has('setconfig')) {
            return Promise.reject({
                error_code: ERROR_CODES.METHOD_NOT_FOUND,
            });
        }
        return this.call(COMMAND_SENDER_INTERNAL, 'setconfig', config);
    }

    protected override getDefaultConfig(): Record<string, any> {
        return {};
    }
}
