import {
    bthomesensor_entity,
    cover_entity,
    em1_entity,
    em_entity,
    entity_t,
    light_entity,
    switch_entity,
    temperature_entity,
    virtual_boolean_entity,
    virtual_button_entity,
    virtual_number_entity,
    virtual_text_entity,
} from '../types';
import ShellyDevice from '../model/ShellyDevice';
import { bthomeObjectInfos } from '../config/BTHomeData';
import Log4js from 'log4js';
const logger = Log4js.getLogger('ShellyComponents');

// Constants

const VIRTUAL_TYPES = [
    'boolean',
    'number',
    'text',
    'enum',
    'button',
    'bthomesensor',
];

/**
 * Get all instances keys of a specific type
 * @param type type of the component
 * @param status device status
 * @returns List of existing components keys
 */
function getAllInstancesKeys(type: string, status: any) {
    return Object.keys(status).filter((key) => key.startsWith(type));
}

// ----------------------------------------------------------------------------------
// BTHome Sensors
// ----------------------------------------------------------------------------------

export function composeBTHomeSensor(
    config: any,
    deviceName: string,
    deviceId: string
): bthomesensor_entity {
    const objId = config.obj_id;
    const info = bthomeObjectInfos[objId] ?? {};

    const objName = info?.name;
    const unit = info?.unit ?? '';
    const sensorType = info?.type ?? '';

    const objIndex = config.idx;
    const componentId = config.id;

    const id = `${deviceId}_${componentId}:bthomesensor`;
    const name =
        config?.name ??
        `${objName || objId}[${objIndex}] BLU Sensor ${deviceName || deviceId}`;

    return {
        name,
        id,
        type: 'bthomesensor',
        source: deviceId,
        properties: {
            id: componentId,
            unit,
            sensorType,
        },
    };
}

// ----------------------------------------------------------------------------------
// Virtual Components
// ----------------------------------------------------------------------------------

function composeVirtualComponent(
    config: any,
    deviceName: string,
    deviceId: string,
    displayName: String,
    type: string,
    restProps?: any
) {
    const name = config?.name ?? `${displayName} ${deviceName || deviceId}`;

    const componentId = config.id; // important

    const id = `${deviceId}_${componentId}:${type}`;
    const view = config.meta?.ui?.view ?? null;

    return {
        name,
        id,
        source: deviceId,
        type,
        properties: {
            id: componentId,
            view,
            ...(typeof restProps === 'object' ? restProps : {}),
        },
    };
}

function composeVirtualBoolean(
    config: any,
    deviceName: string,
    deviceId: string
): virtual_boolean_entity {
    const labels = config.meta?.ui?.titles;

    return composeVirtualComponent(
        config,
        deviceName,
        deviceId,
        'Boolean',
        'boolean',
        {
            labelFalse: labels?.[0] || 'Off',
            labelTrue: labels?.[1] || 'On',
        }
    );
}

function composeVirtualNumber(
    config: any,
    deviceName: string,
    deviceId: string
): virtual_number_entity {
    const min = config.min;
    const max = config.max;
    const unit = config.meta?.ui?.unit;

    return composeVirtualComponent(
        config,
        deviceName,
        deviceId,
        'Number',
        'number',
        {
            unit,
            min,
            max,
        }
    );
}

function composeVirtualText(
    config: any,
    deviceName: string,
    deviceId: string
): virtual_text_entity {
    const maxLength = config.max_len;

    return composeVirtualComponent(config, deviceName, deviceId, 'Text', 'text', {
        maxLength,
    });
}

function composeVirtualEnum(
    config: any,
    deviceName: string,
    deviceId: string
): virtual_text_entity {
    const values = config.options;
    const labels = config.meta?.ui?.titles ?? {};

    const options: Record<string, string> = {};

    for (const value of values) {
        const label = labels[value] || value;
        options[value] = label;
    }

    return composeVirtualComponent(config, deviceName, deviceId, 'Enum', 'enum', {
        options,
    });
}

