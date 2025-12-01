<template>
    <EmDeviceOptionsModal
        :visible="showOptionsModal"
        :model-value="selectedEMDevices"
        :default-device="defaultEmDevice"
        @update:selected="handleOptionsSave"
        @close="showOptionsModal = false"
    />
  
  
    <BoardTabs v-if="device" :tabs="tabs" @back="() => rightSideStore.clearActiveComponent()">
        <template #title>
            <span class="text-lg font-semibold line-clamp-2">{{ getDeviceName(device.info, shellyID) }}</span>
        </template>
        <div class="flex flex-col gap-3 items-center">
            <figure
                class="image rounded-full border border-gray-400 w-28 h-28"
                :class="[
                    device.online && 'border-gray-400',
                    !device.online && 'border-red-600',
                    device.loading && 'border-yellow-600',
                ]"
            >
                <img
                    :src="getLogo(device)"
                    alt="Shelly"
                    class="w-full h-full p-[6px] rounded-full"
                    @error="handleImgError"
                />
            </figure>
            <div v-if="localIpAddress !== null" class="flex gap-2 pb-4">
                <a
                    class="text-center text-[0.7rem] text-blue-500 underline hover:text-blue-700"
                    :href="localIpAddress"
                    target="_blank"
                >
                    Open Embedded web
                </a>
            </div>
            <div class="flex justify-between gap-3">
                <div class="flex flex-col justify-center items-center gap-2 pb-4">
                    <span class="font-bold text-center">Added: </span>
                    <span class="font-light text-[0.9rem] text-center">{{ dateOfInclusion }}</span>
                </div>
                <div class="flex flex-col justify-center items-center gap-2 pb-4">
                    <span class="font-bold text-center">Last seen: </span>
                    <span class="font-light text-[0.9rem] text-center">{{ lastReport }}</span>
                </div>
                <div class="flex flex-col justify-center items-center gap-2 pb-4">
                    <span class="font-bold text-center">Firmware version: </span>
                    <span class="font-light text-[0.9rem] text-center">{{ device?.info?.ver }}</span>
                </div>
            </div>
        </div>
        <hr class="h-px mx-3 mb-3 bg-gray-200 border-0 dark:bg-gray-700" />

        <div v-if="isDiscovered(device.shellyID)">
            <Notification> This device has been discovered in your local network. </Notification>
            <Notification type="warning"> Discovered devices do not update their state proactively. </Notification>
            <BasicBlock title="Connect device to Fleet Manager">
                <div class="space-y-2">
                    <Input v-model="wsAddress" />
                    <span class="text-xs">
                        You can edit the default address in
                        <RouterLink to="/settings" class="underline">settings</RouterLink>
                    </span>
                    <Button @click="connectToWs">Submit</Button>
                </div>
            </BasicBlock>
        </div>

        <div v-if="device.loading">
            <div class="flex justify-around">
                <Spinner />
            </div>
            <div class="text-center font-semibold text-yellow-600 mt-2 animate-bounce">
                <span>Loading</span>
            </div>
        </div>

        <div v-if="!device.online" class="text-center font-semibold text-red-600">
            <span>Offline</span>
        </div>

        <template v-if="!device.loading">
            <div class="text-center">
                <div class="entities flex flex-col flex-nowrap gap-2 justify-center">
                    <div
                        v-for="entity of Object.values(entities).sort((ent) => (ent.type === 'em' ? -1 : 0))"
                        :key="entity.id"
                    >
                        <EntityEM v-if="entity.type === 'em'" :entity="entity as em_entity" />
                        <EntityWidget vertical class="w-full" :entity="entity" @click="entityClicked(entity)" />
                    </div>
                </div>
            </div>
        </template>
        <template #debug>
            <div class="overflow-auto">
                <Collapse title="Device">
                    <Input v-model="deviceNameField" label="Device name" />
                    <Button type="blue" class="mt-2" @click="saveDeviceName">Submit</Button>
                </Collapse>

                <Collapse title="Deny device">
                    <Notification type="warning">
                        Unchecking this will <b>disconnect</b> the device from this instance and add it to the deny
                        list.
                    </Notification>
                    <Checkbox v-model="accessControlChecked"> Allow this device to connect to Fleet Manager </Checkbox>
                    <Button @click="accessControlSaveClicked">Save</Button>
                </Collapse>

                <Collapse title="Info">
                    <JSONViewer :data="device.info" />
                </Collapse>

                <Collapse title="Status">
                    <JSONViewer :data="device.status" />
                </Collapse>

                <Collapse title="Settings">
                    <JSONViewer :data="device.settings" />
                </Collapse>

                <Collapse title="Firmware Update">
                    <div>
                        <Button
                            v-if="!isCheckingUpdate && !isUpdating && !updateOptionsAvailable"
                            type="blue"
                            class="mt-2"
                            @click="checkForUpdate"
                        >
                            Check for Updates
                        </Button>

                        <div v-else-if="isCheckingUpdate"><Spinner class="mt-2" /> Checking for updates...</div>

                        <div v-if="updateOptionsAvailable && !isUpdating">
                            <div class="mt-4">
                                <p>Select a version to update:</p>
                                <ul class="mt-2">
                                    <li
                                        v-for="(option, index) in availableVersions"
                                        :key="index"
                                        :class="{ 'font-bold': selectedVersionIndex === index }"
                                        class="cursor-pointer p-2 border-b hover:bg-blue-500"
                                        @click="selectVersion(index)"
                                    >
                                        {{ option.type.toUpperCase() }}: {{ option.version }}
                                    </li>
                                </ul>
                            </div>

                            <div class="mt-4 justify-end gap-4">
                                <Button type="blue" @click="triggerUpdate">Update</Button>
                                <Button type="red" class="mt-2" @click="cancelUpdateSelection">Cancel</Button>
                            </div>
                        </div>

                        <div v-else-if="isUpdating"><Spinner class="mt-2" /> Updating...</div>
                    </div>
                </Collapse>

            </div>
        </template>
        <template #charts>
            <GrafanaConsumption :device-id="device.shellyID" />
            <Collapse v-if="isEM" title="Download .csv">
                <div class="space-y-4">
                    <Input v-model="startDateTime" type="datetime-local" label="Start Date & Time" />
                    <Input v-model="endDateTime" type="datetime-local" label="End Date & Time (optional)" />
                    <div>
                        <a href="#" class="text-white underline flex" @click.prevent="showOptionsModal = true">Options</a>
                        <Button v-if="!isLoading" type="blue" class="mt-2" @click="downloadCSV">Download</Button>
                        <Spinner v-else class="mt-2" />
                    </div>
                </div>
            </Collapse>
        </template>
    </BoardTabs>
    <div v-else class="pt-8 text-center">
        <span>Device {{ shellyID }} not found</span>
    </div>
