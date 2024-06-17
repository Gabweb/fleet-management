<template>
    <Notification v-if="MODE === 'development'" type="warning">
        Node-red in <b>not</b> available in <b>development</b> mode
    </Notification>
    <div v-else class="h-[calc(100%-1rem)]">
        <iframe :src="`/node-red/red/`" width="100%" height="100%" />
    </div>
</template>

<script setup lang="ts">
import Notification from '@/components/core/Notification.vue';
import { useSystemStore } from '@/stores/system';
import { useCookies } from '@vueuse/integrations/useCookies.mjs';
import { onMounted } from 'vue';
const systemStore = useSystemStore();

const { MODE } = import.meta.env;

onMounted(() => {
    const cookies = useCookies(['token']);
    cookies.set('token', systemStore.token, {
        secure: false,
        httpOnly: false,
        sameSite: 'strict',
        path: '/node-red',
    });
});
</script>
