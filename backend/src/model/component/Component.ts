import {type Logger, getLogger} from 'log4js';
import * as components from '../../config/components';
import {DEV_MODE, configRc} from '../../config/index';
import {
    notifyComponentEvent,
    notifyComponentStatus
} from '../../modules/ShellyEvents';
import RpcError from '../../rpc/RpcError';
import type {Context} from '../../types';
import {validator} from '../../validations';
import type CommandSender from '../CommandSender';

interface ComponentProperties {
    auto_apply_config?: boolean;
    set_config_methods?: boolean;
    config_base?: Record<string, any>;
}

const DEFAULT_PROPERTIES = Object.freeze({
    auto_apply_config: true,
    set_config_methods: true,
    config_base: Object.freeze({})
} as const);

export default abstract class Component<
    T extends Record<string, any> = Record<string, any>
> {
    readonly name: string;
    protected methods: Map<
        string,
        {
            exec: (params: any, sender: CommandSender) => any;
            checkParams: (params: any) => boolean;
            checkPermissions: (sender: CommandSender, params?: any) => boolean;
        }
    >;
    protected config: T;
    readonly logger: Logger;

    constructor(name: string, properties?: ComponentProperties) {
        this.name = name;
        name = name.toLowerCase();
        this.methods = new Map();
        this.logger = getLogger(`Component ${name}`);
        const props = Object.assign({}, DEFAULT_PROPERTIES, properties);
        let defaultConfig = this.getDefaultConfig();
        if (configRc?.components[name as keyof typeof configRc.components]) {
            // @ts-expect-error config with diff props
            defaultConfig = configRc.components[name];
        }
        this.config = Object.assign(
            {},
            props.config_base,
            components.getConfigSync(name, defaultConfig)
        );
        this.logger.debug('CONFIG:[%s]', JSON.stringify(this.config));

        this.addDefaultMethods(props.set_config_methods);

        if (props.auto_apply_config) {
            this.setConfig(this.config, true);
        }

        const metadata = this.constructor[Symbol.metadata];
        if (metadata) {
            this.#registerDecoratorMethods(metadata);
        }

        if (DEV_MODE) {
            this.addDebugMethods();
        }
    }

    #registerDecoratorMethods(metadata: DecoratorMetadataObject) {
        for (const key in metadata) {
            if (key.startsWith('_')) continue;
            const methodInfo: {
                name?: string;
                checkParams?: (params?: any) => boolean;
                checkPermissions?: (
                    sender: CommandSender,
                    params?: any
                ) => boolean;
            } = metadata[key] as any;
            const handler = (this as any)[key];
            if (methodInfo.name && typeof handler === 'function') {
                this.addMethod(methodInfo.name, handler, methodInfo);
            }
        }
    }

    protected addDefaultMethods(configMethods: boolean) {
        this.addMethod('ListMethods', () => this.listMethods());
        if (configMethods) {
            // default methods
            this.addMethod('getstatus', (params) => this.getStatus(params));
            this.addMethod('getconfig', (params) => this.getConfig(params));
            this.addMethod<{config: any}>('setconfig', (params) =>
                this.setConfig(params.config)
            );
        }
    }

    protected addDebugMethods() {
        this.addMethod('readconfig', () => {
            return this.config;
        });
        this.addMethod<{
            config?: any;
            init?: boolean;
        }>('writeconfig', (params) => {
            const newConfig = params?.config;
            const init = typeof params?.init === 'boolean' ? params.init : true;
            if (newConfig && typeof newConfig === 'object') {
                this.setConfig(newConfig, init);
            }
        });
        this.addMethod<{init?: boolean}>('resetconfig', (params) => {
            const init = typeof params?.init === 'boolean' ? params.init : true;
            this.setConfig(this.getDefaultConfig(), init);
        });
    }

    async call(sender: CommandSender, method: string, params?: any) {
        const bundle = this.methods.get(method);

        if (!bundle) {
            throw RpcError.MethodNotFound();
        }

        const {exec, checkParams, checkPermissions} = bundle;

        if (!checkPermissions(sender, params)) {
            throw RpcError.Unauthrozied();
        }

        if (!checkParams(params)) {
            throw RpcError.InvalidParams();
        }

        let response = await exec.apply(this, [params, sender]);
        // do not send undefined
        if (response === undefined) {
            response = null;
        }

        return response;
    }

    protected addMethod<Params>(
        method: string,
        exec: (params: Params, sender: CommandSender) => any,
        options?: {
            checkParams?: (params: any) => boolean;
            checkPermissions?: (
                sender: CommandSender,
                params?: Params
            ) => boolean;
        }
    ) {
        const checkParams =
            options?.checkParams ||
            ((params: any) => this.checkParams(method, params));
        const checkPermissions =
            options?.checkPermissions ||
            ((sender: CommandSender, params?: any) =>
                this.checkPermissions(sender, method, params));
        this.methods.set(method.toLowerCase(), {
            exec,
            checkParams,
            checkPermissions
        });
    }

    protected checkPermissions(
        sender: CommandSender,
        method: string,
        params?: any
    ) {
        return sender.hasPermission(`${this.name}.${method}`);
    }

    public checkParams(method: string, params?: any): boolean {
        if (method === 'setconfig' && this.methods.has('setconfig')) {
            return (
                typeof params === 'object' &&
                typeof params.config === 'object' &&
                Object.keys(params.config).length > 0
            );
        }
        const validate = validator(`${this.name}.${method}`.toLowerCase());
        if (validate) {
            const resp = validate(params || {});
            if (typeof resp === 'boolean' && !resp && validate.errors) {
                throw RpcError.InvalidParams(JSON.stringify(validate.errors));
            }
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
        notifyComponentStatus({[this.name]: patch});
    }

    // allow to be overridden
    getStatus(params?: any): Record<string, any> {
        return {};
    }

    getConfig(params?: any): Partial<T> {
        return Object.assign({}, this.config);
    }

    getFullConfig() {
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
        this.emitEvent('config_changed');
    }

    // Decorators

    static Expose(name?: string) {
        return (_target: (...args: any) => any, context: Context) => {
            const methodName = (name || context.name).toLowerCase();
            context.metadata ??= {};
            context.metadata[context.name] ??= {};
            context.metadata[context.name].name = methodName;
        };
    }

    static CheckParams(predicate: (params: any) => boolean) {
        return (_target: (...args: any) => any, context: Context) => {
            context.metadata ??= {};
            context.metadata[context.name] ??= {};
            context.metadata[context.name].checkParams = predicate;
        };
    }

    static CheckPermissions(
        predicate: (sender: CommandSender, params: any) => boolean
    ) {
        return (_target: (...args: any) => any, context: Context) => {
            context.metadata ??= {};
            context.metadata[context.name] ??= {};
            context.metadata[context.name].checkPermissions = predicate;
        };
    }

    static NoPermissions(_target: (...args: any) => any, context: Context) {
        context.metadata ??= {};
        context.metadata[context.name] ??= {};
        context.metadata[context.name].checkPermissions = () => true;
    }

    static RequiredPermission(permission: string) {
        return (_target: (...args: any) => any, context: Context) => {
            context.metadata ??= {};
            context.metadata[context.name] ??= {};
            context.metadata[context.name].checkPermissions = (
                sender: CommandSender
            ) => {
                return sender.hasPermission(permission.toLowerCase());
            };
        };
    }
}
