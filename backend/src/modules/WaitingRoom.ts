import type {ShellyDeviceExternal} from '../types';
import * as DeviceCollector from './DeviceCollector';
import * as postgres from './PostgresProvider';
import * as ShellyEvents from './ShellyEvents';

const pendingDevices: Map<
    string,
    {
        status: any;
        onApprove: () => void;
        onDeny: () => void;
    }
> = new Map();

export async function addDevice(
    shellyID: string,
    status: any,
    onApprove: () => void,
    onDeny: () => void
) {
    let accessControl: number;
    try {
        accessControl =
            (await postgres.accessControl(shellyID))?.control_access ||
            Number.NaN;
    } catch (error) {
        accessControl = Number.NaN;
    }

    // Check if we already have an answer already
    if (Number.isFinite(accessControl)) {
        if (accessControl === postgres.ACCESS_CONTROL.ALLOWED) {
            return void onApprove();
        }

        if (accessControl === postgres.ACCESS_CONTROL.DENIED) {
            return void onDeny();
        }
    }

    // We don't have an answer, wait for action
    ShellyEvents.notifyComponentEvent('device', 'waiting_room_updated');
    pendingDevices.set(shellyID, {status, onApprove, onDeny: onDeny});
    // store device status
    const data: Partial<ShellyDeviceExternal> = {
        shellyID,
        presence: 'pending',
        status
    };
    try {
        await postgres.store(shellyID, data);
    } catch (error) {
        console.error(error);
    }
}

export async function listPendingDevices() {
    try {
        const response = await postgres.getPendingDevices();
        const devices: Record<string, any> = {};
        for (const {id, jdoc} of response) {
            devices[id] = jdoc;
        }
        return devices;
    } catch (error) {
        return Object.fromEntries(pendingDevices.entries());
    }
}

export async function approveDevice(shellyID: number) {
    await postgres.allowAccessControl(shellyID);
    const dd: any = await postgres.accessControl(undefined, shellyID);
    const device = pendingDevices.get(dd.external_id);
    if (device) {
        pendingDevices.delete(dd.external_id);
        device.onApprove();
    }
    return !!device;
}

export async function denyDevice(id: number) {
    await postgres.denyAccessControl(id);
    const dd: any = await postgres.accessControl(undefined, id);
    const device = pendingDevices.get(dd.external_id);
    if (device) {
        pendingDevices.delete(dd.external_id);
        device.onDeny();
    }
    DeviceCollector.deleteDevice(dd.external_id);
    return !!device;
}

export async function getDenied() {
    const response = await postgres.getDeniedDevices();
    const devices: Record<string, any> = {};
    for (const dev of response) {
        devices[dev.id] = dev.jdoc;
    }
    return devices;
}
