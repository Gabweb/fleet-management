<template>
    <div>
        <div class="space-y-2">
            <BasicBlock bordered blurred padding="sm" class="relative z-10">
                <div class="flex flex-row gap-2 items-center justify-between">
                    <div class="flex flex-row gap-2 items-baseline">
                        <span class="font-bold">All devices</span>
                        <div class="max-w-sm hidden md:flex flex-row gap-2 items-baseline">
                            <Input v-model="nameFilter" class="" placeholder="Search" />
                            <Dropdown
                                :options="['All Devices', 'Online', 'Offline']"
                                :icons="['', 'fas fa-wifi']"
                                @selected="onlineFilterSelected"
                            />
                        </div>
                    </div>

                    <Button
                        class="justify-self-end"
                        narrow
                        :type="selectMode ? 'red' : 'blue'"
                        @click="selectMode = !selectMode"
                    >
                        {{ selectMode ? 'Discard Command' : 'Create Command' }}
                    </Button>
                </div>

                <div
                    class="flex flex-col [&>*]:w-full md:hidden w-auto md:flex-row gap-2 items-baseline relative mt-4 md:mt-2"
                >
                    <Input v-model="nameFilter" class="w-full" placeholder="Search" />
                    <Dropdown
                        :options="['All Devices', 'Online', 'Offline']"
                        :icons="['', 'fas fa-wifi']"
                        @selected="onlineFilterSelected"
                    />
                </div>
            </BasicBlock>

            <EmptyBlock v-if="Object.keys(devices).length == 0">
                <p class="text-xl font-semibold pb-2">No devices found</p>
                <p class="text-sm pb-2">Connect shelly devices via their outbound websocket.</p>
            </EmptyBlock>
            <div v-else>
                <EmptyBlock v-if="Object.keys(devices).length == 0">
                    <p class="text-xl font-semibold pb-2">No devices found</p>
                    <p class="text-sm pb-2">Try changing you search parameters.</p>
                    <Button type="blue" @click="nameFilter = ''">Reset search</Button>
                </EmptyBlock>
                <div v-else class="mt-2">
                    <Pagination store="devices" class="my-2" :items="devices">
                        <template #default="{ items }">
                            <div :class="[small ? 'flex flex-col gap-2' : 'widget-grid']">
                                <DeviceWidget
                                    v-for="device in items"
                                    :key="device.shellyID"
                                    :device-id="device.shellyID"
                                    :vertical="small"
                                    :select-mode="selectMode"
                                    :selected="(selectMode && device.selected) || activeDevice === device.shellyID"
                                    class="hover:cursor-pointer"
                                    @click.stop="clicked(device)"
                                />
                            </div>
                        </template>
                    </Pagination>
                </div>
            </div>
        </div>

        <!-- Floating Button -->
        <Button
            v-if="selectMode && selectedDevices.length"
            type="blue"
            class="fixed bottom-20 md:bottom-24 left-1/2 -translate-x-1/2"
            @click="rpcBuilderStore.showModal = true"
            >Send RPC to {{ selectedDevices.length }} devices
        </Button>
        <SendRpcModal @close="sendRpcClosed" />
    </div>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue';
import Input from '@/components/core/Input.vue';
import { useDevicesStore } from '@/stores/devices';
import { shelly_device_t } from '@/types';
import BasicBlock from '@/components/core/BasicBlock.vue';
import EmptyBlock from '@/components/core/EmptyBlock.vue';
import SendRpcModal from '@/components/modals/SendRpcModal.vue';
import { useRpcBuilderStore } from '@/stores/rpc-builder';
import Button from '@/components/core/Button.vue';
import { useRightSideMenuStore } from '@/stores/right-side';
import { DeviceBoard } from '@/helpers/components';
import DeviceWidget from '@/components/widgets/DeviceWidget.vue';
import { small } from '@/helpers/ui';
import Dropdown from '@/components/core/Dropdown.vue';
import { useRoute } from 'vue-router';
import Pagination from '@/components/core/Pagination.vue';
import { isDiscovered } from '@/helpers/device';

const deviceStore = useDevicesStore();
const rpcBuilderStore = useRpcBuilderStore();
const rightSideStore = useRightSideMenuStore();
const route = useRoute();

const activeDevice = ref<string>();
const selectMode = ref(false);
const devices = computed(() => Object.values(deviceStore.devices).filter(filterDevice));
const nameFilter = ref('');
const onlineFilter = ref<boolean>();
const selectedDevices = computed(() => Object.values(deviceStore.devices).filter((d) => d.selected));

function filterDevice(device: shelly_device_t) {
    if (isDiscovered(device.shellyID)) {
        return false;
    }

    const name = device.info?.name;
    const id = device.info?.id;

    const filter = nameFilter.value.toLowerCase();

    if (filter.length > 2) {
        if (typeof name === 'string' && !name.toLowerCase().includes(filter)) {
            return false;
        }

        if (typeof id === 'string' && !id.toLowerCase().includes(filter)) {
            return false;
        }
    }

    if (typeof onlineFilter.value === 'boolean') {
        if (onlineFilter.value) {
            // check if matches online state
            if (!device.online) return false;
        } else {
            // check if matches offline state
            if (device.online) return false;
        }
    }

    return true;
}

function onlineFilterSelected(val: string) {
    if (val === 'Online') {
        onlineFilter.value = true;
    } else if (val === 'Offline') {
        onlineFilter.value = false;
    } else {
        onlineFilter.value = undefined;
    }
}

function clicked(device: shelly_device_t) {
    if (!selectMode.value) {
        rightSideStore.setActiveComponent(DeviceBoard, {
            shellyID: device.shellyID,
        });
        activeDevice.value = device.shellyID;
        return;
    }

    device.selected = !device.selected;
}

function sendRpcClosed() {
    for (const device of deviceStore.selectedDevices) {
        device.selected = false;
    }
    deviceStore.selectedDevices.length = 0;
    deviceStore.rpcResponses = {};
    selectMode.value = false;
}

watch(
    route,
    (route) => {
        const online = Number(route.query?.online);
        if (isNaN(online)) {
            onlineFilter.value = undefined;
            return;
        }
        onlineFilter.value = !!online;
    },
    { immediate: true }
);

onUnmounted(() => {
    rightSideStore.clearActiveComponent();
});
</script>
