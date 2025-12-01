<template>
  <Widget
    :selected="selected"
    :vertical="vertical"
    class="relative"
    :class="[device.state === 'open' ? '!bg-red-900/60' : '!bg-green-900/30', 'backdrop-blur']"
  >
    <template #image>
      <img
        v-lazyload
        class="rounded-full mx-auto mb-2"
        :data-url="getLogo(device)"
        @error="handleImgError"
        alt="Sensor"
      />
    </template>

    <template #upper-corner>
      <span class="text-[11px] font-semibold flex items-center gap-1">
        <i class="fas fa-door-open" />
        {{ displayLabel }}
      </span>
    </template>

    <template #upper-right-corner>
      <span
        class="absolute top-0 right-0 bg-black/60 text-[11px] text-white rounded-bl-lg py-[2px] px-[6px] flex items-center z-10"
      >
        <i class="fas fa-battery-half mr-1" />
        {{ device.battery != null ? device.battery + '%' : '–' }}
      </span>
    </template>

    <template #name>
      <span class="text-sm font-bold line-clamp-2">{{ device.name }}</span>
    </template>

    <template #description>
      <span
        v-if="device.kind === 'door_window'"
        class="text-xs font-semibold"
        :class="device.state === 'open' ? 'text-red-500' : 'text-green-600'"
      >
        {{ device.state === 'open' ? 'Open' : 'Closed' }}
      </span>

      <span
        v-else-if="device.kind === 'motion_sensor'"
        class="text-xs font-semibold"
        :class="device.state === 'open' ? 'text-red-500' : 'text-green-600'"
      >
        {{ device.state === 'open'
           ? 'Movement detected'
           : 'No movement detected' }}
      </span>

      <span v-else class="text-xs text-gray-400 italic">
        {{ device.kind === 'button'
           ? 'Button'
           : 'Remote Controller' }}
      </span>
    </template>
  </Widget>
</template>

<script setup lang="ts">
import Widget from '@/components/widgets/WidgetsTemplates/VanilaWidget.vue';
import { useSensorsStore, type SensorDevice } from '@/stores/sensors';

const props = defineProps<{
  device: SensorDevice;
  vertical?: boolean;
  selected?: boolean;
}>();

const { getLogo } = useSensorsStore();

function handleImgError(e: any) {
  e.target.src = '/shelly_logo_black.jpg';
}

const displayLabel = {
  door_window:       'Door / Window',
  button:            'Button',
  remote_controller: 'Remote Controller',
  motion_sensor:     'Motion Sensor',
}[props.device.kind];
</script>
