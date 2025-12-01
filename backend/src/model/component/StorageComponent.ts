import * as Registry from '../../modules/Registry';
import type CommandSender from '../CommandSender';
import Component from './Component';

export interface StorageComponentConfig {
    enable: boolean;
    items: Record<string, any>;
}

function isGetAll(params: any) {
    return (
        params &&
        typeof params === 'object' &&
        (typeof params.registry === 'undefined' ||
            typeof params.registry === 'string')
    );
}

function isAddItem(params: any) {
    return (
        typeof params.registry === 'string' &&
        typeof params.key === 'string' &&
        typeof params.dashboard === 'number' &&
        typeof params.type === 'number' &&
        typeof params.item === 'number' &&
        (params.order === undefined || typeof params.order === 'number') &&
        (params.sub_item === undefined ||
            typeof params.sub_item === 'string' ||
            params.sub_item === null)
    );
}

function isRemoveWidget(params: any) {
    return (
        typeof params.registry === 'string' &&
        typeof params.key === 'string' &&
        typeof params.dashboard === 'number' &&
        typeof params.itemId === 'number'
    );
}

function isGetItem(params: any) {
    return isGetAll(params) && typeof params.key === 'string';
}

function isSetItem(params: any) {
    return isGetItem(params) && typeof params.value !== 'undefined';
}

export default class StorageComponent extends Component<StorageComponentConfig> {
    constructor() {
        super('storage');
    }

    @Component.Expose('SetItem')
    @Component.CheckParams(isSetItem)
    @Component.NoPermissions
    async setItem(params: {registry: string; key: string; value: string}) {
        const registry = (params.registry ?? 'memory').toLowerCase();
        await Registry.addToRegistry(registry, params.key, params.value);
        return {updated: params.key};
    }

    @Component.Expose('GetItem')
    @Component.CheckParams(isGetItem)
    @Component.NoPermissions
    async getItem(
        params: {registry: string; key: string},
        sender: CommandSender
    ) {
        const registry = params.registry ?? 'memory';

        if (registry === 'memory') {
            return this.config.items[params.key] ?? null;
        }
        try {
            const registryContent = await Registry.getFromRegistry(
                registry,
                params.key
            );

            if (!registryContent) {
                return null;
            }

            if (
                registry === 'actions' &&
                params.key === 'rpc' &&
                Array.isArray(registryContent)
            ) {
                const filtered: typeof registryContent = [];
                for (const act of registryContent) {
                    let ok = true;
                    for (const step of act.actions) {
                        for (const shellyID of step.dst) {
                            if (!(await sender.canAccessDevice(shellyID))) {
                                ok = false;
                                break;
                            }
                        }
                        if (!ok) break;
                    }
                    if (ok) filtered.push(act);
                }
                return filtered;
            }

            for (const id of Object.keys(registryContent)) {
                const permissionKey = `storagecomponent.getitem.${registry}.${params.key}.${id}`;
                const fullPermissionKey = `storagecomponent.getitem.${registry}.${params.key}.*`;
                if (sender.hasPermission(fullPermissionKey)) {
                    return registryContent;
                }
                if (!sender.hasPermission(permissionKey)) {
                    delete registryContent[id];
                }
            }
            return registryContent;
        } catch (error) {
            this.logger.error(`Error accessing registry ${registry}:`, error);
            return null;
        }
    }

    @Component.Expose('Keys')
    @Component.CheckParams(isGetAll)
    @Component.NoPermissions
    keys(params: {registry: string}) {
        const registry = params.registry ?? 'memory';

        return registry === 'memory'
            ? Object.keys(this.config.items)
            : Registry.getRegistryKeys(registry);
    }

    @Component.Expose('GetAll')
    @Component.CheckParams(isGetAll)
    @Component.NoPermissions
    getall(params: {registry: string}) {
        const registry = params.registry ?? 'memory';

        return registry === 'memory'
            ? this.config.items
            : Registry.getAll(registry);
    }

    @Component.Expose('RemoveItem')
    @Component.CheckParams(isGetItem)
    @Component.NoPermissions
    async removeItem(params: {registry: string; key: string; value: any}) {
        const registry = params.registry ?? 'memory';

        if (registry === 'memory') {
            this.setConfig({
                items: {[params.key]: undefined}
            });
        } else {
            await Registry.removeFromRegistry(
                registry,
                params.key,
                params.value
            );
        }

        return {removed: params.key};
    }

    @Component.Expose('AddItem') // add a dashboard widget
    @Component.CheckParams(isAddItem)
    @Component.NoPermissions
    async addItem(params: {
        registry: string;
        key: string;
        dashboard: number;
        type: number;
        item: number;
        order?: number;
        sub_item?: string | null;
    }) {
        const registry = params.registry.toLowerCase();
        const {dashboard, type, item, order = 0, sub_item = null} = params;
        const newId = await Registry.addDashboardItem(
            dashboard,
            type,
            item,
            order,
            sub_item
        );
        return {id: newId};
    }

    @Component.Expose('RemoveWidget')
    @Component.CheckParams(isRemoveWidget)
    @Component.NoPermissions
    async removeWidget(params: {
        registry: string;
        key: string;
        dashboard: number;
        itemId: number;
    }) {
        const {dashboard, itemId} = params;
        await Registry.removeDashboardWidget(dashboard, itemId);
        return {removed: itemId};
    }

    @Component.Expose('GetUIConfig')
    @Component.NoPermissions
    async getUIConfig() {
        return await Registry.getUIConfig();
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
                        if (inner_value === undefined) {
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
            items: {}
        };
    }

    override getConfig() {
        return {
            enable: this.config.enable
        };
    }

    override getStatus(): Record<string, any> {
        return {
            length: JSON.stringify(this.config.items).length
        };
    }
}
