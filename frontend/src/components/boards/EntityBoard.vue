<template>
    <BoardTabs v-if="entity && device" @back="openDevice(entity.source)">
        <template #title>
            <span class="text-lg font-semibold line-clamp-2">{{ entity.name }}</span>
        </template>
        <template #default>
            <div class="mt-3">
                <div class="flex flex-col gap-3 items-center">
                    <figure
                        class="image rounded-full border w-28 h-28"
                        :class="[
                            device.online && 'border-gray-300',
                            !device.online && 'border-red-800',
                            device.loading && 'border-yellow-800',
                        ]"
                    >
                        <img :src="getLogoFromModel(device.info?.model)" alt="Shelly" class="w-full h-full p-[6px]" />
                    </figure>
                    <div class="flex flex-col gap-1 items-center">
                        <span class="text-gray-400 text-sm"> {{ entity.type }} - {{ device.info?.app }} </span>
                    </div>

                    <div v-if="device.loading">
                        <div class="flex justify-around">
                            <Spinner />
                        </div>
                        <div class="text-center font-semibold text-yellow-600 mt-2 animate-bounce">
                            <span>Loading</span>
                        </div>
                    </div>

                    <div v-if="!device.online" class="text-center font-semibold text-red-600">
                        <span>Offline</span>
                    </div>

                    <div class="w-full flex flex-col gap-2">
                        <!-- Additional blocks for components -->
                        <EntityEM v-if="entity.type === 'em'" :entity="entity as em_entity" />
                        <EntityWidget vertical :entity="entity" />
                        <ColorWheel
                            v-if="/rgbw?/i.test(entity.type) && device.online"
                            :rgb="entityStatus.rgb"
                            @change="rgbChange"
                        />
                        <HorizontalSlider
                            v-if="entity.type === 'rgbw' && device.online"
                            :value="entityStatus.white"
                            @change="whiteChange"
                        >
                            <template #title> White ({{ entityStatus.white }}) </template>
                        </HorizontalSlider>
                        <HorizontalSlider
                            v-if="/(rgbw?|light|cct)/i.test(entity.type) && device.online"
                            :value="entityStatus.brightness"
                            :saved="{ '0%': 0, '25%': 25, '50%': 50, '75%': 75, '100%': 100 }"
                            @change="brightnessChange"
                        >
                            <template #title> Brightness ({{ entityStatus.brightness }}%) </template>
                        </HorizontalSlider>

                        <CoverPosition
                            v-if="entity.type === 'cover' && device.online"
                            :position="entityStatus.current_pos"
                            :calibrated="entityStatus.pos_control"
                            :favorites="(entity as cover_entity).properties.favorites"
                            @change="positionChange"
                        />
                    </div>
                </div>
            </div>
        </template>
        <template #debug>
            <Collapse v-if="device.online" title="Entity" class="w-full">
                <Input v-model="newName" label="Entity name" />
                <Button class="mt-2 w-full" @click="saveNewName"> Save </Button>
            </Collapse>

            <Collapse title="Info">
                <JSONViewer :data="entity as any" />
            </Collapse>

            <Collapse title="Status">
                <JSONViewer :data="device.status[statusKey]" />
            </Collapse>

            <Collapse title="Settings">
                <JSONViewer :data="device.settings[statusKey]" />
            </Collapse>
        </template>
    </BoardTabs>

    <div v-else class="p-4 text-center">
        <span>Entity not found</span>
    </div>
</template>

<script setup lang="ts">
import { computed, ref, toRef } from 'vue';
import { getLogoFromModel } from '@/helpers/device';
import { useEntityStore } from '@/stores/entities';
import { useToastStore } from '@/stores/toast';
import { cover_entity, em_entity, entity_t } from '@/types';
import EntityWidget from '@/components/widgets/EntityWidget.vue';
import Collapse from '@/components/core/Collapse.vue';
import Input from '@/components/core/Input.vue';
import Button from '@/components/core/Button.vue';
import { DeviceBoard } from '@/helpers/components';
import { useRightSideMenuStore } from '@/stores/right-side';
import Spinner from '../core/Spinner.vue';
import { useDevicesStore } from '@/stores/devices';
import ColorWheel from '@/components/core/ColorWheel.vue';
import HorizontalSlider from '@/components/core/HorizontalSlider.vue';
import CoverPosition from '@/components/core/Cover/CoverPosition.vue';
import BoardTabs from './BoardTabs.vue';
import JSONViewer from '../JSONViewer.vue';
import EntityEM from '../core/Meters/EntityEM.vue';

type props_t = { entity: entity_t };

const props = defineProps<props_t>();
const entity = toRef(props, 'entity');

const newName = ref(entity.value.name);

const entityStore = useEntityStore();
const toastStore = useToastStore();
const deviceStore = useDevicesStore();
const rightSideStore = useRightSideMenuStore();

const device = computed(() => deviceStore.devices[entity.value.source]);
const entityStatus = computed(() => device.value?.status?.[entity.value.type + ':' + entity.value.properties.id]);

const statusKey = computed(() => {
    if (entity.value.properties.id != undefined) {
        return `${entity.value.type}:${entity.value.properties.id}`;
    }

    return entity.value.type;
});

async function saveNewName() {
    try {
        await entityStore.sendRPC(entity.value.id, entity.value.type + '.setconfig', {
            config: { name: newName.value },
        });
        entityStore.updateEntity(entity.value.id);
    } catch (error) {
        toastStore.error('Failed to rename entity');
        console.error(error);
    }
}

function openDevice(source: string) {
    rightSideStore.setActiveComponent(DeviceBoard, { shellyID: source });
}

function setValue(componentType: string, propName: string, value: any, method: string = 'set') {
    deviceStore.sendRPC(device.value.shellyID, `${componentType}.${method}`, {
        id: entity.value.properties.id,
        [propName]: value,
    });
}

function rgbChange(rgb: [number, number, number]) {
    setValue(entity.value.type, 'rgb', rgb);
}

function whiteChange(value: number) {
    setValue('rgbw', 'white', value);
}

function brightnessChange(value: number) {
    setValue(entity.value.type, 'brightness', value);
}

function positionChange(value: number) {
    setValue(entity.value.type, 'pos', value, 'GoToPosition');
}
</script>
