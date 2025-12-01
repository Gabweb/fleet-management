<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import Modal from './Modal.vue';
import BasicBlock from '../core/BasicBlock.vue';
import Button from '../core/Button.vue';

// Define props – if secured is true, additional confirmation is needed
const { secured,footer } = defineProps<{ secured?: boolean, footer?:boolean }>();

const emit = defineEmits(['close', 'confirmAction']);

// Internal state to control modal visibility
const visible = ref(false);

// Holds the callback function (with its parameters) to be executed on confirmation
const pendingAction = ref<(() => void) | null>(null);

// Holds the user's input for deletion confirmation
const deletionInput = ref('');

// Computed property: if secured is enabled, ensure deletionInput is exactly 'DELETE'
const isDeletionConfirmed = computed(() => {
  return !secured || deletionInput.value === 'DELETE';
});

/**
 * This function stores the action and opens the modal.
 * Call this from your parent via the exposed ref.
 */
function storeAction(action: () => void) {
  pendingAction.value = action;
  visible.value = true;
}

/**
 * Executes the stored action (if confirmed) and closes the modal.
 */
function handleConfirm() {
  if (pendingAction.value && isDeletionConfirmed.value) {
    pendingAction.value();
  }
  emit('confirmAction');
  visible.value = false;
}

/**
 * Clear the stored action and reset the input when the modal is closed.
 */
watch(visible, (newVal) => {
  if (!newVal) {
    pendingAction.value = null;
    deletionInput.value = '';
  }
});

// Expose storeAction so that parent components can call it
defineExpose({
  storeAction,
});
</script>

<template>
  <Modal :visible="visible" @close="visible = false">
    <template #title>
      Confirmation
    </template>
    <div class="flex flex-col gap-3 justify-center items-center p-3 md:p-5">
      <div class="font-bold text-2xl p-3 text-center">
        <slot name="title">
          <h1>Are you sure you want to do this action?</h1>
        </slot>
      </div>

      <BasicBlock darker padding="md" v-if="secured">
        <div class="w-full flex justify-center items-center flex-col gap-3">
          <p class="text-sm mb-2">
            To confirm deletion, please type
            <span class="font-bold text-red-600">DELETE</span>
            in the field below.
          </p>
          <input v-model="deletionInput" type="text " placeholder="Type DELETE to confirm"
            class="border rounded p-2 w-full text-black font-bold text-center" />
        </div>

      </BasicBlock>

      <div class="font-semibold text-sm text-center">
        <slot name="subText" v-if="footer">
          <span class="font-bold">*This action is <span class="font-extrabold text-red-600">permanent</span> and we
            need your consent!</span>
        </slot>
      </div>

      <div class="flex flex-col gap-3 sm:flex-row sm:gap-2">
        <slot name="footer">
          <Button type="blue-hollow" @click="visible = false">Cancel</Button>
          <Button @click="handleConfirm" type="red" :disabled="!isDeletionConfirmed">
            Yes
          </Button>
        </slot>
      </div>
    </div>
  </Modal>
</template>
