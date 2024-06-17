<template>
    <div class="flex flex-row items-center justify-center gap-1 px-1.5">
        <!-- Disable the button while waiting for the request to complete or it is in that position already -->
        <button
            class="group disabled:cursor-not-allowed bg-white rounded-full flex"
            :disabled="requestInProgress || state === 'open'"
            @click.stop="setDirection('open')"
        >
            <!-- Replace the error icon with pause button while moving in that direction -->
            <span v-if="state === 'opening'" class="w-10 h-10 flex items-center justify-center">
                <i class="group-disabled:text-gray-400 fas fa-solid text-black fa-pause"></i>
            </span>
            <span v-else class="w-10 h-10 flex items-center justify-center">
                <i class="group-disabled:text-gray-400 fas fa-solid text-black fa-chevron-up"></i>
            </span>
        </button>

        <!-- Disable the button while waiting for the request to complete or it is in that position already -->
        <button
            class="group disabled:cursor-not-allowed bg-white rounded-full flex"
            :disabled="requestInProgress || state === 'closed'"
            @click.stop="setDirection('close')"
        >
            <!-- Replace the error icon with pause button while moving in that direction -->
            <span v-if="state === 'closing'" class="w-10 h-10 flex items-center justify-center">
                <i class="group-disabled:text-gray-400 fas fa-solid text-black fa-pause"></i>
            </span>
            <span v-else class="w-10 h-10 flex items-center justify-center">
                <i class="group-disabled:text-gray-400 fas fa-solid text-black fa-chevron-down"></i>
            </span>
        </button>
    </div>
</template>

<script setup lang="ts">
import { toRefs, defineProps, ref } from 'vue';

const props = defineProps<{
    state: 'open' | 'closed' | 'opening' | 'closing' | 'stopped';
    requestInProgress: boolean;
}>();
const { state, requestInProgress } = toRefs(props);
const lastDirection = ref<'close' | 'open' | 'stop'>('stop');
const emit = defineEmits<{
    direction: [direction: 'stop' | 'open' | 'close'];
}>();

function setDirection(direction: 'stop' | 'open' | 'close') {
    if (state.value !== 'stopped' && direction === lastDirection.value) {
        direction = 'stop';
    }

    lastDirection.value = direction;
    emit('direction', direction);
}
</script>
