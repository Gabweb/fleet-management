import { loginStrategy } from '../config';
import log4js from 'log4js';
import * as jwt from 'jsonwebtoken';
import { user_t } from '../types';
import passport from 'passport';

const logger = log4js.getLogger();
let USERS_CONFIG: Record<string, user_t> = {};
let JWT_TOKEN = process.env['JWT_TOKEN'] ?? 'shelly-secret-token';

export function updateUserConfig(newConfig: Record<string, user_t>) {
    USERS_CONFIG = structuredClone(newConfig);
}

export function updateJwtToken(newToken: string) {
    JWT_TOKEN = newToken;
}

export let allowDebug = false;

export const DEBUG_USER: user_t = {
    username: 'DEBUG',
    password: '',
    permissions: ['*'],
    group: 'admin',
    enabled: false,
};

export const NODE_RED_USER: user_t = {
    username: 'NODE_RED',
    password: '',
    permissions: ['*'],
    group: 'admin',
    enabled: false,
};

function signToken(username: string) {
    return jwt.sign(
        {
            username,
        },
        JWT_TOKEN,
        {
            expiresIn: '1d',
            issuer: 'fleet-management',
            subject: 'general-login',
        }
    );
}

export function login(username: string, password: string) {
    const user = USERS_CONFIG[username];
    if (user == undefined || user.password == undefined) {
        logger.warn('user not found username=[%s]', username);
        return undefined;
    }
    if (user.enabled !== true) {
        logger.warn('user disabled username=[%s]', username);
        return undefined;
    }

    if (user.password != password) {
        logger.warn('user wrong password username=[%s]', username);
        return undefined;
    }

    return signToken(username);
}

export function verifyToken(token: string | undefined) {
    try {
        if (token == undefined) {
            if (!allowDebug) {
                return undefined;
            }
            token = generateDebugToken();
        }
        if (!token.includes('.')) {
            // jwt has ".", basic auth does not
            const decoded = Buffer.from(token, 'base64').toString('utf-8');
            const [username = '', password = ''] = decoded.split(':');
            token = login(username, password) || '';
        }
        return jwt.verify(token, JWT_TOKEN, {
            issuer: 'fleet-management',
            subject: 'general-login',
        }) as jwt.JwtPayload;
    } catch (error) {
        return undefined;
    }
}

export function getUserFromConfig(username: string) {
    if (username === DEBUG_USER.username) {
        return allowDebug ? DEBUG_USER : undefined;
    }

    if (username === NODE_RED_USER.username) {
        return NODE_RED_USER;
    }

    return USERS_CONFIG[username];
}

export async function getUserFromToken(
    token: string | undefined
): Promise<user_t | undefined> {
    if (loginStrategy === 'backend-jwt') {
        const decoded = verifyToken(token);
        if (
            !decoded ||
            typeof decoded !== 'object' ||
            typeof decoded?.username !== 'string'
        )
            return undefined;
        const user = getUserFromConfig(decoded.username);
        if (user == undefined) return undefined;
        return user;
    }

    return new Promise<user_t>((resolve, reject) => {
        passport.authenticate(
            loginStrategy,
            { session: false },
            (err: Error, usr: { email: string }) => {
                if (err) {
                    logger.error('AuthInt', err);
                    return reject(err);
                } else if (!usr) {
                    logger.error('AuthMissingAccessToken', err);
                    return reject('missingAccessToken');
                }
                return resolve({
                    username: usr.email,
                    password: '',
                    permissions: ['*'],
                    group: '',
                    enabled: true,
                });
            }
        )({ headers: { authorization: `bearer ${token}` } });
    });
}

export function generateDebugToken() {
    return signToken(DEBUG_USER.username);
}

export function generateNodeRedToken() {
    return jwt.sign({ username: NODE_RED_USER.username }, JWT_TOKEN, {
        issuer: 'fleet-management',
        subject: 'general-login',
    });
}

export async function hasApiPermission(token: string | undefined, route: string) {
    const user = await getUserFromToken(token);
    if (user == undefined) {
        return false;
    }

    return (
        user.permissions.includes('*') ||
        user.permissions.includes('api:*') ||
        user.permissions.includes(`api:${route}`)
    );
}

export function setAllowDebugging(value: boolean) {
    logger.warn(
        'Enabling DEBUG user, this is only recommended in DEVELOPMENT environments!'
    );
    allowDebug = value;
}
