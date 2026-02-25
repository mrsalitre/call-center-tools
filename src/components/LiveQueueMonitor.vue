<script setup lang="ts">
import { ref } from 'vue'
import { QueueStatus } from '@/enums/queueStatus'
import { QueuePriority } from '@/enums/queuePriority'

type QueuePriorityValue = (typeof QueuePriority)[keyof typeof QueuePriority]
type QueueStatusValue = (typeof QueueStatus)[keyof typeof QueueStatus]

interface QueueEntry {
  id: string
  callerName: string
  phoneNumber: string
  waitingSince: Date // in seconds
  priority: QueuePriorityValue
  status: QueueStatusValue
  assignedAgent?: string // optional, only set when being assigned
}

const queue = ref<QueueEntry[]>([
  {
    id: '1',
    callerName: 'Jhon Doe',
    phoneNumber: '1234567890',
    waitingSince: new Date(Date.now() - 10000),
    priority: QueuePriority.NORMAL,
    status: QueueStatus.WAITING,
  },
  {
    id: '2',
    callerName: 'Jane Doe',
    phoneNumber: '0987654321',
    waitingSince: new Date(Date.now() - 20000),
    priority: QueuePriority.HIGH,
    status: QueueStatus.WAITING,
  },
])

const queueSize = ref(1)
</script>

<template>
  <div>
    <h2>Live Queue Monitor</h2>
    <p>Queue size: {{ queueSize }}</p>
    <ul v-if="queueSize > 0">
      <li v-for="entry in queue" :key="entry.id">
        {{ entry.callerName }} ({{ entry.phoneNumber }}) - {{ entry.waitingSince.toLocaleString() }}
      </li>
    </ul>
  </div>
</template>

<style scoped></style>
