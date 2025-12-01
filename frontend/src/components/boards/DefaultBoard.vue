<template>
    <div class="space-y-2 bg-gray-900 h-full p-2">
        <h2 class="text-lg font-semibold">Device Stats</h2>
        <div class="grid grid-cols-2 gap-2 text-center">
            <RouterLink to="/devices/devices?online=all">
                <BasicBlock class="leading-3">
                    <span class="text-2xl font-bold">{{ Object.keys(deviceStore.devices).length }}</span>
                    <br />
                    <span class="text-xs">All Devices</span>
                </BasicBlock>
            </RouterLink>
            <RouterLink to="/devices/devices?online=0">
                <BasicBlock class="leading-3">
                    <span class="text-2xl font-bold text-red-600">{{ offlineDevices }}</span>
                    <br />
                    <span class="text-xs text-red-600">Offline</span>
                </BasicBlock>
            </RouterLink>
        </div>
        <div class="grid grid-cols-2 gap-2 text-center">
            <RouterLink to="/devices/entities">
                <BasicBlock class="leading-3">
                    <span class="text-2xl font-bold">{{ Object.keys(entitiesStore.entities).length }}</span>
                    <br />
                    <span class="text-xs">entities</span>
                </BasicBlock>
            </RouterLink>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useDevicesStore } from '@/stores/devices';
import BasicBlock from '@/components/core/BasicBlock.vue';
import { useEntityStore } from '@/stores/entities';

const deviceStore = useDevicesStore();
const entitiesStore = useEntityStore();

const offlineDevices = computed(() => {
    return (
        Object.keys(deviceStore.devices).length - Object.values(deviceStore.devices).filter((dev) => dev.online).length
    );
});
</script>