</template>

<script setup lang="ts">
import {useDevicesStore} from '@/stores/devices';
import {computed, onMounted, onUnmounted, ref, toRef, watch} from 'vue';
import {getDeviceName, getLogo, isDiscovered} from '@/helpers/device';
import Collapse from '../core/Collapse.vue';
import JSONViewer from '../JSONViewer.vue';
import Input from '../core/Input.vue';
import Button from '../core/Button.vue';
import {useEntityStore} from '@/stores/entities';
import EntityWidget from '../widgets/EntityWidget.vue';
import {useToastStore} from '@/stores/toast';
import * as ws from '@/tools/websocket';
import Spinner from '../core/Spinner.vue';
import Notification from '../core/Notification.vue';
import BasicBlock from '../core/BasicBlock.vue';
import {defaultWs} from '@/helpers/ui';
import {em_entity, entity_t} from '@/types';
import {EntityBoard} from '@/helpers/components';
import {useRightSideMenuStore} from '@/stores/right-side';
import BoardTabs from './BoardTabs.vue';
import Checkbox from '../core/Checkbox.vue';
import EntityEM from '../core/Meters/EntityEM.vue';
import GrafanaConsumption from '@/components/grafana/GrafanaConsumption.vue';
import EmDeviceOptionsModal from '@/components/modals/EmDeviceOptionsModal.vue';

type props_t = {shellyID: string};

const props = defineProps<props_t>();
const shellyID = toRef(props, 'shellyID');

