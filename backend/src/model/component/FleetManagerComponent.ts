import fsSync from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import {format as csvFormat} from 'fast-csv';
import {DEV_MODE, loginStrategy} from '../../config';
import {PLUGINS_FOLDER} from '../../config';
import * as Commander from '../../modules/Commander';
import * as DeviceCollector from '../../modules/DeviceCollector';
import * as EventDistributor from '../../modules/EventDistributor';
import * as PostgresProvider from '../../modules/PostgresProvider';
import {PluginLoader} from '../../modules/plugins';
import RpcError from '../../rpc/RpcError';
import type {PluginData, json_rpc_event} from '../../types';
import type {FleetManager} from '../../validations/params';
import type CommandSender from '../CommandSender';
import Component from './Component';

const PLUGIN_UPLOADS = path.join(__dirname, '../../../uploads/reports');
if (!fsSync.existsSync(PLUGIN_UPLOADS)) {
    fsSync.mkdirSync(PLUGIN_UPLOADS, {recursive: true});
}
const deviceNameCache = new Map<number, string>();

interface StatRow {
    ts: Date;
    channel: number;
    val: number;
    phase: string;
    device: number;
    tag: string;
}

interface tDeviceReport {
    device: string;
    recordDate?: string;
    totalEnergyKw?: number;
    price?: number;
    [x: string]: any;
}

async function persistInstance(file: string, report_config_id: number) {
    if (!report_config_id) return null;
    const r = await PostgresProvider.callMethod('logging.add_report_instance', {
        p_file_path: file,
        p_report_config_id: report_config_id,
        p_timestamp: null
    });
    return r?.rows?.[0]?.id ?? null;
}

async function writeCsvAndReturnMeta(
    rows: Record<string, any>[],
    name: string,
    extraMeta: Record<string, any> = {}
) {
    const safeName = sanitizeFileName(name);

    const filePath = path.join(PLUGIN_UPLOADS, `${safeName}.csv`);

    await new Promise<void>((resolve, reject) => {
        const ws = fsSync.createWriteStream(filePath);
        const csvStream = csvFormat({headers: true})
            .on('finish', resolve)
            .on('error', reject);

        csvStream.pipe(ws);
        for (const row of rows) csvStream.write(row);
        csvStream.end();
    });

    return {
        id: safeName,
        file: `uploads/em-reports/${safeName}.csv`,
        name: safeName,
        generated: new Date().toISOString(),
        size: (await fs.stat(filePath)).size,
        ...extraMeta
    };
}

