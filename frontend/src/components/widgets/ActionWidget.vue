<template>
    <Widget class="hover:cursor-pointer">
        <template #upper-corner> action </template>
        <template #name>
            {{ action.name }}
        </template>
        <template #description> {{ totalDevices }} device{{ totalDevices < 2 ? '' : 's' }} </template>
        <template #action>
            <template v-if="editMode">
                <Button type="red" @click="emit('delete')">Delete</Button>
            </template>
            <button v-else class="w-10 h-10 rounded-full bg-blue-700" @click.stop="clicked">
                <Spinner v-if="waitingForResponse" />
                <span v-else>Run</span>
            </button>
        </template>
    </Widget>
</template>

<script setup lang="ts">
import { action_t } from '@/types';
import Widget from './Widget.vue';
import { computed, ref, toRef } from 'vue';
import Button from '../core/Button.vue';
import { runAction } from '@/helpers/commands';
import { useToastStore } from '@/stores/toast';
import Spinner from '../core/Spinner.vue';

const props = defineProps<{
    action: action_t;
    editMode?: boolean;
}>();

const emit = defineEmits<{
    delete: [];
}>();

const action = toRef(props, 'action');
const toastStore = useToastStore();
const waitingForResponse = ref(false);

const totalDevices = computed(() => {
    return action.value.actions.reduce((acc, curr: any) => {
        return acc + curr.dst.length;
    }, 0);
});

async function clicked() {
    if (!action.value) return;
    waitingForResponse.value = true;
    try {
        await runAction(action.value);
    } catch (error) {
        toastStore.error('Something went wrong with the action.');
    } finally {
        waitingForResponse.value = false;
    }
}
</script>