const deviceStore = useDevicesStore();
const entityStore = useEntityStore();
const toastStore = useToastStore();
const rightSideStore = useRightSideMenuStore();

const device = computed(() => deviceStore.devices[shellyID.value]);
const deviceNameField = ref(device.value?.info?.name || device.value?.info?.id);
const wsAddress = ref(defaultWs.value);

const accessControlChecked = ref(true);
const tabs = ref([{name: 'charts', icon: 'fas fa-chart-line'}]);

const isLoading = ref(false);

const startDateTime = ref('');
const endDateTime = ref('');
const isCheckingUpdate = ref(false);
const isUpdating = ref(false);
const updateOptionsAvailable = ref(false);
const availableVersions = ref<any[]>([]);
const selectedVersionIndex = ref<number | null>();
const localIpAddress = ref<string | null>(null);

interface EmDevice {
    shellyID: string;
    name: string;
    pictureUrl: string;
}

const defaultEmDevice = computed<EmDevice>(() => ({
    shellyID: device.value.shellyID,
    name: getDeviceName(device.value.info),
    pictureUrl: getLogo(device.value)
}));

const showOptionsModal = ref(false);
const selectedEMDevices = ref<EmDevice[]>([]);

const entities = computed(() => {
    const entities: Record<string, entity_t> = {};
    for (const eid of device.value.entities)
        if (entityStore.entities[eid]) {
            entities[eid] = entityStore.entities[eid];
        }
    return entities;
});

const dateOfInclusion = computed(() => {
    const date = new Date(device.value.status?.ts * 1000);
    return date.toLocaleString();
});

const lastReport = computed(() => {
    const ts = device.value?.meta?.lastReportTs;
    if (!ts) return 'unknown';
    return new Date(ts).toLocaleString();
});

function handleOptionsSave(selected: EmDevice[]) {
    selectedEMDevices.value = selected;
    toastStore.success(`Saved ${selected.length} EM device(s)`);
}

async function saveDeviceName() {
    try {
        await deviceStore.sendRPC(shellyID.value, 'Sys.SetConfig', {
            config: {device: {name: deviceNameField.value}}
        });
        toastStore.success(`Changed device name to '${deviceNameField.value}'`);
    } catch (error) {
        toastStore.error(
            `Failed to change device name to '${deviceNameField.value}'`
        );
    }
}

async function connectToWs() {
    try {
        const wsResp = await deviceStore.sendRPC(
            shellyID.value,
            'WS.SetConfig',
            {
                config: {
                    enable: true,
                    server: wsAddress.value
                }
            }
        );
        if (!wsResp.restart_required) {
            return;
        }
        await deviceStore.sendRPC(shellyID.value, 'shelly.reboot');
        toastStore.success('Saved websocket config');
    } catch (error) {
        toastStore.error(String(error));
    }
}

function entityClicked(entity: entity_t) {
    rightSideStore.setActiveComponent(EntityBoard, {entity});
}

function accessControlSaveClicked() {
    if (accessControlChecked.value) return;
    try {
        ws.sendRPC('FLEET_MANAGER', 'Device.RejectPending', {
            shellyIDs: [shellyID.value]
        });
    } catch (error) {
        toastStore.error(String(error));
    }
}
const isEM = computed(() => {
    return (
        device.value?.status &&
        (device.value.status['em1:0'] || device.value.status['em:0'])
    );
});

async function checkForUpdate() {
    try {
        isCheckingUpdate.value = true;
        const response = await deviceStore.sendRPC(
            shellyID.value,
            'Shelly.CheckForUpdate',
            {}
        );

        if (response?.stable || response?.beta) {
            // Populate available versions
            availableVersions.value = [];
            if (response.stable) {
                availableVersions.value.push({
                    type: 'stable',
                    ...response.stable
                });
            }
            if (response.beta) {
                availableVersions.value.push({type: 'beta', ...response.beta});
            }

            if (availableVersions.value.length > 0) {
                updateOptionsAvailable.value = true; // Show update options
            } else {
                toastStore.success('No updates available.');
            }
        } else {
            toastStore.success('No updates available.');
        }
    } catch (error: any) {
        toastStore.error(
            `Failed to check for updates: ${error?.message || error}`
        );
    } finally {
        isCheckingUpdate.value = false;
    }
}

