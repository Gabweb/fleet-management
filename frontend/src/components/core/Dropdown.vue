<!-- Dropdown.vue -->
<template>
    <div ref="dropdownWrapper" class="relative">
        <label v-if="label" :for="id" class="block text-sm font-semibold text-white pt-2 pb-2">
            {{ label }}
        </label>
        <button
            :id="id"
            data-dropdown-toggle="dropdown"
            class="text-gray-200 focus:outline-none w-full sm:w-44 font-medium rounded-lg text-sm px-2.5 py-2 text-center inline-flex items-center border border-gray-500 bg-gray-900 hover:bg-blue-900 focus:ring-blue-800 relative transition-all duration-50"
            type="button"
            :class="{
                'rounded-b-none': expanded,
            }"
            @click="toggleDropdown"
        >
            <span :key="icon">
                <span v-if="icon" class="icon mr-1">
                    <i :class="['fad', icon]"></i>
                </span>
                <span>{{ selected }}</span>
            </span>
            <span :key="String(expanded)" class="absolute right-2 icon is-small">
                <i
                    class="fad"
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
            ref="dropdownMenu"
            class="divide-y divide-gray-100 rounded-lg rounded-t-none shadow w-full sm:w-44 bg-gray-700 absolute z-50 max-h-[16rem] overflow-auto min-h-fit"
            :class="{ hidden: !expanded }"
        >
            <div v-if="searchable" class="px-2 py-1">
                <input
                    v-model="searchQuery"
                    type="text"
                    class="w-full bg-gray-600 text-gray-200 rounded-lg p-2"
                    placeholder="Search..."
                />
            </div>
            <ul class="text-sm text-gray-700 dark:text-gray-200 z-50" aria-labelledby="dropdownDefaultButton" :style="{ maxHeight: dropdownMaxHeight + 'px' }">
                <li
                    v-for="(option, i) of filteredOptions"
                    :key="option"
                    @click="optionSelected(option, icons?.[i])"
                >
                    <a class="block px-4 py-2 hover:bg-gray-600 hover:text-white p-1 hover:cursor-pointer">
                        <span v-if="icons?.[i]" class="icon mr-1">
                            <i :class="['fad', icons[i]]"></i>
                        </span>
                        <span>{{ option }}</span>
                    </a>
                </li>
            </ul>
        </div>
    </div>
</template>

<script lang="ts" setup generic="T extends string | number | boolean">
import { computed, Ref, ref, toRefs, useId, onMounted, onBeforeUnmount, watch } from 'vue';

const id = useId();

const props = defineProps<{
    options: T[];
    icons?: Array<string>;
    default?: T;
    label?: string;
    searchable?: boolean;
    toDefault?: boolean;
}>();

const emit = defineEmits<{
    selected: [option: T, index: number];
    resetFilters: [];
}>();

const { options,toDefault } = toRefs(props);
const selected = ref(props.default || options.value[0]) as Ref<T>;
const icon = ref(props.icons?.[0] || '');
const expanded = ref(false);
const dropdownWrapper = ref<HTMLElement | null>(null);
const searchQuery = ref('');

const dropdownMaxHeight = computed(() => {
    return window.innerHeight * 0.6;
});

const filteredOptions = computed(() => {
    if (!searchQuery.value) {
        return options.value;
    }
    return options.value.filter((option: T) =>
        option.toString().toLowerCase().includes(searchQuery.value.toLowerCase())
    );
});

watch(toDefault, (toDefault) => {
    if (toDefault) {
        resetDropdown();
    }
});
watch(() => props.default, (newDef) => {
  if (newDef != null && options.value.includes(newDef as T)) {
    selected.value = newDef as T
  }
})
function optionSelected(option: T, picon?: string) {
    selected.value = option;
    if (picon) {
        icon.value = picon;
    }
    expanded.value = false;
    emit('selected', option, options.value.indexOf(option));
}

function toggleDropdown() {
    expanded.value = !expanded.value;
}

function closeDropdown(event: MouseEvent) {
    if (expanded.value && dropdownWrapper.value && !dropdownWrapper.value.contains(event.target as Node)) {
        expanded.value = false;
    }
}

function resetDropdown() {
    selected.value = props.default || options.value[0];  // Set to first option
    icon.value = props.icons?.[0] || '';
    expanded.value = false;
}

onMounted(() => {
    document.addEventListener('click', closeDropdown);
});

onBeforeUnmount(() => {
    document.removeEventListener('click', closeDropdown);
});

// Listen for resetFilters event to reset the dropdown
function resetFilters() {
    resetDropdown();
}

watch(options, (options, oldOptions) => {
    if(oldOptions.length === 0){
        selected.value = options[0];
    }
})

</script>
