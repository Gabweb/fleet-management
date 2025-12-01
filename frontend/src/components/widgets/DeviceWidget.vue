<template>
    <Widget
        :selected
        :loading="device.loading"
        v-if="device && device.info"
        :editMode="editMode"
        :class="[(device.loading || !device.online) && '!bg-red-900/60 backdrop-blur']"
    >
        <template #upper-corner>
            <span class="text-[14px]">
                <i class="mr-1 fas fa-microchip"></i>{{ getAppName(device.info) }}
            </span>
        </template>

        <template #upper-right-corner>
            <span v-if="battery != null" class="text-xs flex items-center gap-1">
                <i class="fas fa-battery-half"></i>{{ battery }}%
            </span>
            <span v-else class="text-xs">
                <i class="mr-1 fas fa-microchip"></i>{{ device.entities.length }} entities
            </span>
        </template>

        <template #image>
            <img
                v-lazyload
                class="rounded-full hover:cursor-pointer"
                :data-url="getLogo(device)"
                @error="handleImgError"
            />
        </template>

        <template #name>
            <span class="text-[13px] font-semibold text-ellipsis line-clamp-2">
                {{ getDeviceName(device.info, device_id) }}
            </span>
        </template>

        <template #description>
            <div v-if="device.loading" class="mx-auto w-7 h-7">
                <Spinner />
            </div>
            <span v-else-if="!device.online" class="text-red-500 font-semibold">
                Offline
            </span>
        </template>

        <template #action>
            <template v-if="editMode">
                <Button type="red" size="sm" :narrow="true" @click="emit('delete')">
                    <i class="fas fa-trash-alt"></i>
                </Button>
            </template>
        </template>
    </Widget>

    <Widget :loading="device?.loading" :selected v-else class="!bg-red-900/60 backdrop-blur">
        <template #upper-corner>
            <i class="mr-1 fas fa-microchip"></i>
            <span>Device</span>
        </template>
        <template #name>
            {{ deviceId }}
        </template>
        <template #description>
            <span class="text-red-500 font-semibold">Not found</span>
        </template>
    </Widget>
</template>

<script lang="ts" setup>
import Widget from './WidgetsTemplates/DeviceWidget.vue';
import { computed, toRefs } from 'vue';
import Button from '@/components/core/Button.vue';
import { getLogo, getAppName, getDeviceName } from '@/helpers/device';
import Spinner from '../core/Spinner.vue';
import { useDevicesStore } from '@/stores/devices';

type props_t = {
    deviceId: string;
    editMode?: boolean;
    selected?: boolean;
    battery?: number;
};

const props = withDefaults(defineProps<props_t>(), {
    editMode: false,
    selected: false,
    battery: undefined,
});

const emit = defineEmits<{
    delete: [];
}>();

const { deviceId: device_id, editMode, battery } = toRefs(props);

const deviceStore = useDevicesStore();

function handleImgError(e: any) {
    e.target.src = getLogo();
}

const device = computed(() => deviceStore.devices[device_id.value]);
</script>
