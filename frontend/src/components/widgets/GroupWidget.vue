<template>
    <Widget>
        <template #upper-corner>
            <i class="mr-1 fas fa-cubes"></i>
            Group
        </template>

        <template #image>
            <img class="rounded-full hover:cursor-pointer" src="/shelly_logo_black.jpg" alt="Shelly" />
        </template>

        <template #name>
            <span class="text-ellipsis line-clamp-2"> {{ name }}</span>
        </template>

        <template #description>
            <span class="text-gray-400">
                {{ members.length + ' device' + (members.length == 1 ? '' : 's') }}
            </span>
        </template>

        <template #action>
            <Button v-if="editMode" type="red" @click="emit('delete')">Delete</Button>
            <slot v-else name="widget-action" />
        </template>
    </Widget>
</template>

<script lang="ts" setup>
import Widget from './Widget.vue';
import { toRef } from 'vue';
import Button from '../core/Button.vue';

type props_t = { name: string; members: string[]; editMode?: boolean };
const props = defineProps<props_t>();

const editMode = toRef(props, 'editMode');
const emit = defineEmits<{
    delete: [];
}>();
</script>