function sanitizeFileName(
    input: string,
    opts: {maxLength?: number} = {}
): string {
    const maxLength = opts.maxLength ?? 120;

    let s = String(input || '')
        .normalize('NFKD')
        .replace(/\p{M}+/gu, '');

    s = s.replace(/[<>:"/\\|?*]/g, '-');

    {
        let out = '';
        for (const ch of s) {
            const code = ch.charCodeAt(0);
            out += code < 32 || code === 127 ? '-' : ch;
        }
        s = out;
    }

    s = s.trim().replace(/\s+/g, '-');

    s = s.replace(/^\.+/, '');
    s = s.replace(/[ .]+$/g, '');

    s = s.replace(/[-_]{2,}/g, '-');

    const reserved = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;
    if (reserved.test(s)) s = `_${s}`;

    if (s.length > maxLength) {
        s = s.slice(0, maxLength).replace(/[ .]+$/g, '');
    }

    if (!s) s = 'report';

    return s;
}

async function deviceId2DeviceName(
    rows: tDeviceReport[],
    idMap: Record<number, string>
): Promise<tDeviceReport[]> {
    return Promise.all(
        rows.map(async (r) => {
            const iid = Number(r.device);
            const shellyID = idMap[iid]!;

            if (deviceNameCache.has(iid)) {
                return {...r, device: deviceNameCache.get(iid)!};
            }

            try {
                const res = await PostgresProvider.callMethod(
                    'device.fn_fetch',
                    {
                        p_external_id: shellyID,
                        p_control_access: null
                    }
                );
                const info = res.rows?.[0];
                const name = info?.name || shellyID;
                deviceNameCache.set(iid, name);
                return {...r, device: name};
            } catch {
                const fallback = shellyID || String(iid);
                deviceNameCache.set(iid, fallback);
                return {...r, device: fallback};
            }
        })
    );
}

async function getShellyIDsFromConfig(
    report_config_id?: number
): Promise<string[]> {
    if (!report_config_id) return [];
    const res = await PostgresProvider.callMethod('logging.get_report_config', {
        p_id: report_config_id
    });
    const row = res?.rows?.[0];
    const params = row?.params || {};
    const devices = Array.isArray(params.devices) ? params.devices : [];
    return devices;
}

export default class FleetManagerComponent extends Component<any> {
    constructor() {
        super('fleetmanager', {auto_apply_config: false});
        this.methods.delete('setconfig');
    }

    @Component.Expose('GetVariables')
    @Component.NoPermissions
    getVariables() {
        const variables: Record<string, any> = {
            'login-strategy': loginStrategy
        };
        if (DEV_MODE) {
            variables['dev-mode'] = true;
        }
        return variables;
    }

    @Component.Expose('Subscribe')
    subscribe(
        params: {events: string[]; options: Record<string, any>},
        sender: CommandSender
    ) {
        const {events, options} = params;
        const subscribedEvents: [string, number][] = [];

        const socket = sender.getSocket();
        if (!socket) {
            throw RpcError.Server('No websocket found');
        }
        for (const event of events) {
            const eventOptions = options?.events?.[event];
            const shellyIDs = options?.shellyIDs;
            const event_id = EventDistributor.addEventListener(
                sender,
                event,
                {...eventOptions, shellyIDs},
                (evt: json_rpc_event) => {
                    if (socket.readyState === 1) {
                        socket.send(JSON.stringify(evt));
                    }
                }
            );
            subscribedEvents.push([event, event_id]);
            this.logger.mark(
                'added event event_name:[%s] event_id:[%s] options:[%s]',
                event,
                event_id,
                eventOptions
            );
        }

        socket.on('close', () => {
            subscribedEvents.forEach(([_, id]) =>
                EventDistributor.removeEventListener(id, '')
            );
        });

        return Promise.resolve({ids: subscribedEvents.map(([, id]) => id)});
    }

    @Component.Expose('Unsubscribe')
    @Component.RequiredPermission('FleetManager.Subscribe')
    unsubscribe(params: FleetManager.Unsubscribe) {
        const {ids} = params;
        this.logger.debug('unsubscribing', ids.join(','));
        ids.forEach((id) => EventDistributor.removeEventListener(id, ''));
    }

    @Component.Expose('ListPlugins')
    listPlugins() {
        const plugins = PluginLoader.listPlugins() as Record<
            string,
            PluginData & {config?: any}
        >;
        for (const name in plugins) {
            plugins[name].config = Commander.getComponent(
                `plugin:${name}`
            )?.getConfig();
        }
        return plugins;
    }

    @Component.Expose('UploadPlugin')
    async uploadPlugin(params: {data: string}) {
        const fileData = Buffer.from(params.data, 'base64');
        const filePath = path.join(PLUGINS_FOLDER, 'upload.zip');
        await fs.writeFile(filePath, fileData);
        return null;
    }

    @Component.Expose('RemovePlugin')
    @Component.CheckParams((p: any) => typeof p.name === 'string')
    async removePlugin(params: {name: string}) {
        await PluginLoader.disablePlugin(params.name);
        const dir = path.join(PLUGINS_FOLDER, params.name);
        try {
            await fs.rm(dir, {recursive: true, force: true});
            this.logger.mark(`Deleted plugin folder: ${dir}`);
        } catch (err) {
            this.logger.error(`Failed to delete plugin folder ${dir}`, err);
            throw err;
        }
        return {removed: params.name};
    }

    @Component.Expose('ListCommands')
    listCommands() {
        return Commander.listCommands();
    }

    @Component.Expose('FetchMonthlyReport')
    @Component.NoPermissions
    async fetchReports(
        params: {date: number; tariff: number; report_config_id: number},
        sender: CommandSender
    ) {
        deviceNameCache.clear();
        const {date, tariff, report_config_id} = params;

        if (
            typeof report_config_id !== 'number' ||
            typeof date !== 'number' ||
            date < 1 ||
            date > 28 ||
            typeof tariff !== 'number' ||
            tariff < 0
        ) {
            throw RpcError.InvalidParams('Invalid parameters for FetchReports');
        }

        const cfgRes = await PostgresProvider.callMethod(
            'logging.get_report_config',
            {
                p_id: report_config_id
            }
        );
        const cfgRow = cfgRes?.rows?.[0];
        if (!cfgRow) throw RpcError.Server('Report config not found');
        const shellyIDs: string[] = Array.isArray(cfgRow?.params?.devices)
            ? cfgRow.params.devices
            : [];
        if (!shellyIDs.length)
            throw RpcError.Server('No devices in report config');

        const internalIds: number[] = [];
        const idMap: Record<number, string> = {};
        for (const id of shellyIDs) {
            const res = await PostgresProvider.callMethod('device.fn_fetch', {
                p_external_id: id,
                p_control_access: null
            });
            const iid = res.rows?.[0]?.id;
            if (iid) {
                internalIds.push(iid);
                idMap[iid] = id;
            }
        }
        if (!internalIds.length) throw RpcError.Server('No device IDs found');

        const rep = await PostgresProvider.callMethod(
            'device_em.fn_report_mount_diff',
            {
                p_devices: internalIds,
                p_period: 'month',
                p_period_look_back: 1,
                p_end_period_day: date
            }
        );

        let sumEnergy = 0;
        let sumPrice = 0;
        const rawRows = rep.rows.map((r: any) => {
            const energy = r.total_energy_kw;
            const price = +(energy * tariff).toFixed(2);
            sumEnergy += energy;
            sumPrice += price;
            return {
                device: String(r.device),
                recordDate: r.record_date,
                totalEnergyKw: +energy.toFixed(3),
                price: +price.toFixed(2)
            };
        });

        const namedRows = await deviceId2DeviceName(rawRows as any, idMap);
        namedRows.push({
            device: 'Totals',
            recordDate: '',
            totalEnergyKw: +sumEnergy.toFixed(3),
            price: +sumPrice.toFixed(2)
        });

        const ts = Date.now();
        const meta = await writeCsvAndReturnMeta(namedRows, `monthly_${ts}`, {
            devices: shellyIDs,
            period: 'month',
            date,
            tariff,
            rows: namedRows.length
        });
        await persistInstance(meta.file, report_config_id);
        return meta;
    }

    @Component.Expose('FetchCustomRangeReport')
    @Component.NoPermissions
    async fetchRange(
        params: {
            from: string;
            to: string;
            tariff: number;
            report_config_id: number;
        },
        sender: CommandSender
    ) {
        deviceNameCache.clear();
        const {from, to, tariff, report_config_id} = params;

        if (
            typeof report_config_id !== 'number' ||
            typeof from !== 'string' ||
            !from ||
            typeof to !== 'string' ||
            !to ||
            typeof tariff !== 'number'
        ) {
            throw RpcError.InvalidParams('Invalid parameters for FetchRange');
        }

        const cfgRes = await PostgresProvider.callMethod(
            'logging.get_report_config',
            {
                p_id: report_config_id
            }
        );
        const cfgRow = cfgRes?.rows?.[0];
        if (!cfgRow) throw RpcError.Server('Report config not found');
        const shellyIDs: string[] = Array.isArray(cfgRow?.params?.devices)
            ? cfgRow.params.devices
            : [];
        if (!shellyIDs.length)
            throw RpcError.Server('No devices in report config');

        const internalIds: number[] = [];
        const idMap: Record<number, string> = {};
        for (const id of shellyIDs) {
            const res = await PostgresProvider.callMethod('device.fn_fetch', {
                p_external_id: id,
                p_control_access: null
            });
            const iid = res.rows?.[0]?.id;
            if (iid) {
                internalIds.push(iid);
                idMap[iid] = id;
            }
        }
        if (!internalIds.length) throw RpcError.Server('No device IDs found');

        const rep = await PostgresProvider.callMethod(
            'device_em.fn_report_diff',
            {
                p_devices: internalIds,
                p_from: new Date(from),
                p_to: new Date(to),
                p_period: 'day'
            }
        );

        let sumEnergy = 0;
        let sumPrice = 0;
        const rawRows = rep.rows.map((r: any) => {
            const energy = r.total_energy_kw;
            const price = +(energy * tariff).toFixed(2);
            sumEnergy += energy;
            sumPrice += price;
            return {
                recordDate: r.record_date,
                device: String(r.device),
                totalEnergyKw: +energy.toFixed(3),
                price: +price.toFixed(2)
            };
        });

        const namedRows = await deviceId2DeviceName(
            rawRows.map((x: any) => ({...x, device: String(x.device)})),
            idMap
        );
        namedRows.push({
            recordDate: '',
            device: 'Totals',
            totalEnergyKw: +sumEnergy.toFixed(3),
            price: +sumPrice.toFixed(2)
        });

        const ts = Date.now();
        const meta = await writeCsvAndReturnMeta(namedRows, `range_${ts}`, {
            devices: shellyIDs,
            from,
            to,
            tariff,
            rows: namedRows.length
        });
        await persistInstance(meta.file, report_config_id);
        return meta;
    }

    @Component.Expose('FetchDBDump')
    @Component.NoPermissions
    async dumpStatsToFile(
        params: {from: string; to: string; report_config_id: number},
        sender: CommandSender
    ) {
        deviceNameCache.clear();
        const {from, to, report_config_id} = params;

        if (
            typeof report_config_id !== 'number' ||
            typeof from !== 'string' ||
            !from ||
            typeof to !== 'string' ||
            !to
        ) {
            throw RpcError.InvalidParams(
                'Invalid parameters for DumpStatsToFile'
            );
        }

        const cfgRes = await PostgresProvider.callMethod(
            'logging.get_report_config',
            {
                p_id: report_config_id
            }
        );
        const cfgRow = cfgRes?.rows?.[0];
        if (!cfgRow) throw RpcError.Server('Report config not found');
        const shellyIDs: string[] = Array.isArray(cfgRow?.params?.devices)
            ? cfgRow.params.devices
            : [];
        if (!shellyIDs.length)
            throw RpcError.Server('No devices in report config');

        const internalIds: number[] = [];
        const idMap: Record<number, string> = {};
        for (const extId of shellyIDs) {
            const res = await PostgresProvider.callMethod('device.fn_fetch', {
                p_external_id: extId,
                p_control_access: null
            });
            const iid = res.rows?.[0]?.id;
            if (iid) {
                internalIds.push(iid);
                idMap[iid] = extId;
            }
        }
        if (!internalIds.length) {
            throw RpcError.Server('No device IDs found');
        }

        const qr = (await PostgresProvider.callMethod(
            'device_em.fn_dump_stats',
            {
                p_devices: internalIds,
                p_start: new Date(from),
                p_end: new Date(to)
            }
        )) as {rows: StatRow[]};

        const uniqueIds = Array.from(
            new Set(qr.rows.map((r: any) => Number(r.device)))
        );
        await Promise.all(
            uniqueIds.map(async (iid) => {
                if (deviceNameCache.has(iid)) return;
                const shellyID = idMap[iid];
                try {
                    const info = await PostgresProvider.callMethod(
                        'device.fn_fetch',
                        {
                            p_external_id: shellyID,
                            p_control_access: null
                        }
                    );
                    const name = info.rows?.[0]?.name || shellyID;
                    deviceNameCache.set(iid, name);
                } catch {
                    deviceNameCache.set(iid, shellyID);
                }
            })
        );

        const csvRows = qr.rows.map((r: any) => {
            const iid = Number(r.device);
            const name = deviceNameCache.get(iid)!;
            return {
                ts: r.ts,
                channel: r.channel,
                val: r.val,
                phase: r.phase,
                device: name,
                tag: r.tag
            };
        });

        const ts = Date.now();
        const meta = await writeCsvAndReturnMeta(csvRows, `dump_${ts}`, {
            devices: shellyIDs,
            from,
            to
        });
        await persistInstance(meta.file, report_config_id);
        return meta;
    }

    @Component.Expose('ListReportConfigs')
    @Component.NoPermissions
    async listReportConfigs() {
        const res = await PostgresProvider.callMethod(
            'logging.get_report_configs',
            {}
        );
        return res.rows;
    }

    @Component.Expose('ListReports')
    @Component.NoPermissions
    async listReports() {
        const res = await PostgresProvider.callMethod(
            'logging.get_report_instances',
            {}
        );
        return res.rows;
    }

    @Component.Expose('AddReportConfig')
    @Component.NoPermissions
    async addReportConfig(params: {
        report_type: 'monthly' | 'custom' | 'dump' | string;
        config: any;
    }) {
        const {report_type, config} = params || ({} as any);
        if (!report_type || typeof config !== 'object') {
            throw RpcError.InvalidParams('report_type and config are required');
        }
        const res = await PostgresProvider.callMethod(
            'logging.add_report_config',
            {
                p_report_type: report_type,
                p_params: config
            }
        );
        const id = res?.rows?.[0]?.id ?? res?.rows?.[0] ?? res?.id;
        return {id};
    }

    @Component.Expose('DeleteReportConfig')
    @Component.NoPermissions
    async deleteReportConfig(params: {id: number}) {
        const {id} = params || ({} as any);

        if (typeof id !== 'number' || !Number.isFinite(id) || id <= 0) {
            throw RpcError.InvalidParams('id must be a positive number');
        }

        await PostgresProvider.callMethod('logging.delete_report_config', {
            p_id: id
        });

        return {deleted: id};
    }

    @Component.Expose('PurgeReports')
    @Component.NoPermissions
    async purgeReports() {
        try {
            const files = await fs.readdir(PLUGIN_UPLOADS);
            const csvs = files.filter((f) => f.toLowerCase().endsWith('.csv'));

            let deletedFiles = 0;
            await Promise.all(
                csvs.map(async (fname) => {
                    try {
                        await fs.unlink(path.join(PLUGIN_UPLOADS, fname));
                        deletedFiles++;
                    } catch {
                        this.logger.error(`Failed to delete file: ${fname}`);
                    }
                })
            );

            await PostgresProvider.callMethod(
                'logging.delete_all_report_instances',
                {}
            );

            return {success: true, deletedFiles, deletedDb: true};
        } catch (err) {
            throw RpcError.Server(`Failed to purge reports: ${String(err)}`);
        }
    }

    @Component.Expose('SendRPC')
    @Component.NoPermissions
    async sendRpc(params: {
        dst: string | string[];
        method: string;
        params?: any;
        silent?: boolean;
    }) {
        const {method, silent} = params || ({} as any);
        if (!method || typeof method !== 'string') {
            throw RpcError.InvalidParams('SendRPC: "method" is required');
        }

        const dsts = Array.isArray(params.dst) ? params.dst : [params.dst];
        const results: Record<string, any> = {};

        await Promise.allSettled(
            dsts.map(async (sid) => {
                const shellyID = String(sid);
                const dev = DeviceCollector.getDevice(shellyID);
                if (!dev) {
                    results[shellyID] = {
                        code: -32002,
                        message: 'Device offline or not found'
                    };
                    return;
                }
                try {
                    const res = await dev.sendRPC(
                        method,
                        params?.params ?? {},
                        silent
                    );
                    results[shellyID] = res;
                } catch (err: any) {
                    results[shellyID] =
                        err && typeof err === 'object' && 'code' in err
                            ? err
                            : {code: -32603, message: String(err)};
                }
            })
        );

        return results;
    }

    @Component.Expose('PostgresProviderCallMethod')
    @Component.NoPermissions
    async postgresProviderCallMethod(params: {
        name: string;
        args?: any;
        txId?: number;
    }) {
        const {name, args, txId} = params || ({} as any);

        if (typeof name !== 'string' || name.length === 0) {
            throw RpcError.InvalidParams(
                'PostgresProviderCallMethod: "name" must be a non-empty string'
            );
        }

        try {
            const raw = await PostgresProvider.callMethod(
                name,
                args ?? {},
                txId
            );
            const rows = Array.isArray(raw?.rows) ? raw.rows : raw;
            const safeRows = JSON.parse(JSON.stringify(rows));

            return {rows: safeRows};
        } catch (err: any) {
            const message = err?.message ?? String(err);
            throw RpcError.Server(
                `PostgresProviderCallMethod failed for "${name}": ${message}`
            );
        }
    }

    @Component.Expose('SubscribeToNotifications')
    @Component.NoPermissions
    async notificationsSubscribe(params: {token?: string}) {
        const token = (params?.token ?? '').trim();

        if (!token || typeof token !== 'string') {
            throw RpcError.InvalidParams(
                'NotificationsSubscribe: "token" must be a non-empty string'
            );
        }

        try {
            const res = await PostgresProvider.callMethod(
                'notifications.add_token',
                {
                    p_token: token
                }
            );

            const row =
                Array.isArray(res?.rows) && res.rows.length > 0
                    ? res.rows[0]
                    : {token};

            return {
                id: row.id ?? null,
                token: row.token ?? token
            };
        } catch (err: any) {
            const message = err?.message ?? String(err);
            throw RpcError.Server(`NotificationsSubscribe failed: ${message}`);
        }
    }

    @Component.Expose('ListNotificationTokens')
    @Component.NoPermissions
    async listNotificationTokens() {
        try {
            const res = await PostgresProvider.callMethod(
                'notifications.get_all_tokens',
                {}
            );
            const rows = Array.isArray(res?.rows) ? res.rows : [];

            return rows.map((r: any) => ({
                id: r.id ?? null,
                token: r.token ?? null,
                created: r.created ?? null,
                updated: r.updated ?? null,
                ...(r && typeof r === 'object' && 'platform' in r
                    ? {platform: r.platform}
                    : {}), //potentially to be added
                ...(r && typeof r === 'object' && 'user_id' in r
                    ? {user_id: r.user_id}
                    : {}) //potentially to be added
            }));
        } catch (err: any) {
            const message = err?.message ?? String(err);
            throw RpcError.Server(`ListNotificationTokens failed: ${message}`);
        }
    }

    override async getStatus() {
        const status: Record<string, any> = {};
        for (const [name, comp] of Commander.getComponents().entries()) {
            if (comp === this) continue;
            try {
                const st = await Commander.getStatus(name);
                if (Object.keys(st).length) status[name] = st;
            } catch (err) {
                status[name] = {error: String(err)};
            }
        }
        return status;
    }

    override async getConfig() {
        const cfg: Record<string, any> = {};
        for (const name of Commander.getComponents().keys()) {
            if (name === this.name) continue;
            try {
                const c = await Commander.getConfig(name);
                if (Object.keys(c).length) cfg[name] = c;
            } catch (err) {
                cfg[name] = {error: String(err)};
            }
        }
        return cfg;
    }

    protected override getDefaultConfig() {
        return {};
    }
}
