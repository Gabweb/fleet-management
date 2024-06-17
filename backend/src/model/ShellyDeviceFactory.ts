import { ShellyDeviceExternal } from '../types';
import ShellyDevice from './ShellyDevice';
import HttpTransport from './transport/HttpTransport';
import RpcTransport from './transport/RpcTransport';
import WebSocketTransport from './transport/WebsocketTransport';

export default class ShellyDeviceFactory {
    static fromHttp(transport: HttpTransport) {
        return this.fromOnlineTransport(transport);
    }

    static fromWebsocket(transport: WebSocketTransport) {
        return this.fromOnlineTransport(transport);
    }

    static fromDatabase(external: ShellyDeviceExternal): ShellyDevice | undefined {
        // sanity check
        if (
            !external ||
            typeof external !== 'object' ||
            typeof external.shellyID !== 'string' ||
            typeof external.source !== 'string' ||
            typeof external.info !== 'object' ||
            typeof external.status !== 'object' ||
            typeof external.settings !== 'object'
        ) {
            return undefined;
        }

        const { info, status, settings: config } = external;

        return new ShellyDevice(
            external.shellyID,
            undefined,
            'offline',
            info,
            status,
            config,
            false
        );
    }

    private static async getData(
        transport: RpcTransport
    ): Promise<[info: any, status: any, config: any]> {
        return await Promise.all([
            transport.sendRPC('Shelly.GetDeviceInfo', null),
            transport.sendRPC('Shelly.GetStatus', null),
            transport.sendRPC('Shelly.GetConfig', null),
        ]);
    }

    private static async fromOnlineTransport(transport: RpcTransport) {
        const [info, status, config] = await this.getData(transport);

        // check the firmware version if supports virtual components
        const ver = info.ver;
        const [major, minor] = ver.split('.').map((z: string) => parseInt(z));
        // minimum supported version is 1.2.0
        if (major >= 1 && minor >= 2) {
            await addVirtualComponents(transport, status, config);
        }

        return new ShellyDevice(
            info.id,
            transport,
            'online',
            info,
            status,
            config,
            false
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
    let offset = 0,
        total = 0;
    do {
        const result = await transport.sendRPC('Shelly.GetComponents', {
            offset,
            dynamic_only: true,
        });
        total = result.total;
        const components = result.components;
        for (const { key, config, status } of components) {
            deviceStatus[key] = status;
            deviceConfig[key] = config;
        }
        // add newly loaded components to the offset
        offset += components.length;
    } while (total > offset);
}
