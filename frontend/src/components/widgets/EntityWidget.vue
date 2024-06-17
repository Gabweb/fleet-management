<template>
    <Widget
        :selected="selected"
        :class="[(!device || device.loading || !device.online) && '!bg-red-900/60 backdrop-blur']"
    >
        <template #upper-corner>
            <i class="mr-1" :class="upperCornerData.icon"></i>
            {{ upperCornerData.text }}
        </template>

        <template #image>
            <img v-lazyload class="rounded-full" :data-url="getLogoFromModel(deviceModel)" alt="Shelly" />
        </template>

        <template #name>
            <span class="text-[13px] font-semibold text-ellipsis line-clamp-2"> {{ entity.name }}</span>
        </template>

        <template #description>
            <span v-if="!device" class="text-red-500 font-semibold"> Error </span>
            <div v-else-if="device.loading" class="mx-auto">
                <Spinner />
            </div>
            <span v-else-if="!device.online" class="text-red-500 font-semibold"> Offline </span>
            <div v-else class="flex flex-nowrap overflow-x-scroll select-none gap-1 no-scrollbar">
                <!-- Show the color of the RGBW and RGB lights -->
                <span
                    v-if="/rgbw?/i.test(entity.type) && device.online"
                    class="text-xs bg-gray-950 text-gray-50 p-1 rounded-md"
                >
                    <p
                        class="border-2 rounded-full"
                        :style="`width: 20px; height: 20px; background-color: rgb(${entity_status.rgb.join(',')});`"
                    ></p>
                </span>

                <span
                    v-for="[index, { icon, text }] of Object.entries(tags)"
                    :key="index"
                    class="text-xs bg-gray-950 text-gray-50 p-1 rounded-md"
                >
                    <i v-if="!!icon" :class="icon" /> {{ text }}
                </span>
            </div>
        </template>

        <template v-if="device" #action>
            <template v-if="editMode">
                <Button type="red" @click="emit('delete')">Delete</Button>
            </template>
            <template v-else-if="entity_status && device.online && !device.loading">
                <div v-if="entity.type === 'temperature'" class="box">
                    <p>{{ entity_status.tC }} °C</p>
                </div>

                <div
                    v-else-if="
                        entity.type === 'bthomesensor' &&
                        (entity as bthomesensor_entity).properties.sensorType === 'sensor' &&
                        device.online
                    "
                    class="box"
                >
                    <p>{{ entity_status.value ?? 'N/A' }} {{ (entity as bthomesensor_entity).properties.unit }}</p>
                </div>

                <div
                    v-else-if="
                        entity.type === 'bthomesensor' &&
                        (entity as bthomesensor_entity).properties.sensorType === 'binary_sensor' &&
                        device.online
                    "
                    class="box"
                >
                    <p>{{ entity_status.value ? 'True' : 'False' }}</p>
                </div>

                <div
                    v-else-if="
                        entity.type === 'bthomesensor' &&
                        (entity as bthomesensor_entity).properties?.sensorType === 'button' &&
                        device.online
                    "
                    class="box"
                >
                    <p>{{ displayEvent }}</p>
                </div>

                <div v-else-if="entity.type === 'button' && device.online" class="box">
                    <p>{{ displayEvent }}</p>
                </div>

                <div v-else-if="entity.type === 'boolean' && device.online" class="box">
                    <p>
                        {{
                            entity_status.value
                                ? (entity as virtual_boolean_entity).properties.labelTrue
                                : (entity as virtual_boolean_entity).properties.labelFalse
                        }}
                    </p>
                </div>

                <div v-else-if="entity.type === 'number' && device.online" class="box">
                    <p>{{ entity_status.value }} {{ (entity as virtual_number_entity).properties.unit }}</p>
                </div>

                <div v-else-if="entity.type === 'text' && device.online" class="box">
                    <p>{{ entity_status.value }}</p>
                </div>

                <div v-else-if="entity.type === 'enum' && device.online" class="box">
                    <p>
                        {{
                            (entity as virtual_enum_entity).properties.options[entity_status.value] ??
                            entity_status.value
                        }}
                    </p>
                </div>

                <div v-else-if="entity.type === 'em1'" class="box">
                    <p>{{ formatWatts(entity_status.act_power) }}</p>
                </div>

                <div
                    v-else-if="entity.type === 'input' && (entity as input_entity).properties.type === 'switch'"
                    class="w-10 h-10 p-2 rounded-md bg-gray-900 text-gray-100 box"
                >
                    <p :key="String(entity_status.state)" class="my-auto text-base">
                        <i v-if="entity_status.state" class="fas fa-toggle-on text-green-500" />
                        <i v-else class="fas fa-toggle-off text-red-500" />
                    </p>
                </div>

                <div
                    v-else-if="entity.type === 'input' && (entity as input_entity).properties.type === 'analog'"
                    class="w-10 h-10 p-2 rounded-md bg-gray-900 text-gray-100 box"
                >
                    <p>
                        {{ entity_status?.xpercent || entity_status.percent }}
                        {{ (entity as input_entity).properties.unit ?? '%' }}
                    </p>
                </div>

                <div
                    v-else-if="entity.type === 'input' && (entity as input_entity).properties.type === 'button'"
                    class="w-10 h-10 p-2 rounded-md bg-gray-900 text-gray-100 box"
                >
                    <p>{{ displayEvent }}</p>
                </div>

                <CoverControls
                    v-if="entity.type === 'cover'"
                    :state="entity_status.state"
                    :request-in-progress="waitingForResponse"
                    @direction="coverControl"
                />

                <button
                    v-else-if="/(cct|switch|light|rgbw?)/.test(entity.type)"
                    class="w-10 h-10 rounded-full"
                    :class="{
                        'bg-red-500': !entity_status.output,
                        'bg-emerald-500': entity_status.output,
                    }"
                    @click.stop="actionClicked"
                >
                    <Spinner v-if="waitingForResponse" />
                    <template v-else>
                        <span>
                            <i class="fas fa-power-off"></i>
                        </span>
                    </template>
                </button>
            </template>
        </template>
    </Widget>
