<template>
    <div class="space-y-2">
        <BasicBlock bordered blurred padding="sm" class="relative z-10">
            <div class="flex flex-row gap-2 items-center justify-between">
                <div class="flex flex-row gap-2 items-baseline">
                    <span class="font-bold">Waiting Room</span>
                    <Dropdown :options="MODES" @selected="modeChanged" />
                </div>
                <div class="space-x-2">
                    <Button v-if="!selectMode" type="blue" size="sm" narrow @click="selectMode = true">Select</Button>
                    <template v-else>
                        <Button type="blue" size="sm" narrow :disabled="selectAllDisabled" @click="selectAll">
                            Select all
                        </Button>
                        <Button type="green" size="sm" narrow :disabled="selected.length == 0" @click="acceptAll"
                            >Accept all</Button
                        >
                        <Button type="red" size="sm" narrow :disabled="selected.length == 0" @click="rejectAll"
                            >Reject all</Button
                        >
                        <Button type="blue" size="sm" narrow @click="selectMode = false">Exit Select</Button>
                    </template>
                    <Button type="blue" size="sm" narrow @click="refresh"><i class="fas fa-refresh" /></Button>
                </div>
            </div>
        </BasicBlock>

        <template v-if="mode === 'pending'">
            <Notification v-if="error" type="error"> Something went wrong </Notification>

            <EmptyBlock v-else-if="loading">
                <p class="text-xl font-semibold pb-2">Loading</p>
                <Spinner />
            </EmptyBlock>

            <template v-else-if="devices">
                <EmptyBlock v-if="Object.keys(devices).length == 0">
                    <p class="text-xl font-semibold pb-2">No pending devices</p>
                    <p class="text-sm pb-2">Pending shelly devices will appear here.</p>
                    <Button type="blue" @click="refresh">Refresh</Button>
                </EmptyBlock>
                <div v-else :class="[small ? 'flex flex-col gap-2' : 'widget-grid']">
                        <Widget
                            v-for="(device, internalId) in devices"
                            :key="internalId"
                            :class="[selected.includes(internalId) && selectMode && 'shadow-md shadow-blue-500']"
                            @click="deviceClicked(internalId)"
                        >
                        <template #name>
                            {{ device.shellyID }}
                        </template>
                        <template #action>
                            <div v-if="selectMode">
                                <div class="flex justify-center place-items-center mt-4 ml-2">
                                    <input
                                        type="checkbox"
                                        class="w-4 h-4 text-blue-700 bg-gray-700 border-gray-600 rounded"
                                        :checked="selected.includes(internalId)"
                                        :value="selected.includes(internalId)"
                                    />
                                </div>
                            </div>
                            <div v-else class="flex flex-row gap-1 items-center justify-around h-[40px]">
                                <Button type="red" size="md" narrow @click="rejectDevice(internalId)"
                                    ><i class="fas fa-xmark"
                                /></Button>
                                <Button type="green" size="md" narrow @click="acceptDevice(internalId)"
                                    ><i class="fas fa-check"
                                /></Button>
                            </div>
                        </template>
                    </Widget>
                </div>
            </template>
        </template>

        <template v-if="mode === 'denied'">
            <Notification v-if="deniedError" type="error"> Something went wrong </Notification>

            <EmptyBlock v-else-if="deniedLoading">
                <p class="text-xl font-semibold pb-2">Loading</p>
                <Spinner />
            </EmptyBlock>

            <template v-else-if="deniedDevices">
                <EmptyBlock v-if="Object.keys(deniedDevices).length == 0">
                    <p class="text-xl font-semibold pb-2">No denied devices</p>
                    <p class="text-sm pb-2">Denied shelly devices will appear here.</p>
                    <Button type="blue" @click="deniedRefresh">Refresh</Button>
                </EmptyBlock>
                <div v-else :class="[small ? 'flex flex-col gap-2' : 'widget-grid']">
                    <Widget
                        v-for="(device, internalId) in deniedDevices"
                        :class="[selected.includes(internalId) && selectMode && 'shadow-md shadow-blue-500']"
                        @click="deviceClicked(internalId)"
                        :key="internalId"
                    >
                        <template #upper-corner> denied </template>
                        <template #name>
                            {{ device.shellyID }}
                        </template>
                        <template #action>
                            <div v-if="selectMode">
                                <div class="flex justify-center place-items-center mt-4 ml-2">
                                    <input
                                        type="checkbox"
                                        class="w-4 h-4 text-blue-700 bg-gray-700 border-gray-600 rounded"
                                        :checked="selected.includes(internalId)"
                                        :value="selected.includes(internalId)"
                                    />
                                </div>
                            </div>
                            <div v-else class="flex flex-row gap-1 items-center justify-around h-[40px]">
                                <Button type="green" size="md" narrow @click="acceptDevice(internalId)"
                                    >Accept</Button
                                >
                            </div>
                        </template>
                    </Widget>
                </div>
            </template>
        </template>
    </div>
