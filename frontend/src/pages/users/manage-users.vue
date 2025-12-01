<template>
    <div v-if="hasAccess" class="space-y-2">
        <BasicBlock darker title="Manage users">
            <div class="flex flex-row justify-between">
                <div class="border-red-500"></div>
                <div class="border-red-500">
                    <Button narrow @click="openCreateModal()">Add</Button>
                </div>
            </div>
        </BasicBlock>
        <BasicBlock v-if="users" darker title="Registered users">
            <div class="overflow-x-auto">
                <table class="min-w-full divide-y-2 divide-gray-200 text-sm">
                    <thead class="ltr:text-left rtl:text-right">
                        <tr>
                            <th>ID</th>
                            <th>Username</th>
                            <th>Full Name</th>
                            <th>Email</th>
                            <th>Role</th>
                            <th>Enabled</th>
                            <th>Created</th>
                            <th class="px-4 py-2"></th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-200">
                        <tr v-for="user in users" :key="user.username">
                            <td>{{ user.id }}</td>
                            <td>{{ user.name }}</td>
                            <td>{{ user.full_name }}</td>
                            <td>{{ user.email }}</td>
                            <td>{{ user.group }}</td>
                            <td>{{ user.enabled ? 'Enabled':'Disabled' }}</td>
                            <td>{{ humanDate(user.created) }}</td>
                            <td class="flex flex-row justify-center gap-4">
                                <Button narrow @click="openSideMenu(user)">View</Button>
                                <Button narrow @click="openEditModal(user)">Edit</Button>
                                <Button type='red' @click="() => handleDelete(user)">Delete</Button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </BasicBlock>
        <div v-if="active" class="fixed top-0 left-0 w-screen h-screen bg-gray-950/70 z-10" @click="bgClicked" />
        <template v-if="editUser">
            <EditUser :type="modalType" v-bind="editUser" @close="modalClosed" />
        </template>
        <ConfirmationModal secured ref='modalRef' footer>
            <template #title>
                <h1>Are you sure you want to delete this user?</h1>
            </template>
        </ConfirmationModal>
    </div>
    <div v-else class="text-center text-lg font-semibold text-red-500 mt-10">
        ACCESS RESTRICTED
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import BasicBlock from '@/components/core/BasicBlock.vue';
import Button from '@/components/core/Button.vue';
import EditUser from '@/components/modals/EditUser.vue';
import useWsRpc from '@/composables/useWsRpc';
import { sendRPC } from '@/tools/websocket';
import { useRightSideMenuStore } from '@/stores/right-side';
import { UserBoard } from '@/helpers/components';
import ConfirmationModal from '@/components/modals/ConfirmationModal.vue';
const rightSideMenu = useRightSideMenuStore();

// Fetching and managing users
const { data: users, refresh } = useWsRpc<Record<string, any>>('User.List');

// Modal state management
const addUser = ref(false);
const editUser = ref<any>({});
const modalType = ref('');
const modalRef = ref<InstanceType<typeof ConfirmationModal>>();

const active = computed(() => {
    return rightSideMenu.mobileVisible;
});

// Handles modal close
function modalClosed() {
    editUser.value = {};
    addUser.value = false;
    modalType.value = '';
    refresh();
}

function openCreateModal() {
    editUser.value.visible = true;
    modalType.value = 'add';
}

function humanDate(date: string) {
    return new Date(date).toLocaleString();
}

function openEditModal(user: any) {
    modalType.value = 'edit';
    user.fullName = user.full_name;
    editUser.value = user;
    editUser.value.visible = true;
}

async function deleteUser(user: any) {
    await sendRPC('FLEET_MANAGER', 'User.Delete', { id: user.id });
    await refresh();
}

function handleDelete(user: any) {
    if (modalRef.value) {
        modalRef.value.storeAction(async () => {
            await deleteUser(user)});
    }
}

function bgClicked() {
    if (!active.value) return;
    rightSideMenu.clearActiveComponent();
}

function openSideMenu(user: any){
    rightSideMenu.setActiveComponent(UserBoard, { user });
}

const hasAccess = computed(() => {
  return users.value && Object.keys(users.value).length > 0;
});

</script>

<style scoped>
td,
th {
    @apply whitespace-nowrap px-4 py-2 font-medium text-gray-100 text-center;
}

th {
    @apply font-semibold;
}
</style>
