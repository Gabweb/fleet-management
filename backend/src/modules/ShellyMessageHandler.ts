import {flattie} from 'flattie';
import * as log4js from 'log4js';
import {floats} from '../config/shelly.dataTypes';
import type ShellyDevice from '../model/ShellyDevice';
import {parseComponentKey} from '../model/ShellyDevice';
import type {
    ShellyMessageData,
    ShellyMessageIncoming,
    shelly_bthome_type_t
} from '../types';
import {rawCall} from './PostgresProvider';
import {InitEm} from './ShellyEmHandler';
import * as ShellyEvents from './ShellyEvents';
const logger = log4js.getLogger('message-parser');

const lastDeviceStatusValue = new Map<string, number>();
let status_push_queue: t_intermid_1 = {
    p_ts: [],
    p_id: [],
    p_field: [],
    p_field_group: [],
    p_value: [],
    p_prev_value: []
};

setInterval(async () => {
    const sl = status_push_queue.p_ts.length;
    if (sl) {
        try {
            logger.info('---->>> Syncing status, length %d', sl);
            await rawCall('device.fn_status_push', status_push_queue);
        } finally {
            status_push_queue = {
                p_ts: [],
                p_id: [],
                p_field: [],
                p_field_group: [],
                p_value: [],
                p_prev_value: []
            };
        }
    }
}, 120000);

const em = InitEm();
type shelly_event_t =
    | 'config_changed'
    | 'component_added'
    | 'component_removed'
    | 'device_discovered' // bthome discovery result
    | 'discovery_done' // bthome discovery finished
    | 'single_push'
    | 'double_push'
    | 'triple_push'
    | 'long_push';

export function handleMessage(
    shelly: ShellyDevice,
    res: ShellyMessageIncoming,
    req?: ShellyMessageData
) {
    // period updates
    em.evaluate(res, shelly);
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

                const {
                    event: evt,
                    component
                }: {event: shelly_event_t; component: string} = event;

                switch (evt) {
                    case 'config_changed':
                        onConfigChange(shelly, component, event.data);
                        break;

                    case 'component_added':
                        logger.info('Component added', event.target);
                        shelly.fetchComponent(event.target);
                        break;

                    case 'component_removed':
                        shelly.removeComponent(event.target);
                        break;

                    case 'single_push':
                    case 'double_push':
                    case 'triple_push':
                    case 'long_push':
                        shelly.forwardComponentEvent(component, evt);
                        break;

                    case 'device_discovered':
                        ShellyEvents.emitBTHomeDiscoveryResult(
                            event?.device?.local_name as shelly_bthome_type_t,
                            event?.device?.addr as string,
                            shelly.shellyID
                        );
                        logger.info(
                            'BTHome device discovered',
                            event?.device?.local_name,
                            'from',
                            shelly.shellyID
                        );
                        break;

                    case 'discovery_done':
                        // {"component":"bthome","event":"discovery_done","device_count":1,"ts":1733001388.36}
                        logger.info(
                            'BTHome discovery done',
                            event.device_count,
                            'for',
                            shelly.shellyID
                        );
                        ShellyEvents.emitShellyDiscoveryDone(
                            shelly.shellyID,
                            event.device_count
                        );
                        break;

                    default:
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

type t_intermid_1 = {
    p_ts: number[];
    p_id: number[];
    p_field: string[];
    p_field_group: string[];
    p_value: number[];
    p_prev_value: number[];
};

export async function statusSelectivePush(
    req: ShellyMessageIncoming,
    device: ShellyDevice
) {
    const {ts, ...components} = req.params;
    const d = flattie(components);
    try {
        const status_push = await Object.keys(d).reduce(
            async (_: Promise<t_intermid_1>, k): Promise<t_intermid_1> => {
                const a: t_intermid_1 = await _;
                const v = d[k];
                const idx = floats.raw.indexOf(k);
                if (idx > -1) {
                    if (!lastDeviceStatusValue.get(`${device.id}.${k}`)) {
                        const {
                            rows: [lr]
                        } = await rawCall('device.fn_status_last_value', {
                            p_id: device.id,
                            p_field: k
                        });
                        lr?.last_value &&
                            lastDeviceStatusValue.set(
                                `${device.id}.${k}`,
                                lr.last_value
                            );
                    }
                    const lastVal = lastDeviceStatusValue.get(
                        `${device.id}.${k}`
                    );
                    a.p_ts.push(ts.toFixed(0));
                    a.p_id.push(device.id);
                    a.p_field.push(k);
                    a.p_field_group.push(floats.group[idx]);
                    a.p_value.push(v);
                    a.p_prev_value.push(lastVal !== undefined ? lastVal : v);
                    lastDeviceStatusValue.set(`${device.id}.${k}`, v);
                }
                return a;
            },
            Promise.resolve({
                p_ts: [],
                p_id: [],
                p_field: [],
                p_field_group: [],
                p_value: [],
                p_prev_value: []
            })
        );
        if (status_push.p_ts.length) {
            status_push_queue.p_ts = status_push_queue.p_ts.concat(
                status_push.p_ts
            );
            status_push_queue.p_id = status_push_queue.p_id.concat(
                status_push.p_id
            );
            status_push_queue.p_field = status_push_queue.p_field.concat(
                status_push.p_field
            );
            status_push_queue.p_field_group =
                status_push_queue.p_field_group.concat(
                    status_push.p_field_group
                );
            status_push_queue.p_value = status_push_queue.p_value.concat(
                status_push.p_value
            );
            status_push_queue.p_prev_value =
                status_push_queue.p_prev_value.concat(status_push.p_prev_value);
        }
    } catch (e) {
        logger.error('Collect device status: ', e);
    }
}

async function onConfigChange(shelly: ShellyDevice, key: string, config: any) {
    const {type, id} = parseComponentKey(key);

    try {
        const config = await shelly.sendRPC(`${type}.GetConfig`, id && {id});
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
