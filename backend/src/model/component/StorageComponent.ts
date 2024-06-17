import Component from './Component';
import * as Registry from '../../modules/Registry';

export interface StorageComponentConfig {
    enable: boolean;
    items: Record<string, any>;
}

export default class StorageComponent extends Component<StorageComponentConfig> {
    constructor() {
        super('storage');
        this.methods.set('setitem', (params) => this.#setItem(params));
        this.methods.set('getitem', (params) => this.#getItem(params));
        this.methods.set('removeitem', (params) => this.#removeItem(params));
        this.methods.set('keys', (params) => this.#keys(params));
        this.methods.set('getall', (params) => this.#getall(params));
    }

    #setItem(params: { registry: string; key: string; value: string }) {
        const registry = (params.registry ?? 'memory').toLowerCase();
        if (registry === 'memory') {
            this.setConfig({
                items: { [params.key]: params.value },
            });
        } else {
            // save to disk
            Registry.addToRegistry(registry, params.key, params.value);
        }
        return { updated: params.key };
    }

    #getItem(params: { registry: string; key: string }) {
        const registry = params.registry ?? 'memory';

        if (registry === 'memory') {
            return this.config.items[params.key] ?? null;
        } else {
            // read from disk
            return Registry.getFromRegistry(registry, params.key);
        }
    }

    #removeItem(params: { registry: string; key: string }) {
        const registry = params.registry ?? 'memory';

        if (registry === 'memory') {
            this.setConfig({
                items: { [params.key]: undefined },
            });
        } else {
            // remove from disk
            Registry.removeFromRegistry(registry, params.key);
        }

        return { removed: params.key };
    }

    #keys(params: { registry: string }) {
        const registry = params.registry ?? 'memory';

        return registry === 'memory'
            ? Object.keys(this.config.items)
            : Registry.getRegistryKeys(registry);
    }

    #getall(params: { registry: string }) {
        const registry = params.registry ?? 'memory';

        return registry === 'memory' ? this.config.items : Registry.getAll(registry);
    }

    public override checkParams(method: string, params?: any): boolean {
        switch (method) {
            case 'setitem':
                return (
                    typeof params === 'object' &&
                    (typeof params.registry === 'undefined' ||
                        typeof params.registry === 'string') &&
                    typeof params.key === 'string' &&
                    typeof params.value !== 'undefined'
                );
            case 'removeitem':
            case 'getitem':
                return (
                    typeof params === 'object' &&
                    (typeof params.registry === 'undefined' ||
                        typeof params.registry === 'string') &&
                    typeof params.key === 'string'
                );
            case 'keys':
            case 'getall':
                return (
                    params &&
                    typeof params === 'object' &&
                    (typeof params.registry === 'undefined' ||
                        typeof params.registry === 'string')
                );

            default:
                return super.checkParams(method, params);
        }
    }

    protected override checkConfigKey(key: string, value: any): boolean {
        switch (key) {
            case 'items':
                return typeof value === 'object';
            case 'enable':
                return typeof value === 'boolean';
            default:
                return super.checkConfigKey(key, value);
        }
    }

    protected override applyConfigKey(key: string, value: any): void {
        switch (key) {
            case 'items':
                if (typeof value === 'object')
                    for (const inner_key in value) {
                        const inner_value = value[inner_key];
                        if (inner_value == undefined) {
                            delete this.config.items[inner_key];
                            return;
                        }
                        this.config.items[inner_key] = inner_value;
                    }
                break;
            case 'enable':
                this.config.enable = Boolean(value);
                break;
        }
    }

    protected override getDefaultConfig() {
        return {
            enable: true,
            items: {},
        };
    }

    override getConfig() {
        return {
            enable: this.config.enable,
        };
    }

    override getStatus(): Record<string, any> {
        return {
            length: JSON.stringify(this.config.items).length,
        };
    }
}
