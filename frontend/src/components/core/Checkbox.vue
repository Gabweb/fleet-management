<template>
    <div class="flex items-center mb-4">
        <input
            :id="id"
            v-model="selected"
            type="checkbox"
            class="w-4 h-4 text-blue-700 bg-gray-700 border-gray-600 rounded focus:ring-blue-600 ring-offset-gray-800 focus:ring-2 dark"
            @click="onClick"
        />
        <label :for="id" class="ml-2 text-sm font-medium text-gray-300"><slot /></label>
    </div>
</template>

<script setup lang="ts">
import { ref, useId, watch } from 'vue';

const emit = defineEmits<{
    click: [];
    'update:modelValue': [selected: boolean];
}>();

const props = withDefaults(
    defineProps<{
        modelValue?: boolean;
    }>(),
    { modelValue: false }
);

const id = useId();

const selected = ref(props.modelValue);

watch(
    () => props.modelValue,
    (newValue) => {
        selected.value = newValue;
    }
);

function onClick() {
    selected.value = !selected.value;
    emit('click');
    emit('update:modelValue', selected.value);
}
</script>
