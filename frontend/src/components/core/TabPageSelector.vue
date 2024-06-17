<template>
    <div class="h-full">
        <div
            class="flex flex-nowrap gap-0 text-sm font-medium text-center mb-3 whitespace-nowrap overflow-x-scroll no-scrollbar md:px-4"
        >
            <template v-for="[name, path] in tabs">
                <a
                    v-if="isActive(path)"
                    :key="'active' + name"
                    class="inline-block p-3 rounded-t-lg font-semibold select-none border-t border-x border-blue-500 max-w-xs"
                    >{{ name }}
                </a>
                <RouterLink
                    v-else
                    :key="name"
                    :to="path"
                    class="inline-block p-3 rounded-t-lg text-gray-200 select-none border-b border-blue-500 hover:bg-gray-800 hover:text-gray-300 hover:cursor-pointer"
                    >{{ name }}
                </RouterLink>
            </template>
            <div class="w-full border-b border-blue-500" />
        </div>
        <div class="overflow-y-scroll h-full md:px-4 pb-[8rem] lg:pb-[3rem]">
            <RouterView />
        </div>
    </div>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router';
import { useRoute } from 'vue-router/auto';
const route = useRoute();

defineProps<{
    tabs: [string, string][]; // [name, path]
}>();

function isActive(prefix: string) {
    return route.path.startsWith(prefix);
}
</script>
