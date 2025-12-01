import * as DeviceCollector from '../../modules/DeviceCollector';
import type {entity_t} from '../../types';
import type CommandSender from '../CommandSender';
import Component from './Component';

export default class EntityComponent extends Component<any> {
    declare config: never;

    constructor() {
        super('entity');
        this.methods.delete('setconfig');
    }

    protected override checkConfigKey(key: string, value: any): boolean {
        return false;
    }

    override getStatus(params?: any): Record<string, any> {
        if (!params || typeof params?.id !== 'string') {
            const keys = DeviceCollector.getAll().flatMap((device) =>
                device.entities.map((entity) => entity.id)
            );
            return {
                entities_count: keys.length,
                entities: keys
            };
        }

        const bundle = findEntityAndDevice(params.id);
        if (!bundle) return {};

        const {entity, device} = bundle;
        const {properties, type} = entity;
        const channel = properties.id;

        return device.status[`${type}:${channel}`] ?? {};
    }

    override getConfig(params?: any): Record<string, any> {
        if (!params || typeof params?.id !== 'string') return {};

        const bundle = findEntityAndDevice(params.id);
        if (!bundle) return {};

        const {entity, device} = bundle;
        const {properties, type} = entity;
        const channel = properties.id;

        return device.config[`${type}:${channel}`] ?? {};
    }

    @Component.Expose('GetInfo')
    @Component.CheckParams((params) => typeof params?.id === 'string')
    getInfo({id}: {id: string}) {
        const bundle = findEntityAndDevice(id);
        return bundle ? bundle.entity : {};
    }

    @Component.Expose('List')
    @Component.NoPermissions
    async listEntities(
        _params: any,
        sender: CommandSender
    ): Promise<Record<string, entity_t>> {
        const allEntities = DeviceCollector.getAll().flatMap((device) =>
            device.entities.map((entity) => ({
                ...entity,
                source: device.shellyID as string
            }))
        );

        const printEntities: Array<entity_t & {source: string}> = [];
        for (const entity of allEntities) {
            if (await sender.canAccessDevice(entity.source)) {
                printEntities.push(entity);
            }
        }

        return printEntities.reduce<Record<string, entity_t>>((acc, curr) => {
            acc[curr.id] = curr;
            return acc;
        }, {});
    }

    protected override getDefaultConfig() {
        return {};
    }
}

// TODO: Use iterators probably
function findEntityAndDevice(id: string) {
    for (const device of DeviceCollector.getAll()) {
        for (const entity of device.entities) {
            if (entity.id === id)
                return {
                    entity,
                    device
                };
        }
    }
    return undefined;
}
