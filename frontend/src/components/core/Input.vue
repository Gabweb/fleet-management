<template>
    <label v-if="label" :for="'generic_input_' + id" class="block text-sm font-semibold text-white pt-2 pb-2">
        {{ props.label }}
    </label>
    <div class="relative w-full">

        <input :id="'generic_input_' + id" v-model="model" :type="computedType"
            class="border text-sm rounded-lg block w-full p-2 bg-gray-900 border-gray-500 placeholder-gray-500 text-gray-100"
            :class="[props.disabled && 'text-gray-500', props.customClass, props.type === 'password' ? 'pr-10' : '']"
            :placeholder="props.placeholder" :max="props.max" :min="props.min" :disabled="props.disabled" required
            @focus="handleFocus" @blur="handleFocus" />

        <button v-if="model && props.type !== 'password' && props.clear" type="button"
            class="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-200"
            @click="clearInput">
            ✕
        </button>
        <!-- Adjusted password toggle button positioning -->
        <span v-if="props.type === 'password'" @click="toggleVisibility"
            class="absolute inset-y-0 right-2 flex items-center cursor-pointer select-none text-white">
            <svg v-if="isPasswordVisible" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none"
                viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24"
                stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M13.875 18.825A10.05 10.05 0 0112 19c-4.477 0-8.268-2.943-9.542-7a10.122 10.122 0 012.07-3.174M6.12 6.12A10.056 10.056 0 0112 5c4.477 0 8.268 2.943 9.542 7a10.122 10.122 0 01-1.017 1.766M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3l18 18" />
            </svg>
        </span>

        <!-- Display error message if present -->
        <div v-if="props.error" class="text-red-600 text-sm mt-1">
            {{ props.error }}
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useId } from 'vue';

const id = useId();

const props = withDefaults(
    defineProps<{
        placeholder?: string;
        label?: string;
        type?: 'text' | 'password' | 'number' | 'datetime-local' | 'email';
        min?: number;
        max?: number;
        disabled?: boolean;
        customClass?: string;
        error?: string;
        clear?: boolean;
    }>(),
    {
        type: 'text',
        placeholder: undefined,
        label: undefined,
        min: NaN,
        max: NaN,
        disabled: false,
        customClass: '',
        error: '',
        clear: false
    }
);

const emit = defineEmits<{
    (event: 'focus'): void;
}>();

const handleFocus = () => {
    emit('focus');
};

const model = defineModel<string | number | Function>({ required: true });

const clearInput = () => {
    model.value = '';
};
const isPasswordVisible = ref(false);
const toggleVisibility = () => {
    isPasswordVisible.value = !isPasswordVisible.value;
};

const computedType = computed(() => {
    if (props.type === 'password') {
        return isPasswordVisible.value ? 'text' : 'password';
    }
    return props.type;
});
</script>

<style scoped>
.capitalized {
    text-transform: capitalize;
}
</style>