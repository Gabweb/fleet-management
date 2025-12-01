<template>
  <Widget class="relative overflow-visible hover:cursor-pointer w-full" style="max-width: 100%">
    <template #upper-corner>Action</template>
    <template #upper-right-corner>
      <button
        v-if="editMode"
        @click.stop="emit('duplicate')"
        class="absolute top-2 right-2 text-blue-500 hover:text-blue-700 z-20"
        title="Duplicate action"
      >
        <i class="fas fa-copy"></i>
      </button>
    </template>
    <template #name>{{ action.name }}</template>
    <template #description>{{ totalDevices }} device{{ totalDevices < 2 ? '' : 's' }}</template>
    <template #action>
      <template v-if="editMode">
        <div class="flex flex-col space-y-2 w-full">
          <Button type="blue" size="sm" class="w-full" @click="emit('edit')">Edit</Button>
          <Button type="red" size="sm" class="w-full" @click="emit('delete')">Delete</Button>
        </div>
      </template>
      <button v-else class="w-10 h-10 rounded-full bg-blue-700" @click.stop="clicked">
        <Spinner v-if="waitingForResponse" />
        <span v-else>Run</span>
      </button>
    </template>
  </Widget>
</template>

<script setup lang="ts">
import { action_t } from '@/types'
import Widget from './WidgetsTemplates/VanilaWidget.vue'
import { computed, ref, toRef } from 'vue'
import Button from '../core/Button.vue'
import Spinner from '../core/Spinner.vue'
import { runAction } from '@/helpers/commands'
import { useToastStore } from '@/stores/toast'

const props = defineProps<{
  action: action_t
  editMode?: boolean
}>()

const emit = defineEmits<{
  delete: []
  edit: []
  duplicate: []
}>()

const action = toRef(props, 'action')
const toastStore = useToastStore()
const waitingForResponse = ref(false)
const totalDevices = computed(() =>
  action.value.actions.reduce((acc, curr: any) => acc + curr.dst.length, 0)
)

async function clicked() {
  waitingForResponse.value = true
  try {
    await runAction(action.value)
  } catch {
    toastStore.error('Something went wrong with the action.')
  } finally {
    waitingForResponse.value = false
  }
}
</script>
