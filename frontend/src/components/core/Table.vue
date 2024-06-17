<template>
    <div class="relative overflow-x-auto rounded">
        <table class="w-full text-sm text-left text-gray-400">
            <thead v-if="header" class="text-xs uppercase bg-gray-800 text-gray-400">
                <tr>
                    <th v-for="text in header" :key="text" scope="col" class="px-6 py-3">
                        {{ text }}
                    </th>
                </tr>
            </thead>
            <tbody>
                <tr v-for="(row, i) in data" :key="i" class="border-b last:border-b-0 bg-gray-900 border-gray-700">
                    <th v-for="(entry, index) in row" :key="entry" scope="row" class="px-6 py-4">
                        <slot :data="row" :entry="entry" :index="index" />
                    </th>
                </tr>
            </tbody>
        </table>
    </div>
</template>

<script setup lang="ts">
type props_t = {
    header?: string[];
    data: string[][];
};

defineProps<props_t>();
</script>
