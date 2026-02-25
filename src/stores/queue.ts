import { ref, computed, onScopeDispose } from 'vue'
import { defineStore } from 'pinia'
import { QueueStatus } from '@/enums/queueStatus'
import { QueuePriority } from '@/enums/queuePriority'
import { CallStatus } from '@/enums/callStatus'
import { useAttendedCallsStore } from './attendedCalls'

export type CallStatusValue = (typeof CallStatus)[keyof typeof CallStatus]

export type QueuePriorityValue = (typeof QueuePriority)[keyof typeof QueuePriority]
export type QueueStatusValue = (typeof QueueStatus)[keyof typeof QueueStatus]

export interface QueueEntry {
  id: string
  callerName: string
  phoneNumber: string
  waitingSince: Date
  basePriority: QueuePriorityValue
  priority: QueuePriorityValue
  status: QueueStatusValue
  assignedAgent?: string
}

export const useQueueStore = defineStore('queue', () => {
  const queue = ref<QueueEntry[]>([
    {
      id: '1',
      callerName: 'John Doe',
      phoneNumber: '1234567890',
      waitingSince: new Date(Date.now() - 10000),
      basePriority: QueuePriority.NORMAL,
      priority: QueuePriority.NORMAL,
      status: QueueStatus.WAITING,
    },
    {
      id: '2',
      callerName: 'Jane Doe',
      phoneNumber: '0987654321',
      waitingSince: new Date(Date.now() - 20000),
      basePriority: QueuePriority.HIGH,
      priority: QueuePriority.HIGH,
      status: QueueStatus.WAITING,
    },
  ])

  const activeCall = ref<QueueEntry | null>(null)
  const selectedPriorityFilter = ref<QueuePriorityValue | 'all'>('all')
  const callStatus = ref<CallStatusValue>(CallStatus.IDLE)
  const callDuration = ref(0)
  const durationInterval = ref<ReturnType<typeof setInterval> | null>(null)
  const now = ref(Date.now())
  const nowInterval = ref<ReturnType<typeof setInterval> | null>(null)

  nowInterval.value = setInterval(() => {
    now.value = Date.now()
  }, 1000)

  onScopeDispose(() => {
    if (durationInterval.value) {
      clearInterval(durationInterval.value)
      durationInterval.value = null
    }
    if (nowInterval.value) {
      clearInterval(nowInterval.value)
      nowInterval.value = null
    }
  })

  const queueSize = computed(() => queue.value.length)

  const waitingCount = computed(
    () => queue.value.filter((e) => e.status === QueueStatus.WAITING).length,
  )

  const priorityOrder = {
    [QueuePriority.VIP]: 0,
    [QueuePriority.HIGH]: 1,
    [QueuePriority.NORMAL]: 2,
    [QueuePriority.LOW]: 3,
  }

  function sortEntries(entries: QueueEntry[]): QueueEntry[] {
    return [...entries].sort((a, b) => {
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority]
      if (priorityDiff !== 0) return priorityDiff
      return a.waitingSince.getTime() - b.waitingSince.getTime()
    })
  }

  const partitionedByStatus = computed(() => {
    const waiting: QueueEntry[] = []
    const active: QueueEntry[] = []

    for (const entry of queue.value) {
      if (entry.status === QueueStatus.WAITING) {
        waiting.push(entry)
      } else if (entry.status === QueueStatus.ASSIGNED || entry.status === QueueStatus.ASSIGNING) {
        active.push(entry)
      }
    }
    return { waiting, active }
  })

  const waitingQueue = computed(() => {
    const filtered =
      selectedPriorityFilter.value === 'all'
        ? partitionedByStatus.value.waiting
        : partitionedByStatus.value.waiting.filter(
            (e) => e.priority === selectedPriorityFilter.value,
          )
    return sortEntries(filtered)
  })

  const activeCallsQueue = computed(() => {
    const filtered =
      selectedPriorityFilter.value === 'all'
        ? partitionedByStatus.value.active
        : partitionedByStatus.value.active.filter(
            (e) => e.priority === selectedPriorityFilter.value,
          )
    return sortEntries(filtered)
  })

  const sortedQueue = computed(() => {
    return [...waitingQueue.value, ...activeCallsQueue.value]
  })

  const hasActiveCall = computed(() => activeCall.value !== null)
  const isAcceptingCall = computed(
    () => activeCall.value !== null || callStatus.value === CallStatus.TRANSFERRING,
  )
  const isActive = computed(() => callStatus.value === CallStatus.ACTIVE)
  const isOnHold = computed(() => callStatus.value === CallStatus.ON_HOLD)
  const canEndCallAction = computed(() => isActive.value || isOnHold.value)
  const canTransferCallAction = computed(() => isActive.value || isOnHold.value)
  const canHoldOrResumeCallAction = computed(() => isActive.value || isOnHold.value)
  const holdOrResumeLabel = computed(() => {
    if (!canHoldOrResumeCallAction.value) {
      return 'Hold/Resume Unavailable'
    }
    return isOnHold.value ? 'Resume Call' : 'Hold Call'
  })

  const formattedDuration = computed(() => {
    const minutes = Math.floor(callDuration.value / 60)
    const seconds = callDuration.value % 60
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  })

  function calculatePriority(waitingSeconds: number): QueuePriorityValue {
    if (waitingSeconds >= 300) return QueuePriority.VIP
    if (waitingSeconds >= 180) return QueuePriority.HIGH
    if (waitingSeconds >= 60) return QueuePriority.NORMAL
    return QueuePriority.LOW
  }

  function getEffectivePriority(
    basePriority: QueuePriorityValue,
    waitingSeconds: number,
  ): QueuePriorityValue {
    const timeBasedPriority = calculatePriority(waitingSeconds)
    return priorityOrder[timeBasedPriority] < priorityOrder[basePriority]
      ? timeBasedPriority
      : basePriority
  }

  function updatePriorities() {
    queue.value.forEach((entry) => {
      if (entry.status !== QueueStatus.WAITING) return
      const waitingSeconds = Math.floor((now.value - entry.waitingSince.getTime()) / 1000)
      entry.priority = getEffectivePriority(entry.basePriority, waitingSeconds)
    })
  }

  function getWaitingTime(entry: QueueEntry): number {
    return Math.floor((now.value - entry.waitingSince.getTime()) / 1000)
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
    if (hasActiveCall.value || isAcceptingCall.value) return

    entry.status = QueueStatus.ASSIGNING
    activeCall.value = { ...entry }

    setTimeout(() => {
      entry.status = QueueStatus.ASSIGNED
      entry.assignedAgent = 'Agent 1'
      callStatus.value = CallStatus.ACTIVE
      callDuration.value = 0
      startDurationTimer()
    }, 500)
  }

  function startDurationTimer() {
    if (durationInterval.value) clearInterval(durationInterval.value)
    durationInterval.value = setInterval(() => {
      callDuration.value++
    }, 1000)
  }

  function stopDurationTimer() {
    if (durationInterval.value) {
      clearInterval(durationInterval.value)
      durationInterval.value = null
    }
  }

  function holdCall() {
    if (callStatus.value !== CallStatus.ACTIVE) return
    callStatus.value = CallStatus.ON_HOLD
    stopDurationTimer()
  }

  function resumeCall() {
    if (callStatus.value !== CallStatus.ON_HOLD) return
    callStatus.value = CallStatus.ACTIVE
    startDurationTimer()
  }

  function handleHoldOrResume() {
    if (callStatus.value === CallStatus.ON_HOLD) {
      resumeCall()
    } else {
      holdCall()
    }
  }

  function transferCall() {
    if (callStatus.value !== CallStatus.ACTIVE && callStatus.value !== CallStatus.ON_HOLD) return

    callStatus.value = CallStatus.TRANSFERRING
    stopDurationTimer()

    setTimeout(() => {
      callStatus.value = CallStatus.TRANSFERRED
      endCall()
    }, 800)
  }

  function endCall(duration?: number) {
    if (!activeCall.value) return

    stopDurationTimer()

    const attendedCallsStore = useAttendedCallsStore()
    attendedCallsStore.addAttendedCall({
      id: activeCall.value.id,
      callerName: activeCall.value.callerName,
      phoneNumber: activeCall.value.phoneNumber,
      duration: duration ?? callDuration.value,
      priority: activeCall.value.priority,
      agentName: activeCall.value.assignedAgent ?? 'Unknown',
    })

    const entry = queue.value.find((e) => e.id === activeCall.value?.id)
    if (entry) {
      queue.value = queue.value.filter((e) => e.id !== activeCall.value?.id)
    }
    activeCall.value = null
    callStatus.value = CallStatus.IDLE
    callDuration.value = 0
  }

  function addToQueue(entry: Omit<QueueEntry, 'basePriority' | 'priority' | 'status'>) {
    const newEntry: QueueEntry = {
      ...entry,
      basePriority: QueuePriority.LOW,
      priority: QueuePriority.LOW,
      status: QueueStatus.WAITING,
    }
    queue.value.push(newEntry)
  }

  return {
    queue,
    activeCall,
    selectedPriorityFilter,
    callStatus,
    callDuration,
    queueSize,
    waitingCount,
    waitingQueue,
    activeCallsQueue,
    sortedQueue,
    hasActiveCall,
    isAcceptingCall,
    isActive,
    isOnHold,
    canEndCallAction,
    canTransferCallAction,
    canHoldOrResumeCallAction,
    holdOrResumeLabel,
    formattedDuration,
    updatePriorities,
    getWaitingTime,
    formatWaitingTime,
    setPriorityFilter,
    acceptCall,
    endCall,
    holdCall,
    resumeCall,
    handleHoldOrResume,
    transferCall,
    addToQueue,
  }
})
