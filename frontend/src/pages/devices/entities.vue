<template>
    <InfiniteGridScrollPage :page="page" :total-pages="totalPages" :items="items" :loading="loading"
        customClass="widget-grid-entities" @load-items="loadItems">
        <template #header>
            <BasicBlock bordered blurred class="relative z-10 mb-2">
                <div class="flex flex-col gap-3">
                    <div class="flex flex-col md:flex-row gap-2 items-center justify-between">
                        <div class="flex flex-1 flex-row flex-wrap gap-2 items-center">
                            <div class="flex items-center gap-2 min-w-[200px] flex-1 max-w-md">
                                <Input v-model="nameFilter" placeholder="Search" clear class="w-full" />
                                <Button :type="hasFiltersFromModal ? 'red' : 'blue'" size="sm" narrow @click="filterVisible = true">
                                    <i class="fas fa-filter" />
                                </Button>
                            </div>
                            <div class="flex flex-wrap items-center gap-2">
                                <span
                                    v-for="([key, value]) in activeFilterPillsEntries"
                                    :key="key"
                                    class="pill bg-gray-200 text-gray-800 rounded-full px-2 py-1 text-sm flex items-center gap-1"
                                >
                                    {{ key === 'online' ? (value ? 'Online' : 'Offline') : value }}
                                    <button @click="clearPill(key as 'type' | 'online')" class="focus:outline-none">×</button>
                                </span>
                            </div>
                        </div>
                    </div>
                    <div class="flex flex-row gap-2 items-baseline justify-center">
                        <span class="w-full font-bold size-3">{{ entitiesCalculation }}</span>
                    </div>
                </div>
            </BasicBlock>
            <EntityFilter
                v-model="filterVisible"
                :filters="activeFilterPills"
                :key="JSON.stringify(activeFilterPills)"
                @setFilters="setActiveFilters"
                @entities="setEntities"
            />
        </template>

        <template #default="{ item: entity, small }">
            <EntityWidget vertical :key="entity.id" :entity="entity" :selected="activeEntityId == entity.id"
                class="hover:cursor-pointer" @click="clicked(entity)" />
        </template>
        <template #empty>
            <EmptyBlock v-if="Object.keys(deviceStore.devices).length == 0">
                <p class="text-xl font-semibold pb-2">No devices found</p>
                <p class="text-sm pb-2">Connect Shelly devices via their outbound websocket.</p>
            </EmptyBlock>
        </template>
    </InfiniteGridScrollPage>
</template>

<script setup lang="ts">
import BasicBlock from '@/components/core/BasicBlock.vue';
import Dropdown from '@/components/core/Dropdown.vue';
import Input from '@/components/core/Input.vue';
import EntityWidget from '@/components/widgets/EntityWidget.vue';
import { useEntityStore } from '@/stores/entities';
import { useRightSideMenuStore } from '@/stores/right-side';
import { entity_t } from '@/types';
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue';
import { EntityBoard } from '@/helpers/components';
import { useDevicesStore } from '@/stores/devices';
import useInfiniteScroll from '@/composables/useInfiniteScroll';
import InfiniteGridScrollPage from '@/components/pages/InfiniteGridScrollPage.vue';
import EmptyBlock from '@/components/core/EmptyBlock.vue';
import Button from '@/components/core/Button.vue';
import EntityFilter from '@/components/modals/EntityFilter.vue';
import { useEntityFiltering } from '@/composables/useEntityFiltering';

const entityStore = useEntityStore();
const rightSideStore = useRightSideMenuStore();
const deviceStore = useDevicesStore();

const nameFilter = ref('');
const activeEntityId = ref<string>();
const filterVisible = ref(false);

const defaultFilters = { type: 'All entities', online: null as boolean | null };
const activeFilterPills = reactive({ ...defaultFilters });

const entityList = computed(() => Object.values(entityStore.entities));
const filtered = ref<entity_t[]>([]);

const showEntities = computed(() => {
    return filtered.value.filter(e => {
        if (!nameFilter.value) return true;
        return e.name.toLowerCase().includes(nameFilter.value.toLowerCase());
    });
});

const { items, page, totalPages, loading, loadItems } = useInfiniteScroll(showEntities);

const entitiesCalculation = computed(() => {
    const total = Object.values(entityStore.entities).length;
    const online = Object.values(deviceStore.devices).filter((d) => d.online).length;
    const filteredCount = showEntities.value.length;
    return filteredCount !== total
        ? `Showing ${filteredCount}/${total} entities`
        : `Total ${total} entities`;
});

const hasFiltersFromModal = computed(() => showEntities.value.length !== Object.values(entityStore.entities).length);

const activeFilterPillsEntries = computed(() =>
    Object.entries(activeFilterPills).filter(([key, value]) =>
        key === 'type' ? value !== defaultFilters.type :
        key === 'online' ? value !== null : false
    )
);

function setActiveFilters(filters: typeof activeFilterPills) {
    Object.assign(activeFilterPills, filters);
}

function clearPill(key: 'type' | 'online') {
    if (key === 'type') activeFilterPills.type = defaultFilters.type;
    if (key === 'online') activeFilterPills.online = defaultFilters.online;
    const { filtered: f } = useEntityFiltering(entityList.value, activeFilterPills);
    setEntities(f.value);
}

function setEntities(entities: entity_t[]) {
    filtered.value = entities;
}

function clicked(entity: entity_t) {
    rightSideStore.setActiveComponent(EntityBoard, { entity });
    activeEntityId.value = entity.id;
}

onUnmounted(() => {
    rightSideStore.clearActiveComponent();
});

onMounted(() => {
    if (entityList.value.length > 0) {
        const { filtered: f } = useEntityFiltering(entityList.value, activeFilterPills);
        filtered.value = f.value;
    }
});


watch(
  () => entityList.value.length,
  (length) => {
    if (length > 0 && filtered.value.length === 0) {
      const { filtered: f } = useEntityFiltering(entityList.value, activeFilterPills);
      filtered.value = f.value;
    }
  }
);

</script>
