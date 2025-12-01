import { defineStore } from 'pinia';
import * as ws from '../tools/websocket';
import { computed, reactive, ref } from 'vue';
import { useEntityStore } from './entities';
import { ShellyDeviceExternal, presence, shelly_device_t } from '@/types';
import { isDiscovered } from '@/helpers/device';

export const useDevicesStore = defineStore('devices', () => {
    const entityStore = useEntityStore();
    const BATTERY_POWERED_DEVICES_APPS = ['HTG3', 'PlusSmoke', 'FloodSensorG4'];
    const devices = reactive<Record<string, shelly_device_t>>({});
    const idToShellyMap = new Map<number, string>();
    function insertDevice(shellyID: string, info = {}, status = {}, settings = {}, entities: string[] = [], meta: any = {}, id: any) {
        devices[shellyID] = {
            shellyID: shellyID,
            id,
            online: false,
            selected: false,
            loading: true,
            info: info,
            status: status,
            settings: settings,
            entities: entities,
            meta
        };
        idToShellyMap.set(id, shellyID);

        setTimeout(() => {
            if (devices[shellyID] && devices[shellyID].loading === true) {
                devices[shellyID].loading = false;
                devices[shellyID].online = false;
            }
        }, 5_000);
    }

    const rpcResponses = ref<Record<string, any>>({});

    function sendTemplateRpc(method: string, params?: object) {
        // Clear old results
        rpcResponses.value = {};
        // Send commands
        for (const dev of selectedDevices.value) {
            ws.sendRPC(dev.shellyID, method, params).then((resp) => {
                rpcResponses.value[dev.shellyID] = resp;
            });
        }
    }

    const selectedDevices = computed(() => Object.values(devices).filter((dev) => dev.selected));

    function getDevices() {
        return Object.values(devices).filter((shelly) => !isDiscovered(shelly.shellyID));
    }

    function getDiscoveredDevices() {
        return Object.values(devices).filter((shelly) => isDiscovered(shelly.shellyID));
    }

    async function fetchDevices() {
        const serverDevices = await ws.listDevices();
        for (const device in serverDevices) {
            handleNewDevice(serverDevices[device]);
        }
        // cleanup old devices
        // const serverDevicesKeys = Object.values(serverDevices).map(val => val.shellyID);
        // for (const key of Object.keys(devices)) {
        //     if (!serverDevicesKeys.includes(key)) {
        //         delete devices[key];
        //     }
        // }
    }

    function handleNewDevice(shelly: ShellyDeviceExternal) {
        if (!devices[shelly.shellyID]) {
            insertDevice(
                shelly.shellyID,
                shelly.info,
                shelly.status,
                shelly.settings,
                shelly.entities,
                shelly.meta,
                shelly.id
            );
            if (!isDiscovered(shelly.shellyID)) {
                for (const entity of shelly.entities) {
                    entityStore.addEntity(entity);
                }
            }
        } else {
            const d = devices[shelly.shellyID];
            d.info = shelly.info;
            d.status = shelly.status;
            d.settings = shelly.settings;
            d.entities = shelly.entities;
            d.meta = shelly.meta;
        }

        const d = devices[shelly.shellyID];
        if (BATTERY_POWERED_DEVICES_APPS.includes(d.info?.app)) {
            const lastTs = (d.status as any).ts ?? (d.status as any).sys?.unixtime ?? 0;
            const period = (d.status as any).sys?.wakeup_period ?? 86400;
            const now = Date.now() / 1000;
            d.online = lastTs + period > now;
        } else {
            d.online = shelly.presence === 'online';
        }
        d.loading = false;
    }

    function deviceConnected(shelly: ShellyDeviceExternal) {
        handleNewDevice(shelly);
    }

    function deviceDisconnected(shellyID: string) {
        const device = devices[shellyID];
        if (device) {
            device.online = false;

            // entityStore.removeEntities(shelly.entities);
        }
    }

    function deviceDeleted(shellyID: string) {
        const device = devices[shellyID];
        if (device) {
            entityStore.removeEntities(device.entities);
        }

        delete devices[shellyID];
    }

    async function sendRPC(shellyID: string, method: string, params?: any) {
        return ws.sendRPC(shellyID, method, params);
    }

    function getSelected() {
        return Object.values(devices).filter((dev) => dev.selected);
    }

    function patchInfo(shellyID: string, info: any) {
        const device = devices[shellyID];
        if (device != undefined) {
            device.info = info;
        }
    }

    function patchStatus(shellyID: string, status: any) {
        if (devices[shellyID]) {
            devices[shellyID].status = status;
        }
    }

    function patchSettings(shellyID: string, settings: any) {
        if (devices[shellyID]) {
            devices[shellyID].settings = settings;
        }
    }

    // function patchKVS(shellyID: string, kvs: Record<string, string>) {
    //     const device = devices[shellyID];
    //     if (device != undefined) {
    //         // TODO
    //         // device.kvs = kvs;
    //     }
    // }

    function patchPresence(shellyID: string, presence: presence) {
        if (devices[shellyID]) {
            devices[shellyID].online = presence === 'online';
        }
    }

    function getDeviceName(shellyID: string): string | undefined {
        const device = devices[shellyID];
        if (device && device.info && device.info.name) {
            return device.info.name;
        }
        return undefined; // Return undefined if the device or name is not found
    }

    return {
        fetchDevices,
        deviceConnected,
        deviceDisconnected,
        deviceDeleted,
        getDevices,
        getDiscoveredDevices,
        patchInfo,
        patchSettings,
        patchStatus,
        // patchKVS,
        patchPresence,
        sendRPC,
        getSelected,
        selectedDevices,
        rpcResponses,
        sendTemplateRpc,
        getDeviceName,
        devices,
        idToShellyMap
    };
});
