<template>
    <Widget
        v-if="device && device.info"
        :class="[(device.loading || !device.online) && '!bg-red-900/60 backdrop-blur']"
    >
        <template #upper-corner> <i class="mr-1 fas fa-microchip"></i> <span>Device</span> </template>

        <template #image>
            <img
                v-lazyload
                class="rounded-full hover:cursor-pointer"
                :data-url="getLogoFromModel(device.info?.model)"
                alt="Shelly"
            />
        </template>

        <template #name>
            <span class="text-[13px] font-semibold text-ellipsis line-clamp-2">
                {{ device.info?.name || device.info?.id || device_id }}
            </span>
        </template>

        <template #description>
            <div v-if="device.loading" class="mx-auto">
                <Spinner />
            </div>
            <span v-else-if="!device.online" class="text-red-500 font-semibold"> Offline </span>
            <span v-else class="text-gray-400"> {{ device.entities.length }} entities </span>
        </template>

        <template #action>
            <template v-if="editMode">
                <Button type="red" @click="emit('delete')">Delete</Button>
            </template>
        </template>
    </Widget>
</template>

<script lang="ts" setup>
import Widget from './Widget.vue';
import { computed, toRefs } from 'vue';
import Button from '@/components/core/Button.vue';
import { getLogoFromModel } from '@/helpers/device';
import Spinner from '../core/Spinner.vue';
import { useDevicesStore } from '@/stores/devices';

type props_t = {
    deviceId: string;
    editMode?: boolean;
};

const props = withDefaults(defineProps<props_t>(), {
    editMode: false,
});

const emit = defineEmits<{
    delete: [];
}>();

const { deviceId: device_id, editMode } = toRefs(props);

const deviceStore = useDevicesStore();

const device = computed(() => deviceStore.devices[device_id.value]);
</script>
