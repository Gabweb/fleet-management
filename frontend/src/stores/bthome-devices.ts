import { defineStore } from 'pinia';
import { ref } from 'vue';
import { shelly_bthome_result_t } from '@/types';

export const useBTHomeDevicesStore = defineStore('bthome-devices', () => {
    const devices = ref<shelly_bthome_result_t[]>([]);
    const discoveryInProgress = ref<boolean>(false);

    function addDevice(device: shelly_bthome_result_t) {
        console.log('Dsicovered BTHome', device);
        devices.value.push(device);
    }

    function finishDiscovery() {
        discoveryInProgress.value = false;
    }

    function startDiscovery() {
        devices.value = [];
        discoveryInProgress.value = true;
    }

    return {
        bthome_devices: devices,
        addDevice,
        discoveryInProgress,
        startDiscovery,
        finishDiscovery,
    };
});
