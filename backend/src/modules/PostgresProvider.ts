import exposeMethods from 'expose-sql-methods/lib/postgres';
import * as log4js from 'log4js';
import migration from 'migration-collection/lib/postgres';
import {configRc} from '../config';
import ShellyDeviceFactory from '../model/ShellyDeviceFactory';
import * as DeviceCollector from '../modules/DeviceCollector';

const logger = log4js.getLogger('postgres');

export type get_resp_t = {
    external_id: string;
    created: Date;
    updated: Date;
    jdoc: any;
    control_access: number;
    id: number;
};
const MAX_SLEEP_COUNT = 30;
const SLEEP_MS = 1000;
let sleeps = 0;

export const ACCESS_CONTROL = {
    PENDING: 1,
    DENIED: 2,
    ALLOWED: 3
};

// make sure we hoist that and make it accessible everywhere
let callDbMethod: <T = any>(
    name: string,
    params: any,
    txId?: number
) => Promise<T>;

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

export async function rawCall(name: string, params: any) {
    if (!callDbMethod) throw new Error('Database not ready');
    return callDbMethod(name, params);
}

export async function get(
    shellyID: string | null = null,
    controlAccess: number | null = null
): Promise<get_resp_t[]> {
    if (!callDbMethod) throw new Error('Database not ready');
    const result = await callDbMethod('device.fn_fetch', {
        p_external_id: shellyID,
        p_control_access: controlAccess || null
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
    shellyID?: string,
    id?: number,
    controlAccess?: number
): Promise<get_resp_t | undefined> {
    if (!callDbMethod) throw new Error('Database not ready');
    const rows = (
        await callDbMethod('device.fn_fetch', {
            p_external_id: shellyID,
            p_id: id,
            p_control_access: controlAccess
        })
    ).rows;
    if (!rows[0]) return undefined;
    return rows[0] as get_resp_t;
}

export async function allowAccessControl(id: number) {
    return await callDbMethod<void>('device.fn_control_access_allow', {
        p_id: id
    });
}

export async function denyAccessControl(id: number) {
    return await callDbMethod<void>('device.fn_control_access_deny', {
        p_id: id
    });
}

export async function userCheck(name: string, password: string) {
    return await callDbMethod<void>('user.fn_get', {
        p_name: name,
        p_password: password
    });
}

export async function userList({
    id,
    name,
    password
}: {
    id?: number;
    name?: string;
    password?: string;
}) {
    return await callDbMethod<{rows: any[]}>('user.fn_get', {
        p_id: id,
        p_name: name,
        p_password: password
    });
}

export async function userDelete({id}: {id: number}) {
    return await callDbMethod<void>('user.fn_delete', {p_id: id});
}

export async function deviceDelete(shellyID: string) {
    const device = (await get(shellyID))[0];
    if (!device) throw new Error(`Device ${shellyID} not found`);
    return await callDbMethod<void>('device.fn_full_delete', {
        p_id: device.id
    });
}

export async function userCreate({
    name,
    enabled,
    password,
    fullName,
    group,
    email,
    permissions
}: {
    name: string;
    enabled: boolean;
    password: string;
    fullName: string;
    group: string;
    email: string;
    permissions: string[];
}) {
    return await callDbMethod<void>('user.fn_add', {
        p_name: name,
        p_email: email,
        p_enabled: enabled,
        p_password: password,
        p_full_name: fullName,
        p_group: group,
        p_permissions: permissions
    });
}

export async function userUpdate({
    id,
    enabled,
    password,
    fullName,
    group,
    permissions,
    email
}: {
    id: number;
    enabled?: boolean;
    password?: string;
    fullName?: string;
    group?: string;
    permissions?: string[];
    email?: string;
}) {
    return await callDbMethod<void>('user.fn_update', {
        p_id: id,
        p_enabled: enabled,
        p_password: password,
        p_full_name: fullName,
        p_group: group,
        p_permissions: permissions,
        p_email: email
    });
}

export async function store(shellyID: string, data: any) {
    if (!callDbMethod) throw new Error('Database not ready');
    return await callDbMethod('device.fn_add', {
        p_external_id: shellyID,
        p_jdoc: data
    });
}
export async function callMethod(method: string, params: any, txId?: number) {
    if (!callDbMethod) throw new Error('Database not ready');
    return await callDbMethod(method, params, txId);
}

export async function initDatabase() {
    logger.debug('init started');
    let allReady = 0;
    const config = Object.assign({}, configRc.internalStorage);

    if (!config || Object.keys(config).length === 0) {
        logger.warn('init config error, no postgres config found');
        // return empty array
        return;
    }

    if (config?.cwd) {
        allReady = allReady - 1;
        config.cwd = config.cwd.map((e: string) => `${process.cwd()}/${e}`);
        // run in background
        try {
            await migration(config);
            allReady = allReady + 1;
        } catch (err: any) {
            logger.error('Migration failed %s', err.message);
            throw err;
        }
    }

    await sleepUntil(SLEEP_MS, () => allReady === 0);

    const expConfig = {
        ...config,
        schemas: config.link.schemas
    };

    const expDB = await exposeMethods<Record<string, any>>(expConfig, {
        log: (level: 'error' | 'info' | 'warn', ...rest: [any]) => {
            logger[level](...rest);
        }
    });

    // pass state to global variable
    callDbMethod = async (name: string, params: any, txId?: number) => {
        const m = expDB.methods[name];
        if (!m) {
            if (name === 'tx') {
                return {
                    async begin() {
                        return await expDB.txBegin();
                    },
                    async end(id: number, query: string) {
                        return await expDB.txEnd(id, query);
                    }
                };
            }
            throw new Error('MethodNotFound');
        }
        return await m(params, txId);
    };
    allReady = allReady + 1;

    logger.debug('init finished');
}

export async function loadSavedDevices() {
    const devices = await get();
    logger.info('found %s saved devices', devices.length);
    let registered = 0;
    for (const external of devices) {
        // parse saved state to actual device object
        try {
            const device = ShellyDeviceFactory.fromDatabase(external);
            if (device) {
                DeviceCollector.register(device);
                registered++;
            } else {
                logger.warn(
                    'Cannot create device from db entry',
                    external.jdoc
                );
            }
        } catch (error) {
            logger.warn(
                'failed to load saved device state=[%s] err=[%s]',
                JSON.stringify(external.jdoc),
                String(error)
            );
        }
    }

    if (registered < devices.length) {
        logger.warn(
            'failed to load %s saved devices',
            devices.length - registered
        );
    }
}
