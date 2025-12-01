<template>
    <main>
        <DefaultLayout v-if="authStore.loggedIn">
            <router-view />
        </DefaultLayout>
        <BasicLayout v-else>
            <router-view />
        </BasicLayout>
        <Toast />
    </main>
</template>

<script setup lang="ts">
import { useAuthStore } from '@/stores/auth';
import Toast from '@/components/Toast.vue';
import BasicLayout from '@/layouts/BasicLayout.vue';
import DefaultLayout from '@/layouts/DefaultLayout.vue';
import { useGeneralStore } from './stores/general';
import { onMounted, watch } from 'vue';
const generalStore = useGeneralStore();

const authStore = useAuthStore();
// Init

watch(
    () => generalStore.background,
    (newValue) => {
        if (!newValue || newValue === 'undefined') {
            // Set default background color
            // document.documentElement.style.setProperty('--background-image', `url(${newValue})`);
            // document.documentElement.style.removeProperty('--background-color');
            console.log('nothing selected');
        } else if (newValue.startsWith('http')) {
            // Set background image
            document.documentElement.style.setProperty('--background-image', `url(${newValue})`);
            document.documentElement.style.removeProperty('--background-color');
        } else if (newValue.startsWith('#')) {
            // Set background color
            document.documentElement.style.setProperty('--background-color', newValue);
            document.documentElement.style.removeProperty('--background-image');
        }
    },
    { immediate: true } // Trigger immediately on mount
);

onMounted(() => {
    generalStore.setup();
});
</script>

<style>
#script .background {
    background-image: v-bind('generalStore.background');
    background-color: v-bind('generalStore.background');
}
</style>