function composeVirtualButton(
    config: any,
    deviceName: string,
    deviceId: string
): virtual_button_entity {
    return composeVirtualComponent(config, deviceName, deviceId, 'Button', 'button');
}

export function composeDynamicComponent(
    type:
        | 'button'
        | 'boolean'
        | 'number'
        | 'text'
        | 'enum'
        | 'bthomesensor'
        | string,
    config: any,
    deviceName: string,
    deviceId: string
): entity_t | null {
    switch (type) {
        case 'boolean':
            return composeVirtualBoolean(config, deviceName, deviceId);

        case 'number':
            return composeVirtualNumber(config, deviceName, deviceId);

        case 'text':
            return composeVirtualText(config, deviceName, deviceId);

        case 'enum':
            return composeVirtualEnum(config, deviceName, deviceId);

        case 'button':
            return composeVirtualButton(config, deviceName, deviceId);

        case 'bthomesensor':
            return composeBTHomeSensor(config, deviceName, deviceId);

        default:
            console.error(`Unknown virtual component type: ${type}`);
            return null;
    }
}

function composeVirtualComponents(shelly: ShellyDevice): entity_t[] {
    const deviceStatus = shelly.status;
    const deviceConfig = shelly.config;
    const deviceName = shelly.info.name as string;
    const deviceId = shelly.shellyID;

    const entities: entity_t[] = [];

    for (const type of VIRTUAL_TYPES) {
        const allVirtualComponentsKeys = getAllInstancesKeys(type, deviceStatus);

        for (const key of allVirtualComponentsKeys) {
            const config = deviceConfig[key];

            const entity: entity_t | null = composeDynamicComponent(
                type,
                config,
                deviceName,
                deviceId
            );

            if (entity) {
                entities.push(entity);
            }
        }
    }

    return entities;
}

// ----------------------------------------------------------------------------------
// Build-in Components
// ----------------------------------------------------------------------------------

function composeComponents(
    shelly: ShellyDevice,
    type: string,
    title: string,
    parser?: (config: any, status: any) => Record<string, number | string>
): entity_t[] {
    const keys = Object.keys(shelly.status).filter((key) =>
        key.startsWith(`${type}:`)
    );

    return keys.map((key) => {
        const entity_status = shelly.status[key];
        const entity_config = shelly.config[key];
        const device_name = shelly.info.name;

        const name =
            entity_config.name === 'string'
                ? entity_config.name
                : (keys.length > 1 ? `${entity_status.id}) ` : '') +
                  (title || type) +
                  ' ' +
                  (device_name || shelly.shellyID);

        let restProps = null;
        try {
            if (typeof parser === 'function') {
                restProps = parser(entity_config, entity_status) ?? {};
            }
        } catch (e) {
            logger.error(`Error parsing ${key}`, e);
        }

        return {
            name,
            id: `${shelly.shellyID}_${entity_status.id}:${type}`,
            type: type as any,
            source: shelly.shellyID,
            properties: {
                id: entity_status.id,
                ...(restProps ?? {}),
            },
        };
    });
}

function composeInputs(shelly: ShellyDevice): entity_t[] {
    return composeComponents(shelly, 'input', 'Input', (config, status) => {
        const type = config.type;

        let unit = '';

        if (type === 'analog') {
            unit = config?.xpercent?.unit || '%';
        }

        return {
            type,
            unit,
        };
    });
}

function proposeOutputs(shelly: ShellyDevice): switch_entity[] {
    const switch_keys = Object.keys(shelly.status).filter((elem) =>
        elem.startsWith('switch:')
    );
    return switch_keys.map((key) => {
        const entity_status = shelly.status[key];
        const entity_config = shelly.config[key];
        const device_name = shelly.info.name;

        return {
            name:
                entity_config.name === 'string'
                    ? entity_config.name
                    : (switch_keys.length > 1
                          ? `${entity_status.id}) Output `
                          : '') + (device_name || shelly.shellyID),
            id: `${shelly.shellyID}_${entity_status.id}:out`,
            type: 'switch',
            source: shelly.shellyID,
            properties: {
                id: entity_status.id,
            },
        };
    });
}

