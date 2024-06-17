import { defineStore } from 'pinia';
import * as ws from '../tools/websocket';
import { computed, reactive, ref } from 'vue';
import { useEntityStore } from './entities';
import { ShellyDeviceExternal, presence, shelly_device_t } from '@/types';
import { isDiscovered } from '@/helpers/device';

export const useDevicesStore = defineStore('devices', () => {
    const entityStore = useEntityStore();

    const devices = reactive<Record<string, shelly_device_t>>({});

    function insertDevice(shellyID: string, info = {}, status = {}, settings = {}, entities: string[] = []) {
        devices[shellyID] = {
            shellyID,
            online: false,
            selected: false,
            loading: true,
            info: info,
            status: status,
            settings: settings,
            entities: entities,
        };

        setTimeout(() => {
            if (devices[shellyID] && devices[shellyID].loading === true) {
                devices[shellyID].loading = false;
                devices[shellyID].online = false;
            }
        }, 5_000);
    }

    // persist state into local storage
    function persistState() {
        const state: Record<string, any> = {};

        for (const key in devices) {
            const device = devices[key];
            state[key] = {
                online: device.online,
                selected: device.selected,
                loading: device.loading,
                info: device.info,
                status: device.status,
                settings: device.settings,
                entities: device.entities,
            };
        }
        localStorage.setItem('saved-devices', JSON.stringify(state));
        console.debug(`🧙🏻 device store persisted state of ${Object.keys(state).length} devices.`);
    }

    // run on boot
    try {
        const savedDevices = JSON.parse(localStorage.getItem('saved-devices') || '{}');
        for (const shellyID in savedDevices) {
            const device = savedDevices[shellyID];
            const { status, settings, info, entities } = device;
            insertDevice(shellyID, info, status, settings, entities);
        }
        console.log(`🧙🏻 device store loaded ${Object.keys(savedDevices).length} devices from memory.`);
    } catch (error) {
        // ok to fail
        console.error('🧙🏻 device store cannot parse saved devices', error);
    }

    // persist state every 7.5 seconds
    setInterval(() => {
        persistState();
    }, 7500);

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
        for (const device of Object.values(serverDevices)) {
            handleNewDevice(device);
        }
        // cleanup old devices
        const serverDevicesKeys = Object.keys(serverDevices);
        for (const key of Object.keys(devices)) {
            if (!serverDevicesKeys.includes(key)) {
                delete devices[key];
            }
        }
    }

    function handleNewDevice(shelly: ShellyDeviceExternal) {
        if (devices[shelly.shellyID] == undefined) {
            insertDevice(shelly.shellyID, shelly.info, shelly.status, shelly.settings, shelly.entities);

            if (!isDiscovered(shelly.shellyID))
                for (const entity of shelly.entities) {
                    entityStore.addEntity(entity);
                }
        } else {
            devices[shelly.shellyID].info = shelly.info;
            devices[shelly.shellyID].status = shelly.status;
            devices[shelly.shellyID].settings = shelly.settings;
            devices[shelly.shellyID].entities = shelly.entities;
        }

        devices[shelly.shellyID].online = shelly.presence === 'online';
        devices[shelly.shellyID].loading = false;
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

    return {
        fetchDevices,
        deviceConnected,
        deviceDisconnected,
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
        devices,
    };
});
