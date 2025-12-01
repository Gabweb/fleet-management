<template>
    <div class="h-[calc(100%-1rem)]">
        <iframe :src="NODE_RED_URL" width="100%" height="100%" />
    </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '@/stores/auth';
import { useCookies } from '@vueuse/integrations/useCookies.mjs';
import { onMounted } from 'vue';
import { NODE_RED_URL } from '@/constants';

const authStore = useAuthStore();

onMounted(() => {
    const cookies = useCookies(['token']);
    cookies.set('token', authStore.accessToken, {
        secure: false,
        httpOnly: false,
        sameSite: 'strict',
        path: '/node-red',
    });
});
</script>
