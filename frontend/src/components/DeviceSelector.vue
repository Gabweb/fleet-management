<template>
    <div class="space-y-4">
        <div class="flex flex-row items-center justify-between">
            <span class="font-semibold"> Selected: {{ selected.length }}</span>
            <Input v-model="filter" placeholder="search" />
        </div>
        <div class="flex flex-row items-center justify-between">
            <Button size="sm" @click="selectAll">Select All</Button>
            <Button size="sm" @click="selected.length = 0">Unselect All</Button>
        </div>
        <div class="grid grid-cols-2 gap-3">
            <div v-for="device in filteredDevices" :key="device.shellyID">
                <div
                    class="p-3 flex flex-row gap-2 items-center rounded-lg bg-gray-950 border-blue-500 shadow-blue-500 hover:cursor-pointer"
                    :class="[selected.includes(device.shellyID) && 'border shadow-md']"
                    @click="deviceClicked(device.shellyID)"
                >
                    <input type="checkbox" class="" :checked="selected.includes(device.shellyID)" />
                    <img :src="device.picture_url" class="w-8 h-8 bg-slate-800 rounded-full" />
                    <span class="text-sm line-clamp-2">
                        {{ device.name }}
                    </span>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { getDeviceName, getLogoFromModel } from '@/helpers/device';
import { useDevicesStore } from '@/stores/devices';
import { computed, onMounted, ref, shallowRef } from 'vue';
import Input from './core/Input.vue';
import Button from './core/Button.vue';

const selected = defineModel<string[]>({ required: true });
const devicesStore = useDevicesStore();

const devices = shallowRef<
    Array<{
        shellyID: string;
        name: string;
        picture_url: string;
    }>
>([]);

const filter = ref('');
const filteredDevices = computed(() => {
    return devices.value.filter((dev) => dev.name.includes(filter.value));
});

function deviceClicked(shellyID: string) {
    if (selected.value.includes(shellyID)) {
        selected.value.splice(selected.value.indexOf(shellyID), 1);
    } else {
        selected.value.push(shellyID);
    }
}

function selectAll() {
    for (const dev of filteredDevices.value) {
        if (!selected.value.includes(dev.shellyID)) {
            selected.value.push(dev.shellyID);
        }
    }
}

onMounted(() => {
    devices.value = Object.values(devicesStore.devices).map((dev) => {
        return {
            shellyID: dev.shellyID,
            name: getDeviceName(dev.info, dev.shellyID),
            picture_url: getLogoFromModel(dev.info.model),
        };
    });
});
</script>
