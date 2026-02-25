import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { QueuePriority } from '@/enums/queuePriority'

export type AttendedCallPriority = (typeof QueuePriority)[keyof typeof QueuePriority]

export interface AttendedCall {
  id: string
  callerName: string
  phoneNumber: string
  attendedAt: Date
  duration: number
  priority: AttendedCallPriority
  agentName: string
}

export const useAttendedCallsStore = defineStore('attendedCalls', () => {
  const attendedCalls = ref<AttendedCall[]>([])

  const totalAttended = computed(() => attendedCalls.value.length)

  const sortedByDate = computed(() => {
    return [...attendedCalls.value].sort((a, b) => b.attendedAt.getTime() - a.attendedAt.getTime())
  })

  function addAttendedCall(call: Omit<AttendedCall, 'attendedAt'>) {
    const newCall: AttendedCall = {
      ...call,
      attendedAt: new Date(),
    }
    attendedCalls.value.push(newCall)
  }

  function formatDuration(seconds: number): string {
    const minutes = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  function formatDate(date: Date): string {
    return date.toLocaleString()
  }

  return {
    attendedCalls,
    totalAttended,
    sortedByDate,
    addAttendedCall,
    formatDuration,
    formatDate,
  }
})
