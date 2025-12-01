<template>
    <div class="fixed top-4 right-4 left-auto bottom-auto w-[350px] z-50">
        <Notification
            v-for="toast in toasts"
            v-show="toast.visible"
            :key="toast.message"
            :type="toast.type"
            class="transition-all duration-500"
            >{{ toast.message }}</Notification
        >
    </div>
</template>

<script setup lang="ts">
import { useToastStore } from '@/stores/toast';
import { storeToRefs } from 'pinia';
import Notification from './core/Notification.vue';

const toastStore = useToastStore();
const { toasts } = storeToRefs(toastStore);
</script>
