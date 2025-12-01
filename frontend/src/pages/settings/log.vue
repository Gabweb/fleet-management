<template>
    <div class="h-[calc(100vh-10rem)] lg:h-[calc(100vh-4rem)] w-full pb-2 bg-neutral-950 overflow-auto">
        <div class="h-full p-4 text-xs md:text-sm font-mono rounded-xl whitespace-pre-wrap">
            <div v-for="(log, index) in logStore.logs" :key="index">
                <span :style="{ color: log.color || 'white' }">{{ log.coloredPart }}</span>
                <span class="text-white"> - {{ log.message }}</span>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useLogStore } from '@/stores/console';

const logStore = useLogStore();

onMounted(() => {
    scrollToBottom();
});

const scrollToBottom = () => {
    const container = document.querySelector('.console-output');
    if (container) {
        container.scrollTop = container.scrollHeight;
    }
};
</script>