</template>

<script lang="ts" setup>
import Widget from './Widget.vue';
import { computed, ref, toRef, toRefs, watch, onMounted, onUnmounted } from 'vue';
import { useEntityStore } from '@/stores/entities';
import Button from '@/components/core/Button.vue';
import { getLogoFromModel } from '@/helpers/device';
import { formatWatts } from '@/helpers/numbers';
import {
    entity_t,
    virtual_boolean_entity,
    virtual_enum_entity,
    virtual_number_entity,
    input_entity,
    bthomesensor_entity,
} from '@/types';
import Spinner from '../core/Spinner.vue';
import { useDevicesStore } from '@/stores/devices';
import CoverControls from '@/components/core/Cover/CoverControls.vue';

type props_t = { entity: entity_t; editMode?: boolean; selected?: boolean };

const props = withDefaults(defineProps<props_t>(), {
    editMode: false,
    selected: false,
});
const emit = defineEmits<{
    delete: [];
}>();

const { editMode, selected } = toRefs(props);

const entityStore = useEntityStore();
const deviceStore = useDevicesStore();
const entity = toRef(props, 'entity');

const device = computed(() => deviceStore.devices[entity.value.source]);
const deviceModel = computed(() => device.value && device.value.info.model);

const entity_status = computed(() => {
    if (!device.value) {
        return {};
    }

    return device.value.status?.[entity.value.type + ':' + entity.value.properties.id];
});

let eventListener: (() => void) | null = null;
const event = ref(null);
let clearEventTimeout: ReturnType<typeof setTimeout>;

watch(device, (dev) => {
    console.log('dev', dev);
});

onMounted(() => {
    // events are needed only for buttons
    if (
        !(
            entity.value.type === 'button' ||
            (entity.value.type === 'bthomesensor' &&
                (entity.value as bthomesensor_entity).properties.sensorType === 'button') ||
            (entity.value.type === 'input' && (entity.value as input_entity).properties.type === 'button')
        )
    ) {
        return;
    }

    eventListener = entityStore.addListener(entity.value.id, (_event: any) => {
        event.value = _event;

        if (clearEventTimeout) {
            clearTimeout(clearEventTimeout);
        }

        clearEventTimeout = setTimeout(() => {
            event.value = null;
            clearTimeout(clearEventTimeout);
        }, 3000);
    });
});

