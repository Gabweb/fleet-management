import {flattie} from 'flattie';
import * as log4js from 'log4js';
import type ShellyDevice from '../model/ShellyDevice';
import * as DeviceCollector from '../modules/DeviceCollector';
import type {ShellyMessageIncoming} from '../types';
import {callMethod, get} from './PostgresProvider';

type EMModels =
    | 'SPEM-002CEBEU50'
    | 'SPEM-003CEBEU400'
    | 'SPEM-003CEBEU'
    | 'S3EM-002CXCEU'
    | 'S3EM-003CXCEU63';
type MonoPhase = {
    method: string;
    channels: number[];
    phases?: string[];
};
type TriPhase = {
    method: string;
    channels: number[];
    phases: string[];
};

const logger = log4js.getLogger('message-parser');
const emProfiles = {
    'SPEM-002CEBEU50': {
        monophase: {
            method: 'em1data.getdata',
            channels: [0, 1]
        }
    },
    'SPEM-003CEBEU400': {
        monophase: {
            method: 'em1data.getdata',
            channels: [0, 1, 2]
        },
        triphase: {
            method: 'emdata.getdata',
            channels: [0],
            phases: ['a', 'b', 'c']
        }
    },
    'SPEM-003CEBEU': {
        monophase: {
            method: 'em1data.getdata',
            channels: [0, 1, 2]
        },
        triphase: {
            method: 'emdata.getdata',
            channels: [0],
            phases: ['a', 'b', 'c']
        }
    },
    'S3EM-002CXCEU': {
        monophase: {
            method: 'em1data.getdata',
            channels: [0, 1]
        },
        triphase: {
            method: 'emdata.getdata',
            channels: [0],
            phases: ['a', 'b', 'c']
        }
    },
    'S3EM-003CXCEU63': {
        monophase: {
            method: 'em1data.getdata',
            channels: [0, 1, 2]
        },
        triphase: {
            method: 'emdata.getdata',
            channels: [0],
            phases: ['a', 'b', 'c']
        }
    }
};
// @ts-ignore
const dataFields = [
    'total_act_energy',
    'total_act_ret_energy',
    'min_voltage',
    'max_voltage'
];

const day0 = (before = 90) => {
    const past = new Date();
    const now = new Date();
    const d = new Date(past.setDate(now.getDate() - before));
    return (
        new Date(
            Date.UTC(
                d.getUTCFullYear(),
                d.getUTCMonth(),
                d.getUTCDate(),
                0,
                0,
                0
            )
        ).getTime() / 1000
    );
};

const timeThreshold = (threshold: number): ((check: number) => boolean) => {
    return (check: number): boolean => {
        return Math.floor(Date.now() / 1000) - check > threshold;
    };
};
const inPast = timeThreshold(60 * 10);

