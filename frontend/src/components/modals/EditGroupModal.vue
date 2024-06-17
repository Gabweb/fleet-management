<template>
    <SteppedModal v-model:stage="stage" v-model:visible="visible" :max-steps="2" @save="onSave">
        <template #title> Edit group </template>

        <template #stepTitle="{ stage }">
            <span v-if="stage == 1">Main</span>
            <span v-if="stage == 2">Select devices</span>
        </template>

        <template #default="{ stage }">
            <div v-if="stage == 1" class="p-2">
                <Input v-model="newName" label="Room name" />
            </div>
            <div v-if="stage == 2" class="p-2">
                <DeviceSelector v-model="selected"> </DeviceSelector>
            </div>
        </template>
    </SteppedModal>
</template>

<script setup lang="ts">
import SteppedModal from '@/components/modals/SteppedModal.vue';
import DeviceSelector from '@/components/DeviceSelector.vue';
import { ref } from 'vue';
import Input from '../core/Input.vue';

const visible = defineModel<boolean>({ required: true });
const emit = defineEmits<{
    save: [string, string[]];
}>();
const props = defineProps<{ name: string; devices: string[] }>();

const stage = ref(1);
const selected = ref(props.devices);
const newName = ref(props.name);

function onSave() {
    emit('save', newName.value, selected.value);
}
</script>
