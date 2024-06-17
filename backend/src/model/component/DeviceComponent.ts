import Component from './Component';
import { buildRpcRequest } from '../../tools/jsonrpc';
import * as Commander from '../../modules/Commander';
import { buildOutgoingJsonRpcError, ERROR_CODES } from '../../tools/jsonrpc';
import { ShellyDeviceExternal } from '../../types';
import * as WaitingRoom from '../../modules/WaitingRoom';
import * as DeviceCollector from '../../modules/DeviceCollector';

export default class DeviceComponent extends Component<any> {
    constructor() {
        super('device');
        this.methods.set('list', (params) => this.listDevices(params));
        this.methods.set('getinfo', (params) => this.getInfo(params));
        this.methods.set('getsetup', (params) => this.getSetup(params));
        this.methods.set('call', (params) => this.directCall(params));
        this.methods.set('getpending', async () => await this.getPending());
        this.methods.set('getdenied', async () => await this.getDenied());
        this.methods.set(
            'acceptpending',
            async (params) => await this.acceptPending(params.shellyIDs)
        );
        this.methods.set(
            'rejectpending',
            async (params) => await this.rejectPending(params.shellyIDs)
        );
    }

    public override checkParams(method: string, params?: any): boolean {
        switch (method) {
            case 'getsetup':
                return (
                    params &&
                    typeof params === 'object' &&
                    typeof params.shellyID === 'string'
                );
            default:
                return super.checkParams(method, params);
        }
    }

    override getStatus(params?: any): Record<string, any> {
        const len = Object.keys(params ?? {}).length;
        if (len == 0 || typeof params.id !== 'string') {
            const keys = Array.from(DeviceCollector.getAllShellyIDs());
            return {
                devices_size: keys.length,
                devices: keys,
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

    listDevices(params?: { filters?: Record<string, any> }) {
        let devices = DeviceCollector.getAll().map((device) => device.toJSON());

        // filter by top level keys; could be expanded in the future?
        const filters = params?.filters;
        if (
            filters &&
            typeof filters === 'object' &&
            Object.keys(filters).length > 0
        )
            for (const key in filters) {
                const value = filters[key];
                if (['string', 'number', 'boolean'].includes(typeof value)) {
                    devices = devices.filter(
                        (device) =>
                            key in device &&
                            device[key as keyof ShellyDeviceExternal] == value
                    );
                }
            }

        let printDevices: Record<string, ShellyDeviceExternal> = {};
        for (const device of devices) {
            printDevices[device.shellyID] = device;
        }

        return printDevices;
    }

    getInfo(params?: any) {
        const len = Object.keys(params ?? {}).length;
        if (len == 0 || typeof params.id !== 'string') {
            return {};
        }

        const device = DeviceCollector.getDevice(params.id);
        if (device) {
            return device.info;
        }

        return {};
    }

    async getSetup(params: any) {
        const shellyID = params.shellyID;
        const mode = params.mode || 'json';

        const setup: Record<string, Record<string, any>> = await Commander.exec(
            Commander.COMMAND_SENDER_INTERNAL,
            'Storage.GetAll',
            { registry: 'configs' }
        );

        if (mode === 'rpc') {
            let id = 1000;
            const rpcs: Record<string, Record<string, string[]>> = {};
            for (const profile in setup) {
                if (rpcs[profile] == undefined) {
                    rpcs[profile] = {};
                }
                for (const configName in setup[profile]) {
                    for (const key in setup[profile][configName]) {
                        const stringReq = JSON.stringify(
                            buildRpcRequest(id++, key + '.setconfig', {
                                config: setup[profile][configName][key],
                            })
                        );

                        if (rpcs[profile][configName] == undefined) {
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

    async directCall(params: any) {
        const device = DeviceCollector.getDevice(params.shellyID);

        if (!device) {
            const NOT_FOUND = buildOutgoingJsonRpcError(
                ERROR_CODES.DEVICE_NOT_FOUND_ERROR,
                params.id,
                'FLEET_MANAGER'
            );

            return Promise.reject(NOT_FOUND);
        }

        return await device.sendRPC(params.method, params.params);
    }

    //#region Waiting room

    private async getPending() {
        return await WaitingRoom.listPendingDevices();
    }

    private async getDenied() {
        return await WaitingRoom.getDenied();
    }
    private async acceptPending(shellyIDs: string[]) {
        const success: string[] = [];
        const error: string[] = [];
        for (const shellyID of shellyIDs) {
            try {
                await WaitingRoom.approveDevice(shellyID);
                success.push(shellyID);
            } catch (err) {
                this.logger.warn('Failed to approve', shellyID, err);
                error.push(shellyID);
            }
        }

        return {
            success,
            error,
        };
    }
    private async rejectPending(shellyIDs: string[]) {
        const success: string[] = [];
        const error: string[] = [];
        for (const shellyID of shellyIDs) {
            try {
                await WaitingRoom.denyDevice(shellyID);
                success.push(shellyID);
            } catch (err) {
                this.logger.warn('Failed to deny', shellyID, err);
                error.push(shellyID);
            }
        }

        return {
            success,
            error,
        };
    }

    //#endregion

    protected override getDefaultConfig() {
        return {};
    }
}
