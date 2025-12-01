import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import { useGroupsStore } from '@/stores/groups';
import type { shelly_device_t } from '@/types';

export function useDeviceFiltering(
  devices: shelly_device_t[],
  filters: { online: boolean | null; type: string; group: string }
) {
  const groupStore = useGroupsStore();
  const { groups } = storeToRefs(groupStore);

  const filtered = computed(() => {
    return devices.filter(d => {
      // online
      if (filters.online !== null && d.online !== filters.online) {
        return false;
      }

      // type
      if (filters.type !== 'All devices' && d.info?.app !== filters.type) {
        return false;
      }

      // group
      if (filters.group !== 'All groups') {
        const grp = Object
          .values(groups.value)
          .find(g => g.name === filters.group);
        if (!grp || !grp.devices.includes(d.shellyID)) {
          return false;
        }
      }

      return true;
    });
  });

  return { filtered };
}
