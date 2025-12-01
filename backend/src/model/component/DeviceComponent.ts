import * as Commander from '../../modules/Commander';
import * as DeviceCollector from '../../modules/DeviceCollector';
import * as PostgresProvider from '../../modules/PostgresProvider';
import * as WaitingRoom from '../../modules/WaitingRoom';
import RpcError from '../../rpc/RpcError';
import {buildRpcRequest} from '../../rpc/builders';
import type {
    ShellyDeviceExternal,
    shelly_bthome_result_t,
    shelly_bthome_type_t
} from '../../types';
import type {Device} from '../../validations/params';
import type CommandSender from '../CommandSender';
import type ShellyDevice from '../ShellyDevice';
import Component from './Component';

const REDIRECT_METHODS = [
    'getpending',
    'getdenied',
    'acceptpending',
    'rejectpending',
    'acceptpendingbyid',
    'acceptpendingbyexternalid'
];

function redirectToWaitingRoom(method: string) {
    return async (params: any, sender: CommandSender) => {
        return await Commander.exec(sender, `WaitingRoom.${method}`, params);
    };
}

export default class DeviceComponent extends Component<any> {
    constructor() {
        super('device');

        // Setup waiting room redirects
        for (const method of REDIRECT_METHODS) {
            this.addMethod(method, redirectToWaitingRoom(method));
        }
    }

    override getStatus(params?: any): Record<string, any> {
        const len = Object.keys(params ?? {}).length;
        if (len === 0 || typeof params.id !== 'string') {
            const keys = Array.from(DeviceCollector.getAllShellyIDs());
            return {
                devices_size: keys.length,
                devices: keys
            };
        }

        const device = DeviceCollector.getDevice(params.id);
        if (device) {
            return device.status;
        }

        return {};
    }

    override getConfig(params?: any) {
        if (typeof params?.id === 'string') {
            const device = DeviceCollector.getDevice(params.id);
            if (device) {
                return device.config;
            }
        }

        return {};
    }

    @Component.Expose('List')
    @Component.NoPermissions
    async list(
        params: {filters?: Record<string, any>} | undefined,
        sender: CommandSender
    ) {
        let devices = DeviceCollector.getAll().map((device) => device.toJSON());
        // filter by top level keys; could be expanded in the future?
        const filters = params?.filters;
        if (
            filters &&
            typeof filters === 'object' &&
            Object.keys(filters).length > 0
        ) {
            for (const key in filters) {
                const value = filters[key];
                if (['string', 'number', 'boolean'].includes(typeof value)) {
                    devices = devices.filter(
                        (device) =>
                            key in device &&
                            device[key as keyof ShellyDeviceExternal] === value
                    );
                }
            }
        }
        const printDevices: ShellyDeviceExternal[] = [];
        try {
            for (const device of devices) {
                if (await sender.canAccessDevice(device.shellyID)) {
                    printDevices.push(device);
                }
            }
        } catch (e) {
            console.error(e);
        }

        return printDevices;
    }

    @Component.Expose('GetInfo')
    @Component.NoPermissions
    getInfo(params?: any) {
        const len = Object.keys(params ?? {}).length;
        if (len === 0 || typeof params.id !== 'string') {
            return {};
        }

        const device = DeviceCollector.getDevice(params.id);
        if (device) {
            return device.info;
        }

        return {};
    }

    @Component.Expose('GetSetup')
    @Component.NoPermissions
    async getSetup(params: Device.GetSetup) {
        const shellyID = params.shellyID;
        const mode = params.mode || 'json';

        const setup: Record<
            string,
            Record<string, any>
        > = await Commander.execInternal('Storage.GetAll', {
            registry: 'configs'
        });

        if (mode === 'rpc') {
            let id = 1000;
            const rpcs: Record<string, Record<string, string[]>> = {};
            for (const profile in setup) {
                if (rpcs[profile] === undefined) {
                    rpcs[profile] = {};
                }
                for (const configName in setup[profile]) {
                    for (const key in setup[profile][configName]) {
                        const stringReq = JSON.stringify(
                            buildRpcRequest(id++, `${key}.setconfig`, {
                                config: setup[profile][configName][key]
                            })
                        );

                        if (rpcs[profile][configName] === undefined) {
                            rpcs[profile][configName] = [];
                        }

                        rpcs[profile][configName].push(stringReq);
                    }
                }
            }
            return rpcs;
        }
        return setup;
    }

