import Component from './Component';

interface Group {
    id: number;
    name: string;
    devices: string[];
}

export interface GroupComponentConfig {
    enable: boolean;
    groups: Record<string, Group>;
}

export default class GroupComponent extends Component<GroupComponentConfig> {
    #nextId: number;

    constructor() {
        super('group', { set_config_methods: false });
        const max = Math.max(...Object.keys(this.config.groups).map(Number));
        this.#nextId = (isFinite(max) ? max : 0) + 1;
        // group management methods
        this.methods.set('create', (params: { name: string; devices: string[] }) =>
            this.create(params.name, params.devices)
        );
        this.methods.set('add', (params: { id: string; shellyID: string }) =>
            this.add(params.shellyID, params.id)
        );
        this.methods.set('remove', (params: { id: string; shellyID: string }) =>
            this.remove(params.shellyID, params.id)
        );
        this.methods.set('delete', (params: { id: string }) =>
            this.delete(params.id)
        );
        this.methods.set('list', (params: { id?: string } | undefined) =>
            this.list(params?.id)
        );
        this.methods.set('rename', (params: { id: string; newName: string }) =>
            this.rename(params.id, params.newName)
        );
        this.methods.set('set', (params: Group) => this.set(params));
        this.methods.set('get', (params: { id: string }) => {
            return this.config.groups[params.id] || null;
        });
        this.methods.set('find', (params: { shellyID: string }) => {
            return this.findGroups(params.shellyID);
        });
    }

    public override checkParams(method: string, params?: any): boolean {
        switch (method) {
            case 'create':
                return typeof params?.name === 'string';
            case 'delete':
            case 'get':
                return (
                    typeof params?.id === 'string' || typeof params?.id === 'number'
                );
            case 'add':
            case 'remove':
                return (
                    (typeof params?.id === 'string' ||
                        typeof params?.id === 'number') &&
                    typeof params?.shellyID === 'string'
                );
            case 'list':
                return (
                    typeof params?.id === 'string' ||
                    typeof params?.id === 'number' ||
                    typeof params?.name === 'undefined'
                );
            case 'rename':
                return (
                    (typeof params?.id === 'string' ||
                        typeof params?.id === 'number') &&
                    typeof params?.newName === 'string'
                );
            case 'edit':
                return (
                    (typeof params?.id === 'string' ||
                        typeof params?.id === 'number') &&
                    typeof params?.groups !== 'undefined'
                );
            default:
                return super.checkParams(method, params);
        }
    }

    protected override checkConfigKey(key: string, value: any) {
        switch (key) {
            case 'enabled':
                return typeof value === 'boolean';
            case 'groups':
                return typeof value === 'object';
            default:
                return super.checkConfigKey(key, value);
        }
    }

    protected override getDefaultConfig(): GroupComponentConfig {
        return { groups: {}, enable: true };
    }

    create(name: string, pass_devices: string[]) {
        const id = this.#nextId++;

        const group: Group = { devices: pass_devices || [], id, name };
        this.config.groups[id] = group;

        // Save in config
        this._persistConfig();

        return group;
    }

    add(shellyID: string, id: string): { added: boolean } {
        const group = this.config.groups[id];
        if (!group) {
            return { added: false };
        }
        if (group.devices.includes(shellyID)) {
            return { added: false };
        }

        group.devices.push(shellyID);
        // save in config
        this._persistConfig();

        return { added: true };
    }

    remove(shellyID: string, id: string): { removed: boolean } {
        const group = this.config.groups[id];
        if (!group) {
            return { removed: false };
        }
        // remove from group
        group.devices.splice(group.devices.indexOf(shellyID), 1);

        // save in config
        this._persistConfig();

        return { removed: true };
    }

    delete(id: string): { deleted: boolean } {
        const deleted = this.config.groups[id];

        if (!deleted) {
            return { deleted: false };
        }

        delete this.config.groups[id];
        // save in config
        this._persistConfig();
        return { deleted: true };
    }

    list(id?: string) {
        if (id) {
            const group = this.config.groups[id];
            return group ? structuredClone(group) : null;
        }
        return structuredClone(this.config.groups);
    }

    rename(id: string, newName: string) {
        const group = this.config.groups[id];
        if (group == undefined) {
            return { renamed: false };
        }
        group.name = newName;
        this._persistConfig();

        return { renamed: true };
    }

    set(group: Group) {
        this.config.groups[group.id] = { ...group, id: Number(group.id) };
        this._persistConfig();
        return group;
    }

    findGroups(shellyID: string) {
        if (!this.config.enable) {
            return [];
        }
        const groups: string | number[] = [];

        for (const id in this.config.groups) {
            const group = this.config.groups[id];
            if (group.devices.includes(shellyID)) {
                groups.push(group.id);
            }
        }

        return groups;
    }
}
