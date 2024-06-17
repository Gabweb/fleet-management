import type { UserManagerSettings } from 'oidc-client';

export const FLEET_MANAGER_BASE =
    typeof import.meta.env.VITE_FLEET_BASE_URL === 'string' && import.meta.env.VITE_FLEET_BASE_URL.length > 0
        ? import.meta.env.VITE_FLEET_BASE_URL
        : window.location.host;

export const SECURE =
    typeof import.meta.env.VITE_FLEET_SECURE == 'string' && import.meta.env.VITE_FLEET_SECURE.length > 0
        ? import.meta.env.VITE_FLEET_SECURE === '1'
        : window.location.protocol === 'https:';

export const FLEET_MANAGER_WEBSOCKET = (SECURE ? 'wss://' : 'ws://') + FLEET_MANAGER_BASE;
export const FLEET_MANAGER_HTTP = (SECURE ? 'https://' : 'http://') + FLEET_MANAGER_BASE;

export declare const OIDC_CONFIG: UserManagerSettings; // from vite.config.ts

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
    const VITE_FE_LOGIN_STRATEGY = import.meta.env.VITE_FE_LOGIN_STRATEGY;
    if (typeof VITE_FE_LOGIN_STRATEGY === 'string' && VITE_FE_LOGIN_STRATEGY === 'backend-jwt') {
        return 'backend-jwt';
    }
    if (isOidcValid(OIDC_CONFIG)) {
        return 'zitadel';
    }

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
    });

    console.debug('login type ->', LOGIN_TYPE);
    console.debug('parsed OIDC Config ->', OIDC_CONFIG);
}
