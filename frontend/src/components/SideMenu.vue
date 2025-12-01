<template>
    <div v-if="smaller">
        <div
            class="fixed bottom-0 left-1/2 w-11/12 z-10 -translate-x-1/2 flex flex-row h-[4rem] md:h-[5rem] border border-gray-600 rounded-t-xl bg-gray-900/50 backdrop-blur-sm justify-around">
            <div v-for="item in items" :key="item.name"
                class="w-auto h-16 flex flex-col justify-evenly hover:cursor-pointer my-auto"
                @click="linkClicked(item.link)">
                <div class="flex flex-col items-center text-center" :class="{ 'text-blue-400': isActive(item.link) }">
                    <span class="text-xl md:text-2xl">
                        <i :class="item.icon"></i>
                    </span>
                    <span class="text-xs line-clamp-1 hidden md:block">{{ item.name }}</span>
                </div>
            </div>
        </div>
    </div>
    <aside v-else class="min-w-[7rem] w-[7rem] h-[calc(100vh-0.5rem)] mt-2 overflow-y-auto ">
        <div
            class="h-full z-10 flex flex-col border border-gray-600 rounded-tr-xl bg-gray-900 bg-opacity-50 backdrop-blur">
            <div v-for="item in items" :key="item.name"
                class="flex flex-col items-center justify-center border-b border-gray-600 w-full h-[85px] hover:cursor-pointer"
                @click="linkClicked(item.link)">
                <div class="flex flex-col items-center" :class="{ 'text-blue-400': isActive(item.link) }">
                    <span class="text-2xl">
                        <i :class="item.icon"></i>
                    </span>
                    <span class="text-sm">{{ item.name }}</span>
                </div>
            </div>
            <!-- <div class="h-[40px]">
                <figure>
                    <img src="https://control.shelly.cloud/images/shelly-logo.svg" width="112" height="28" />
                </figure>
            </div> -->
            <div @click="linkClicked('/settings/user')" class="cursor-pointer mt-auto flex flex-col items-center border-t border-gray-600 py-4">
                
                    <img :src="userImg" @error="imageLoadError"
                        class="w-12 h-12 rounded-full mb-2 border-2 border-white" />
                    <div class="text-center">
                        <span class="text-sm text-white-400 hover:underline">{{ authStore.username }}</span>
                    </div>
                
            </div>
        </div>
    </aside>
    <BluDeviceModal v-if="showBluModal" @close="showBluModal = false" />

</template>

<script setup lang="ts">
import { useRouter, useRoute } from 'vue-router/auto';
import { reactive, onMounted, ref } from 'vue';
import * as ws from '@/tools/websocket';
import { useBreakpoints, breakpointsTailwind } from '@vueuse/core';
import { useAuthStore } from '@/stores/auth';
import { storeToRefs } from 'pinia';
import { FLEET_MANAGER_HTTP, USE_LOGIN_ZITADEL } from '@/constants';
import BluDeviceModal from '@/components/modals/DiscoverBleModal.vue';

const authStore = useAuthStore();
const userImg = ref<string>(`${FLEET_MANAGER_HTTP}/uploads/profilePics/${authStore.username}.png`);

const breakpoints = useBreakpoints(breakpointsTailwind);

const smaller = breakpoints.smaller('lg');

type link_t = {
    link: string;
    name: string;
    icon: string;
};

const router = useRouter();
const route = useRoute();

const showBluModal = ref(false);

function linkClicked(link: string) {
    if (link === 'addBlu') {
        showBluModal.value = true;
        return;
    }
    if (link.startsWith('http://') || link.startsWith('https://')) {
        window.open(link, '_blank');
        return;
    }

    router.push(link);
}

function imageLoadError() {
    userImg.value = FLEET_MANAGER_HTTP + '/uploads/profilePics/default.png';
}

const items = reactive<link_t[]>([
    {
        link: '/dash/1',
        name: 'Dashboard',
        icon: 'fa-solid fa-gauge-high',
    },
    {
        link: '/devices/devices',
        name: 'Devices',
        icon: 'fa-solid fa-microchip',
    },
    // {
    //     link: '/graphs/main',
    //     name: 'Graphs',
    //     icon: 'fa-solid fa-draw-polygon',
    // },
    {
        link: '/automations/actions',
        name: 'Actions',
        icon: 'fa-solid fa-wand-sparkles',
    },
    {
        link: '/users/manage-users',
        name: 'Accounts',
        icon: 'fa-solid fa-users',
    },
    {
        link: '/settings/app',
        name: 'Settings',
        icon: 'fa-solid fa-gear',
    },
    {
        link: 'addBlu',
        name: 'Add BLU device',
        icon: 'fa-solid fa-plus-circle',
    },

]);

onMounted(() => {
    ws.getRegistry('ui')
        .getItem('menuItems')
        .then((menuItems: unknown) => {
            try {
                if (Array.isArray(menuItems))
                    for (const entry of menuItems)
                        if (
                            typeof entry === 'object' &&
                            typeof entry.link === 'string' &&
                            typeof entry.name === 'string' &&
                            typeof entry.icon === 'string'
                        ) {
                            items.push(entry);
                        }
            } catch (error) {
                console.error('cannot add menu entries from ' + JSON.stringify(menuItems), error);
            }
        });
});

function isActive(link: string) {
    if (!link.startsWith('/')) return;

    if (link == '/') {
        return route.path == '/';
    }

    const prefix = link.split('/')[1];
    return route.path.startsWith('/' + prefix);
}

</script>
