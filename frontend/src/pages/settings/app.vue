<template>
    <div class="space-y-3">
        <BasicBlock darker>
            <div class="space-y-2">
                <span class="font-semibold text-lg"> App Version </span> <br />
                <span>{{ version }} </span>
                <span class="text-sm">({{ commit_time.split(' ')[0] }})</span>
            </div>
        </BasicBlock>
        <AppSettings />
        <!-- <Discovery /> -->
        <Developer v-if="systemStore.devMode" />
    </div>
</template>

<script setup lang="ts">
import Developer from '@/components/pages/settings/Developer.vue';
import BasicBlock from '@/components/core/BasicBlock.vue';
// import Discovery from '@/components/pages/settings/Discovery.vue';
import { useSystemStore } from '@/stores/system';
import AppSettings from '@/components/pages/settings/AppSettings.vue';

declare const GIT_COMMIT_HASH: string; // from vite.config.ts
declare const NPM_APP_VERSION: string; // from vite.config.ts
declare const GIT_LAST_COMMIT_TIME: string; // from vite.config.ts

const commit_time = GIT_LAST_COMMIT_TIME;

const version = `${NPM_APP_VERSION}-${GIT_COMMIT_HASH}`;

const systemStore = useSystemStore();
</script>
