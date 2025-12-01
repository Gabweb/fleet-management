import * as log4js from 'log4js';
import type AbstractDevice from '../model/AbstractDevice';
const logger = log4js.getLogger('DeviceCollector');

const devices: Map<string, AbstractDevice> = new Map();

export function register(shelly: AbstractDevice) {
    const old = devices.get(shelly.shellyID);
    let reconnected = false;
    if (old !== undefined) {
        logger.mark('destroying old connection shellyID:[%s]', shelly.shellyID);
        devices.delete(shelly.shellyID);
        old.destroy();
        reconnected = true;
    }

    if (shelly.source === 'local') {
        const originalID = shelly.shellyID.replace('.local', '').toLowerCase();
        if (devices.get(originalID) !== undefined) {
            logger.mark(
                'destroying duplicate mdns connection shellyID:[%s]',
                shelly.shellyID
            );
            shelly.destroy();
            return;
        }
    }

    logger.mark(
        'registering new device id:[%s] prot:[%s]',
        shelly.shellyID,
        shelly.source
    );

    shelly.reconnected = reconnected;
    devices.set(shelly.shellyID, shelly);
}

export function getAllShellyIDs() {
    return devices.keys();
}

export function getAll() {
    return Array.from(devices.values());
}

export function getDevice(shellyID: string) {
    return devices.get(shellyID);
}

export function deleteDevice(shellyID: string) {
    logger.mark('starting device delete for', shellyID);
    const device = devices.get(shellyID);
    if (!device) {
        logger.warn('device not found', shellyID);
        return;
    }
    devices.delete(shellyID);
    device.destroy();
    logger.debug('disconnected & removed cached data for device', shellyID);
}
