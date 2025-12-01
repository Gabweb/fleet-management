import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import { useDevicesStore } from '@/stores/devices';
import type { entity_t } from '@/types';

export function useEntityFiltering(
  entities: entity_t[],
  filters: { online: boolean | null; type: string }
) {
  const deviceStore = useDevicesStore();
  const { devices } = storeToRefs(deviceStore);

  const filtered = computed(() => {
    return entities.filter((e) => {
      // online
      if (filters.online !== null) {
        const device = devices.value[e.source];
        if (device && device.online !== filters.online) return false;
      }

      // type
      if (filters.type !== 'All entities') {
        const lowercase = filters.type.toLowerCase();

        switch (lowercase) {
          case 'switch':
            if (e.type !== 'switch') return false;
            break;
          case 'light':
            if (e.type !== 'light') return false;
            break;
          case 'input':
            if (e.type !== 'input') return false;
            break;
          case 'temperature':
            if (e.type !== 'temperature') return false;
            break;
          case 'energy meter':
            if (!['em', 'em1'].includes(e.type)) return false;
            break;
          case 'blu sensor':
            if (!['bthomesensor', 'bthomedevice'].includes(e.type)) return false;
            break;
          case 'virtual component':
            if (!['boolean', 'number', 'enum', 'text', 'group', 'button'].includes(e.type)) return false;
            break;
          default:
            if (e.type.toLowerCase() !== lowercase) return false;
        }
      }

      return true;
    });
  });

  return { filtered };
}
