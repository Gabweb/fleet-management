<template>
    <div>
        <button
            data-dropdown-toggle="dropdown"
            class="text-gray-200 focus:outline-none w-full sm:w-44 font-medium rounded-lg text-sm px-2.5 py-2 text-center inline-flex items-center border border-gray-500 bg-gray-900 hover:bg-blue-900 focus:ring-blue-800 relative transition-all duration-50"
            type="button"
            :class="{
                'rounded-b-none': expanded,
            }"
            @click="expanded = !expanded"
        >
            <span :key="icon">
                <span v-if="icon" class="icon mr-1">
                    <i :class="['fas', icon]"></i>
                </span>
                <span>{{ selected }}</span>
            </span>
            <span :key="String(expanded)" class="absolute right-2 icon is-small">
                <i
                    class="fas"
                    :class="{
                        'fa-angle-down': !expanded,
                        'fa-angle-up': expanded,
                    }"
                    aria-hidden="true"
                ></i>
            </span>
        </button>

        <!-- Dropdown menu -->
        <div
            class="divide-y divide-gray-100 rounded-lg rounded-t-none shadow w-full sm:w-44 bg-gray-700 absolute z-50 max-h-[16rem] overflow-auto min-h-fit"
            :class="{ hidden: !expanded }"
        >
            <ul class="text-sm text-gray-700 dark:text-gray-200 z-50" aria-labelledby="dropdownDefaultButton">
                <li v-for="(option, i) of options" :key="option" @click="optionSelected(option, icons?.[i])">
                    <a class="block px-4 py-2 hover:bg-gray-600 hover:text-white p-1 hover:cursor-pointer">
                        <span v-if="icons?.[i]" class="icon mr-1">
                            <i :class="['fas', icons[i]]"></i>
                        </span>
                        <span>
                            {{ option }}
                        </span>
                    </a>
                </li>
            </ul>
        </div>
    </div>
</template>

<script lang="ts" setup generic="T extends string | number">
import { Ref, ref, toRefs } from 'vue';

const props = defineProps<{
    options: T[];
    icons?: string[];
    default?: T;
}>();

const emit = defineEmits<{
    selected: [option: T, index: number];
}>();

const { options } = toRefs(props);

const selected = ref(props.default || options.value[0]) as Ref<T>;
const icon = ref(props.icons?.[0] || '');
const expanded = ref(false);

function optionSelected(option: T, picon?: string) {
    selected.value = option;
    if (picon) {
        icon.value = picon;
    }
    expanded.value = false;
    emit('selected', option, options.value.indexOf(option));
}
</script>

<style scoped>
.button {
    border: 1px solid rgba(255, 255, 255, 0.5);
    min-width: 8rem;
    display: flex;
    justify-content: space-between;
}

.dropdown,
.dropdown-menu {
    min-width: 8rem;
}

.dropdown-menu {
    border: 1px solid rgba(255, 255, 255, 0.5);
    border-radius: 0.25rem;
    border-top-right-radius: 0rem;
    border-top-left-radius: 0rem;
    border-top: 0px;
}

.dropdown-item {
    font-size: 0.75rem !important;
}
</style>
