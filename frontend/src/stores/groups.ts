import { defineStore } from 'pinia'
import * as ws from '../tools/websocket'
import { ref } from 'vue'
import { useDevicesStore } from './devices'

export const useGroupsStore = defineStore('groups', () => {
  const groups = ref<Record<number, { id: number; name: string; devices: string[] }>>({})
  const devicesStore = useDevicesStore()

  async function fetchGroups() {
    const raw: Record<string, { id: number; name: string; devices: string[] }> =
      await ws.sendRPC('FLEET_MANAGER', 'group.list')
    const fresh: Record<number, { id: number; name: string; devices: string[] }> = {}
    for (const groupIdString in raw) {
      const groupId = Number(groupIdString)
      const groupEntry = raw[groupIdString]
      const mappedDevices = groupEntry.devices.map((deviceIdStr) => {
        const deviceNumId = Number(deviceIdStr)
        if (!isNaN(deviceNumId)) {
          const shellyID = devicesStore.idToShellyMap.get(deviceNumId)
          if (shellyID) return shellyID
        }
        return deviceIdStr
      })
      fresh[groupId] = {
        id: groupEntry.id,
        name: groupEntry.name,
        devices: mappedDevices,
      }
    }
    groups.value = fresh
  }

  fetchGroups()

  return {
    groups,
    fetchGroups,
  }
})
