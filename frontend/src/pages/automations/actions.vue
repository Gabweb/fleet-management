<template>
  <div v-if="loading">
    <span>loading...</span>
  </div>
  <div v-else-if="error">
    <span>Something went wrong</span>
  </div>
  <InfiniteGridScrollPage
    v-else="actions"
    :page="page"
    :total-pages="totalPages"
    :items="items"
    :loading="scrollLoading"
    @load-items="loadItems"
  >
    <template #header>
      <BasicBlock bordered blurred class="relative z-10 mb-2">
        <div class="flex flex-row flex-nowrap justify-between align-middle items-center font-semibold">
          <p>Actions</p>
          <div class="flex flex-row gap-2">
            <Button type="blue" size="sm" narrow @click="addActionVisible = true">
              <i class="fas fa-plus" />
            </Button>
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
      <CreateAndEditActionModal
        :visible="addActionVisible"
        @safe="closeCreateModal"
        @close="closeCreateModal"
      />
      <CreateAndEditActionModal
        v-if="editActionVisible"
        :visible="editActionVisible"
        :action="selectedAction"
        @close="closeEditModal"
      />
      <CreateAndEditActionModal
        v-if="duplicateActionVisible"
        :visible="duplicateActionVisible"
        :action="selectedActionCopy"
        :duplicate="true"
        @close="closeDuplicateModal"
      />
    </template>

    <template #default="{ item: action, small }">
      <ActionWidget
        :key="action.id"
        :action="action"
        :edit-mode="editMode"
        :vertical="small"
        @click="!editMode && clicked(action)"
        @delete="deleteAction(action)"
        @edit="editAction(action)"
        @duplicate="duplicateAction(action)"
      />
    </template>

    <template #empty>
      <EmptyBlock>
        <p class="text-xl font-semibold pb-2">No actions found</p>
        <p class="text-sm pb-2">You can add actions from the Devices tab</p>
        <RouterLink to="/devices/devices">
          <Button>Open devices</Button>
        </RouterLink>
      </EmptyBlock>
    </template>
  </InfiniteGridScrollPage>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { ActionBoard } from '@/helpers/components'
import BasicBlock from '@/components/core/BasicBlock.vue'
import Button from '@/components/core/Button.vue'
import EmptyBlock from '@/components/core/EmptyBlock.vue'
import useRegistry from '@/composables/useRegistry'
import useInfiniteScroll from '@/composables/useInfiniteScroll'
import { useRightSideMenuStore } from '@/stores/right-side'
import { useToastStore } from '@/stores/toast'
import InfiniteGridScrollPage from '@/components/pages/InfiniteGridScrollPage.vue'
import ActionWidget from '@/components/widgets/ActionWidget.vue'
import CreateAndEditActionModal from '@/components/modals/CreateAndEditActionModal.vue'
import { getRegistry } from '@/tools/websocket'
import { action_t } from '@/types'

const { data: actions, error, loading, refresh, upload } = useRegistry<action_t[]>('actions', 'rpc')
const actionItems = computed(() => actions.value || [])
const { items, page, totalPages, loading: scrollLoading, loadItems } = useInfiniteScroll(actionItems)

const rightSideStore = useRightSideMenuStore()
const toastStore = useToastStore()

const editMode = ref(false)
const addActionVisible = ref(false)
const editActionVisible = ref(false)
const duplicateActionVisible = ref(false)

const selectedAction = ref<action_t | null>(null)
const selectedActionCopy = ref<action_t | null>(null)

function toggleEditMode() {
  editMode.value = !editMode.value
}

function clicked(action: action_t) {
  rightSideStore.setActiveComponent(ActionBoard, {
    actionID: action.id,
  })
}

function editAction(action: action_t) {
  selectedAction.value = action
  editActionVisible.value = true
}

function duplicateAction(action: action_t) {
  const copy = JSON.parse(JSON.stringify(action)) as action_t
  delete (copy as any).id
  copy.name = `${action.name} copy`
  selectedActionCopy.value = copy
  duplicateActionVisible.value = true
}

async function deleteAction(action: action_t) {
  try {
    await getRegistry('actions').removeItem('rpc', { id: action.id })
    refresh()
  } catch {
    toastStore.error('Failed to delete action')
  }
}

function closeEditModal() {
  editActionVisible.value = false
  refresh()
}

function closeCreateModal() {
  addActionVisible.value = false
  refresh()
}

function closeDuplicateModal() {
  duplicateActionVisible.value = false
  refresh()
}

watch(loading, () => {
  if (!loading && actions.value == null) {
    actions.value = []
    upload()
  }
})
</script>
