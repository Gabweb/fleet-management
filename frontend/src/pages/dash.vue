<template>
    <div class="relative overflow-hidden h-screen">
        <TabPageSelector :tabs="tabs" />

        <div class="absolute top-0 right-4">
            <Button narrow size="sm" @click="modal.open = true">
                <span>
                    <i class="fas fa-pencil" />
                </span>
            </Button>
        </div>
        <Modal :visible="modal.open" @close="modal.open = false">
            <template #title>Edit dashboards</template>
            <template #default>
                <div class="flex flex-row gap-2 items-end p-2">
                    <div class="flex-grow">
                        <Input
                            id="username"
                            v-model="modal.name"
                            label="Add Dashboard"
                            type="text"
                            placeholder="My Dashboard"
                        />
                    </div>
                    <div>
                        <Button narrow @click="createDash">Add</Button>
                    </div>
                </div>
            </template>
            <template #footer>
                <div class="flex flex-col gap-2">
                    <span class="font-semibold text-lg">Current dashboards</span>
                    <div
                        v-for="dashboard of sortedDashboards"
                        :key="'dash-id-' + dashboard.id"
                        class="flex flex-row gap-2"
                    >
                        <div class="flex-grow">
                            <Input
                                :id="'dash-' + dashboard.id"
                                v-model="modal.renames[dashboard.id]"
                                :placeholder="dashboard.name"
                                :disabled="dashboard.id == 1"
                            />
                        </div>
                        <Button
                            narrow
                            type="blue"
                            :disabled="dashboard.id == 1"
                            @click="renameDash(Number(dashboard.id), modal.renames[dashboard.id])"
                        >
                            <i class="fas fa-save" />
                        </Button>
                        <Button narrow type="red" :disabled="dashboard.id == 1" @click="deleteDash(dashboard)">
                            <i class="fas fa-trash" />
                        </Button>
                    </div>
                </div>
            </template>
        </Modal>
    </div>
</template>

<script setup lang="ts">
import Button from '@/components/core/Button.vue';
import Input from '@/components/core/Input.vue';
import TabPageSelector from '@/components/core/TabPageSelector.vue';
import Modal from '@/components/modals/Modal.vue';
import useRegistry from '@/composables/useRegistry';
import useUiRegistry from '@/composables/useUiRegistry';
import useWsRpc from '@/composables/useWsRpc';
import { useToastStore } from '@/stores/toast';
import { getRegistry, sendRPC } from '@/tools/websocket';
import { dashboard_t } from '@/types';
import { computed, reactive, ref, watch } from 'vue';
import { useRouter } from 'vue-router/auto';

const { data, upload, refresh } = useUiRegistry<dashboard_t>('dashboards');
const toast = useToastStore();

const sortedDashboards = computed<dashboard_t[]>(() => {
    if (!data.value) return [];
    return Object.values(data.value);
});

const modal = reactive({
    open: false,
    name: '',
    renames: {} as Record<number | string, string>,
});

const tabs = ref<[string, string][]>([]);

watch(
    data,
    (newData) => {
        for (const id in data) {
            modal.renames[id] = (data as any)[id].name;
        }
        if (!newData || Object.values(newData).length === 0) {
            tabs.value = [];
        } else {
            tabs.value = Object.values(newData)
                .sort((a, b) => Number(a.id) - Number(b.id))
                .map(({ id, name }) => [name, `/dash/${id}`] as [string, string]);
        }
    },
    { immediate: true }
);

const router = useRouter();

async function createDash() {
    if (modal.name.length < 1) {
        return;
    }

    if (!data.value) {
        return;
    }



    const newDash = {
        name: modal.name,
        items: [],
    };

    try {
        await getRegistry('ui').setItem('dashboards', newDash);
        await getDashboards();
        const all = Object.values(data.value);
        const nextId = data.value[all.length - 1].id;

        router.replace({
            name: '/dash/[id]',
            params: { id: nextId },
        });
    } catch (error) {
        toast.error('Cannot create ' + modal.name);
    }

    modal.open = false;
    modal.name = '';
}

async function deleteDash(dash: dashboard_t) {
    if (!data.value) return;
    try {
        let result = await getRegistry('ui').removeItem('dashboards', {id:dash.id});
        await getDashboards();
        router.push({
            name: '/dash/[id]',
            params: {
                id: 1,
            },
        });
        delete data.value[dash.id];
        toast.success('Successfully deleted ' + dash.name);
    } catch (error) {
        toast.error('Cannot delete ' + dash.name);
    }
}

async function renameDash(id: number, newName: string) {
    if (!id || !newName) {
        toast.error('Invalid name');
        return;
    }
    await getRegistry('ui').setItem('dashboards', { id,name: newName, item: [] });
    await getDashboards();
}

async function getDashboards() {
    return await getRegistry('ui')
        .getItem('dashboards')
        .then((response: any) => {
            data.value = response;
        })
        .catch((error) => {
            console.error('Error fetching dashboards:', error);
            return {};
        });
}
</script>
