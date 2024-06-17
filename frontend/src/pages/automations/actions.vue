<template>
    <div v-if="loading">
        <span>loading...</span>
    </div>

    <div v-else-if="error">
        <span>Something went wrong</span>
    </div>

    <div v-else-if="actions" class="space-y-2">
        <BasicBlock bordered blurred>
            <div class="flex flex-row flex-nowrap justify-between align-middle items-center font-semibold">
                <p>Actions</p>
                <div class="flex flex-row gap-2">
                    <Button type="blue" size="sm" narrow @click="refresh">
                        <i class="fas fa-refresh" />
                    </Button>
                    <Button v-if="!editMode" type="blue" size="sm" narrow @click="toggleEditMode">
                        <i class="fas fa-pencil" />
                    </Button>
                    <Button v-else type="red" size="sm" narrow @click="toggleEditMode">Exit edit mode</Button>
                </div>
            </div>
        </BasicBlock>

        <EmptyBlock v-if="actions.length == 0">
            <p class="text-xl font-semibold pb-2">No actions found</p>
            <p class="text-sm pb-2">You can add actions from the Devices tab</p>
            <RouterLink to="/devices/devices">
                <Button> Open devices </Button>
            </RouterLink>
        </EmptyBlock>

        <div v-else :class="[small ? 'flex flex-col gap-2' : 'widget-grid']">
            <ActionWidget
                v-for="action in actions"
                :key="action.id"
                :action="action"
                :edit-mode="editMode"
                @click="!editMode && clicked(action)"
                @delete="deleteAction(action)"
            />
        </div>
    </div>
</template>

<script setup lang="ts">
import { ActionBoard } from '@/helpers/components';
import BasicBlock from '@/components/core/BasicBlock.vue';
import Button from '@/components/core/Button.vue';
import EmptyBlock from '@/components/core/EmptyBlock.vue';
import useRegistry from '@/composables/useRegistry';
import { small } from '@/helpers/ui';
import { useRightSideMenuStore } from '@/stores/right-side';
import { action_t } from '@/types';
import { ref, watch } from 'vue';
import ActionWidget from '@/components/widgets/ActionWidget.vue';
import { useToastStore } from '@/stores/toast';

const { data: actions, error, loading, refresh, upload } = useRegistry<action_t[]>('actions', 'rpc');
const rightSideStore = useRightSideMenuStore();

const editMode = ref(false);
const toastStore = useToastStore();

function toggleEditMode() {
    editMode.value = !editMode.value;
}

function clicked(action: action_t) {
    rightSideStore.setActiveComponent(ActionBoard, {
        actionID: action.id,
    });
    return;
}

async function deleteAction(action: action_t) {
    try {
        if (!actions.value) {
            return;
        }
        const index = actions.value.findIndex((act) => act.id === action.id);
        if (index < 0) {
            return;
        }
        actions.value.splice(index, 1);
        await upload();
    } catch (error) {
        toastStore.error('Failed to delete action');
    }
}

watch(loading, () => {
    if (!loading && actions.value == null) {
        actions.value = [];
        upload();
        console.log('setting default actions');
    }
});
</script>
