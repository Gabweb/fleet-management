<template>
    <Modal :visible="modals.addWidget" @close="modals.addWidget = false">
        <template #title>
            <span>Add Widget</span>
        </template>

        <template #default>
            <div class="space-y-6">
                <Steps :current="stage" :steps="2" @click="(selected) => (stage = selected)">
                    <template #stepTitle="{ id }">
                        <span v-if="id == 1" class="font-semibold">Select type</span>
                        <span v-if="id == 2" class="font-semibold">Select items</span>
                    </template>
                </Steps>

                <div class="bg-gray-900 rounded-lg p-2 md:p-4">
                    <div v-if="stage == 1">
                        <div :class="[small ? 'flex flex-col gap-2' : 'widget-grid']">
                            <Widget
                                :selected="selectedType == 'Entity'"
                                :vertical="small"
                                :stripped="small"
                                @select="selectedType = 'Entity'"
                            >
                                <template #name>
                                    <span class="font-semibold">Entity</span>
                                </template>
                                <template #description>
                                    Entities allow you to see the state of a device's interactive component.
                                </template>
                            </Widget>

                            <Widget
                                :selected="selectedType == 'Group'"
                                :vertical="small"
                                :stripped="small"
                                @select="selectedType = 'Group'"
                            >
                                <template #name>
                                    <span class="font-semibold">Group</span>
                                </template>
                                <template #description> Collection of devices. </template>
                            </Widget>
                        </div>
                    </div>
                    <div v-if="selectedType === 'Entity' && stage == 2" class="space-y-2">
                        <Input v-model="entityNameFilter" class="max-w-sm" placeholder="Search" />
                        <div class="max-h-[30rem] overflow-y-scroll grid grid-cols-1 md:grid-cols-2 gap-2">
                            <EntityWidget
                                v-for="entity in Object.values(entityStore.entities).filter(filterEntity)"
                                :key="entity.id"
                                stripped
                                vertical
                                :entity
                                :selected="selectedEntities.includes(entity.id)"
                                @select="selectEntity(entity.id)"
                            />
                        </div>
                    </div>
                    <div v-else-if="selectedType === 'Group' && stage == 2" class="space-y-2">
                        <Input v-model="groupNameFilter" class="max-w-sm mt-2" placeholder="Search" />
                        <div class="max-h-[30rem] overflow-y-scroll grid grid-cols-1 md:grid-cols-2 gap-2">
                            <template v-for="group of groupStore.groups">
                                <template v-if="filterGroup(group.name)">
                                    <GroupWidget
                                        :key="group.id"
                                        vertical
                                        :members="group.devices"
                                        :name="group.name"
                                        :selected="group.id == selectedGroup"
                                        @select="selectedGroup = group.id"
                                    />
                                </template>
                            </template>
                        </div>
                    </div>
                </div>
            </div>
        </template>

        <template #footer>
            <div class="flex flex-row-reverse gap-4">
                <Button type="blue" @click="nextOrFinish">{{ stage == 2 ? 'Finish' : 'Next' }}</Button>
                <Button type="red" @click="backClicked">Back</Button>
            </div>
        </template>
    </Modal>
</template>

<script lang="ts" setup>
import Modal from '@/components/modals/Modal.vue';
import { useEntityStore } from '@/stores/entities';
import { useToastStore } from '@/stores/toast';
import { ref } from 'vue';
import { entity_t } from '@/types';
import Input from '../core/Input.vue';
import { useGroupsStore } from '@/stores/groups';
import Button from '../core/Button.vue';
import { small } from '@/helpers/ui';
import EntityWidget from '../widgets/EntityWidget.vue';
import Widget from '../widgets/Widget.vue';
import GroupWidget from '../widgets/GroupWidget.vue';
import Steps from '../core/Steps.vue';
import { modals } from '@/helpers/ui';

const entityStore = useEntityStore();
const toastStore = useToastStore();
const groupStore = useGroupsStore();

const selectedType = ref('Entity');
const stage = ref(1);

const selectedEntities = ref<string[]>([]);
const selectedGroup = ref(-1);

const emit = defineEmits<{
    added: [
        item: {
            type: 'entities' | 'group';
            data: any;
        },
    ];
}>();

// BEGIN Entity stage 2
const entityNameFilter = ref('');
const groupNameFilter = ref('');

function filterEntity(entity: entity_t) {
    if (entityNameFilter.value.length > 1) {
        if (!entity.name.toLowerCase().includes(entityNameFilter.value.toLowerCase())) {
            return false;
        }
    }

    return true;
}

function filterGroup(name: string) {
    if (groupNameFilter.value.length > 1) {
        if (!name.toLowerCase().includes(groupNameFilter.value.toLowerCase())) {
            return false;
        }
    }
    return true;
}

// END Entity stage 2

function finish() {
    if (selectedType.value === 'Entity') {
        if (selectedEntities.value.length == 0) {
            toastStore.warning('You need to select an entity');
            return;
        }

        emit('added', {
            type: 'entities',
            data: {
                ids: selectedEntities.value,
            },
        });

        stage.value = 1;
        // reset stage 2 entity
        entityNameFilter.value = '';
        selectedEntities.value.length = 0;
    } else if (selectedType.value === 'Group') {
        if (selectedGroup.value == -1) {
            toastStore.warning('You need to select a group');
            return;
        }

        emit('added', {
            type: 'group',
            data: {
                id: selectedGroup.value,
                name: groupStore.groups[selectedGroup.value].name,
            },
        });
    } else {
        toastStore.warning('Not supported yet.');
    }
}

function isLastStage() {
    if (selectedType.value == 'Entity') {
        return stage.value == 2;
    }

    if (selectedType.value == 'Group') {
        return stage.value == 2;
    }

    return true;
}

function nextOrFinish() {
    if (isLastStage()) {
        finish();
        return;
    }
    stage.value++;
}

function backClicked() {
    if (stage.value == 1) {
        modals.addWidget = false;
        return;
    }
    stage.value--;
}

function selectEntity(entityID: string) {
    if (selectedEntities.value.includes(entityID)) {
        selectedEntities.value.splice(selectedEntities.value.indexOf(entityID), 1);
    } else {
        selectedEntities.value.push(entityID);
    }
}
</script>