function proposeTemperatures(shelly: ShellyDevice): temperature_entity[] {
    const temperature_keys = Object.keys(shelly.status).filter((elem) =>
        elem.startsWith('temperature:')
    );
    return temperature_keys.map((key) => {
        const entity_status = shelly.status[key];
        const device_name = shelly.info.name;

        return {
            name:
                (temperature_keys.length > 1
                    ? `${entity_status.id}) Temperature `
                    : '') + (device_name || shelly.shellyID),
            id: `${shelly.shellyID}_${entity_status.id}:temp`,
            type: 'temperature',
            source: shelly.shellyID,
            properties: {
                id: entity_status.id,
            },
        };
    });
}

function proposeEM1(shelly: ShellyDevice): em1_entity[] {
    const em1_keys = Object.keys(shelly.status).filter((elem) =>
        elem.startsWith('em1:')
    );
    return em1_keys.map((key) => {
        const entity_status = shelly.status[key];
        const device_name = shelly.info.name;

        return {
            name:
                (em1_keys.length > 1 ? `${entity_status.id}) Energy Meter ` : '') +
                (device_name || shelly.shellyID),
            id: `${shelly.shellyID}_${entity_status.id}:em1`,
            type: 'em1',
            source: shelly.shellyID,
            properties: {
                id: entity_status.id,
            },
        };
    });
}

function proposeLights(shelly: ShellyDevice): light_entity[] {
    const light_keys = Object.keys(shelly.status).filter((elem) =>
        elem.startsWith('light:')
    );
    return light_keys.map((key) => {
        const entity_status = shelly.status[key];
        const entity_config = shelly.config[key];
        const device_name = shelly.info.name;

        return {
            name:
                entity_config.name === 'string'
                    ? entity_config.name
                    : (light_keys.length > 1 ? `${entity_status.id}) Light ` : '') +
                      (device_name || shelly.shellyID),
            id: `${shelly.shellyID}_${entity_status.id}:light`,
            type: 'light',
            source: shelly.shellyID,
            properties: {
                id: entity_status.id,
            },
        };
    });
}

function composeCovers(shelly: ShellyDevice): cover_entity[] {
    const covers = composeComponents(shelly, 'cover', 'Cover') as cover_entity[];

    const sysConfig = shelly.config.sys;

    covers.forEach((cover) => {
        const key =
            cover.properties.id === 0 ? 'cover' : `cover${cover.properties.id}`;
        const favorites =
            sysConfig.ui_data?.[key]
                ?.split(',')
                ?.map(Number)
                ?.filter((x: number) => x >= 0 && x <= 100)
                ?.sort((a: number, b: number) => a - b) ?? [];

        cover.properties.favorites = [...new Set<number>(favorites)];
    });

    return covers;
}

// ----------------------------------------------------------------------------------
// Collector function
// ----------------------------------------------------------------------------------

export function proposeEntities(shelly: ShellyDevice): entity_t[] {
    const entities: entity_t[] = [];
    entities.push(...composeInputs(shelly));
    entities.push(...proposeOutputs(shelly));
    entities.push(...proposeTemperatures(shelly));
    entities.push(...proposeEM1(shelly));
    entities.push(...composeComponents(shelly, 'em', 'Energy Meter'));
    entities.push(...proposeLights(shelly));

    entities.push(...composeComponents(shelly, 'rgbw', 'RGBW'));
    entities.push(...composeComponents(shelly, 'rgb', 'RGB'));

    entities.push(...composeCovers(shelly));

    entities.push(...composeVirtualComponents(shelly));
    return entities;
}
