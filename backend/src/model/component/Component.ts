import * as components from '../../config/components';
import type { CommandSender } from '../../modules/Commander';
import { ERROR_CODES } from '../../tools/jsonrpc';
import { getLogger, Logger } from 'log4js';
import { configRc } from '../../config/index';
import {
    notifyComponentEvent,
    notifyComponentStatus,
} from '../../modules/ShellyEvents';

interface ComponentProperties {
    auto_apply_config?: boolean;
    set_config_methods?: boolean;
    config_base?: Record<string, any>;
}

type MethodCallback = (params: any, sender: CommandSender) => any | PromiseLike<any>;

const DEFAULT_PROPERTIES = Object.freeze({
    auto_apply_config: true,
    set_config_methods: true,
    config_base: Object.freeze({}),
} as const);

export default abstract class Component<
    T extends Record<string, any> = Record<string, any>,
> {
    readonly name: string;
    protected methods: Map<string, MethodCallback>;
    protected config: T;
    readonly logger: Logger;

    constructor(name: string, properties?: ComponentProperties) {
        this.name = name;
        this.methods = new Map();
        this.logger = getLogger('Component ' + name);
        const props = Object.assign({}, DEFAULT_PROPERTIES, properties);
        let defaultConfig = this.getDefaultConfig();
        if (
            configRc.components &&
            configRc.components[name as keyof typeof configRc.components]
        ) {
            // @ts-expect-error config with diff props
            defaultConfig = configRc.components[name];
        }
        this.config = Object.assign(
            {},
            props.config_base,
            components.getConfigSync(name, defaultConfig)
        );
        this.logger.debug('CONFIG:[%s]', JSON.stringify(this.config));

        if (props.set_config_methods) {
            // default methods
            this.methods.set('getstatus', (params) => this.getStatus(params));
            this.methods.set('getconfig', (params) => this.getConfig(params));
            this.methods.set('setconfig', (params) => this.setConfig(params.config));
        }

        this.methods.set('listmethods', () => this.listMethods());

        if (props.auto_apply_config) {
            this.setConfig(this.config, true);
        }
    }

    public async call(sender: CommandSender, method: string, params?: any) {
        if (!this.methods.has(method)) {
            return Promise.reject({
                error_code: ERROR_CODES.METHOD_NOT_FOUND,
            });
        }

        if (!this.checkPermissions(sender, method, params)) {
            return Promise.reject({
                error: 'Insufficient permissions',
            });
        }

        const methodHandler = this.methods.get(method);
        if (typeof methodHandler !== 'function') {
            return Promise.reject({
                error_code: ERROR_CODES.METHOD_NOT_FOUND,
            });
        }

        if (!this.checkParams(method, params)) {
            return Promise.reject({
                error_code: ERROR_CODES.INVALID_PARAMS,
            });
        }

        try {
            let response = await methodHandler(params, sender);
            // do not send undefined
            if (response == undefined) {
                response = null;
            }
            return response;
        } catch (error) {
            return Promise.reject({
                error_code: ERROR_CODES.SERVER_ERROR,
                error: String(error),
            });
        }
    }

    protected checkPermissions(sender: CommandSender, method: string, params?: any) {
        return (
            sender.group === 'admin' ||
            sender.permissions.includes('*') ||
            sender.permissions.includes(`${this.name}.${method}`.toLowerCase())
        );
    }

    public checkParams(method: string, params?: any): boolean {
        if (method === 'setconfig' && this.methods.has('setconfig')) {
            return (
                typeof params === 'object' &&
                typeof params.config === 'object' &&
                Object.keys(params.config).length > 0
            );
        }
        return true;
    }

    public listMethods() {
        return Array.from(this.methods.keys());
    }

    // allow to be overridden
    protected checkConfigKey(key: string, value: any) {
        return false;
    }

    // allow to be overridden
    protected applyConfigKey(
        key: string,
        value: any,
        config: Partial<T>,
        init?: boolean
    ): void | Promise<void> {
        (this.config as Record<string, any>)[key] = value;
    }

    protected configChanged() {
        // empty
    }

    protected abstract getDefaultConfig(): T;

    protected emitEvent(event: string) {
        notifyComponentEvent(this.name, event);
    }

    protected emitStatus(patch: object) {
        notifyComponentStatus({ [this.name]: patch });
    }

    // allow to be overridden
    getStatus(params?: any): Record<string, any> {
        return {};
    }

    getConfig(params?: any): Partial<T> {
        return Object.assign({}, this.config);
    }

    protected async _persistConfig() {
        return await components.saveConfig(this.name, this.config);
    }

    async setConfig(config: Partial<T>, init = false) {
        for (const key in config) {
            if (this.checkConfigKey(key, config[key])) {
                await this.applyConfigKey(key, config[key], config, init);
            }
        }
        this._persistConfig();
        this.configChanged();
        // fire config changed event
        return {
            component: this.name,
            event: 'config_changed',
        };
    }
}