    @Component.Expose('Call')
    @Component.NoPermissions
    async directCall(params: Device.Call) {
        const device = DeviceCollector.getDevice(params.shellyID);
        if (!device) {
            throw RpcError.DeviceNotFound();
        }

        return await device.sendRPC(params.method, params.params);
    }

    @Component.Expose('Get')
    @Component.NoPermissions
    getDevice(params: {shellyID: string} | {id: string}) {
        const id = 'shellyID' in params ? params.shellyID : params.id;

        if (typeof id !== 'string') {
            throw RpcError.InvalidParams('Missing device id');
        }

        const device = DeviceCollector.getDevice(id);

        if (!device) {
            throw RpcError.DeviceNotFound();
        }

        return device.toJSON();
    }

    @Component.Expose('Delete')
    @Component.NoPermissions
    async delete(params: Device.Delete) {
        const {shellyID} = params;
        let {id} = params;

        if (typeof id !== 'number') {
            const rec = await PostgresProvider.accessControl(shellyID);
            if (!rec?.id) {
                throw RpcError.InvalidParams(
                    `Could not resolve internal id for ${shellyID}`
                );
            }
            id = rec.id;
        }

        await WaitingRoom.denyDevice(id);
        await PostgresProvider.deviceDelete(shellyID);
        return {
            deleted: shellyID
        };
    }

    @Component.Expose('GetEmData')
    @Component.NoPermissions
    async getEmData(
        params: {shellyIDs: string[]; from: string; to: string},
        sender: CommandSender
    ) {
        const {shellyIDs, from, to} = params;

        if (!shellyIDs || shellyIDs.length === 0 || !from || !to) {
            throw RpcError.InvalidParams('Missing shellyID, from, or to');
        }

        const internalIds: number[] = [];
        for (const shellyID of shellyIDs) {
            const devices = await PostgresProvider.callMethod(
                'device.fnFetch',
                {
                    pDevice: shellyID,
                    pControlAccess: null
                }
            );
            const internalId = devices?.rows?.[0]?.internalId;
            if (internalId) {
                internalIds.push(internalId);
            }
        }

        if (internalIds.length === 0) {
            throw RpcError.DeviceNotFound();
        }

        const stats = await PostgresProvider.callMethod(
            'device_em.fnReportDiff',
            {
                pDevices: internalIds,
                pFrom: from,
                pTo: to,
                pPeriod: 'month'
            }
        );

        return {
            shellyIDs,
            internalIds,
            data: stats.rows
        };
    }

    //-----------------------------|BTHOME|-----------------------------//

    @Component.Expose('AddBTHomeDevices')
    @Component.NoPermissions
    addBTHomeDevice(params: {devices: shelly_bthome_result_t[]}) {
        for (const {mac, shellyID} of params.devices) {
            const device = DeviceCollector.getDevice(shellyID) as ShellyDevice;
            if (!device) {
                continue;
            }

            device.addBTHomeDevice(mac);
        }
    }

    @Component.Expose('StartDeviceDiscovery')
    @Component.NoPermissions
    startDeviceDiscovery(params: {shellyIds: string[]; duration: number}) {
        for (const shellyId of params.shellyIds) {
            const device = DeviceCollector.getDevice(shellyId) as ShellyDevice;
            if (!device) {
                continue;
            }

            device.startBTHomeScanner(params.duration);
        }
    }

    @Component.Expose('RemoveBTHomeDevice')
    @Component.NoPermissions
    async rpcRemoveBTHomeDevice(
        params: {shellyID: string; id: number},
        sender: CommandSender
    ): Promise<{success: true}> {
        const {shellyID, id} = params;
        if (typeof shellyID !== 'string' || typeof id !== 'number') {
            throw RpcError.InvalidParams(
                'Expected { shellyID: string, id: number }'
            );
        }
        const device = DeviceCollector.getDevice(shellyID);
        if (!device) {
            throw RpcError.DeviceNotFound();
        }
        const shelly = device as ShellyDevice;

        await shelly.removeBTHomeDevice(id);

        return {success: true};
    }

