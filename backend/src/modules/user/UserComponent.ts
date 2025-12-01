import {login} from '.';
import Component from '../../model/component/Component';
import RpcError from '../../rpc/RpcError';
import type {User} from '../../validations/params';
import * as store from '../PostgresProvider';
import {
    AlexaTokenSigner,
    DefaultSigner,
    REFRESH_TOKEN_OPTIONS
} from './signers';

export interface UserComponentConfig {
    allowDebugUser: boolean;
    jwtToken: string;
}

export default class UserComponent extends Component<UserComponentConfig> {
    constructor() {
        super('user');

        this.methods.delete('setconfig');
    }

    @Component.Expose('Authenticate')
    @Component.NoPermissions
    async authenticate({
        username,
        password,
        purpose,
        endpoint
    }: User.Authenticate) {
        const access_token = await login(username, password);
        if (access_token === undefined) {
            throw RpcError.InvalidRequest();
        }

        if (purpose === 'alexa') {
            if (typeof endpoint !== 'string') {
                throw RpcError.InvalidParams();
            }
            const refreshToken = AlexaTokenSigner.sign({
                username,
                endpoint
            });
            return {
                refresh_token: refreshToken,
                access_token: AlexaTokenSigner.refresh(refreshToken)
            };
        }

        const refresh_token = DefaultSigner.sign(
            username,
            REFRESH_TOKEN_OPTIONS
        );

        return {
            access_token,
            refresh_token
        };
    }

    @Component.Expose('Refresh')
    @Component.NoPermissions
    async refresh({refresh_token}: User.Refresh) {
        const data = DefaultSigner.verify(refresh_token, REFRESH_TOKEN_OPTIONS);
        let access_token: string | undefined = undefined;

        if (data?.aud === 'alexa') {
            access_token = AlexaTokenSigner.refresh(refresh_token);
        } else {
            access_token = DefaultSigner.refresh(refresh_token);
        }

        if (!access_token) {
            throw RpcError.Unauthrozied();
        }

        return {
            access_token
        };
    }

    @Component.Expose('Create')
    async create(params: User.Create) {
        const {name, password, fullName, group, permissions, email} = params;
        const exists = await this.find({name});
        if (exists?.rows.length > 0) {
            throw RpcError.InvalidParams(`User '${name}' already created`);
        }

        // Remove any permission that is undefined, null, empty, or contains '.undefined'
        const safePermissions = (permissions || []).filter(
            (p) => !!p && typeof p === 'string' && !p.includes('undefined')
        );

        const u = await store.userCreate({
            email,
            name,
            password,
            fullName,
            group,
            enabled: true,
            permissions: safePermissions
        });
        return {created: u};
    }

    @Component.Expose('Update')
    async update(params: User.Update) {
        const u = await store.userUpdate(params);
        return {updated: params.id, fields: params};
    }

    @Component.Expose('Delete')
    async delete(params: User.Delete) {
        const u = await store.userDelete({id: params.id});
        return {deleted: params.id};
    }

    @Component.Expose('List')
    async list() {
        const dbResponse = await store.userList({});
        const rows = dbResponse?.rows || [];
        const users = rows.filter((user) => user.deleted === false);
        return users;
    }

    @Component.Expose('Find')
    async find({
        id,
        name,
        password
    }: {
        id?: number;
        name?: string;
        password?: string;
    }): Promise<any> {
        const u = await store.userList({id, name, password});
        return u;
    }

    // @Component.Expose('View')
    // async view(params: User.View) {
    //     return await store.userList({ id: params.id });
    // }

    protected override checkConfigKey(key: string, value: any): boolean {
        switch (key) {
            case 'allowDebugUser':
                return typeof value === 'boolean';
            default:
                return false;
        }
    }

    protected override applyConfigKey(key: string, value: any) {
        switch (key) {
            case 'allowDebugUser': {
                const allowed = Boolean(value);
                this.config.allowDebugUser = allowed;
                break;
            }
        }
    }

    protected override getDefaultConfig() {
        return {
            allowDebugUser: false,
            jwtToken: 'shelly-secret-token' // this should go into config
        } satisfies UserComponentConfig;
    }

    override getConfig(params?: any) {
        return Object.assign({}, {allowDebugUser: this.config.allowDebugUser});
    }
}