export const InitEm = (): {
    evaluate: (m: ShellyMessageIncoming, device: ShellyDevice) => void;
} => {
    const syncQueue = new Map<
        string,
        {
            locked: boolean;
            id: number;
            profile: 'monophase' | 'triphase';
            model: EMModels;
        }
    >();
    setInterval(
        () =>
            Array.from(syncQueue, async ([id]) => {
                return (await lock(id)) && (await sync(id));
            }),
        5000
    );

    const lock = async (id: string): Promise<boolean> => {
        const sd = syncQueue.get(id);
        if (sd && sd.locked === true) {
            return false;
        }
        if (!sd?.id) {
            throw new Error('InternalIdIsRequired');
        }
        sd.locked = true;
        syncQueue.set(id, sd);
        return true;
    };
    const unlock = (id: string): void => {
        const sd = syncQueue.get(id);
        if (!sd?.id) {
            throw new Error('InternalIdIsRequired');
        }
        sd.locked = false;
        syncQueue.set(id, sd);
    };
    const addForSync = async (
        device: string,
        model: EMModels,
        profile: 'monophase' | 'triphase'
    ) => {
        if (!syncQueue.get(device)) {
            const [r] = await get(device);
            syncQueue.set(device, {
                locked: false,
                id: r.id,
                model,
                profile
            });
        }
    };
    const appendMeasurements = async ({
        fields,
        device,
        channel,
        payload
    }: {
        fields: {
            name: string;
            phase: string;
            ref: string;
        }[];
        device: number;
        channel: number;
        payload: {
            keys: string[];
            data: {
                period: number;
                ts: number;
                values: number[][];
            }[];
        };
    }) => {
        if (!payload) {
            return;
        }
        const dataIndexes = fields
            .map((v) => ({...v, idx: payload.keys.indexOf(v.name)}))
            .filter((v) => v.idx > -1);
        const inserts: {
            p_device: number[];
            p_tag: string[];
            p_phase: string[];
            p_channel: number[];
            p_ts: number[];
            p_val: number[];
        } = {
            p_device: [],
            p_tag: [],
            p_phase: [],
            p_channel: [],
            p_ts: [],
            p_val: []
        };
        payload.data.map(({values, ts}: {values: number[][]; ts: number}) =>
            values.map((el1: number[]): any =>
                dataIndexes.map(({idx, ref, phase}) => {
                    inserts.p_device.push(device);
                    inserts.p_tag.push(ref);
                    inserts.p_phase.push(phase || 'z');
                    inserts.p_channel.push(channel);
                    inserts.p_ts.push(ts);
                    inserts.p_val.push(el1[idx]);
                })
            )
        );
        await callMethod('device_em.fn_append_stats', inserts);
    };

    const sync = async (shellyId: string): Promise<any> => {
        const device = syncQueue.get(shellyId);
        const id = device?.id;
        if (!id) {
            return;
        }
        logger.info(`EM Sync started for device: ${id}`);
        try {
            const dProf = device.profile;
            const model: EMModels = device.model;
            // @ts-ignore
            const params: MonoPhase | TriPhase = emProfiles[model][dProf];

            if (!params) {
                logger.info(`No Params for device: ${id}`);
                return;
            }
            const channels = params.channels || [];
            const {rows: lastTx} = await callMethod('device_em.fn_last_sync', {
                p_device: id,
                p_channel: -1
            });
            if (!lastTx.length) {
                const ts = day0();
                await Promise.all(
                    channels.map(async (ch) => {
                        logger.info(
                            `Pushing zero day! for id: ${id}, channel: ${ch}, ts: ${ts}`
                        );
                        return await callMethod('device_em.fn_synced', {
                            p_device: id,
                            p_created: ts,
                            p_channel: ch
                        });
                    })
                );
                return;
            }
            const [{created}] = lastTx;
            if (!inPast(created)) {
                logger.info(
                    `Device: ${id} last record(${created}) is not in the past`
                );
                return;
            }
            const fields = dataFields.reduce((a: any, df: string) => {
                if (!params?.phases) {
                    return a.concat({name: df, ref: df});
                }
                return a.concat(
                    params?.phases?.map((p) => {
                        return {name: [p, df].join('_'), ref: df, phase: p};
                    })
                );
            }, []);
            const shellyDev = DeviceCollector.getDevice(shellyId);
            if (!shellyDev) {
                return;
            }
            await channels?.reduce(async (a: any, channel: number) => {
                await a;
                const nextTsLoc = Math.floor(Date.now() / 1000) - 100;
                const {
                    rows: [{created: lastSyncDate}]
                } = await callMethod('device_em.fn_last_sync', {
                    p_device: id,
                    p_channel: channel
                });
                const {
                    keys,
                    data,
                    next_record_ts: nextTs
                }: {
                    keys: string[];
                    data: {
                        period: number;
                        ts: number;
                        values: number[][];
                    }[];
                    next_record_ts: number;
                } = await shellyDev.sendRPC(params.method, {
                    id: channel,
                    ts: Number.parseInt(lastSyncDate)
                });
                logger.info(
                    `Pushing device=${id}/channel=${channel}/date=${lastSyncDate}/nextDate=${nextTs}/nextDateLocal=${nextTsLoc}/nextDateSync=${nextTs || nextTsLoc}`
                );
                await appendMeasurements({
                    fields,
                    device: id,
                    channel,
                    payload: {keys, data}
                });
                const nextDate = nextTs || nextTsLoc;
                await callMethod('device_em.fn_synced', {
                    p_device: id,
                    p_created: nextDate,
                    p_channel: channel
                });
                logger.info(
                    `Query Finished device=${id} for channel=${channel} @ nextDate=${nextDate}`
                );
            }, Promise.resolve());
        } catch (e) {
            logger.warn(e);
            logger.warn(`Sync finished for device: ${id}`);
        } finally {
            logger.info(`Sync finished for device: ${id}`);
            unlock(shellyId);
        }
    };
    const o = {
        evaluate(m: ShellyMessageIncoming, device: ShellyDevice): void {
            (async () => {
                if (
                    !device.info.model ||
                    [
                        'SPEM-002CEBEU50',
                        'SPEM-003CEBEU400',
                        'SPEM-003CEBEU',
                        'S3EM-002CXCEU',
                        'S3EM-003CXCEU63'
                    ].indexOf(device?.info.model) === -1
                ) {
                    return;
                }
                await addForSync(
                    device.shellyID,
                    device?.info?.model as EMModels,
                    device?.config?.sys?.device?.profile || 'monophase'
                );
            })();
        }
    };
    return o;
};
