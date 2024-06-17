import { defineStore } from 'pinia';
import * as ws from '../tools/websocket';
import { ref } from 'vue';

export const useGroupsStore = defineStore('groups', () => {
    const groups = ref<
        Record<
            number,
            {
                id: number;
                name: string;
                devices: string[];
            }
        >
    >({});

    async function fetchGroups() {
        groups.value = await ws.sendRPC('FLEET_MANAGER', 'group.list');
    }

    // run on setup
    fetchGroups();

    return {
        groups,
        fetchGroups,
    };
});
