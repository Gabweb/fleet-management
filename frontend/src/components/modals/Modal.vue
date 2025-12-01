<template>
    <div>
        <div
            class="fixed top-0 left-0 w-screen h-screen bg-black/80 z-40"
            :class="{ hidden: !visible }"
            @click="bgClicked"
        />

        <div
            class="fixed sm:left-1/2 sm:-translate-x-1/2 sm:translate-y-1/2 sm:bottom-1/2 sm:w-[720px] sm:max-w-[95%] lg:w-[960px] sm:rounded-lg bottom-0 left-0 w-full rounded-t-sm border-2 border-gray-700 z-50 max-h-[85vh] lg:max-h-[95vh] overflow-hidden"
            :class="[!visible && 'hidden']"
        >
            <BasicBlock padding="none">
                <!-- X button -->
                <button
                    type="button"
                    class="text-gray-200 bg-transparent rounded-lg text-sm w-8 h-8 ml-auto inline-flex justify-center items-center hover:bg-gray-600 hover:text-gray-200 absolute top-3 right-3"
                    @click="emit('close')"
                >
                    <svg
                        class="w-3 h-3"
                        aria-hidden="true"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 14 14"
                    >
                        <path
                            stroke="currentColor"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6"
                        />
                    </svg>
                </button>
                <div class="flex flex-col p-3 md:p-5 gap-3">
                    <div v-if="$slots.title" class="h-18 w-full font-bold text-lg">
                        <slot name="title" />
                    </div>
                    <div
                        class="flex-grow max-h-[65vh] lg:max-h-[75vh] overflow-y-scroll z-40 bg-slate-900 p-4 rounded-lg"
                    >
                        <slot></slot>
                    </div>
                    <div v-if="$slots.footer" class="w-full md:rounded-b">
                        <slot name="footer" />
                    </div>
                </div>
            </BasicBlock>
        </div>
    </div>
</template>

<script setup lang="ts">
import BasicBlock from '../core/BasicBlock.vue';
import { toRef } from 'vue';

const props = defineProps<{
    visible: boolean;
}>();

const emit = defineEmits<{
    close: [];
}>();

const visible = toRef(props, 'visible');

function bgClicked() {
    emit('close');
}
</script>
