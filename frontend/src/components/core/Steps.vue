<template>
    <div>
        <div class="w-full flex flex-row gap-2 text-center">
            <div
                v-for="(_, id) in Array(steps)"
                :key="id"
                class="flex-1 hover:cursor-pointer"
                @click="emit('click', id + 1)"
            >
                <slot :id="id + 1" name="stepTitle">
                    <span
                        class="font-semibold"
                        :class="{
                            'text-gray-500': current != id + 1,
                        }"
                    >
                        Step {{ id + 1 }}
                    </span>
                </slot>
                <div
                    class="w-full h-2 rounded-lg mt-1"
                    :class="{
                        'bg-blue-500 shadow-2xl shadow-blue-500': current == id + 1,
                        'bg-gray-600': current != id + 1,
                    }"
                />
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { toRef } from 'vue';

const props = defineProps<{
    steps: number;
    current: number;
}>();

const steps = toRef(props, 'steps');

const emit = defineEmits<{
    click: [number];
}>();
</script>
