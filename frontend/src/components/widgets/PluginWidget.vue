<template>
    <Widget>
        <template #upper-corner> Plugin </template>
        <template #name> {{ plugin.info.name }} ({{ plugin.info.version }}) </template>
        <template #description>
            <small class="text-gray-400">{{ plugin.info.description }}</small>
        </template>
        <template #action>
            <Button
                :type="plugin.config.enable ? 'red' : 'blue'"
                :disabled="!actionButtonEnabled"
                @click="togglePlugin(plugin)"
            >
                {{ plugin.config.enable ? 'Disable' : 'Enable' }}
            </Button>
        </template>
    </Widget>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import Widget from './Widget.vue';
import * as ws from '@/tools/websocket';
import { useToastStore } from '@/stores/toast';
import Button from '@/components/core/Button.vue';

interface PluginInfo {
    name: string;
    version: string;
    description: string;
}

interface PluginData {
    location: string;
    info: PluginInfo;
    config: {
        enable: boolean;
    };
}

defineProps<{
    plugin: PluginData;
}>();
const toast = useToastStore();
const actionButtonEnabled = ref(true);

async function togglePlugin(pluginData: PluginData) {
    actionButtonEnabled.value = false;
    try {
        if (pluginData.config.enable) {
            await ws.enablePlugin(pluginData.info.name, false);
            toast.success(`Disabled plugin '${pluginData.info.name}'`);
        } else {
            await ws.enablePlugin(pluginData.info.name, true);
            toast.success(`Enabled plugin '${pluginData.info.name}'`);
        }
    } catch (error: any) {
        toast.error(`Failed to enable plugin '${pluginData.info.name}'`);
        if (error?.message) {
            toast.error(error?.message);
        }
    } finally {
        actionButtonEnabled.value = true;
    }
}
</script>
