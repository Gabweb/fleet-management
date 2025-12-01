<template>
    <div v-if="vertical"
        class="flex flex-row gap-2 bg-slate-800 rounded-lg shadow-lg p-2 relative text-sm h-18 justify-start hover:cursor-pointer"
        :class="{ 'border border-blue-500 shadow-sm shadow-blue-700': selected }" @click="onClick">
        <figure class="w-14 h-14 aspect-square border border-gray-300 bg-gray-900/50 rounded-full">
            <slot name="image">
                <img class="rounded-full" src="/shelly_logo_black.jpg" alt="Shelly" />
            </slot>
        </figure>
        <div class="my-auto line-clamp-1 flex-grow text-left overflow-x-scroll no-scrollbar">
            <div class="font-semibold">
                <slot name="name">
                    <span>Widget Name</span>
                </slot>
            </div>

            <template v-if="!stripped">
                <slot name="description" />
            </template>
        </div>
        <div v-if="!stripped" class="min-w-[40px] min-h-[40px] my-auto">
            <input v-if="selectMode" type="checkbox" class="w-4 h-4" :value="selected" :checked="selected" />
            <slot v-else name="action" :vertical="true" />
        </div>
    </div>

    <div v-else
        class="min-w-[180px] h-[180px] no-scrollbar overflow-hidden text-ellipsis whitespace-pre-line text-center relative bg-slate-800 rounded-lg text-sm text-gray-200 border self-stretch leading-tight"
        :class="[selected ? 'border-blue-500 shadow shadow-blue-700' : 'border-gray-700']" @click="onClick">
        <span class="bg-black/60 text-xs rounded-br-lg py-[2px] px-[6px] absolute h-5 self-center top-0 left-0 z-[1]">
            <slot name="upper-corner">
                <i class="mr-1 fas fa-code"></i>
                Widget
            </slot>
        </span>
        <slot name="upper-right-corner">
            
        </slot>
        <div
            class="w-full h-[50%] absolute top-0 left-0 border bg-gradient-to-t from-slate-900 to-slate-800 border-none [&>img]:mx-auto [&>img]:h-full [&>img]:brightness-75">
            <slot name="image">
                <img class="rounded-full" src="/shelly_logo_black.jpg" alt="Shelly" />
            </slot>
            <div class="absolute text-center bottom-1 w-full drop-shadow-2xl" style="text-shadow: black 0px 0px 10px">
                <slot name="name">
                    <span>Widget Name</span>
                </slot>
            </div>
        </div>

        <div class="absolute h-[50%] bottom-0 w-full p-1 flex flex-col">
            <template v-if="!stripped">
                <slot name="description" />
            </template>

            <div v-if="!stripped"
                class="min-w-[80%] [&>button]:min-w-[80%] [&>*]:mx-auto min-h-[40px] absolute self-center bottom-2.5">
                <input v-if="selectMode" type="checkbox" class="w-4 h-4" :value="selected" :checked="selected" />
                <slot v-else name="action" :vertical="false" />
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { toRefs } from 'vue';

type props_t = {
    selected?: boolean;
    vertical?: boolean;
    selectMode?: boolean;
    stripped?: boolean;
};
const props = withDefaults(defineProps<props_t>(), {
    stripped: false,
});

const emit = defineEmits<{
    select: [];
}>();

const { vertical, selected } = toRefs(props);

function onClick() {
    emit('select');
}
</script>
