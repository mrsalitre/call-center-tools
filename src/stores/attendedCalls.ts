import { shallowRef, computed } from 'vue'
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
  const attendedCalls = shallowRef<AttendedCall[]>([])

  const totalAttended = computed(() => attendedCalls.value.length)

  const sortedByDate = computed(() => {
    return [...attendedCalls.value].sort((a, b) => b.attendedAt.getTime() - a.attendedAt.getTime())
  })

  /**
   * Adds a completed call to the attended calls history.
   * Automatically sets the attendedAt timestamp to the current time.
   * Uses immutable pattern for shallowRef optimization.
   * @param call - Call data without the attendedAt field
   */
  function addAttendedCall(call: Omit<AttendedCall, 'attendedAt'>) {
    attendedCalls.value = [...attendedCalls.value, { ...call, attendedAt: new Date() }]
  }

  /**
   * Formats a duration in seconds to MM:SS format.
   * @param seconds - Duration in seconds
   * @returns Formatted string (e.g., "05:30")
   */
  function formatDuration(seconds: number): string {
    const minutes = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  /**
   * Formats a date to a localized string representation.
   * @param date - Date object to format
   * @returns Localized date/time string
   */
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