function selectVersion(index: number) {
    selectedVersionIndex.value = index; // Set selected version index
}

function cancelUpdateSelection() {
    updateOptionsAvailable.value = false; // Reset update options
    selectedVersionIndex.value = null; // Clear selection
}

function handleImgError(e: any) {
    e.target.src = getLogo();
}

async function triggerUpdate() {
    if (selectedVersionIndex.value == null) {
        toastStore.error('Please select a version to update.');
        return;
    }

    const selectedVersion = availableVersions.value[selectedVersionIndex.value];
    const confirmed = confirm(
        `You selected the ${selectedVersion.type.toUpperCase()} version ${selectedVersion.version}. Do you want to proceed with the update?`
    );
    if (!confirmed) {
        return;
    }

    try {
        isUpdating.value = true;
        updateOptionsAvailable.value = false; // Hide update options
        const response = await deviceStore.sendRPC(
            shellyID.value,
            'Shelly.Update',
            {stage: selectedVersion.type}
        );
        if (response.success) {
            toastStore.success(
                `Firmware update for ${selectedVersion.type.toUpperCase()} started successfully. The device will reboot.`
            );
        } else {
            toastStore.error(
                `Failed to initiate ${selectedVersion.type.toUpperCase()} firmware update.`
            );
        }
    } catch (error: any) {
        toastStore.error(
            `Failed to update firmware: ${error?.message || error}`
        );
    } finally {
        isUpdating.value = false;
    }
}

async function getDeviceLocalAddress(
    status: Record<string, any>
): Promise<string | null> {
    const ip = status?.wifi?.sta_ip || status?.eth?.ip;

    if (!ip) {
        console.error('No IP address found in device status');
        return null; // can not find the ip address
    }

    try {
        await fetch(`http://${ip}/rpc/Shelly.GetDeviceInfo`, {
            mode: 'no-cors',
            method: 'GET',
            cache: 'no-store'
        });
        return `http://${ip}/`; // return the local address
    } catch (e) {
        // do nothing
    }

    return null;
}

async function downloadCSV() {
    try {
        isLoading.value = true;

        if (selectedEMDevices.value.length === 0) {
            toastStore.error('No devices selected.');
            return;
        }

        if (!startDateTime.value) {
            toastStore.error('Please select a start date & time.');
            return;
        }

        const start = new Date(startDateTime.value).toISOString();
        const end = endDateTime.value
            ? new Date(endDateTime.value).toISOString()
            : new Date().toISOString();

        const shellyIDs = selectedEMDevices.value.map((dev) => dev.shellyID);

        const response = await ws.sendRPC('FLEET_MANAGER', 'device.GetEmData', {
            shellyIDs,
            from: start,
            to: end
        });

        if (
            !response ||
            !response.data ||
            !Array.isArray(response.data) ||
            response.data.length === 0
        ) {
            toastStore.error('No data available for this period.');
            return;
        }

        const keys = Object.keys(response.data[0]);
        const csvRows = [keys.join(',')];

        for (const row of response.data) {
            const line = keys
                .map((k) => JSON.stringify(row[k] ?? ''))
                .join(',');
            csvRows.push(line);
        }

        const csvString = csvRows.join('\n');
        const blob = new Blob([csvString], {type: 'text/csv;charset=utf-8;'});
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${shellyID.value}_em_data.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    } catch (err) {
        toastStore.error(`Failed to fetch data: ${String(err)}`);
    } finally {
        isLoading.value = false;
    }
}

watch(shellyID, async (shellyID, oldShellyID) => {
    await ws.clearTemporarySubscriptions();
    await ws.addTemporarySubscription([shellyID]);
    deviceNameField.value = getDeviceName({
        info: device.value?.info
    } as any);
});

onMounted(async () => {
    ws.addTemporarySubscription([shellyID.value]);

    localIpAddress.value = await getDeviceLocalAddress(device.value.status);
});

onUnmounted(() => {
    ws.clearTemporarySubscriptions();
});
</script>
