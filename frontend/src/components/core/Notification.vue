<template>
    <div class="p-4 bg-slate-700 text-gray-300 mb-4 rounded-md shadow-md border-l flex flex-row" :class="borderColor">
        <span class="mr-4 m-auto" :class="textColor"> <i class="fas fa-circle-info"></i></span>
        <div class="flex-grow">
            <slot />
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { notifcation_type_t } from '@/types';

const props = withDefaults(
    defineProps<{
        type?: notifcation_type_t;
    }>(),
    { type: 'info' }
);

const borderColor = computed(() => {
    switch (props.type) {
        case 'success':
            return 'border-l-green-500';
        case 'info':
            return 'border-l-blue-500';
        case 'warning':
            return 'border-l-yellow-500';
        case 'error':
            return 'border-l-red-500';
    }

    return undefined;
});

const textColor = computed(() => {
    switch (props.type) {
        case 'success':
            return 'text-green-500';
        case 'info':
            return 'text-blue-500';
        case 'warning':
            return 'text-yellow-500';
        case 'error':
            return 'text-red-500';
    }

    return undefined;
});
</script>
