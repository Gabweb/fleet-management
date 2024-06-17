<template>
    <div class="relative">
        <TabPageSelector :tabs="tabs" />
        <div class="absolute top-0 right-4">
            <Button narrow size="sm" @click="modal.open = true">
                <span>
                    <i class="fas fa-pencil" />
                </span>
            </Button>
        </div>
        <Modal :visible="modal.open" @close="modal.open = false">
            <template #title> Edit dashboards </template>
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
                        v-for="dashboard in sortedDashboards"
                        :key="'dash-id-' + dashboard.id"
                        class="flex flex-row gap-2"
                    >
                        <div class="flex-grow">
                            <Input
                                :id="'dash-' + dashboard.id"
                                v-model="modal.renames[dashboard.id]"
                                :disabled="dashboard.id == -1"
                            />
                        </div>
                        <Button
                            narrow
                            type="blue"
                            :disabled="dashboard.id == -1"
                            @click="renameDash(dashboard.id, modal.renames[dashboard.id])"
                        >
                            <i class="fas fa-save" />
                        </Button>
                        <Button narrow type="red" :disabled="dashboard.id == -1" @click="deleteDash(dashboard)">
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
import useUiRegistry from '@/composables/useUiRegistry';
import { useToastStore } from '@/stores/toast';
import { dashboard_t } from '@/types';
import { computed, reactive, watch } from 'vue';
import { useRouter } from 'vue-router/auto';

const { data, upload, refresh } = useUiRegistry<dashboard_t>('dashboards');
const toast = useToastStore();

const sortedDashboards = computed(() => {
    if (!data.value) return [];
    return Object.values(data.value).sort((a, b) => a.id - b.id);
});

const modal = reactive({
    open: false,
    name: '',
    renames: {} as Record<number | string, string>,
});

const router = useRouter();

watch(data, (data) => {
    if (!data || Object.keys(data).length == 0) {
        modal.name = 'My Dashboard';
        createDash();
        return;
    }

    for (const id in data) {
        modal.renames[id] = data[id].name;
    }
});

async function createDash() {
    if (modal.name.length < 1) {
        return;
    }

    if (!data.value) {
        return;
    }

    const ids = [
        0, // Math.max with empty array is -Infinity
        ...Object.keys(data.value).map(Number),
    ];
    const nextId = Math.max(...ids) + 1;

    data.value[nextId] = {
        name: modal.name,
        id: nextId,
        items: [],
    } satisfies dashboard_t;

    try {
        await upload();
        router.push({
            name: '/dash/[id]',
            params: { id: nextId },
        });
    } catch (error) {
        toast.error('Cannot create ' + modal.name);
    }

    modal.open = false;
    modal.name = '';
    refresh();
}

async function deleteDash(dash: dashboard_t) {
    if (!data.value) return;
    delete data.value[dash.id];

    try {
        await upload();
        modal.open = false;
        modal.name = '';
        await refresh();
        router.push({
            name: '/dash/[id]',
            params: {
                id: -1,
            },
        });
        toast.success('Successfully deleted ' + dash.name);
    } catch (error) {
        toast.error('Cannot delete ' + dash.name);
    }
}

async function renameDash(id: number, newName: string) {
    if (!data.value?.[id]) {
        return;
    }
    data.value[id].name = newName;
    await upload();
    refresh();
}

// [name, path]
const tabs = computed<[string, string][]>(() => {
    if (!data.value || Object.keys(data.value).length == 0) return [['My Dashboard', '/dash/-1']];
    return Object.entries(data.value)
        .sort((a, b) => Number(a[0]) - Number(b[0]))
        .map(([id, data]) => [data.name, '/dash/' + id]);
});
</script>
