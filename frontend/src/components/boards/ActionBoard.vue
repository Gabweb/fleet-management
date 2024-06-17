<template>
    <div v-if="action" class="flex flex-col gap-2 h-[100%] max-h-[100%]">
        <div class="mt-3">
            <span class="text-xl font-semibold line-clamp-2 text-center">{{ action.name }}</span>
        </div>

        <div v-for="item in action.actions" class="flex-grow overflow-x-scroll space-y-3">
            <div>
                <h2 class="text-lg font-bold">Command</h2>
                <pre class="bg-gray-800 p-3 rounded">{{
                    JSON.stringify({ ...item, dst: undefined }, undefined, 2)
                }}</pre>
            </div>

            <div>
                <h2 class="text-lg font-bold">Devices</h2>
                <ul class="space-y-2">
                    <li v-for="shellyID in item.dst" v-if="'dst' in item" :key="shellyID">
                        <DeviceWidget v-memo="shellyID" :device-id="shellyID" vertical />
                    </li>
                </ul>
            </div>
        </div>

        <div class="bg-gray-950 w-full p-4 relative h-20 rounded-lg">
            <div class="absolute -translate-x-1/2 left-1/2 top-1/2 -translate-y-1/2">
                <Button @click="run"> Run </Button>
            </div>
        </div>
    </div>
    <div v-else>
        <span>Action not found</span>
    </div>
</template>

<script setup lang="ts">
import { watch, ref, toRef } from 'vue';
import * as ws from '@/tools/websocket';
import { action_t } from '@/types';
import DeviceWidget from '../widgets/DeviceWidget.vue';
import Button from '../core/Button.vue';
import { runAction } from '@/helpers/commands';
import { useToastStore } from '@/stores/toast';

const props = defineProps<{ actionID: string }>();

const toastStore = useToastStore();

const actionID = toRef(props, 'actionID');
const action = ref<action_t>();

async function run() {
    if (!action.value) return;
    try {
        await runAction(action.value);
    } catch (error) {
        toastStore.error('Something went wrong with the action.');
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
