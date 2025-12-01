import {ZitadelIntrospectionOptions} from 'passport-zitadel';

type ConfigDatabaseConnection = {
    host: string;
    port?: string;
    database: string;
    user: string;
    pass: string;
}
type ConfigDatabase = {
    connection: ConfigDatabaseConnection;
    schema: string;
    cwd: string[];
}
export type ConfigZitadelMachineUser = {
    type: string;
    keyId: string;
    key: string;
    userId: string;
    scope: string[];
}
type ConfigServer = { // http server
    host?: string;
    port?: number;
}
export type ZitadelJwtProfile = {
    type: string;
    keyId: string;
    key: string;
    appId: string;
    clientId: string;
};
type ConfigOidcApp = { // http server
    authority: string;
    authorization: ZitadelJwtProfile;
}
export type ConfigOidc = {
    machineUser: ConfigZitadelMachineUser;
    app: ZitadelIntrospectionOptions;
    frontend: any;
}
export type Config = {
    database: ConfigDatabase,
    server: ConfigServer,
    oidc: ConfigOidc
}
export type AccessToken = {
    access_token: string;
    expires_at: number;
    expires_in: number;
};