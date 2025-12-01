<template>
    <Widget>
        <template #upper-corner>
            <i class="mr-1 fas fa-cubes"></i>
            {{ title }}
        </template>

        <template #image>
            <img class="rounded-full hover:cursor-pointer" :src="imageSrc" alt="Shelly" />
        </template>

        <template #name>
            <span class="text-ellipsis line-clamp-2"> {{ name }}</span>
        </template>

        <template #description>
            <span class="text-gray-400">
                {{ description }}
            </span>
        </template>

        <template #action>
            <Button v-if="editMode" type="red" @click="emit('delete')">Delete</Button>
            <slot v-else name="widget-action" />
        </template>
    </Widget>
</template>

<script lang="ts" setup>
import Widget from './WidgetsTemplates/VanilaWidget.vue';
import { toRef } from 'vue';
import Button from '../core/Button.vue';

type props_t = { title: string; name: string; description?: string; imageSrc?: string; editMode?: boolean };
const props = withDefaults(defineProps<props_t>(), {
    editMode: false,
    description: '',
    imageSrc: '/shelly_logo_black.jpg',
});

const editMode = toRef(props, 'editMode');
const emit = defineEmits<{
    delete: [];
}>();
</script>
