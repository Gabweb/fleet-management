import type {Group as Params} from '../../validations/params';
import type CommandSender from '../CommandSender';
import Component from './Component';

interface Group {
    id: number;
    name: string;
    devices: string[];
}

export interface GroupComponentConfig {
    enable: boolean;
    groups: Record<PropertyKey, Group>;
}

export default class GroupComponent extends Component<GroupComponentConfig> {
    #nextId: number;

    constructor() {
        super('group', {set_config_methods: false});
        const max = Math.max(...Object.keys(this.config.groups).map(Number));
        this.#nextId = (Number.isFinite(max) ? max : 0) + 1;
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
        return {groups: {}, enable: true};
    }

    @Component.Expose('Create')
    create(params: Params.Create) {
        const id = this.#nextId++;

        const group: Group = {
            devices: params.devices || [],
            id,
            name: params.name
        };
        this.config.groups[id] = group;

        // Save in config
        this._persistConfig();

        return group;
    }

    @Component.Expose('Add')
    add({shellyID, id}: Params.Add) {
        const group = this.config.groups[id];
        if (!group) {
            return {added: false};
        }
        if (group.devices.includes(shellyID)) {
            return {added: false};
        }

        group.devices.push(shellyID);
        // save in config
        this._persistConfig();

        return {added: true};
    }

    @Component.Expose('Remove')
    remove({shellyID, id}: Params.Remove) {
        const group = this.config.groups[id];
        if (!group) {
            return {removed: false};
        }
        // remove from group
        group.devices.splice(group.devices.indexOf(shellyID), 1);

        // save in config
        this._persistConfig();

        return {removed: true};
    }

    @Component.Expose('Delete')
    delete({id}: Params.Delete): {deleted: boolean} {
        const deleted = this.config.groups[id];

        if (!deleted) {
            return {deleted: false};
        }

        delete this.config.groups[id];
        // save in config
        this._persistConfig();
        return {deleted: true};
    }

    @Component.Expose('List')
    @Component.NoPermissions
    list(params: Params.List, sender: CommandSender) {
        if (sender.isAdmin()) {
            return structuredClone(this.config.groups);
        }

        const permittedGroups: Record<string, any> = {};

        for (const groupId of Object.keys(this.config.groups)) {
            const permissionKey = `group.get.${groupId}`;

            if (sender.hasPermission(permissionKey)) {
                permittedGroups[groupId] = structuredClone(
                    this.config.groups[groupId]
                );
            }
        }

        return permittedGroups;
    }

    @Component.Expose('Get')
    @Component.CheckPermissions((sender, params) => {
        return sender.hasPermission(`group.get.${params.id}`);
    })
    get({id}: Params.Get) {
        return this.config.groups[id] || null;
    }

    @Component.Expose('Rename')
    rename({id, newName}: Params.Rename) {
        const group = this.config.groups[id];
        if (group === undefined) {
            return {renamed: false};
        }
        group.name = newName;
        this._persistConfig();

        return {renamed: true};
    }

    @Component.Expose('Set')
    set(params: Params.Set) {
        this.config.groups[params.id] = {...params, id: Number(params.id)};
        this._persistConfig();
        return params;
    }

    @Component.Expose('Find')
    find({shellyID}: Params.Find) {
        return this.findGroups(shellyID);
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
