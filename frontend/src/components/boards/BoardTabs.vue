<template>
    <div class="relative h-full w-full bg-gray-800 rounded px-1">
        <div class="px-2 h-8 w-full flex flex-row gap-2 items-center align-middle">
            <div @click="emit('back')">
                <span>
                    <i class="fas fa-arrow-left"></i>
                </span>
            </div>
            <div class="flex-grow">
                <slot name="header" />
            </div>
            <div v-if="!rightSideMenu.detached" class="hidden lg:block" @click="rightSideMenu.detached = true">
                <span>
                    <i class="fa-solid fa-up-right-and-down-left-from-center"></i>
                </span>
            </div>
        </div>
        <div class="absolute flex flex-col gap-0 border border-gray-600 divide-y rounded-l divide-gray-700 bg-gray-900">
            <div
                v-for="tab in tabs"
                :key="tab.name"
                class="relative w-10 h-10 hover:cursor-pointer bg-gray-800"
                :class="[activeTab == tab.name && 'bg-gray-900 rounded-l-sm']"
                @click="activeTab = tab.name"
            >
                <div class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                    <span><i :class="tab.icon" /></span>
                </div>
            </div>
        </div>
        <div
            class="h-[calc(100%-2.25rem)] bg-gray-900 ml-[41px] space-y-2 p-2 border border-gray-700 overflow-x-hidden rounded-r-lg"
        >
            <div class="text-center flex flex-col gap-2">
                <slot name="title" />
                <span class="capitalize text-sm">{{ activeTab }}</span>
            </div>
            <slot :name="activeTab" />
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import RightSideMenu from '../RightSideMenu.vue';
import { useRightSideMenuStore } from '@/stores/right-side';

interface Tab {
    name: string;
    icon: string;
}

type props_t = {
    tabs?: Tab[];
};

const props = withDefaults(defineProps<props_t>(), {
    tabs: () => [],
});

const emit = defineEmits<{
    back: [];
}>();

const rightSideMenu = useRightSideMenuStore();

const tabs = computed<Tab[]>(() => {
    return [
        {
            name: 'default',
            icon: 'fas fa-microchip',
        },
        ...props.tabs,
        {
            name: 'debug',
            icon: 'fas fa-code',
        },
    ];
});

const activeTab = ref(tabs.value[0].name);
</script>
