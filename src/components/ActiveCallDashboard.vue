<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'
import { CallStatus } from '@/enums/callStatus'

defineProps<{
  customerName: string
}>()

const callStatus = ref(CallStatus.IDLE)
const callDuration = ref(0)

let durationInterval: ReturnType<typeof setInterval> | null = null
const canStartCall = [CallStatus.IDLE, CallStatus.ENDED, CallStatus.TRANSFERRED]

const formattedDuration = computed(() => {
  const minutes = Math.floor(callDuration.value / 60)
  const seconds = callDuration.value % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
})

function clearDurationInterval() {
  if (durationInterval) {
    clearInterval(durationInterval)
    durationInterval = null
  }
}

function startCall() {
  if (!canStartCall.includes(callStatus.value)) {
    return
  }

  callStatus.value = CallStatus.RINGING
  setTimeout(() => {
    callStatus.value = CallStatus.ACTIVE
    callDuration.value = 0
  }, 800)
}

function endCall() {
  if (callStatus.value !== CallStatus.ACTIVE) {
    return
  }
  callStatus.value = CallStatus.ENDED
}

function transferCall() {
  if (callStatus.value !== CallStatus.ACTIVE) {
    return
  }
  callStatus.value = CallStatus.TRANSFERRING
  // This is for mock the transfer process
  setTimeout(() => {
    callStatus.value = CallStatus.TRANSFERRED
  }, 800)
}

function handleHoldOrResumeCall() {
  if (callStatus.value === CallStatus.ON_HOLD) {
    resumeCall()
  } else {
    holdCall()
  }
}

function holdCall() {
  if (callStatus.value !== CallStatus.ACTIVE) {
    return
  }
  callStatus.value = CallStatus.ON_HOLD
}

function resumeCall() {
  callStatus.value = CallStatus.ACTIVE
}

watch(callStatus, (newStatus) => {
  if (newStatus === CallStatus.ACTIVE) {
    durationInterval = setInterval(() => {
      callDuration.value++
    }, 1000)
  } else {
    clearDurationInterval()
  }
})

onUnmounted(() => {
  clearDurationInterval()
})
</script>

<template>
  <div>
    <h2>Current Active Call</h2>
    <p>Customer Name: {{ customerName }}</p>
    <p>Call Status: {{ callStatus }}</p>
    <p>Call Duration: {{ formattedDuration }}</p>
    <button v-on:click="startCall">Start Call</button>
    <button v-on:click="endCall">End Call</button>
    <button v-on:click="transferCall">Transfer Call</button>
    <button v-on:click="handleHoldOrResumeCall">
      {{ callStatus === CallStatus.ON_HOLD ? 'Resume Call' : 'Hold Call' }}
    </button>
  </div>
</template>

<style scoped></style>
