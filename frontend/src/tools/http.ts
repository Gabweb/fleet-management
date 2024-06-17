import { useToastStore } from '@/stores/toast';
import { FLEET_MANAGER_HTTP } from '../constants';
import { USE_LOGIN_ZITADEL } from '@/constants';
import zitadelAuth from '@/helpers/zitadelAuth';

export async function fetchServer(uri: string, method = 'GET', body = {}) {
    let token: string | undefined | null = undefined;

    if (USE_LOGIN_ZITADEL && zitadelAuth) {
        token = await zitadelAuth.oidcAuth.mgr.getUser().then((usr) => usr?.access_token);
    } else {
        token = localStorage.getItem('fleet-management-token');
    }

    const resp = await fetch(FLEET_MANAGER_HTTP + uri, {
        method,
        headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer ' + token,
        },
        body: method == 'GET' ? undefined : JSON.stringify(body),
    });
    if (resp.ok) {
        if (resp.status == 204) return Promise.resolve({});
        return resp.json();
    }

    switch (resp.status) {
        case 403:
            useToastStore().error('You do not have permission to complete this action.');
            break;

        case 404:
            useToastStore().error('404 Resource not found.');
            break;

        default:
            useToastStore().error('Something went wrong.');
            break;
    }

    return resp.json();
}

export async function healthCheck() {
    return fetchServer('/health');
}

export async function login(username: string, password: string) {
    return fetchServer('/auth/login', 'POST', { username, password });
}

export function requestMountAccess(shellyID: string) {
    return fetchServer('/request-access/' + shellyID);
}
