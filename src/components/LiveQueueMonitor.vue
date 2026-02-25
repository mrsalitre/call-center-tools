<script setup lang="ts">
import { useQueueStore, type QueueEntry } from '@/stores/queue'
import { QueueStatus } from '@/enums/queueStatus'
import { QueuePriority } from '@/enums/queuePriority'

const queueStore = useQueueStore()

function handleAcceptCall(entry: QueueEntry) {
  if (queueStore.hasActiveCall) return
  queueStore.acceptCall(entry)
}

function filterByPriority(priority: (typeof QueuePriority)[keyof typeof QueuePriority] | 'all') {
  queueStore.setPriorityFilter(priority)
}

function isPriorityActive(
  priority: (typeof QueuePriority)[keyof typeof QueuePriority] | 'all',
): boolean {
  return queueStore.selectedPriorityFilter === priority
}
</script>

<template>
  <div>
    <h2>Live Queue Monitor</h2>
    <p>Queue size: {{ queueStore.queueSize }} | Waiting: {{ queueStore.waitingCount }}</p>

    <div>
      <span>Filter by priority: </span>
      <button :class="{ active: isPriorityActive('all') }" @click="filterByPriority('all')">
        All
      </button>
      <button
        :class="{ active: isPriorityActive(QueuePriority.VIP) }"
        @click="filterByPriority(QueuePriority.VIP)"
      >
        VIP
      </button>
      <button
        :class="{ active: isPriorityActive(QueuePriority.HIGH) }"
        @click="filterByPriority(QueuePriority.HIGH)"
      >
        High
      </button>
      <button
        :class="{ active: isPriorityActive(QueuePriority.NORMAL) }"
        @click="filterByPriority(QueuePriority.NORMAL)"
      >
        Normal
      </button>
      <button
        :class="{ active: isPriorityActive(QueuePriority.LOW) }"
        @click="filterByPriority(QueuePriority.LOW)"
      >
        Low
      </button>
    </div>

    <h3>Waiting ({{ queueStore.waitingCount }})</h3>
    <ul v-if="queueStore.waitingQueue.length > 0">
      <li
        v-for="entry in queueStore.waitingQueue"
        :key="entry.id"
        v-memo="[entry.status, entry.priority, queueStore.getWaitingTime(entry)]"
      >
        <strong>{{ entry.callerName }}</strong> ({{ entry.phoneNumber }})
        <br />
        Waiting: {{ queueStore.formatWaitingTime(queueStore.getWaitingTime(entry)) }} | Priority:
        {{ entry.priority.toUpperCase() }}
        <button v-if="!queueStore.hasActiveCall" @click="handleAcceptCall(entry)">
          Accept Call
        </button>
      </li>
    </ul>
    <p v-else>No calls waiting</p>

    <h3>Active Calls ({{ queueStore.activeCallsQueue.length }})</h3>
    <ul v-if="queueStore.activeCallsQueue.length > 0">
      <li
        v-for="entry in queueStore.activeCallsQueue"
        :key="entry.id"
        v-memo="[entry.status, entry.priority, entry.assignedAgent]"
      >
        <strong>{{ entry.callerName }}</strong> ({{ entry.phoneNumber }})
        <br />
        Priority: {{ entry.priority.toUpperCase() }} | Status:
        <span v-if="entry.status === QueueStatus.ASSIGNING">Connecting...</span>
        <span v-if="entry.status === QueueStatus.ASSIGNED"
          >Assigned to {{ entry.assignedAgent }}</span
        >
      </li>
    </ul>
    <p v-else>No active calls</p>
  </div>
</template>

<style scoped>
button.active {
  font-weight: bold;
  text-decoration: underline;
}

ul {
  list-style: none;
  padding: 0;
}

li {
  margin-bottom: 1rem;
  padding: 0.5rem;
  border: 1px solid #444;
  border-radius: 4px;
}
</style>
