<template>
    <div class="h-full">
        <div
            class="flex flex-nowrap gap-0 text-sm font-medium text-center mb-3 whitespace-nowrap overflow-x-scroll no-scrollbar md:px-4"
        >
            <template v-for="tab in tabs">
                <a
                    v-if="active === tab"
                    :key="'active' + tab"
                    class="inline-block p-3 rounded-t-lg font-semibold select-none border-t border-x border-blue-500 max-w-xs"
                    >{{ tab }}
                </a>
                <a
                    v-else
                    :key="tab"
                    class="inline-block p-3 rounded-t-lg text-gray-200 select-none border-b border-blue-500 hover:bg-gray-800 hover:text-gray-300 hover:cursor-pointer"
                    @click="tabClicked(tab)"
                    >{{ tab }}
                </a>
            </template>
            <div class="w-full border-b border-blue-500" />
        </div>

        <div class="overflow-y-scroll h-full md:px-4 pb-[8rem] lg:pb-[3rem]">
            <slot :name="active" />
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, ref, toRef } from 'vue';

const props = defineProps<{
    tabs: string[];
    active?: string;
}>();

const emit = defineEmits<{
    change: [tab: string];
}>();

const external = toRef(props, 'active');
const internal = ref(props.tabs[0]);

const active = computed(() => {
    return external.value ?? internal.value;
});

function tabClicked(tab: string) {
    internal.value = tab;
    emit('change', tab);
}
</script>
