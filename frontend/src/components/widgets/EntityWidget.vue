<template>
    <Widget :vertical="vertical" board :selected="selected" :vc="checkIfVC(entity.type)"
        :class="[(!device || device.loading || !device.online) && '!bg-red-900/60 backdrop-blur']">

        <template #upper-corner>
            Entity
        </template>

        <template #image>
            <div class="image-container">
                <i v-lazyload class="rounded-full typeIcon" :class="getPredefinedImageForEntity(entity.type)"
                    alt="Shelly"></i>
            </div>
        </template>

        <template #name>
            <span class="text-[12px] text-wrap text-center truncate line-clamp-2"> {{ nameFitter }}</span>
        </template>

        <template #description>
            <span v-if="!device" class="text-red-500 font-semibold"> Error </span>
            <div v-else-if="device.loading" class="mx-auto">
                <Spinner />
            </div>
            <span v-else-if="!device.online" class="text-red-500 font-semibold"> Offline </span>
            <div v-else class="flex flex-nowrap overflow-x-scroll select-none gap-1 no-scrollbar flex-col">
                <!-- Show the color of the RGBW and RGB lights -->
                <div class="flex flex-wrap gap-2">
                    <span v-if="/rgbw?/i.test(entity.type) && device.online"
                        class="text-[11px] bg-gray-950 text-gray-50 px-1 rounded-md">
                        <p class="border-2 rounded-full"
                            :style="`width: 20px; height: 20px; background-color: rgb(${entity_status.rgb.join(',')});`">
                        </p>
                    </span>

                    <span v-for="[index, { icon, text }] of Object.entries(tags)" :key="index"
                        class="text-[11px] bg-gray-950 text-gray-50 p-1 rounded-md">
                        <i v-if="!!icon" :class="icon" /> {{ text }}
                    </span>
                </div>

                <!-- Entity controls -->
                <div v-if="entity_status && vertical" class="max-w-[80%]" @click.stop>
                    <HorizontalSlider v-if="
                        entity.type === 'number' && (entity as virtual_number_entity).properties.view === 'slider'
                    " :value="entity_status.value" :min="(entity as virtual_number_entity).properties.min"
                        :max="(entity as virtual_number_entity).properties.max"
                        :step="(entity as virtual_number_entity).properties.step"
                        :disable="waitingForResponse || !device.online"
                        @change="(value) => sendRpc(entity.id, 'Number.Set', { value })">
                        <template #title>
                            {{ entity_status.value }} {{ (entity as virtual_number_entity).properties.unit }}
                        </template>
                    </HorizontalSlider>

                    <HorizontalProgress v-if="
                        entity.type === 'number' &&
                        (entity as virtual_number_entity).properties.view === 'progressbar'
                    " :value="entity_status.value" :min="(entity as virtual_number_entity).properties.min"
                        :max="(entity as virtual_number_entity).properties.max"
                        :step="(entity as virtual_number_entity).properties.step" :disable="!device.online"
                        @change="(value) => sendRpc(entity.id, 'Number.Set', { value })">
                    </HorizontalProgress>

                    <form
                        v-if="entity.type === 'number' && (entity as virtual_number_entity).properties.view === 'field'"
                        class="flex flex-col items-center gap-1"
                        @submit.prevent="() => sendRpc(entity.id, 'Number.Set', { value: tempValue })">
                        <Input v-model="tempValue" :type="'number'" :placeholder="'Value'" />
                        <Button submit size="xs">Save</Button>
                    </form>
                    <form v-if="entity.type === 'text' && (entity as virtual_text_entity).properties.view === 'field'"
                        class="flex flex-col items-center gap-1"
                        @submit.prevent="() => sendRpc(entity.id, 'Text.Set', { value: tempValue })">
                        <Input v-model="tempValue" :type="'text'" :placeholder="'Value'"
                            :max="(entity as virtual_text_entity).properties.maxLength" />
                        <Button submit size="xs">Save</Button>
                    </form>
                </div>
            </div>
        </template>

        <template v-if="device" #action>
            <template v-if="editMode">
                <Button type="red" @click="emit('delete')">Delete</Button>
            </template>
            <template v-else-if="entity_status && device.online && !device.loading">
                <div v-if="entity.type === 'temperature'" class="box">
                    <p v-if="entity_status.tC !== null">{{ entity_status.tC }} °C</p>
                    <p v-else>N/A</p>
                </div>

                <div v-else-if="
                    entity.type === 'bthomesensor' &&
                    (entity as bthomesensor_entity).properties.sensorType === 'sensor' &&
                    device.online
                " class="box">
                    <p>{{ entity_status.value ?? 'N/A' }} {{ (entity as bthomesensor_entity).properties.unit }}</p>
                </div>

                <div v-else-if="
                    entity.type === 'bthomesensor' &&
                    (entity as bthomesensor_entity).properties.sensorType === 'binary_sensor' &&
                    device.online
                " class="box">
                    <p>{{ entity_status.value ? 'True' : 'False' }}</p>
                </div>

                <div v-else-if="
                    entity.type === 'bthomesensor' &&
                    (entity as bthomesensor_entity).properties?.sensorType === 'button' &&
                    device.online
                " class="box">
                    <p>{{ displayEvent }}</p>
                </div>

                <div v-else-if="entity.type === 'button' && device.online" class="box">
                    <p>{{ displayEvent }}</p>
                </div>

                <!-- Virtual Boolean component with label view -->
                <div v-else-if="
                    entity.type === 'boolean' &&
                    (entity as virtual_boolean_entity).properties.view === 'label' &&
                    device.online
                " class="box">
                    <p>
                        {{
                            entity_status.value
                                ? (entity as virtual_boolean_entity).properties.labelTrue
                                : (entity as virtual_boolean_entity).properties.labelFalse
                        }}
                    </p>
                </div>

                <!-- Virtual Boolean component with toggle control -->
                <button v-else-if="
                    entity.type === 'boolean' &&
                    (entity as virtual_boolean_entity).properties.view === 'toggle' &&
                    device.online
                " class="w-10 h-10 rounded-full" :class="{
                        'bg-red-500': !entity_status.value,
                        'bg-emerald-500': entity_status.value,
                    }" @click.stop="() => sendRpc(entity.id, 'Boolean.Set', { value: !entity_status.value })">
                    <Spinner v-if="waitingForResponse" />
                    <template v-else>
                        <span>
                            <i class="fas fa-power-off"></i>
                        </span>
                    </template>
                </button>

                <!-- Virtual number - always show the value, except when it is hidden -->

                <div v-else-if="
                    entity.type === 'number' &&
                    (entity as virtual_number_entity).properties.view !== null &&
                    device.online
                " class="box">
                    <p>{{ entity_status.value }} {{ (entity as virtual_number_entity).properties.unit }}</p>
                </div>

                <!-- Virtual text - show the value only when the view config is label or for non-vertical widgets  -->
                <div v-else-if="
                    entity.type === 'text' &&
                    (!vertical || (entity as virtual_text_entity).properties.view === 'label') &&
                    device.online
                " class="box">
                    <p>{{ entity_status.value }}</p>
                </div>

                <div v-else-if="
                    entity.type === 'enum' &&
                    (entity as virtual_enum_entity).properties.view === 'label' &&
                    device.online
                " class="box">
                    <p>
                        {{
                            (entity as virtual_enum_entity).properties.options[entity_status.value] ??
                            entity_status.value
                        }}
                    </p>
                </div>

                <Dropdown v-else-if="
                    entity.type === 'enum' &&
                    (entity as virtual_enum_entity).properties.view === 'dropdown' &&
                    device.online
                " :default="(entity as virtual_enum_entity).properties.options[entity_status.value] || entity_status.value
                        " :options="Object.values((entity as virtual_enum_entity).properties.options)" @click.stop
                    @selected="
                        (selectedValue: string) => {
                            const selectedKey = Object.entries(
                                (entity as virtual_enum_entity)?.properties?.options || {}
                            ).find(([_, value]) => value === selectedValue)?.[0];

                            if (!selectedKey) {
                                return;
                            }

                            sendRpc(entity.id, 'Enum.Set', { value: selectedKey });
                        }
                    " />

                <div v-else-if="entity.type === 'em1'" class="box">
                    <p>{{ formatWatts(entity_status.act_power) }}</p>
                </div>

                <div v-else-if="entity.type === 'input' && (entity as input_entity).properties.type === 'switch'"
                    class="w-10 h-10 p-2 rounded-md bg-gray-900 text-gray-100 box">
                    <p :key="String(entity_status.state)" class="my-auto text-base">
                        <i v-if="entity_status.state" class="fas fa-toggle-on text-green-500" />
                        <i v-else class="fas fa-toggle-off text-red-500" />
                    </p>
                </div>

                <div v-else-if="entity.type === 'input' && (entity as input_entity).properties.type === 'analog'"
                    class="w-10 h-10 p-2 rounded-md bg-gray-900 text-gray-100 box">
                    <p>
                        {{ entity_status?.xpercent || entity_status.percent }}
                        {{ (entity as input_entity).properties.unit ?? '%' }}
                    </p>
                </div>

                <div v-else-if="entity.type === 'input' && (entity as input_entity).properties.type === 'button'"
                    class="w-10 h-10 p-2 rounded-md bg-gray-900 text-gray-100 box">
                    <p>{{ displayEvent }}</p>
                </div>

                <CoverControls v-if="entity.type === 'cover'" :state="entity_status.state"
                    :request-in-progress="waitingForResponse" @direction="coverControl" />

                <button v-else-if="/(cct|switch|light|rgbw?)/.test(entity.type)" class="w-10 h-10 rounded-full" :class="{
                    'bg-red-500': !entity_status.output,
                    'bg-emerald-500': entity_status.output,
                }" @click.stop="actionClicked">
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
import Widget from './WidgetsTemplates/EntityWidget.vue';
import { computed, ref, toRef, toRefs, watch, onMounted, onUnmounted } from 'vue';
import { useEntityStore } from '@/stores/entities';
import Button from '@/components/core/Button.vue';
import { getPredefinedImageForEntity } from '@/helpers/device';
import { formatWatts } from '@/helpers/numbers';
import {
    entity_t,
    virtual_boolean_entity,
    virtual_enum_entity,
    virtual_number_entity,
    input_entity,
    bthomesensor_entity,
    virtual_text_entity,
} from '@/types';
import Spinner from '../core/Spinner.vue';
import { useDevicesStore } from '@/stores/devices';
import CoverControls from '@/components/core/Cover/CoverControls.vue';
import HorizontalSlider from '../core/HorizontalSlider.vue';
import HorizontalProgress from '../core/HorizontalProgress.vue';
import Input from '../core/Input.vue';
import Dropdown from '../core/Dropdown.vue';

