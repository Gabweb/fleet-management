<template>
    <BasicLayout>
        <div class="flex flex-row max-h-screen h-screen overflow-hidden">
            <SideMenu class="h-[calc(100vh-0.5rem)]" />
            <div class="px-2 mt-2 flex-grow w-full">
                <slot />
            </div>
            <RightSideMenu
                v-if="!rightSideStore.detached"
                class="min-w-[400px] w-[500px] max-w-[100%] mt-5 h-[calc(100vh-1.25rem)] z-20"
            />
        </div>
        <!-- Modal background -->
        <div v-if="active" class="fixed top-0 left-0 w-screen h-screen bg-gray-950/70 z-10" @click="bgClicked" />
        <!-- Expanded -->

        <Modal
            v-if="rightSideStore.detached"
            :visible="!!rightSideStore.component"
            @close="rightSideStore.clearActiveComponent()"
        >
            <template #title> Control device </template>
            <template #default>
                <component :is="rightSideStore.component" v-bind="rightSideStore.props" />
            </template>
        </Modal>
    </BasicLayout>
</template>

<script setup lang="ts">
import BasicLayout from '@/layouts/BasicLayout.vue';
import SideMenu from '@/components/SideMenu.vue';
import RightSideMenu from '@/components/RightSideMenu.vue';

import { computed, onMounted } from 'vue';
import { useRightSideMenuStore } from '@/stores/right-side';
import Modal from '@/components/modals/Modal.vue';

const rightSideStore = useRightSideMenuStore();

const active = computed(() => {
    return rightSideStore.mobileVisible;
});

onMounted(() => {
    document.addEventListener('keydown', (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
            bgClicked();
        }
    });
});

function bgClicked() {
    if (!active.value) return;
    rightSideStore.clearActiveComponent();
}
</script>
