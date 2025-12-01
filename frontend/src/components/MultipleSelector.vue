<template>
    <div class="space-y-4">
        <div class="flex flex-row items-center justify-between">
            <span class="font-semibold"> Selected: {{ selected.length }}</span>
            <Input v-model="filter" placeholder="search" />
        </div>
        <div class="flex flex-row items-center justify-between">
            <Button size="sm" @click="selectAll">Select All</Button>
            <Button size="sm" @click="selected.length = 0">Unselect All</Button>
        </div>
        <div class="grid grid-cols-2 gap-3">
            <div v-for="option in filteredOptions" :key="option.name">
                <div
                    class="p-3 flex flex-row gap-2 items-center rounded-lg bg-gray-950 border-blue-500 shadow-blue-500 hover:cursor-pointer"
                    :class="[selected.includes(option) && 'border shadow-md']"
                    @click="optionSelected(option)"
                >
                    <input type="checkbox" class="" :checked="selected.includes(option)" />
                    <img :src="option.pictureUrl" class="w-8 h-8 bg-slate-800 rounded-full" />
                    <span class="text-sm line-clamp-2">
                        {{ option.name }}
                    </span>
                </div>
            </div>
        </div>
    </div>
</template>

<script
    setup
    lang="ts"
    generic="
        T extends {
            name: string;
            pictureUrl: string;
        }
    "
>
import { computed, ref, toRefs } from 'vue';
import Input from './core/Input.vue';
import Button from './core/Button.vue';

const selected = defineModel<T[]>({ required: true });

const props = defineProps<{
    options: T[];
}>();
const { options } = toRefs(props);

const filter = ref('');
const filteredOptions = computed(() => {
    return options.value.filter((option) => option.name.includes(filter.value));
});

function optionSelected(option: T) {
    if (selected.value.includes(option)) {
        selected.value.splice(selected.value.indexOf(option), 1);
    } else {
        selected.value.push(option);
    }
}

function selectAll() {
    for (const option of filteredOptions.value) {
        if (!selected.value.includes(option)) {
            selected.value.push(option);
        }
    }
}
</script>
