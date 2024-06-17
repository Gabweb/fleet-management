import Component from './Component';
import log4js from 'log4js';
const logger = log4js.getLogger('FleetManagerComponent');
import * as Commander from '../../modules/Commander';
import { PluginData, json_rpc_event } from '../../types';
import * as EventDistributor from '../../modules/EventDistributor';
import * as PluginLoader from '../../modules/PluginLoader';

export default class FleetManagerComponent extends Component<any> {
    constructor() {
        super('fleetmanager', { auto_apply_config: false });
        this.methods.set('subscribe', (params, sender) =>
            this.subscribe(params, sender)
        );
        this.methods.set('unsubscribe', (params) => this.unsubscribe(params));
        this.methods.set('listcommands', () => Commander.listCommands());
        this.methods.set('listplugins', () => this.lisPlugins());
        this.methods.delete('setconfig');
    }

    public override checkParams(method: string, params?: any): boolean {
        switch (method) {
            case 'subscribe':
                return (
                    typeof params.events === 'object' &&
                    Array.isArray(params.events) &&
                    params.events.every((event: any) => typeof event === 'string') &&
                    (typeof params.options == 'undefined' ||
                        (params.options && typeof params.options === 'object'))
                );
            case 'unsubscribe':
                return (
                    typeof params.ids === 'object' &&
                    Array.isArray(params.ids) &&
                    params.ids.every((id: any) => typeof id === 'number')
                );
            default:
                return super.checkParams(method, params);
        }
    }

    subscribe(
        params: { events: string[]; options: Record<string, any> },
        sender: Commander.CommandSender
    ) {
        const { events, options } = params;
        const subscribedEvents: [string, number][] = [];

        const socket = sender.additional?.socket;
        if (socket == undefined) {
            return Promise.reject({ error: 'bad sender' });
        }
        for (const event of events) {
            const eventOptions = options?.events?.[event];
            const shellyIDs = options?.shellyIDs;
            const event_id = EventDistributor.addEventListener(
                event,
                { ...eventOptions, shellyIDs },
                (event: json_rpc_event) => {
                    if (socket && socket.readyState === 1) {
                        // WebSocket.OPEN = 1
                        socket.send(JSON.stringify(event));
                    }
                }
            );
            subscribedEvents.push([event, event_id]);
            logger.mark(
                'added event event_name:[%s] event_id:[%s] options:[%s]',
                event,
                event_id,
                eventOptions
            );
        }

        socket.on('close', () => {
            subscribedEvents.forEach(([name, id]) =>
                EventDistributor.removeEventListener(id, name)
            );
        });

        return Promise.resolve({ ids: subscribedEvents.map(([_, id]) => id) });
    }

    unsubscribe(params: { ids: number[] }) {
        const ids = params.ids;
        logger.debug('unsubscribing', ids.join(','));
        for (const id of ids) {
            EventDistributor.removeEventListener(id, '');
        }
    }

    lisPlugins() {
        let plugins: Record<string, PluginData & { config?: any }> =
            PluginLoader.listPlugins();
        for (const plugin in plugins) {
            const config = Commander.getComponent(`plugin:${plugin}`)?.getConfig();
            plugins[plugin].config = config;
        }
        return plugins;
    }

    override async getStatus() {
        let status: Record<string, any> = {};
        for (const [name, component] of Commander.getComponents().entries()) {
            if (component == this) {
                continue;
            }
            try {
                const compStatus = await Commander.getStatus(name);
                if (Object.keys(compStatus).length > 0) {
                    status[name] = compStatus;
                }
            } catch (error) {
                status[name] = { error: String(error) };
            }
        }
        return status;
    }

    override async getConfig() {
        let config: Record<string, any> = {};
        for (const name of Commander.getComponents().keys()) {
            if (name == this.name) {
                continue;
            }
            try {
                const compConfig = await Commander.getConfig(name);
                if (Object.keys(compConfig).length > 0) {
                    config[name] = compConfig;
                }
            } catch (error) {
                config[name] = { error: String(error) };
            }
        }
        return config;
    }

    protected override getDefaultConfig() {
        return {};
    }
}
