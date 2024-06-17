<template>
    <div class="space-y-2">
        <BasicBlock bordered blurred class="relative z-10">
            <div class="flex flex-row gap-2 items-center justify-between">
                <div class="flex flex-row gap-2 items-baseline">
                    <span class="font-bold">All entities</span>
                    <Input v-model="nameFilter" class="max-w-sm hidden md:block" placeholder="Search" />
                </div>
            </div>

            <div class="flex flex-col [&>*]:w-full md:w-auto md:flex-row gap-2 items-baseline relative mt-4 md:mt-2">
                <Input v-model="nameFilter" class="w-full md:hidden" placeholder="Search" />
                <Dropdown
                    :options="['All Devices', 'Online', 'Offline']"
                    :icons="['', 'fas fa-wifi']"
                    @selected="onlineFilterSelected"
                />
                <Dropdown
                    :options="typeFilter.options"
                    :icons="[
                        'fa-microchip',
                        'fa-power-off',
                        'fa-power-off',
                        'fa-arrow-right',
                        'fa-thermometer-half',
                        'fa-bolt',
                        'fa-thermometer-half',
                    ]"
                    @selected="typeSelected"
                />
            </div>
        </BasicBlock>

        <EmptyBlock v-if="Object.keys(entityStore.entities).length == 0">
            <p class="text-xl font-semibold pb-2">No entities found</p>
            <p class="text-sm pb-2">Try adding Shelly devices to Fleet Manager to explore their capabilities.</p>
        </EmptyBlock>

        <main v-else>
            <EmptyBlock v-if="entities.length == 0">
                <p class="text-xl font-semibold pb-2">No entities found</p>
                <p class="text-sm pb-2">Try changing you search parameters.</p>
                <Button type="blue" @click="nameFilter = ''">Reset search</Button>
            </EmptyBlock>
            <Pagination store="entities" class="my-2" :items="entities">
                <template #default="{ items }">
                    <div :class="[small ? 'flex flex-col gap-2' : 'widget-grid']">
                        <EntityWidget
                            v-for="entity in items"
                            :key="entity.id"
                            :vertical="small"
                            :entity="entity"
                            :selected="activeEntityId == entity.id"
                            class="hover:cursor-pointer"
                            @click="clicked(entity)"
                        />
                    </div>
                </template>
            </Pagination>
        </main>
    </div>
</template>

<script setup lang="ts">
import BasicBlock from '@/components/core/BasicBlock.vue';
import Button from '@/components/core/Button.vue';
import Dropdown from '@/components/core/Dropdown.vue';
import EmptyBlock from '@/components/core/EmptyBlock.vue';
import Input from '@/components/core/Input.vue';
import EntityWidget from '@/components/widgets/EntityWidget.vue';
import { useEntityStore } from '@/stores/entities';
import { useRightSideMenuStore } from '@/stores/right-side';
import { entity_t } from '@/types';
import { computed, onUnmounted, reactive, ref } from 'vue';
import { EntityBoard } from '@/helpers/components';
import { small } from '@/helpers/ui';
import Pagination from '@/components/core/Pagination.vue';
import { isDiscovered } from '@/helpers/device';
import { useDevicesStore } from '@/stores/devices';

const entityStore = useEntityStore();
const rightSideStore = useRightSideMenuStore();

const entities = computed(() => Object.values(entityStore.entities).filter((entity) => filterEntity(entity)));

const typeFilter = reactive({
    options: ['All entities', 'Switch', 'Light', 'Input', 'Temperature', 'Energy Meter', 'BLU Sensor'],
    selected: 'All entities',
});

const nameFilter = ref('');
const onlineFilter = ref<boolean>();
const activeEntityId = ref<string>();
const deviceStore = useDevicesStore();

function typeSelected(type: string) {
    typeFilter.selected = type;
}

function onlineFilterSelected(val: string) {
    if (val === 'Online') {
        onlineFilter.value = true;
    } else if (val === 'Offline') {
        onlineFilter.value = false;
    } else {
        onlineFilter.value = undefined;
    }
}

function filterEntity(entity: entity_t) {
    if (isDiscovered(entity.source)) {
        return false;
    }

    if (typeFilter.selected !== 'All entities') {
        const lowercase = typeFilter.selected.toLowerCase();

        if (lowercase === 'energy meter') {
            return ['em', 'em1'].includes(entity.type);
        }

        if (typeFilter.selected.toLowerCase() !== entity.type) {
            return false;
        }
    }

    if (nameFilter.value.length > 1) {
        if (!entity.name.toLowerCase().includes(nameFilter.value.toLowerCase())) {
            return false;
        }
    }

    if (typeof onlineFilter.value === 'boolean') {
        const device = deviceStore.devices[entity.source];
        if (device) {
            if (onlineFilter.value) {
                // check if matches online state
                if (!device.online) return false;
            } else {
                // check if matches offline state
                if (device.online) return false;
            }
        }
    }

    return true;
}

function clicked(entity: entity_t) {
    rightSideStore.setActiveComponent(EntityBoard, { entity });
    activeEntityId.value = entity.id;
}

onUnmounted(() => {
    rightSideStore.clearActiveComponent();
});
</script>