    @Component.Expose('AddBTHomeDeviceManual')
    async rpcAddBTHomeDeviceManual(
        params: {shellyID?: string; mac?: string; name?: string},
        sender: CommandSender
    ) {
        const {shellyID, mac, name} = params;
        if (typeof shellyID !== 'string' || typeof mac !== 'string') {
            throw RpcError.InvalidParams(
                'Expected { shellyID: string, mac: string, name?: string }'
            );
        }
        const device = DeviceCollector.getDevice(shellyID);
        if (!device) throw RpcError.DeviceNotFound();

        try {
            await (device as ShellyDevice).addBTHomeDeviceManual(mac, name);
            return {success: true};
        } catch (err: any) {
            console.error(
                `rpcAddBTHomeDeviceManual failed for shellyID=${shellyID} mac=${mac}:`,
                err
            );
            throw RpcError.Server(
                `AddBTHomeDeviceManual failed: ${err?.message ?? String(err)}`
            );
        }
    }

    @Component.Expose('GetBTHomeDeviceKnownObjects')
    @Component.NoPermissions
    async rpcGetBTHomeDeviceKnownObjects(
        params: {shellyID: string; mac: string},
        sender: CommandSender
    ): Promise<
        Array<{
            addr: string;
            obj_id: number;
            idx: number;
            type: string | null;
            name?: string;
            meta?: any;
        }>
    > {
        const {shellyID} = params;
        if (typeof shellyID !== 'string') {
            throw RpcError.InvalidParams('Expected { shellyID: string }');
        }
        const device = DeviceCollector.getDevice(shellyID) as ShellyDevice;
        if (!device) throw RpcError.DeviceNotFound();

        try {
            const cfg = device.config as Record<string, any>;
            const result: Array<{
                id: number;
                addr: string;
                obj_id: number;
                idx: number;
                type: string | null;
                name?: string;
                meta?: any;
            }> = [];

            for (const key of Object.keys(cfg)) {
                if (!key.startsWith('bthomedevice:')) continue;
                const idNum = Number.parseInt(key.split(':')[1], 10);
                if (!Number.isFinite(idNum)) continue;
                if (cfg[key].addr !== params.mac) continue;
                let known: {
                    id: number;
                    objects?: Array<{
                        obj_id: number;
                        idx: number;
                        component: string | null;
                    }>;
                };
                try {
                    known = await device.sendRPC(
                        'BTHomeDevice.GetKnownObjects',
                        {id: idNum}
                    );
                } catch (innerErr: any) {
                    console.error(
                        `BTHomeDevice.GetKnownObjects RPC failed for shellyID=${shellyID} id=${idNum}:`,
                        innerErr
                    );
                    continue;
                }

                const devCfg = cfg[key];
                for (const o of known.objects ?? []) {
                    result.push({
                        id: idNum,
                        addr: devCfg.addr,
                        obj_id: o.obj_id,
                        idx: o.idx,
                        type: o.component ?? null,
                        name: devCfg.name,
                        meta: devCfg.meta
                    });
                }
            }

            return result;
        } catch (err: any) {
            console.error(
                `rpcGetBTHomeDeviceKnownObjects failed for shellyID=${shellyID}:`,
                err
            );
            throw RpcError.Server(
                `GetBTHomeDeviceKnownObjects failed: ${err?.message ?? String(err)}`
            );
        }
    }

    @Component.Expose('AddBTHomeSensor')
    async rpcAddBTHomeSensor(
        params: {
            shellyID?: string;
            id?: number;
            addr?: string;
            obj_id?: number;
            idx?: number;
            name?: string;
            meta?: Record<string, any>;
        },
        sender: CommandSender
    ): Promise<{success: true}> {
        const {shellyID, id, addr, obj_id, idx, name, meta} = params;
        if (
            typeof shellyID !== 'string' ||
            typeof id !== 'number' ||
            typeof addr !== 'string' ||
            typeof obj_id !== 'number' ||
            typeof idx !== 'number'
        ) {
            throw RpcError.InvalidParams(
                'Expected { shellyID: string, id: number, addr: string, obj_id: number, idx: number, name?: string, meta?: any }'
            );
        }
        const device = DeviceCollector.getDevice(shellyID) as ShellyDevice;
        if (!device) throw RpcError.DeviceNotFound();

        try {
            await device.addBTHomeSensor(id!, addr!, obj_id!, idx!, name, meta);
            return {success: true};
        } catch (err: any) {
            console.error(
                `rpcAddBTHomeSensor failed for shellyID=${shellyID} id=${id} obj_id=${obj_id} idx=${idx}:`,
                err
            );
            throw RpcError.Server(
                `AddBTHomeSensor failed: ${err?.message ?? String(err)}`
            );
        }
    }

    protected override getDefaultConfig() {
        return {};
    }
}
