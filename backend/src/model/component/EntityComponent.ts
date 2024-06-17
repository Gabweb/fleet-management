import Component from './Component';
import * as DeviceCollector from '../../modules/DeviceCollector';
import { entity_t } from '../../types';

export default class EntityComponent extends Component<any> {
    declare config: never;

    constructor() {
        super('entity');
        this.methods.set('list', () => this.listEntities());
        this.methods.set('getinfo', (params: { id: string }) =>
            this.getInfo(params.id)
        );
        this.methods.delete('setconfig');
    }

    protected override checkConfigKey(key: string, value: any): boolean {
        return false;
    }

    public override checkParams(method: string, params?: any): boolean {
        switch (method) {
            case 'getinfo':
                return (
                    params &&
                    typeof params === 'object' &&
                    typeof params?.id === 'string'
                );

            default:
                return super.checkParams(method, params);
        }
    }

    override getStatus(params?: any): Record<string, any> {
        if (!params || typeof params?.id !== 'string') {
            const keys = Object.keys(this.listEntities());
            return {
                entities_count: keys.length,
                entities: keys,
            };
        }

        const parts = breakdown(params.id);
        if (!parts) return {};
        const { shellyID, channel, type } = parts;

        const device = DeviceCollector.getDevice(shellyID);
        if (!device) return {};

        return device.status[type + ':' + channel] ?? {};
    }

    override getConfig(params?: any): Record<string, any> {
        if (!params || typeof params?.id !== 'string') return {};

        const parts = breakdown(params.id);
        if (!parts) return {};
        const { shellyID, channel, type } = parts;

        const device = DeviceCollector.getDevice(shellyID);
        if (!device) return {};

        return device.config[type + ':' + channel] ?? {};
    }

    getInfo(id: string) {
        const parts = breakdown(id);
        if (!parts) return {};
        const device = DeviceCollector.getDevice(parts.shellyID);
        if (!device) return {};

        return device.entities.find((entity) => entity.id === id);
    }

    listEntities() {
        const allEntities = DeviceCollector.getAll()
            .map((device) => device.entities)
            .flat(1);
        return allEntities.reduce<Record<string, entity_t>>((acc, curr) => {
            acc[curr.id] = curr;
            return acc;
        }, {});
    }

    protected override getDefaultConfig() {
        return {};
    }
}

function breakdown(id: string) {
    const parts = id.split('_', 2);
    if (parts.length !== 2) return;
    const [shellyID, channel = '0'] = parts[0].split('_');
    return {
        shellyID,
        channel,
        type: parts[1],
    };
}
