<template>
    <div>
        <label v-if="label" for="generic_input" class="block text-sm font-semibold text-white">
            {{ label }}
        </label>
        <input
            id="generic_input"
            v-model="model"
            :type="type"
            class="border text-sm rounded-lg block w-full p-2 bg-gray-900 border-gray-500 placeholder-gray-500 text-gray-100"
            :class="[disabled && 'text-gray-500']"
            :placeholder="placeholder"
            :max="max"
            :min="min"
            :disabled="disabled"
            required
        />
    </div>
</template>

<script setup lang="ts">
withDefaults(
    defineProps<{
        placeholder?: string;
        label?: string;
        type?: 'text' | 'password' | 'number';
        min?: number;
        max?: number;
        disabled?: boolean;
    }>(),
    {
        type: 'text',
        placeholder: undefined,
        label: undefined,
        min: NaN,
        max: NaN,
        disabled: false,
    }
);

const model = defineModel<string | number>({ required: true });
</script>
