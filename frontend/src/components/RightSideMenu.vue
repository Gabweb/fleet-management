<template>
    <Transition name="slide-fade">
        <aside
            class="border border-gray-600 bg-gray-800 rounded-tl-xl rounded-bl-xl overflow-y-scroll"
            :class="myClass"
        >
            <template v-if="rightSideStore.component">
                <component :is="rightSideStore.component" v-bind="rightSideStore.props" />
            </template>
            <!-- Default -->
            <DefaultBoard v-else />
        </aside>
    </Transition>
</template>

<script setup lang="ts">
import { useRightSideMenuStore } from '@/stores/right-side';
import DefaultBoard from './boards/DefaultBoard.vue';
import { computed } from 'vue';

const rightSideStore = useRightSideMenuStore();

const active = computed(() => {
    return rightSideStore.mobileVisible;
});

const myClass = computed(() => {
    return active.value ? 'fixed right-0 max-w-[400px]' : 'hidden';
});
</script>

<style>
.slide-fade-enter-active {
    transition: all 150ms ease-in;
}

.slide-fade-leave-active {
    transition: all 100ms ease-out;
}

.slide-fade-enter-from,
.slide-fade-leave-to {
    transform: translateX(400px);
    opacity: 0.8;
}
</style>
