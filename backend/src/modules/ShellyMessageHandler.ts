import { flattie } from 'flattie';
import { ShellyMessageData, ShellyMessageIncoming } from '../types';
import * as ShellyEvents from './ShellyEvents';
import { floats } from '../config/shelly.dataTypes';
import { rawCall } from './PostgresProvider';
import ShellyDevice, { parseComponentKey } from '../model/ShellyDevice';
import * as log4js from 'log4js';
const logger = log4js.getLogger('message-parser');

const SUPPORTED_EVENTS: Record<string, string> = {
    configChanged: 'config_changed',
    dynamicComponentAdded: 'component_added',
    dynamicComponentRemoved: 'component_removed',
    buttonSinglePush: 'single_push',
    buttonDoublePush: 'double_push',
    buttonTriplePush: 'triple_push',
    buttonLongPush: 'long_push',
};

export function handleMessage(
    shelly: ShellyDevice,
    res: ShellyMessageIncoming,
    req?: ShellyMessageData
) {
    // period updates
    if (res.method === 'NotifyStatus') {
        statusSelectivePush(res, shelly);
        patchStatus(shelly, res.params);
    } else if (res.method === 'NotifyEvent') {
        if (
            typeof res.params?.events === 'object' &&
            Array.isArray(res.params.events)
        ) {
            for (const event of res.params.events) {
                if (typeof event !== 'object') {
                    continue;
                }

                const { event: evt, component } = event;

                switch (evt) {
                    case SUPPORTED_EVENTS.configChanged:
                        onConfigChange(shelly, component, event.data);
                        break;

                    case SUPPORTED_EVENTS.dynamicComponentAdded:
                        shelly.fetchComponent(event.target);
                        break;

                    case SUPPORTED_EVENTS.dynamicComponentRemoved:
                        shelly.removeComponent(event.target);
                        break;

                    case SUPPORTED_EVENTS.buttonSinglePush:
                    case SUPPORTED_EVENTS.buttonDoublePush:
                    case SUPPORTED_EVENTS.buttonTriplePush:
                    case SUPPORTED_EVENTS.buttonLongPush:
                        shelly.forwardComponentEvent(component, evt);
                        break;

                    default:
                        // console.log('Unknown event:', evt, event);
                        continue;
                }
            }
        }
    }

    // logger.debug("new message shelly_id:[%s] msg:[%s]", shelly.shellyID, JSON.stringify(res));
    ShellyEvents.emitShellyMessage(shelly, res, req);
}

function patchStatus(shelly: ShellyDevice, data: Record<string, any>) {
    for (const key in data) {
        if (key === 'ts') continue;
        shelly.setComponentStatus(key, data[key]);
    }
}

export async function statusSelectivePush(
    req: ShellyMessageIncoming,
    device: ShellyDevice
) {
    const { ts, ...components } = req.params;
    const d = flattie(components);
    try {
        await Promise.all(
            Object.keys(d).map(async (k): Promise<undefined> => {
                const v = d[k];
                const idx = floats.raw.indexOf(k);
                if (idx > -1) {
                    const params = {
                        pTs: ts.toFixed(0),
                        pId: device.shellyID,
                        pField: k,
                        pFieldGroup: floats.group[idx],
                        pValue: v,
                    };
                    return rawCall('devices.fnStatusPush', params);
                }
            })
        );
    } catch (e) {
        logger.error('Insert device status: ', e);
    }
}

async function onConfigChange(shelly: ShellyDevice, key: string, config: any) {
    const { type, id } = parseComponentKey(key);

    try {
        const config = await shelly.sendRPC(`${type}.GetConfig`, id && { id });
        // Update the config
        shelly.setComponentConfig(key, config);
    } catch (error) {
        logger.error('Error getting config for %s:%s -> %s', type, id, error);
        return;
    }

    if (type === 'sys') {
        try {
            const info = await shelly.sendRPC('Shelly.GetDeviceInfo');
            // Update the device info
            shelly.setInfo(info);
        } catch (error) {
            logger.error('Error getting device info -> %s', error);
        }
    }
}
