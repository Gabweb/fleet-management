import type {get_resp_t} from '../modules/PostgresProvider';
import * as postgres from '../modules/PostgresProvider';
import {ShellyDeviceExternal} from '../types';
import ShellyDevice from './ShellyDevice';
import type HttpTransport from './transport/HttpTransport';
import type RpcTransport from './transport/RpcTransport';
import type WebSocketTransport from './transport/WebsocketTransport';

export default class ShellyDeviceFactory {
    static fromHttp(transport: HttpTransport) {
        return ShellyDeviceFactory.fromOnlineTransport(transport);
    }

    static fromWebsocket(transport: WebSocketTransport) {
        return ShellyDeviceFactory.fromOnlineTransport(transport);
    }

    static fromDatabase(entry: get_resp_t): ShellyDevice | undefined {
        // sanity check
        const {updated, created, jdoc, id} = entry;

        if (
            !jdoc ||
            typeof jdoc !== 'object' ||
            typeof jdoc.shellyID !== 'string' ||
            typeof id !== 'number' ||
            typeof jdoc.source !== 'string' ||
            typeof jdoc.info !== 'object' ||
            typeof jdoc.status !== 'object' ||
            typeof jdoc.settings !== 'object'
        ) {
            return undefined;
        }

        const {info, status, settings: config} = jdoc;

        return new ShellyDevice(
            jdoc.shellyID,
            undefined,
            'offline',
            info,
            status,
            config,
            false,
            id,
            updated.getTime()
        );
    }

    private static async getData(
        transport: RpcTransport
    ): Promise<[info: any, status: any, config: any]> {
        return await Promise.all([
            transport.sendRPC('Shelly.GetDeviceInfo', null),
            transport.sendRPC('Shelly.GetStatus', null),
            transport.sendRPC('Shelly.GetConfig', null)
        ]);
    }

    private static async fromOnlineTransport(transport: RpcTransport) {
        const td = await ShellyDeviceFactory.getData(transport);
        const [info, status, config] = td;

        // check the firmware version if supports virtual components
        const ver = info.ver;
        const [major, minor] = ver
            .split('.')
            .map((z: string) => Number.parseInt(z));
        // minimum supported version is 1.2.0
        if (major >= 1 && minor >= 2) {
            await addVirtualComponents(transport, status, config);
        }
        const [dev] = await postgres.get(info.id, 3);
        return new ShellyDevice(
            info.id,
            transport,
            'online',
            info,
            status,
            config,
            false,
            dev?.id || 0
        );
    }
}

/**
 * This function modifies the parameters and creates side effects!
 * Usually not considered a good practice, but it works here 🤔
 */
async function addVirtualComponents(
    transport: RpcTransport,
    deviceStatus: any,
    deviceConfig: any
) {
    let offset = 0;
    let total = 0;
    do {
        const result = await transport.sendRPC('Shelly.GetComponents', {
            offset,
            dynamic_only: true
        });
        total = result.total;
        const components = result.components;
        for (const {key, config, status} of components) {
            deviceStatus[key] = status;
            deviceConfig[key] = config;
        }
        // add newly loaded components to the offset
        offset += components.length;
    } while (total > offset);
}
