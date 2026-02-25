import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { QueueStatus } from '@/enums/queueStatus'
import { QueuePriority } from '@/enums/queuePriority'

export type QueuePriorityValue = (typeof QueuePriority)[keyof typeof QueuePriority]
export type QueueStatusValue = (typeof QueueStatus)[keyof typeof QueueStatus]

export interface QueueEntry {
  id: string
  callerName: string
  phoneNumber: string
  waitingSince: Date
  priority: QueuePriorityValue
  status: QueueStatusValue
  assignedAgent?: string
}

export const useQueueStore = defineStore('queue', () => {
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

  const activeCall = ref<QueueEntry | null>(null)
  const selectedPriorityFilter = ref<QueuePriorityValue | 'all'>('all')

  const queueSize = computed(() => queue.value.length)

  const waitingCount = computed(
    () => queue.value.filter((e) => e.status === QueueStatus.WAITING).length,
  )

  const sortedQueue = computed(() => {
    const priorityOrder = {
      [QueuePriority.VIP]: 0,
      [QueuePriority.HIGH]: 1,
      [QueuePriority.NORMAL]: 2,
      [QueuePriority.LOW]: 3,
    }

    const filtered =
      selectedPriorityFilter.value === 'all'
        ? queue.value
        : queue.value.filter((e) => e.priority === selectedPriorityFilter.value)

    return [...filtered].sort((a, b) => {
      const statusOrder = {
        [QueueStatus.WAITING]: 0,
        [QueueStatus.ASSIGNING]: 1,
        [QueueStatus.ASSIGNED]: 2,
      }
      const statusDiff = statusOrder[a.status] - statusOrder[b.status]
      if (statusDiff !== 0) return statusDiff

      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority]
      if (priorityDiff !== 0) return priorityDiff

      return a.waitingSince.getTime() - b.waitingSince.getTime()
    })
  })

  const hasActiveCall = computed(() => activeCall.value !== null)

  function calculatePriority(waitingSeconds: number): QueuePriorityValue {
    if (waitingSeconds >= 300) return QueuePriority.VIP
    if (waitingSeconds >= 180) return QueuePriority.HIGH
    if (waitingSeconds >= 60) return QueuePriority.NORMAL
    return QueuePriority.LOW
  }

  function updatePriorities() {
    const now = Date.now()
    queue.value.forEach((entry) => {
      const waitingSeconds = Math.floor((now - entry.waitingSince.getTime()) / 1000)
      entry.priority = calculatePriority(waitingSeconds)
    })
  }

  function getWaitingTime(entry: QueueEntry): number {
    return Math.floor((Date.now() - entry.waitingSince.getTime()) / 1000)
  }

  function formatWaitingTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  function setPriorityFilter(priority: QueuePriorityValue | 'all') {
    selectedPriorityFilter.value = priority
  }

  function acceptCall(entry: QueueEntry) {
    if (entry.status !== QueueStatus.WAITING) return

    entry.status = QueueStatus.ASSIGNING

    setTimeout(() => {
      entry.status = QueueStatus.ASSIGNED
      entry.assignedAgent = 'Agent 1'
      activeCall.value = { ...entry }
    }, 500)
  }

  function endCall() {
    if (!activeCall.value) return

    const entry = queue.value.find((e) => e.id === activeCall.value?.id)
    if (entry) {
      queue.value = queue.value.filter((e) => e.id !== activeCall.value?.id)
    }
    activeCall.value = null
  }

  function addToQueue(entry: Omit<QueueEntry, 'priority' | 'status'>) {
    const newEntry: QueueEntry = {
      ...entry,
      priority: QueuePriority.LOW,
      status: QueueStatus.WAITING,
    }
    queue.value.push(newEntry)
  }

  return {
    queue,
    activeCall,
    selectedPriorityFilter,
    queueSize,
    waitingCount,
    sortedQueue,
    hasActiveCall,
    updatePriorities,
    getWaitingTime,
    formatWaitingTime,
    setPriorityFilter,
    acceptCall,
    endCall,
    addToQueue,
  }
})
