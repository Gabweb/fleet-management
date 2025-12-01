import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useLogStore = defineStore('logStore', () => {
    const logs = ref<{ coloredPart: string; message: string; color: string }[]>([]);

    function addLog(coloredPart: string, message: string, color: string) {
        logs.value.push({ coloredPart, message, color });
    }

    function clearLogs() {
        logs.value = [];
    }

    return {
        logs,
        addLog,
        clearLogs,
    } as const;
});
