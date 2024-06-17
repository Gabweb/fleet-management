import * as ShellyEvents from './ShellyEvents';
import * as postgres from './PostgresProvider';
import * as DeviceCollector from './DeviceCollector';
import { ShellyDeviceExternal } from '../types';

const allowList = new Set<string>();
const denyList = new Set<string>();
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
            (await postgres.accessControl(shellyID))?.controlAccess || NaN;
    } catch (error) {
        accessControl = NaN;
    }

    // store device status
    const data: Partial<ShellyDeviceExternal> = {
        shellyID,
        presence: 'pending',
        status,
    };

    if (
        allowList.has(shellyID) ||
        (isFinite(accessControl) &&
            accessControl === postgres.ACCESS_CONTROL.ALLOWED)
    )
        return void onApprove();
    if (
        denyList.has(shellyID) ||
        (isFinite(accessControl) && accessControl === postgres.ACCESS_CONTROL.DENIED)
    )
        return void onDeny();
    ShellyEvents.notifyComponentEvent('device', 'waiting_room_updated');
    pendingDevices.set(shellyID, { status, onApprove, onDeny: onDeny });
    try {
        await postgres.store(shellyID, data);
    } catch (error) {
        // do nothing
    }
}

export async function listPendingDevices() {
    const response = await postgres.getPendingDevices();
    let devices: Record<string, any> = {};
    for (const dev of response) {
        devices[dev.id] = dev.jdoc;
    }
    return devices;
}

export async function approveDevice(shellyID: string) {
    const device = pendingDevices.get(shellyID);
    if (device) {
        pendingDevices.delete(shellyID);
        device.onApprove();
    }
    postgres.allowAccessControl(shellyID);
    allowList.add(shellyID);
    return !!device;
}

export async function denyDevice(shellyID: string) {
    const device = pendingDevices.get(shellyID);
    if (device) {
        pendingDevices.delete(shellyID);
        device.onDeny();
    }
    const connectedDevice = DeviceCollector.getDevice(shellyID);
    if (connectedDevice) {
        connectedDevice.destroy();
    }
    denyList.add(shellyID);
    postgres.denyAccessControl(shellyID);
    return !!device;
}

export async function getDenied() {
    const response = await postgres.getDeniedDevices();
    let devices: Record<string, any> = {};
    for (const dev of response) {
        devices[dev.id] = dev.jdoc;
    }
    return devices;
}
