import type { UserManagerSettings } from 'oidc-client';

export const MODE = import.meta.env.MODE === "development" ? "development" : "production";

export const FLEET_MANAGER_BASE = getEnv("FLEET_BASE_URL", window.location.host);
const FLEET_SECURE = getEnv("FLEET_SECURE", window.location.protocol === 'https:' ? "1" : "0");
export const SECURE = FLEET_SECURE === '1';

export const FLEET_MANAGER_WEBSOCKET = (SECURE ? 'wss://' : 'ws://') + FLEET_MANAGER_BASE;
export const FLEET_MANAGER_HTTP = (SECURE ? 'https://' : 'http://') + FLEET_MANAGER_BASE;

export const NODE_RED_URL = getEnv("NODE_RED_URL", `${MODE === "development" ? FLEET_MANAGER_HTTP : ""}/node-red/red`);

export declare const OIDC_CONFIG: UserManagerSettings; // from vite.config.ts

function getEnv(name: string, orElse: string) {
    const envVar = import.meta.env[`VITE_${name}`];
    return (typeof envVar === 'string' && envVar.length > 0) ? envVar : orElse;
}

function isOidcValid(obj: any): boolean {
    return (
        obj &&
        typeof obj === 'object' &&
        typeof obj.authority === 'string' &&
        typeof obj.client_id === 'string' &&
        typeof obj.redirect_uri === 'string' &&
        typeof obj.response_type === 'string' &&
        typeof obj.scope === 'string' &&
        typeof obj.filterProtocolClaims === 'boolean' &&
        typeof obj.metadata === 'object'
    );
}

function getLoginType() {
    // This repository is configured to use backend JWT auth only.
    // Zitadel/OIDC is intentionally disabled.
    return 'backend-jwt';
}

export const LOGIN_TYPE = getLoginType();
export const USE_LOGIN_ZITADEL = LOGIN_TYPE === 'zitadel';

// DEV print
if (import.meta.env.DEV) {
    console.log('-------- ENVIRONMENT --------');
    console.table(import.meta.env);

    console.log('-------- CONNECTION --------');
    console.table({
        FLEET_MANAGER_BASE,
        SECURE,
        FLEET_MANAGER_HTTP,
        FLEET_MANAGER_WEBSOCKET,
        NODE_RED_URL
    });

    console.debug('login type ->', LOGIN_TYPE);
    console.debug('parsed OIDC Config ->', OIDC_CONFIG);
}
