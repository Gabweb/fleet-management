<template>
    <BoardTabs v-if="device" @back="() => rightSideStore.clearActiveComponent()">
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
                    :src="getLogoFromModel(device.info.model)"
                    alt="Shelly"
                    class="w-full h-full p-[6px] rounded-full"
                />
            </figure>
        </div>

        <div v-if="isDiscovered(device.shellyID)">
            <Notification> This device has been discovered in you local network. </Notification>
            <Notification type="warning"> Discovered devices do not update their state proactively. </Notification>
            <BasicBlock title="Connect device to Fleet Manager">
                <div class="space-y-2">
                    <Input v-model="wsAddress" />
                    <span class="text-xs"
                        >You can edit the default address in
                        <RouterLink to="/settings" class="underline"> settings</RouterLink></span
                    >
                    <Button @click="connectToWs"> Submit </Button>
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
                    <!-- For Pro3EM we want to display the EM component first -->
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
            <div class="overflow-hidden">
                <Collapse title="Device">
                    <Input v-model="deviceNameField" label="Device name" />
                    <Button type="blue" class="mt-2" @click="saveDeviceName">Submit</Button>
                </Collapse>

                <Collapse title="Deny device">
                    <Notification type="warning">
                        Unchecking this will <b>disconnect</b> the device from this instance and add it to the deny
                        list.</Notification
                    >
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
            </div>
        </template>
    </BoardTabs>
    <div v-else>
        <span>Device not found</span>
    </div>
</template>

<script setup lang="ts">
import { useDevicesStore } from '@/stores/devices';
import { computed, onMounted, onUnmounted, ref, toRef, watch } from 'vue';
import { getDeviceName, getLogoFromModel, isDiscovered } from '@/helpers/device';
import Collapse from '../core/Collapse.vue';
import JSONViewer from '../JSONViewer.vue';
import Input from '../core/Input.vue';
import Button from '../core/Button.vue';
import { useEntityStore } from '@/stores/entities';
import EntityWidget from '../widgets/EntityWidget.vue';
import { useToastStore } from '@/stores/toast';
import * as ws from '@/tools/websocket';
import Spinner from '../core/Spinner.vue';
import Notification from '../core/Notification.vue';
import BasicBlock from '../core/BasicBlock.vue';
import { defaultWs } from '@/helpers/ui';
import { em_entity, entity_t } from '@/types';
import { EntityBoard } from '@/helpers/components';
import { useRightSideMenuStore } from '@/stores/right-side';
import BoardTabs from './BoardTabs.vue';
import Checkbox from '../core/Checkbox.vue';
import EntityEM from '../core/Meters/EntityEM.vue';

type props_t = { shellyID: string };

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

const entities = computed(() => {
    const entities: Record<string, entity_t> = {};

    for (const eid of device.value.entities)
        if (entityStore.entities[eid]) {
            entities[eid] = entityStore.entities[eid];
        }
    return entities;
});

async function saveDeviceName() {
    try {
        await deviceStore.sendRPC(shellyID.value, 'Sys.SetConfig', {
            config: { device: { name: deviceNameField.value } },
        });
        toastStore.success(`Changed device name to '${deviceNameField.value}'`);
    } catch (error) {
        toastStore.error(`Failed to change device name to '${deviceNameField.value}'`);
    }
}

async function connectToWs() {
    try {
        const wsResp = await deviceStore.sendRPC(shellyID.value, 'WS.SetConfig', {
            config: {
                enable: true,
                server: wsAddress.value,
            },
        });
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
    rightSideStore.setActiveComponent(EntityBoard, { entity });
}

function accessControlSaveClicked() {
    if (accessControlChecked.value) return;
    try {
        ws.sendRPC('FLEET_MANAGER', 'Device.RejectPending', {
            shellyIDs: [shellyID.value],
        });
    } catch (error) {
        toastStore.error(String(error));
    }
}

watch(shellyID, async (shellyID, oldShellyID) => {
    console.log('shellyId changed %s -> %s', oldShellyID, shellyID);
    await ws.clearTemporarySubscriptions();
    await ws.addTemporarySubscription([shellyID]);
    deviceNameField.value = getDeviceName({
        info: device.value?.info,
    } as any);
});

onMounted(() => {
    console.log('device component mounted', shellyID.value);
    ws.addTemporarySubscription([shellyID.value]);
});

onUnmounted(() => {
    console.log('device component unmounted', shellyID.value);
    ws.clearTemporarySubscriptions();
});
</script>
