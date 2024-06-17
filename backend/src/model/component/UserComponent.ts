import * as Commander from '../../modules/Commander';
import Component from './Component';
import * as UserController from '../../model/User';

export interface UserComponentConfig {
    users: {
        [key: string]: {
            username: string;
            password: string;
            permissions: string[];
            group: string;
            enabled: boolean;
        };
    };
    allowDebugUser: boolean;
}

export default class UserComponent extends Component<UserComponentConfig> {
    constructor() {
        super('user');
        this.methods.set('create', (params) => this.#create(params));
        this.methods.set('update', (params) => this.#update(params));
        this.methods.set('delete', (params) => this.#delete(params));
    }

    #create(params: {
        username: string;
        password: string;
        group: string;
        permissions: string[];
    }) {
        const { username, password, group, permissions } = params;

        if (this.config.users[username]) {
            return Promise.reject({
                error: `User '${username}' already created`,
            });
        }
        this.setConfig({
            users: {
                [username]: {
                    username,
                    password,
                    group,
                    permissions,
                    enabled: true,
                },
            },
        });
        return { created: username };
    }

    #update(params: {
        username?: string;
        password?: string;
        group?: string;
        permissions?: string[];
    }) {
        const username = params.username!;
        const user = this.config.users[username];
        if (!user) {
            return Promise.reject({
                error: `User '${username}' does not exist`,
            });
        }
        if (params.password) {
            user.password = params.password;
        }
        if (params.group) {
            user.group = params.group;
        }
        if (params.permissions) {
            user.permissions = params.permissions;
        }
        delete params.username;
        this.setConfig({ users: { [username]: user } });
        return { updated: username, fields: params };
    }

    #delete(params: { username: string }) {
        const { username } = params;
        if (!this.config.users[username]) {
            return Promise.reject({
                error: `User '${username}' does not exist`,
            });
        }
        this.setConfig({ users: { [username]: undefined } } as Record<string, any>);
        return { deleted: username };
    }

    public override checkParams(method: string, params?: any): boolean {
        switch (method) {
            case 'create':
                return (
                    typeof params === 'object' &&
                    typeof params.username === 'string' &&
                    params.username !== 'DEBUG' && // reserved username
                    typeof params.password === 'string' &&
                    typeof params.group === 'string' &&
                    typeof params.permissions === 'object' &&
                    Array.isArray(params.permissions) &&
                    params.permissions.every((e: any) => typeof e === 'string')
                );
            case 'update':
                return (
                    typeof params === 'object' &&
                    typeof params.username === 'string' &&
                    (typeof params.password === 'string' ||
                        typeof params.password === 'undefined') &&
                    (typeof params.group === 'string' ||
                        typeof params.group === 'undefined') &&
                    ((typeof params.permissions === 'object' &&
                        Array.isArray(params.permissions) &&
                        params.permissions.every(
                            (e: any) => typeof e === 'string'
                        )) ||
                        typeof params.permissions === 'undefined')
                );
            case 'delete':
                return (
                    typeof params === 'object' && typeof params.username === 'string'
                );
            default:
                return super.checkParams(method, params);
        }
    }

    protected override checkPermissions(
        sender: Commander.CommandSender,
        method: string,
        params?: any
    ): boolean {
        if (method === 'setconfig') {
            if (params?.users) {
                return sender == Commander.COMMAND_SENDER_INTERNAL;
            }
        }
        return super.checkPermissions(sender, method);
    }

    protected override checkConfigKey(key: string, value: any): boolean {
        switch (key) {
            case 'users':
                return typeof value === 'object';
            case 'allowDebugUser':
                return typeof value === 'boolean';
            default:
                return false;
        }
    }

    protected override applyConfigKey(key: string, value: any) {
        switch (key) {
            case 'users': {
                if (typeof value === 'object')
                    for (const inner_key in value) {
                        const inner_value = value[inner_key];
                        if (inner_value == undefined) {
                            delete this.config.users[inner_key];
                            return;
                        }
                        this.config.users[inner_key] = inner_value;
                    }
                break;
            }
            case 'allowDebugUser': {
                const allowed = Boolean(value);
                if (allowed != UserController.allowDebug) {
                    UserController.setAllowDebugging(allowed);
                }
                this.config.allowDebugUser = allowed;
                break;
            }
        }
    }

    protected override getDefaultConfig() {
        return {
            users: {
                admin: {
                    username: 'admin',
                    password: 'admin',
                    permissions: ['*'],
                    group: 'admin',
                    enabled: true,
                },
                user: {
                    username: 'user',
                    password: 'user',
                    permissions: ['fleetmanager.subscribe', 'device.list'],
                    group: 'user',
                    enabled: true,
                },
            },
            allowDebugUser: false,
        };
    }

    protected override configChanged(): void {
        UserController.updateUserConfig(this.config.users);
    }

    override getConfig(params?: any) {
        return Object.assign({}, { allowDebugUser: this.config.allowDebugUser });
    }
}
