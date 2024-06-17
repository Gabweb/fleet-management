<template>
    <main>
        <DefaultLayout v-if="systemStore.loggedIn">
            <router-view />
        </DefaultLayout>
        <BasicLayout v-else>
            <router-view />
        </BasicLayout>
        <Toast />
    </main>
</template>

<script setup lang="ts">
import { useSystemStore } from '@/stores/system';
import Toast from '@/components/Toast.vue';
import BasicLayout from '@/layouts/BasicLayout.vue';
import DefaultLayout from '@/layouts/DefaultLayout.vue';

const systemStore = useSystemStore();
</script>
