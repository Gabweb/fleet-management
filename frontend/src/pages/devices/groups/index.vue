<template>
    <div class="space-y-2">
        <BasicBlock blurred bordered>
            <div class="flex flex-row flex-nowrap gap-2 justify-between align-middle items-center">
                <p class="font-semibold">Groups</p>
                <div>
                    <Button size="sm" type="blue" class="mr-2" narrow @click="openCreateGroupModal"
                        ><i class="fas fa-plus"
                    /></Button>
                    <Button v-if="!editMode" size="sm" type="blue" narrow @click="editMode = true"
                        ><i class="fas fa-pencil"
                    /></Button>
                    <Button v-else size="sm" type="red" narrow @click="editMode = false">Exit edit mode</Button>
                </div>
            </div>
        </BasicBlock>

        <div
            v-if="Object.keys(groups).length > 0"
            class="mt-2"
            :class="[small ? 'flex flex-col gap-2' : 'widget-grid']"
        >
            <GroupWidget
                v-for="group of groups"
                :key="group.id"
                :name="group.name"
                :members="group.devices"
                :vertical="small"
                class="hover:cursor-pointer"
                @click="!editMode && groupClicked(group.id)"
            >
                <template v-if="editMode" #widget-action>
                    <Button type="red" @click="deleteGroup(group.id)">Delete</Button>
                </template>
            </GroupWidget>
        </div>

        <EmptyBlock v-else>
            <p class="text-xl font-semibold pb-2">No groups found</p>
            <p class="text-sm pb-2">Groups are a collection of devices. Create one by clicking the button below</p>
            <Button type="blue" @click="openCreateGroupModal">Create a group</Button>
        </EmptyBlock>

        <!-- Modal for creating -->
        <Modal :visible="isCreateGroupModalActive" @close="isCreateGroupModalActive = false">
            <template #title>
                <p class="text-2xl font-semibold">Create Group</p>
            </template>
            <template #default>
                <Input v-model="newGroupName" label="Group name" type="text" placeholder="Enter group name" />
            </template>
            <template #footer>
                <div class="flex flex-row gap-2">
                    <Button type="red" @click="isCreateGroupModalActive = false">Cancel</Button>
                    <Button type="blue" class="mr-2" @click="handleCreateGroup">Next</Button>
                </div>
            </template>
        </Modal>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import * as ws from '@/tools/websocket';
import Modal from '@/components/modals/Modal.vue';
import { useRouter } from 'vue-router/auto';
import BasicBlock from '@/components/core/BasicBlock.vue';
import Input from '@/components/core/Input.vue';
import { useToastStore } from '@/stores/toast';
import { useGroupsStore } from '@/stores/groups';
import { storeToRefs } from 'pinia';
import GroupWidget from '@/components/widgets/GroupWidget.vue';
import Button from '@/components/core/Button.vue';
import EmptyBlock from '@/components/core/EmptyBlock.vue';
import { small } from '@/helpers/ui';

const isCreateGroupModalActive = ref(false);
const newGroupName = ref('');
const toast = useToastStore();
const editMode = ref(false);

const router = useRouter();
const groupStore = useGroupsStore();

const { groups } = storeToRefs(groupStore);

function groupClicked(id: number) {
    router.push({
        name: '/devices/groups/[id]',
        params: {
            id,
        },
    });
}

function openCreateGroupModal() {
    isCreateGroupModalActive.value = true;
}

function deleteGroup(id: number) {
    ws.sendRPC('FLEET_MANAGER', 'group.delete', { id }).then(() => {
        toast.info(`Group '${id}' has been deleted.`);
        groupStore.fetchGroups();
    });
}

onMounted(() => {
    groupStore.fetchGroups();
});

async function handleCreateGroup() {
    if (newGroupName.value) {
        try {
            await ws.sendRPC('FLEET_MANAGER', 'group.create', {
                name: newGroupName.value,
            });
            isCreateGroupModalActive.value = false;
            newGroupName.value = '';
            groupStore.fetchGroups();
        } catch (err: any) {
            toast.error(err?.message ?? 'Error creating the group');
        }
    } else {
        toast.error('Group name cannot be empty.');
    }
}
</script>

<style scoped>
.modal-background {
    width: 100vw;
    height: 100vh;
    background-color: rgba(1, 1, 1, 0.7);
    position: fixed;
    top: 0;
    left: 0;
    z-index: 998;
}

.modal-card {
    z-index: 999;
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    @apply bg-slate-800 p-4 rounded-md;
}
</style>
