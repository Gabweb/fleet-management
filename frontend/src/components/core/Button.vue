<template>
    <button
        class="focus:ring-1 focus:outline-none text-xs text-center rounded-xl text-gray-50 shadow select-none font-semibold bg-gradient-to-l hover:cursor-pointer hover:transition-all hover:duration-100"
        :class="classColor"
        :disabled="disabled"
        @click="!loading && emit('click')"
    >
        <div v-if="loading" class="w-full flex flex-row justify-around">
            <Spinner size="xs" class="m-auto" />
        </div>
        <slot v-else />
    </button>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import Spinner from './Spinner.vue';

const props = withDefaults(
    defineProps<{
        type?: 'green' | 'red' | 'blue' | 'blue-hollow';
        size?: 'xs' | 'sm' | 'md' | 'lg';
        narrow?: boolean;
        loading?: boolean;
        disabled?: boolean;
    }>(),
    {
        type: 'blue',
        size: 'md',
    }
);

const emit = defineEmits<{
    click: [];
}>();

const classColor = computed(() => {
    const classes = [`btn-${props.type}`];
    if (props.size == 'xs') {
        classes.push('py-1 px-2 text-sm');
    }
    if (props.size == 'sm') {
        classes.push('py-2', 'px-3');
    } else if (props.size == 'md') {
        classes.push('py-2.5', 'px-4');
    }

    if (!props.narrow) {
        classes.push('min-w-[10rem]');
    }

    if (props.loading) {
        classes.push('hover:cursor-not-allowed');
    }

    if (props.disabled) {
        classes.push('!bg-none !border-none', '!bg-opacity-25', '!shadow-none', 'hover:!cursor-not-allowed');
    }

    return classes;
});
</script>

<style scoped>
.btn-blue-hollow {
    @apply border-2 border-blue-700;
}

.btn-blue {
    @apply bg-blue-800 from-blue-600 shadow-blue-800/50 hover:bg-blue-800 hover:from-blue-700;
}

.btn-red {
    @apply bg-red-800 from-red-600 shadow-red-800/50 hover:bg-red-800 hover:from-red-700;
}

.btn-green {
    @apply bg-green-800 from-green-600 shadow-green-800/50 hover:bg-green-800 hover:from-green-700;
}
</style>
