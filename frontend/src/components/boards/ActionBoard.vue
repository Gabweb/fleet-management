<template>
    <BoardTabs @back="rightSideMenu.clearActiveComponent">
        <template #title>
            <span class="text-lg font-semibold line-clamp-2">{{ action?.name || 'Action Details' }}</span>
        </template>

        <template #default>
            <div v-if="action" class="flex flex-col gap-2 h-full bg-slate-900">
                <div class="flex-grow">
                    <div v-for="item in action.actions" :key="JSON.stringify(item)">
                        <template v-if="Object.keys(deviceResults).length">
                            <Notification type="success"> {{ fulfilledPromises }} fulfilled </Notification>
                            <Notification type="error">
                                {{ Object.keys(deviceResults).length - fulfilledPromises }} errored
                            </Notification>
                        </template>
                        <h2 class="text-lg font-bold">Command</h2>
                        <pre class="bg-gray-800 p-3 rounded">{{
                            JSON.stringify({ ...item, dst: undefined }, undefined, 2)
                        }}</pre>

                        <h2 class="text-lg font-bold mt-2">Devices</h2>
                        <ul v-if="'dst' in item" class="space-y-2">
                            <li v-for="shellyID in item.dst" :key="shellyID">
                                <DeviceWidget v-memo="shellyID" :device-id="shellyID" vertical />
                            </li>
                        </ul>
                    </div>
                </div>

                <div class="bg-gray-950 w-full p-4 relative h-20 rounded-lg">
                    <div class="absolute -translate-x-1/2 left-1/2 top-1/2 -translate-y-1/2">
                        <Button :loading="waitingForResponse" :disabled="waitingForResponse" @click="run"> Run </Button>
                    </div>
                </div>
            </div>
        </template>

        <template #debug>
            <div v-if="deviceResults && Object.keys(deviceResults).length > 0">
                <div v-for="(device, shellyID) in deviceResults" :key="shellyID" class="mb-4">
                    <Collapse :title="shellyID">
                        <Spinner v-if="device.loading" />
                        <JSONViewer v-else :data="device.result" />
                    </Collapse>
                </div>
            </div>
            <div v-else>
                <p class="text-lg text-gray-300">No results available yet.</p>
            </div>
        </template>
    </BoardTabs>
</template>

<script setup lang="ts">
import { ref, watch, toRef, computed } from 'vue';
import * as ws from '@/tools/websocket';
import { action_t } from '@/types';
import DeviceWidget from '@/components/widgets/DeviceWidget.vue';
import Button from '@/components/core/Button.vue';
import { useToastStore } from '@/stores/toast';
import { useRightSideMenuStore } from '@/stores/right-side';
import BoardTabs from '@/components/boards/BoardTabs.vue';
import Spinner from '@/components/core/Spinner.vue';
import JSONViewer from '@/components/JSONViewer.vue';
import Collapse from '@/components/core/Collapse.vue';
import { runAction } from '@/helpers/commands';
import Notification from '../core/Notification.vue';

const props = defineProps<{ actionID: string }>();

const toastStore = useToastStore();
const rightSideMenu = useRightSideMenuStore();
const actionID = toRef(props, 'actionID');
const action = ref<action_t>();
const deviceResults = ref<Record<string, { loading: boolean; result: any }>>({});
const waitingForResponse = ref(false);

const fulfilledPromises = computed(() =>
    Object.values(deviceResults.value).reduce(
        (acc, curr) => acc + Number(curr?.result?.__promiseStatus === 'fulfilled'),
        0
    )
);

async function run() {
    if (!action.value) return;

    waitingForResponse.value = true;

    action.value.actions.forEach((item) => {
        if (item.dst) {
            item.dst.forEach((shellyID: string) => {
                deviceResults.value[shellyID] = { loading: true, result: null };
            });
        }
    });

    try {
        const results = await runAction(action.value);
        for (const shellyID in results) {
            const result = results[shellyID];
            deviceResults.value[shellyID] = {
                result,
                loading: false,
            };
        }
    } catch (error) {
        toastStore.error('Something went wrong with the action.' + String(error));
        console.error(error);
    } finally {
        waitingForResponse.value = false;
    }
}

watch(
    actionID,
    async () => {
        const ActionsController = ws.getRegistry('actions');
        const allActions = await ActionsController.getItem<action_t[]>('rpc');
        action.value = allActions.find((action) => action.id === actionID.value);
    },
    { immediate: true }
);
</script>
