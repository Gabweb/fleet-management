<template>
    <div>
        <div class="flex flex-row gap-1 items-center">
            <div v-for="(entries, index) of phasesInfo" :key="index">
                <div
                    v-for="[name, value, unit] of entries"
                    :key="name"
                    class="flex flex-col items-center bg-gray-800 p-2 rounded-lg m-1"
                >
                    <span class="text-base font-bold">{{ value }} {{ unit ?? '' }}</span>
                    <span class="text-xs text-gray-500 text-center">{{ name }}</span>
                </div>
            </div>
        </div>

        <div v-if="neutralCurrent !== null" class="flex flex-col items-center bg-gray-800 p-2 rounded-lg m-1">
            <span class="text-base font-bold">{{ neutralCurrent }}</span>
            <span class="text-xs text-gray-500 text-center">Neutral current</span>
        </div>

        <div class="flex items-start">
            <h6 class="mt-1 font-bold">Total</h6>
        </div>
        <div
            v-for="[name, value, unit] of totalsInfo"
            :key="name"
            class="flex flex-col items-center bg-gray-800 p-2 rounded-lg m-1"
        >
            <span class="text-base font-bold">{{ value }} {{ unit ?? '' }}</span>
            <span class="text-xs text-gray-500 text-center">{{ name }}</span>
        </div>
    </div>
</template>

<script setup lang="ts">
import { useDevicesStore } from '@/stores/devices';
import { em_entity } from '@/types';
import { toRefs, computed } from 'vue';

const ALL_PHASES = ['a', 'b', 'c'] as const;

const props = defineProps<{
    entity: em_entity;
}>();

const { entity } = toRefs(props);

const deviceStore = useDevicesStore();

const device = computed(() => deviceStore.devices[entity.value.source]);
const entityStatus = computed(() => device.value?.status?.[entity.value.type + ':' + entity.value.properties.id]);

const phasesInfo = computed(() =>
    ALL_PHASES.map((phase) => {
        const isUserCalibrated = entityStatus.value.user_calibrated_phase.includes(phase);
        // mark the phase if it is calibrated by the user
        const name = `${phase.toUpperCase()}${isUserCalibrated ? '*' : ''}`;

        return [
            ['Phase', name],
            ['Active power', entityStatus.value[`${phase}_act_power`], 'W'],
            ['Apparent power', entityStatus.value[`${phase}_aprt_power`], 'W'],
            ['Current', entityStatus.value[`${phase}_current`], 'A'],
            ['Voltage', entityStatus.value[`${phase}_voltage`], 'V'],
            // ['Frequency', entityStatus.value[`${phase}_freq`], 'Hz'],
            ['PF', entityStatus.value[`${phase}_pf`]],
        ];
    })
);

const totalsInfo = computed(() => {
    return [
        ['Active power', entityStatus.value.total_act_power, 'W'],
        ['Apparent power', entityStatus.value.total_aprt_power, 'W'],
        ['Current', entityStatus.value.total_current, 'A'],
    ];
});

const neutralCurrent = computed(() => {
    if (entityStatus.value.user_calibrated_phase.includes('n')) {
        return `${entityStatus.value.n_current ?? 'N/A'} A`;
    }
    return null;
});
</script>
