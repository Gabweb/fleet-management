<template>
    <div class="content">
        <slot></slot>
        <div class="control">
            <input
                v-model="filter"
                type="text"
                class="input border bg-slate-800 p-1 rounded-sm mb-2 border-white text-white w-full"
                placeholder="Search keys"
            />
        </div>
        <pre class="max-h-[50vh] overflow-scroll text-left whitespace-pre text-white text-sm">{{ filteredText }}</pre>
    </div>
</template>

<script setup lang="ts">
import { ref, toRef, computed } from 'vue';

const props = defineProps<{ data: Record<string, unknown> }>();
const data = toRef(props, 'data');

const filter = ref('');

const filteredText = computed(() => {
    if (filter.value == undefined || filter.value.length == 0) {
        return JSON.stringify(data.value, undefined, 2);
    }
    const filtered: Record<string, unknown> = {};
    for (const key in data.value) {
        if (key.toLocaleLowerCase().startsWith(filter.value.toLocaleLowerCase().trim())) {
            filtered[key] = data.value[key];
        }
    }
    return JSON.stringify(filtered, undefined, 2);
});
</script>
