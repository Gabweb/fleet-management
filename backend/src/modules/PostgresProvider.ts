import migration from 'migration-collection/lib/postgres';
import exposeMethods from 'expose-sql-methods/lib/postgres';
import * as log4js from 'log4js';
const logger = log4js.getLogger('postgres');
import { configRc } from '../config';

type get_resp_t = {
    id: string;
    created: Date;
    updated: Date;
    jdoc: any;
    controlAccess: number;
};
const MAX_SLEEP_COUNT = 15;
let sleeps = 0;

export const ACCESS_CONTROL = {
    PENDING: 1,
    DENIED: 2,
    ALLOWED: 3,
};

// make sure we hoist that and make it accessible everywhere
var callDbMethod: <T = any>(name: string, params: any) => Promise<T>;

async function sleepUntil(time: number, assert: () => boolean) {
    return new Promise((resolve, reject) => {
        if (++sleeps > MAX_SLEEP_COUNT) {
            reject('TIMEOUT');
            return;
        }

        if (assert()) {
            resolve(1);
            return;
        }
        setTimeout(() => resolve(sleepUntil(time, assert)), time);
    });
}

export function isReady() {
    return !!callDbMethod;
}

export async function rawCall(name: string, params: any) {
    if (!callDbMethod) return Promise.reject('Not ready.');
    return callDbMethod(name, params);
}

export async function get(
    shellyID: string | null = null,
    controlAccess: number | null = null
): Promise<get_resp_t[]> {
    if (!callDbMethod) return Promise.reject('Not ready.');
    const result = await callDbMethod('devices.fnDeviceFetch', {
        pDevice: shellyID,
        pControlAccess: controlAccess || null,
    });

    return result.rows;
}

export async function getPendingDevices() {
    return get(null, ACCESS_CONTROL.PENDING);
}

export async function getDeniedDevices() {
    return get(null, ACCESS_CONTROL.DENIED);
}

export async function accessControl(
    shellyID: string,
    controlAccess?: number
): Promise<get_resp_t | undefined> {
    if (!callDbMethod) return Promise.reject('Not ready.');
    const rows = (
        await callDbMethod('devices.fnDeviceFetch', {
            pDevice: shellyID,
            pControlAccess: controlAccess,
        })
    ).rows;
    if (!rows[0]) return undefined;
    return rows[0] as get_resp_t;
}

export async function allowAccessControl(shellyID: string) {
    return await callDbMethod<void>('devices.fnControlAccessAllow', {
        pId: shellyID,
    });
}

export async function denyAccessControl(shellyID: string) {
    return await callDbMethod<void>('devices.fnControlAccessDeny', {
        pId: shellyID,
    });
}

export async function store(shellyID: string, data: any) {
    if (!callDbMethod) return Promise.reject('Not ready.');
    return await callDbMethod('devices.fnDeviceAdd', {
        pDevice: shellyID,
        pJdoc: data,
    });
}
export async function callMethod(method: string, params: any) {
    if (!callDbMethod) return Promise.reject('Not ready.');
    return await callDbMethod(method, params);
}

export function init(cb: (devices: get_resp_t[]) => void) {
    logger.debug('init started');
    let allReady = 0;
    let config = Object.assign({}, configRc.internalStorage);

    if (!config || Object.keys(config).length == 0) {
        logger.warn('init config error, no postgres config found');
        // return empty array
        cb([]);
        return;
    }

    if (config && config.cwd) {
        allReady = allReady - 1;
        config.cwd = config.cwd.map((e: string) => `${process.cwd()}/${e}`);
        // run in background
        migration(config).then(
            () => {
                allReady = allReady + 1;
            },
            (err) => {
                logger.error('Migration failed', err);
            }
        );
    }

    // run in background
    sleepUntil(100, () => allReady === 0)
        .then(async () => {
            const expDB = await exposeMethods<Record<string, any>>(config);
            // pass state to global variable
            callDbMethod = async (name: string, params: any) => {
                const m = expDB.methods[name];
                if (!m) {
                    throw new Error('MethodNotFound');
                }
                return await m(params);
            };
            allReady = allReady + 1;

            logger.debug('init finished');
            // list devices and call callback fn
            callDbMethod('devices.fnDeviceFetch', {
                pDevice: null,
                pControlAccess: 3,
            }).then(
                (res) => cb(res.rows),
                () => cb([])
            );
        })
        .catch((err) => {
            logger.fatal('😱 Connection to DB timed out!', err);
        });
}
