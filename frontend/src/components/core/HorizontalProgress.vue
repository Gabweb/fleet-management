<template>
    <div class="bg-slate-800 rounded-lg shadow-lg py-2 px-3 w-full">
        <div :class="`mb-1 text-base font-medium ${disabled ? 'text-gray-400' : ''}`">
            <slot name="title" />
        </div>

        <div class="relative w-full h-2 bg-gray-700 rounded-full">
            <div class="h-full bg-blue-500 rounded-full transition-all" :style="{ width: progressWidth }"></div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, toRefs } from 'vue';

const props = withDefaults(
    defineProps<{
        value: number;
        min?: number;
        max?: number;
        disabled?: boolean;
    }>(),
    {
        value: 0,
        min: 0,
        max: 100,
        saved: null,
        disabled: false,
    }
);

const { value, min, max, disabled } = toRefs(props);

const progressWidth = computed(() => {
    const percentage = ((value.value - min.value) / (max.value - min.value)) * 100;
    return `${percentage}%`;
});
</script>
