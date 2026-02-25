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

  /**
   * Sorts queue entries by priority (ascending) and then by waiting time (oldest first).
   * @param entries - Array of queue entries to sort
   * @returns A new sorted array (does not mutate input)
   */
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

  /**
   * Calculates time-based priority based on how long a caller has been waiting.
   * @param waitingSeconds - Number of seconds the caller has been waiting
   * @returns The calculated priority level (VIP for 5+ min, HIGH for 3+ min, NORMAL for 1+ min, LOW otherwise)
   */
  function calculatePriority(waitingSeconds: number): QueuePriorityValue {
    if (waitingSeconds >= 300) return QueuePriority.VIP
    if (waitingSeconds >= 180) return QueuePriority.HIGH
    if (waitingSeconds >= 60) return QueuePriority.NORMAL
    return QueuePriority.LOW
  }

  /**
   * Determines the effective priority for a queue entry.
   * Returns the higher priority between the base priority and time-based priority.
   * @param basePriority - The initial priority assigned to the caller
   * @param waitingSeconds - Number of seconds the caller has been waiting
   * @returns The effective priority (higher of base or time-based)
   */
  function getEffectivePriority(
    basePriority: QueuePriorityValue,
    waitingSeconds: number,
  ): QueuePriorityValue {
    const timeBasedPriority = calculatePriority(waitingSeconds)
    return priorityOrder[timeBasedPriority] < priorityOrder[basePriority]
      ? timeBasedPriority
      : basePriority
  }

  /**
   * Updates the priority of all waiting queue entries based on their current wait time.
   * Should be called periodically (e.g., every second) to escalate priorities.
   */
  function updatePriorities() {
    queue.value.forEach((entry) => {
      if (entry.status !== QueueStatus.WAITING) return
      const waitingSeconds = Math.floor((now.value - entry.waitingSince.getTime()) / 1000)
      entry.priority = getEffectivePriority(entry.basePriority, waitingSeconds)
    })
  }

  /**
   * Calculates how long a queue entry has been waiting.
   * @param entry - The queue entry to check
   * @returns Number of seconds since the entry started waiting
   */
  function getWaitingTime(entry: QueueEntry): number {
    return Math.floor((now.value - entry.waitingSince.getTime()) / 1000)
  }

  /**
   * Formats a duration in seconds to MM:SS format.
   * @param seconds - Duration in seconds
   * @returns Formatted string (e.g., "05:30")
   */
  function formatWaitingTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  /**
   * Sets the priority filter for the queue display.
   * @param priority - Priority to filter by, or 'all' to show all entries
   */
  function setPriorityFilter(priority: QueuePriorityValue | 'all') {
    selectedPriorityFilter.value = priority
  }

  /**
   * Accepts a waiting call and assigns it to the current agent.
   * Sets the entry status to ASSIGNING, then ASSIGNED after a brief delay.
   * Does nothing if entry is not waiting or if there's already an active call.
   * @param entry - The queue entry to accept
   */
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

  /**
   * Starts the call duration timer, incrementing callDuration every second.
   * Clears any existing interval before starting a new one.
   */
  function startDurationTimer() {
    if (durationInterval.value) clearInterval(durationInterval.value)
    durationInterval.value = setInterval(() => {
      callDuration.value++
    }, 1000)
  }

  /**
   * Stops the call duration timer and clears the interval reference.
   */
  function stopDurationTimer() {
    if (durationInterval.value) {
      clearInterval(durationInterval.value)
      durationInterval.value = null
    }
  }

  /**
   * Puts the current active call on hold.
   * Stops the duration timer while the call is held.
   * Does nothing if there's no active call.
   */
  function holdCall() {
    if (callStatus.value !== CallStatus.ACTIVE) return
    callStatus.value = CallStatus.ON_HOLD
    stopDurationTimer()
  }

  /**
   * Resumes a call that is currently on hold.
   * Restarts the duration timer.
   * Does nothing if the call is not on hold.
   */
  function resumeCall() {
    if (callStatus.value !== CallStatus.ON_HOLD) return
    callStatus.value = CallStatus.ACTIVE
    startDurationTimer()
  }

  /**
   * Toggles between holding and resuming the current call.
   * Convenience function for hold/resume button.
   */
  function handleHoldOrResume() {
    if (callStatus.value === CallStatus.ON_HOLD) {
      resumeCall()
    } else {
      holdCall()
    }
  }

  /**
   * Transfers the current active or held call to another destination.
   * Sets status to TRANSFERRING, then ends the call after a brief delay.
   * Does nothing if there's no active or held call.
   */
  function transferCall() {
    if (callStatus.value !== CallStatus.ACTIVE && callStatus.value !== CallStatus.ON_HOLD) return

    callStatus.value = CallStatus.TRANSFERRING
    stopDurationTimer()

    setTimeout(() => {
      callStatus.value = CallStatus.TRANSFERRED
      endCall()
    }, 800)
  }

  /**
   * Ends the current active call.
   * Records the call in attended calls history and removes it from the queue.
   * @param duration - Optional duration override; uses callDuration if not provided
   */
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

  /**
   * Adds a new entry to the call queue.
   * Sets default priority (LOW) and status (WAITING).
   * @param entry - Queue entry data without basePriority, priority, and status fields
   */
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
