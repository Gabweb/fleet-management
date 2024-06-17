<template>
    <div v-if="loading">
        <span>loading...</span>
    </div>

    <div v-else-if="error">
        <span>Something went wrong</span>
    </div>

    <div v-else-if="plugins">
        <EmptyBlock v-if="plugins && Object.keys(plugins).length == 0">
            <p class="text-xl font-semibold pb-2">No plugins found</p>
            <p class="text-sm pb-2">Plugins extend the features of Fleet Manager.</p>
        </EmptyBlock>

        <div :class="[small ? 'flex flex-col gap-2' : 'widget-grid']">
            <template v-for="plugin in plugins">
                <PluginWidget
                    v-if="plugin && plugin.config"
                    :key="plugin.info.name"
                    :plugin="plugin"
                    @action="refresh"
                />
            </template>
        </div>
    </div>
</template>

<script setup lang="ts">
import EmptyBlock from '@/components/core/EmptyBlock.vue';
import PluginWidget from '@/components/widgets/PluginWidget.vue';
import useWsRpc from '@/composables/useWsRpc';
import { small } from '@/helpers/ui';

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
    actionButton: {
        enabled: boolean;
    };
}

const { data: plugins, loading, error, refresh } = useWsRpc<Record<string, PluginData>>('FleetManager.ListPlugins');
</script>