onUnmounted(() => {
    if (typeof eventListener !== 'function') {
        return;
    }

    eventListener();
});

const displayEvent = computed(() => {
    if (!event.value) {
        return 'None';
    }

    const EVENT_TITLES: Record<string, string> = {
        single_push: 'Single Press',
        double_push: 'Double Press',
        triple_push: 'Triple Press',
        long_push: 'Long Press',
    };

    return EVENT_TITLES[event.value] ?? 'None';
});

const waitingForResponse = ref(false);
let waitingForResponseTimeout: ReturnType<typeof setTimeout>;

const upperCornerData = computed<{ icon: string; text: string }>(() => {
    switch (entity.value.type) {
        case 'input':
            return {
                icon: 'fas fa-arrow-right',
                text: entity.value.type,
            };
        case 'temperature':
            return {
                icon: 'fas fa-thermometer-half',
                text: entity.value.type,
            };

        case 'bthomesensor': {
            return {
                icon: 'fas fa-thermometer-half',
                text: 'BLU Sensor',
            };
        }

        case 'rgb':
        case 'rgbw':
            return {
                icon: 'fas fa-palette',
                text: entity.value.type.toUpperCase(),
            };

        case 'cover':
            return {
                icon: 'fas fa-window-maximize',
                text: 'Cover',
            };

        case 'em':
        case 'em1':
            return {
                icon: 'fas fa-bolt',
                text: entity.value.type.toUpperCase(),
            };

        default:
            return {
                icon: 'fas fa-power-off',
                text: entity.value.type,
            };
    }
});

const tags = computed(() => {
    if (typeof entity_status.value !== 'object' || Object.keys(entity_status.value).length == 0) {
        return [];
    }

    const tags: { icon?: string; text: string }[] = [];
    for (const [k, v] of Object.entries(entity_status.value)) {
        if (v == '0') continue;
        switch (k) {
            case 'apower':
                tags.push({ text: `${v} W` });
                break;

            case 'voltage':
                tags.push({ text: `${v} V` });
                break;

            case 'total':
                tags.push({ text: `${v} Wh` });
                break;

            case 'current':
                tags.push({ text: `${v} A` });
                break;

            case 'white':
                tags.push({ text: String(v), icon: 'fa-solid fa-circle' });
                break;

            case 'brightness':
                tags.push({ text: String(v), icon: 'fas fa-sun' });
                break;

            case 'state':
                tags.push({ text: String(v) });
                break;
        }
    }
    return tags;
});

async function sendRpc(entityId: string, method: string, params?: any) {
    waitingForResponse.value = true;
    waitingForResponseTimeout = setTimeout(() => {
        waitingForResponse.value = false;
    }, 10000); // timeout after 10 seconds

    await entityStore.sendRPC(entityId, method, params);

    if (waitingForResponseTimeout) {
        clearInterval(waitingForResponseTimeout);
    }
    waitingForResponse.value = false;
}

function actionClicked() {
    if (!['switch', 'light', 'rgb', 'rgbw', 'cct'].includes(entity.value.type)) {
        return;
    }

    if (waitingForResponse.value) {
        return;
    }

    sendRpc(entity.value.id, `${entity.value.type}.toggle`);
}

function coverControl(direction: 'stop' | 'open' | 'close') {
    if (entity.value.type !== 'cover') {
        return;
    }

    if (waitingForResponse.value) {
        return;
    }

    sendRpc(entity.value.id, `${entity.value.type}.${direction}`);
}
</script>

<style scoped>
.box {
    @apply p-1 md:p-2 w-max rounded-md bg-gray-900 text-gray-100 h-10 flex items-center;
}

.box > p {
    @apply text-xs md:text-sm line-clamp-1;
}
</style>
