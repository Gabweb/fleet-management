import { FLEET_MANAGER_HTTP } from '../constants';
import { USE_LOGIN_ZITADEL } from '@/constants';
import zitadelAuth from '@/helpers/zitadelAuth';

export async function sendRPC(method: string, params: object | null = null) {
    let token: string | undefined | null = undefined;

    if (USE_LOGIN_ZITADEL && zitadelAuth) {
        token = await zitadelAuth.oidcAuth.mgr.getUser().then((usr) => usr?.access_token);
    } else {
        token = localStorage.getItem('access_token');
    }

    const resp = await fetch(FLEET_MANAGER_HTTP + '/rpc', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer ' + token,
        },
        body: JSON.stringify({
            method,
            params,
        }),
    }).then((res) => res.json());

    if (resp.error) return Promise.reject(resp.error);
    return resp;
}

export async function login(username: string, password: string) {
    return await sendRPC('User.Authenticate', { username, password });
}

export async function refresh(refresh_token: string) {
    return await sendRPC('User.Refresh', { refresh_token });
}