</template>

<script setup lang="ts">
import BasicBlock from '@/components/core/BasicBlock.vue';
import Button from '@/components/core/Button.vue';
import Dropdown from '@/components/core/Dropdown.vue';
import EmptyBlock from '@/components/core/EmptyBlock.vue';
import Notification from '@/components/core/Notification.vue';
import Spinner from '@/components/core/Spinner.vue';
import Widget from '@/components/widgets/WidgetsTemplates/VanilaWidget.vue';
import useWsRpc from '@/composables/useWsRpc';
import { small } from '@/helpers/ui';
import * as ws from '@/tools/websocket';
import { ShellyDeviceExternal } from '@/types';
import { computed, ref } from 'vue';

type PendingDevice = Pick<ShellyDeviceExternal, 'shellyID' | 'status'>;

const { data: devices, loading, error, refresh } = useWsRpc<Record<string, PendingDevice>>('Device.GetPending');
const {
    data: deniedDevices,
    loading: deniedLoading,
    error: deniedError,
    refresh: deniedRefresh,
} = useWsRpc<Record<string, PendingDevice>>('Device.GetDenied');
const selectMode = ref(false);
const selected = ref<string[]>([]);
const mode = ref<'pending' | 'denied'>('pending');

const MODES = ['Pending', 'Denied'];

function modeChanged(currentMode: string) {
    selected.value.length = 0;
    mode.value = MODES.indexOf(currentMode) == 0 ? 'pending' : 'denied';
}

function deviceClicked(shellyID: string) {
    if (!selectMode.value) return;
    if (selected.value.includes(shellyID)) {
        selected.value.splice(selected.value.indexOf(shellyID), 1);
    } else {
        selected.value.push(shellyID);
    }
}

function refreshCorrect() {
    if (mode.value === 'pending') {
        refresh();
    } else {
        deniedRefresh();
    }
}

const selectAllDisabled = computed(() =>
    mode.value === 'pending' ? Object.keys(devices!).length == 0 : Object.keys(deniedDevices!).length == 0
);

function selectAll() {
    if (mode.value === 'pending') {
        selected.value = Object.keys(devices.value || []);
    } else {
        selected.value = Object.keys(deniedDevices.value || []);
    }
}

async function acceptDevice(id: string) {
    try {
        await ws.sendRPC('FLEET_MANAGER', 'Device.AcceptPendingById', {
            ids: [Number(id)],
        });
        refreshCorrect();
    } catch (error) {
        console.error('Cannot accept');
    }
}

async function rejectDevice(shellyID: string) {
    try {
        await ws.sendRPC('FLEET_MANAGER', 'Device.RejectPending', {
            shellyIDs: [shellyID],
        });
        refreshCorrect();
    } catch (error) {
        console.error('Cannot reject');
    }
}

async function acceptAll() {
    loading.value = true;
    try {
        await ws.sendRPC('FLEET_MANAGER', 'Device.AcceptPendingById', {
            ids: selected.value.map((id) => Number(id)),
        });
        selected.value.length = 0;
        selectMode.value = false;
        refreshCorrect();
    } catch (error) {
        console.error('Cannot accept');
    }
}

async function rejectAll() {
    loading.value = true;
    try {
        await ws.sendRPC('FLEET_MANAGER', 'Device.RejectPending', {
            shellyIDs: selected.value,
        });
        selected.value.length = 0;
        selectMode.value = false;
        refreshCorrect();
    } catch (error) {
        console.error('Cannot reject');
    }
}
</script>
