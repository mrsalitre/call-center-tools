<script setup lang="ts">
import { ref, watch, onUnmounted } from 'vue'
import { CallStatus } from '@/enums/callStatus'

const customerName = ref('') // This should come from the parent or maybe the route or maybe an state using pinia
const callStatus = ref(CallStatus.IDLE)
const callDuration = ref(0) // maybe we can create a computed property to format the duration
const isCallTransfered = ref(false)

let durationInterval: ReturnType<typeof setInterval> | null = null

function clearDurationInterval() {
  if (durationInterval) {
    clearInterval(durationInterval)
    durationInterval = null
  }
}

function startCall() {
  callStatus.value = CallStatus.RINGING

  setTimeout(() => {
    callStatus.value = CallStatus.ACTIVE
    callDuration.value = 0
  }, 800)
}

function endCall() {
  callStatus.value = CallStatus.ENDED
}

function transferCall() {
  callStatus.value = CallStatus.TRANSFERRING
  // We should need to wait for the call to be transfered
  isCallTransfered.value = true
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
    <p>Call Duration: {{ callDuration }}</p>
    <button v-on:click="startCall">Start Call</button>
    <button v-on:click="endCall">End Call</button>
    <button v-on:click="transferCall">Transfer Call</button>
    <button v-on:click="handleHoldOrResumeCall">Hold Call</button>
  </div>
</template>

<style scoped></style>
