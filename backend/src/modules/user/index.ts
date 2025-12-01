import {getLogger} from 'log4js';
import passport from 'passport';
import {configRc, loginStrategy} from '../../config';
import type {user_t} from '../../types';
import * as Commander from '../Commander';
import UserComponent from './UserComponent';
import {ACCESS_TOKEN_OPTIONS, DefaultSigner} from './signers';

const logger = getLogger();

const component = new UserComponent();

export function getJwtToken(): string {
    return component.getFullConfig().jwtToken || 'shelly-secret-token';
}

export function hasAllowedDebug() {
    return component.getFullConfig().allowDebugUser;
}

function getRootUser() {
    const configUser = configRc['root-user'];

    if (
        !configUser ||
        typeof configUser.username !== 'string' ||
        typeof configUser.password !== 'string'
    )
        return;

    logger.debug('Enabled root user:[%s]', configUser.username);

    return {
        username: configUser.username,
        password: configUser.password,
        permissions: ['*'],
        group: 'admin',
        enabled: false
    };
}

const ROOT_USER = getRootUser();

export const DEBUG_USER: user_t = {
    username: 'DEBUG',
    password: '',
    permissions: ['*'],
    group: 'admin',
    enabled: false
};

export const NODE_RED_USER: user_t = {
    username: 'NODE_RED',
    password: '',
    permissions: ['*'],
    group: 'admin',
    enabled: false
};

export const UNAUTHORIZED_USER: user_t = {
    username: '<UNAUTHORIZED>',
    password: '',
    permissions: [],
    group: '',
    enabled: false
};

export async function getUserFromConfig(username: string) {
    if (username === DEBUG_USER.username) {
        return hasAllowedDebug() ? DEBUG_USER : undefined;
    }

    if (username === NODE_RED_USER.username) {
        return NODE_RED_USER;
    }

    if (ROOT_USER && username === ROOT_USER.username) {
        return ROOT_USER;
    }

    const {
        rows: [user]
    } = await component.find({name: username});

    return user;
}

export async function login(username: string, password: string) {
    // Check if we are trying to login to root user
    if (ROOT_USER && ROOT_USER.username === username) {
        return ROOT_USER.password === password
            ? DefaultSigner.sign(username)
            : undefined;
    }
    // Check normal users
    const {
        rows: [user]
    } = await component.find({name: username, password});
    if (!user) {
        logger.warn('user not found username=[%s]', username);
        return undefined;
    }
    if (!user.enabled) {
        logger.warn('user disabled username=[%s]', username);
        return undefined;
    }
    return DefaultSigner.sign(username, ACCESS_TOKEN_OPTIONS);
}

export async function verifyToken(token: string | undefined) {
    if (token === undefined) {
        if (!hasAllowedDebug()) {
            return undefined;
        }
        token = DefaultSigner.sign(DEBUG_USER.username);
    }

    if (!token.includes('.')) {
        // jwt has '.', basic auth does not
        const decoded = Buffer.from(token, 'base64').toString('utf-8');
        const [username = '', password = ''] = decoded.split(':');
        token = (await login(username, password)) || '';
    }

    return DefaultSigner.verify(token, ACCESS_TOKEN_OPTIONS);
}

export async function getUserFromToken(
    token: string | undefined
): Promise<user_t | undefined> {
    if (loginStrategy === 'backend-jwt') {
        const decoded = await verifyToken(token);
        if (
            !decoded ||
            typeof decoded !== 'object' ||
            typeof decoded?.username !== 'string'
        )
            return undefined;
        return getUserFromConfig(decoded.username);
    }

    return new Promise<user_t>((resolve, reject) => {
        passport.authenticate(
            loginStrategy,
            {session: false},
            (err: Error, usr: {email: string}) => {
                if (err) {
                    logger.error('AuthInt', err);
                    return reject(err);
                }
                if (!usr) {
                    logger.error('AuthMissingAccessToken', err);
                    return reject('missingAccessToken');
                }
                return resolve({
                    username: usr.email,
                    password: '',
                    permissions: ['*'],
                    group: '',
                    enabled: true
                });
            }
        )({headers: {authorization: `bearer ${token}`}});
    });
}

export async function hasApiPermission(
    token: string | undefined,
    route: string
) {
    const user = await getUserFromToken(token);
    if (user === undefined) {
        return false;
    }

    return (
        user.permissions.includes('*') ||
        user.permissions.includes('api:*') ||
        user.permissions.includes(`api:${route}`)
    );
}

// add to commander
Commander.registerComponent(component);
