<template>
    <div class="tab-page-selector overflow-hidden relative flex flex-col h-full">
        <div
            class="min-h-[2.75rem] w-full flex flex-nowrap gap-0 text-sm font-medium text-center whitespace-nowrap overflow-x-scroll no-scrollbar"
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
        <div class="mt-2 flex-grow overflow-auto">
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

function isActive(tabPath: string): boolean {
  const current = route.path
  if (current === tabPath) return true
  return current.startsWith(tabPath + '/') // this way if you choose dash/17 dash/1 won't also be seen as active
}
</script>
