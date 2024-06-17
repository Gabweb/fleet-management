import AbstractDevice from '../model/AbstractDevice';
import {
    EntityEvent,
    FleetManagerEvent,
    ShellyEvent,
    ShellyMessageData,
    ShellyMessageIncoming,
    entity_t,
} from '../types';
import { buildOutgoingEvent, buildOutgoingStatus } from '../tools/jsonrpc';
import * as EventDistributor from '../modules/EventDistributor';

export function notifyComponentEvent(component: string, event: string) {
    const outgoingEvent = buildOutgoingEvent('FM_CLIENT', component, event);
    EventDistributor.notifyAll(outgoingEvent, { reason: component });
}

export function notifyComponentStatus(patch: object) {
    const key = Object.keys(patch)?.[0];
    if (!key) return;
    const outgoingEvent = buildOutgoingStatus('FM_CLIENT', patch);
    EventDistributor.notifyAll(outgoingEvent, { reason: key });
}

export function emitShellyConnected(device: AbstractDevice) {
    const event: ShellyEvent.Connect = {
        method: 'Shelly.Connect',
        params: {
            shellyID: device.shellyID,
            device: device.toJSON(),
        },
    };
    EventDistributor.processAndNotifyAll(event, { device });
}

export function emitFleetManagerConfig(
    name: FleetManagerEvent.Config['params']['name'],
    config: any
) {
    const event: FleetManagerEvent.Config = {
        method: 'FleetManager.Config',
        params: { name, config },
    };
    EventDistributor.processAndNotifyAll(event);
}

export function emitShellyDisconnected(device: AbstractDevice) {
    const { shellyID } = device;
    const event: ShellyEvent.Disconnect = {
        method: 'Shelly.Disconnect',
        params: { shellyID },
    };
    EventDistributor.processAndNotifyAll(event, { device });
}

export function emitShellyDeviceInfo(device: AbstractDevice) {
    const { shellyID, info: deviceInfo } = device;
    const event: ShellyEvent.Info = {
        method: 'Shelly.Info',
        params: { shellyID, info: deviceInfo },
    };
    EventDistributor.processAndNotifyAll(event, { device });
}

export function emitShellyStatus(device: AbstractDevice, reason: string) {
    const { shellyID, status } = device;
    const event: ShellyEvent.Status = {
        method: 'Shelly.Status',
        params: { shellyID, status },
    };
    EventDistributor.processAndNotifyAll(event, {
        device,
        reason,
    });
}

export function emitShellySettings(device: AbstractDevice) {
    const { shellyID, config: settings } = device;
    const event: ShellyEvent.Settings = {
        method: 'Shelly.Settings',
        params: { shellyID, settings },
    };
    EventDistributor.processAndNotifyAll(event, { device });
}

export function emitShellyMessage(
    device: AbstractDevice,
    res: ShellyMessageIncoming,
    req?: ShellyMessageData
) {
    const event: ShellyEvent.Message = {
        method: 'Shelly.Message',
        params: { shellyID: device.shellyID, message: res, req },
    };
    EventDistributor.processAndNotifyAll(event, { device });
}

export function emitShellyPresence(device: AbstractDevice) {
    const { shellyID, presence } = device;
    const event: ShellyEvent.Presence = {
        method: 'Shelly.Presence',
        params: { shellyID, presence },
    };
    EventDistributor.processAndNotifyAll(event, { device });
}

export function emitEntityAdded(entity: entity_t) {
    const event: EntityEvent.Added = {
        method: 'Entity.Added',
        params: { entityId: entity.id },
    };
    EventDistributor.processAndNotifyAll(event);
}

export function emitEntityRemoved(entity: entity_t) {
    const event: EntityEvent.Removed = {
        method: 'Entity.Removed',
        params: { entityId: entity.id },
    };
    EventDistributor.processAndNotifyAll(event);
}

export function emitEntityEvent(
    entity: entity_t,
    event: 'single_push' | 'double_push' | 'triple_push' | 'long_push'
) {
    const _event: EntityEvent.Event = {
        method: 'Entity.Event',
        params: { entityId: entity.id, event },
    };

    EventDistributor.processAndNotifyAll(_event);
}

export function emitEntityStatusChange(entity: entity_t, status: any) {
    const _event: EntityEvent.StatusChange = {
        method: 'Entity.StatusChange',
        params: { entityId: entity.id, status },
    };

    EventDistributor.processAndNotifyAll(_event);
}
