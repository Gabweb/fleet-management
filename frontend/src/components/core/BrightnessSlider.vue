<template>
    <div class="bg-slate-800 rounded-lg shadow-lg py-2 px-3 w-full">
        <div class="mb-1 text-base font-medium">Brightness ({{ brightness }}%)</div>
        <div class="w-full bg-gray-200 rounded-full h-2.5 mb-4 dark:bg-gray-700 hover:cursor-pointer" @click="clicked">
            <div
                class="bg-blue-600 h-2.5 rounded-full dark:bg-blue-500 transition-all"
                :style="`width: ${brightness}%`"
            />
        </div>
        <div class="flex flex-row justify-between">
            <Button
                v-for="percent in percentages"
                :key="percent"
                narrow
                class="!w-autos"
                @click="emit('change', percent)"
            >
                {{ percent }}%
            </Button>
        </div>
    </div>
</template>

<script setup lang="ts">
import { toRef } from 'vue';
import Button from './Button.vue';

const props = defineProps<{ brightness: 0 }>();
const emit = defineEmits<{
    change: [percent: number];
}>();
const brightness = toRef(props, 'brightness');
const percentages = [0, 25, 50, 100];

function clicked(event: MouseEvent) {
    if (!event.currentTarget) return;
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    let percent = Math.round((100 * (event.clientX - rect.left)) / rect.width);
    if (percent < 1) percent = 0;
    if (percent > 99) percent = 100;
    emit('change', percent);
}
</script>
