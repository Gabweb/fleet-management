<template>
    <div>
        <div
            class="text-gray-200 rounded-lg shadow-md h-full"
            :class="{
                'bg-opacity-50 backdrop-blur': blurred,
                'border border-gray-600': bordered,
                'bg-slate-900': darker,
                'bg-slate-800': !darker,
                'p-4': padding === 'md',
                'p-2': padding === 'sm',
                'p-1': padding === 'xs',
            }"
        >
            <div class="flex flex-row justify-between">
            <span v-if="title" class="font-semibold">{{ title }}</span>
            <div class="flex flex-row">
                <slot name="buttons"></slot>
            </div>
            </div>
            <div :class="{ 'pt-4': titlePadding }">
                <slot />
            </div>
        </div>
        <div v-if="loading" class="relative pt-4">
            <div class="absolute top-0 left-0 !p-0 !m-0 w-full h-full z-20 brightness-50 bg-gray-950/40"></div>
            <div class="absolute top-1/2 left-1/2 !p-0 !m-0 -translate-x-1/2 -translate-y-1/2 z-50">
                <Spinner size="sm" />
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import Spinner from './Spinner.vue';

type props_t = {
    title?: string;
    bordered?: boolean;
    darker?: boolean;
    loading?: boolean;
    padding?: 'xs' | 'sm' | 'md' | 'none';
    blurred?: boolean;
    titlePadding?: boolean;
};

withDefaults(defineProps<props_t>(), {
    title: '',
    bordered: false,
    padding: 'md',
});
</script>
