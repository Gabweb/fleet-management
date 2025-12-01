import {SignJWT} from 'jose';
import crypto from 'node:crypto';
import type {ConfigZitadelMachineUser, AccessToken} from './types.js';

export async function oidc (
    machineUser: ConfigZitadelMachineUser,
    authority: string
) {
    const get = async function() {
        const JWK = crypto.createPrivateKey(machineUser.key);
        const jwt = await new SignJWT({})
            .setProtectedHeader({alg: 'RS256', kid: machineUser.keyId})
            .setIssuedAt()
            .setIssuer(machineUser.userId)
            .setSubject(machineUser.userId)
            .setAudience(authority)
            .setExpirationTime('24h')
            .sign(JWK);
        const body = new URLSearchParams();
        body.append('grant_type', 'urn:ietf:params:oauth:grant-type:jwt-bearer');
        body.append(
            'scope',
            machineUser.scope.join(' ')
        );
        body.append('assertion', jwt);
        const headers = new Headers();
        headers.append('content-type', 'application/x-www-form-urlencoded');
    
        const OAToken = await fetch(
            `${authority}/oauth/v2/token`, {
                method: 'POST',
                body
            }
        );
        const t = await OAToken.json();
        return t;
    };
    let token = await get();
    return async function (): Promise<AccessToken> {
        if (token.expires_at < new Date()) {
            token = await get();
        }
        return token;
    }
};


export function ZApi (authority: string) {
    async function zApi({
        uri = '',
        method = 'get',
        headers = [],
        body = undefined
    }: {uri: string, method: string, headers: string[][], body?: any}): Promise<any> {
        let headersRdy: Headers | undefined;
        if (headers) {
            headersRdy = new Headers();
            headers.map(([key, value]) => headersRdy!.append(key, value));
        }
        const opts = (headersRdy && {
            method,
            headers: headersRdy,
            body: body && JSON.stringify(body)
        }) || {
            method,
            body: body && JSON.stringify(body)
        };
        const r = await (await fetch(authority + uri,  opts)).json();
        if (r.code) {
            throw r;
        }
        return r;
    }
    return zApi;
};