type props_t = { entity: entity_t; editMode?: boolean; selected?: boolean; vertical?: boolean };

const props = withDefaults(defineProps<props_t>(), {
    editMode: false,
    selected: false,
    rightCorner: false,
});
const emit = defineEmits<{
    delete: [];
}>();

const { editMode, selected, vertical } = toRefs(props);

const entityStore = useEntityStore();
const deviceStore = useDevicesStore();
const entity = toRef(props, 'entity');

const device = computed(() => deviceStore.devices[entity.value.source]);

const nameFitter = computed(() =>
    entity.value.name.length > 30 ? entity.value.name.substring(0, 30) + '...' : entity.value.name
);

const checkIfVC = computed(() => {
    return (type: string) => ['boolean', 'number', 'enum', 'text', 'group', 'button'].includes(type)
})

const entity_status = computed(() => {
    if (!device.value) {
        return {};
    }

    return device.value.status?.[entity.value.type + ':' + entity.value.properties.id];
});

let eventListener: (() => void) | null = null;
const event = ref(null);
let clearEventTimeout: ReturnType<typeof setTimeout>;
let tempValue: string | number | any = undefined;

watch(device, (dev) => {
    console.log('dev', dev);
});

watch(entity_status, (status) => {
    if (!['number', 'text'].includes(entity.value.type)) {
        return;
    }

    tempValue = status.value;
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

            case 'state': {
                if (entity.value.type !== 'cover') {
                    // skip the state for not covers
                    break;
                }

                tags.push({ text: String(v) });
                break;
            }
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

.box>p {
    @apply text-xs md:text-sm line-clamp-1;
}

.typeIcon {
    font-size: 28px;
    color: white;
    display: absolute;
    top: 50%;
    left: 100%;
}

.image-container {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100%;
}
</style>
