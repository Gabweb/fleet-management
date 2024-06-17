/* eslint-disable no-dupe-class-members */
import * as log4js from 'log4js';
import * as ShellyEvents from '../modules/ShellyEvents';
import type { entity_t } from '../types';
import { store } from '../modules/PostgresProvider';
import { composeDynamicComponent, proposeEntities } from '../modules/EntityComposer';
import { handleMessage } from '../modules/ShellyMessageHandler';
import AbstractDevice from './AbstractDevice';

const logger = log4js.getLogger('device');

export default class ShellyDevice extends AbstractDevice {
    protected override findMessageReason(key: string, message: any): string {
        return findMessageReason(key, message);
    }

    generateEntities() {
        return proposeEntities(this);
    }

    protected override onStateChange(): void {
        this.#persistState();
    }

    async #persistState() {
        try {
            await store(this.shellyID, this.toJSON());
        } catch (error) {
            // do nothing
            logger.warn('failed to persist state for', this.shellyID, String(error));
        }
    }

    protected override onMessage(message: any, request?: any): void {
        handleMessage(this, message, request);
    }

    override setComponentStatus(key: string, status: any) {
        super.setComponentStatus(key, status);
        const entity = this.findEntity(key);
        if (entity) {
            ShellyEvents.emitEntityStatusChange(entity, status);
        }
    }

    public updateComponent(key: string, status: any, config: any) {
        this.setComponentStatus(key, status);
        this.setComponentConfig(key, config);

        const { type, id } = parseComponentKey(key);

        const entity: entity_t | null = composeDynamicComponent(
            type,
            this.config[key],
            this.info.name as string,
            this.shellyID
        );

        if (!entity) {
            logger.error('Error composing entity for %s:%s', type, id);
            return;
        }

        this.addEntity(entity);
    }

    public async fetchComponent(key: string) {
        const { type, id } = parseComponentKey(key);

        let status, config;

        try {
            [status, config] = await Promise.all([
                this.sendRPC(`${type}.GetStatus`, id && { id }),
                this.sendRPC(`${type}.GetConfig`, id && { id }),
            ]);
        } catch (error) {
            logger.error('Error fetching component for %s:%s', type, id);
            return;
        }
        this.updateComponent(key, status, config);
    }

    public override removeComponent(key: string) {
        super.removeComponent(key);
        const entity = this.findEntity(key);
        if (!entity) {
            return;
        }

        this.removeEntity(entity);
    }

    public forwardComponentEvent(
        key: string,
        event: 'single_push' | 'double_push' | 'triple_push' | 'long_push'
    ) {
        // search for entity with type and id
        const entity = this.findEntity(key);

        // exit if doesn't exist
        if (!entity) {
            return;
        }

        ShellyEvents.emitEntityEvent(entity, event);
    }

    private findEntity(key: string): entity_t | undefined {
        const { type, id } = parseComponentKey(key);

        return this.entities.find(
            (entity) =>
                entity.type === type &&
                (!('id' in entity.properties) || entity.properties.id === id)
        );
    }
}

// ------------------------------------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------------------------------------

const SWITCH_CONSUMPTION_KEYS = ['current', 'apower', 'voltage'];
function findMessageReason(key: string, value: Record<string, any>) {
    const separatorIndex = key.indexOf(':');
    const core = separatorIndex > -1 ? key.slice(0, separatorIndex) : key;
    const valueKeys = Object.keys(value);

    // Generic checks
    if (valueKeys.includes('aenergy')) {
        return `${core}:aenergy`;
    }

    // breakdown switch into specific categories - output, aenergy, consumption
    if (key.startsWith('switch')) {
        if (valueKeys.includes('output')) {
            return `${core}:output`;
        }
        if (valueKeys.find((entry) => SWITCH_CONSUMPTION_KEYS.includes(entry))) {
            return `${core}:consumption`;
        }
    }

    return `${core}:generic`;
}

const ENDS_WITH_NUMBER = /:\d*$/;
export function parseComponentKey(key: string): { type: string; id?: number } {
    const type = key.replace(ENDS_WITH_NUMBER, '');
    const id = parseInt(key.replace(`${type}:`, ''));

    return {
        type,
        ...(isFinite(id) ? { id } : {}),
    };
}
