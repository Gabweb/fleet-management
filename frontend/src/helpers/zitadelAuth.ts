import { createZITADELAuth, ZITADELConfig } from '@zitadel/vue';
import { User, UserManagerSettings, WebStorageStateStore } from 'oidc-client';
import { USE_LOGIN_ZITADEL } from '@/constants';

let zitadelAuth: ReturnType<typeof createZITADELAuth> | undefined = undefined;

declare const OIDC_CONFIG: UserManagerSettings; // from vite.config.ts

if (USE_LOGIN_ZITADEL) {
    const zitadelConfig: ZITADELConfig = {
        project_resource_id: OIDC_CONFIG.client_id!.split('@')[0],
        client_id: OIDC_CONFIG.client_id!,
        issuer: OIDC_CONFIG.metadata!.issuer!,
    };

    zitadelAuth = createZITADELAuth(zitadelConfig, undefined, undefined, undefined, {
        ...OIDC_CONFIG,
        userStore: new WebStorageStateStore({ store: localStorage }),
    });

    // handle events
    zitadelAuth.oidcAuth.events.addAccessTokenExpiring(function () {
        // eslint-disable-next-line no-console
        console.log('access token expiring');
    });

    zitadelAuth.oidcAuth.events.addAccessTokenExpired(function () {
        // eslint-disable-next-line no-console
        console.log('access token expired');
    });

    zitadelAuth.oidcAuth.events.addSilentRenewError(function (err: Error) {
        // eslint-disable-next-line no-console
        console.error('silent renew error', err);
    });

    zitadelAuth.oidcAuth.events.addUserLoaded(function (user: User) {
        // eslint-disable-next-line no-console
        console.log('user loaded', user);
    });

    zitadelAuth.oidcAuth.events.addUserUnloaded(function () {
        // eslint-disable-next-line no-console
        console.log('user unloaded');
    });

    zitadelAuth.oidcAuth.events.addUserSignedOut(function () {
        // eslint-disable-next-line no-console
        console.log('user signed out');
    });

    zitadelAuth.oidcAuth.events.addUserSessionChanged(function () {
        // eslint-disable-next-line no-console
        console.log('user session changed');
    });
}

export default zitadelAuth;
