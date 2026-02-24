<script setup lang="ts">
import { ref } from 'vue'
import { CallStatus } from '@/enums/callStatus'

const customerName = ref('') // This should come from the parent or maybe the route or maybe an state using pinia
const callStatus = ref(CallStatus.IDLE)
const callDuration = ref(0) // maybe we can create a computed property to format the duration
const isCallTransfered = ref(false)

function startCall() {
  callStatus.value = CallStatus.RINGING

  setTimeout(() => {
    callStatus.value = CallStatus.ACTIVE // we should watch this value to update the call duration
  }, 800)

  /*
    This set interval is only a mock,
    we need to remove this once we have the watcher
  */
  setInterval(() => {
    if (callStatus.value === CallStatus.ACTIVE) {
      callDuration.value++
    }
  }, 1000)
}

function endCall() {
  callStatus.value = CallStatus.ENDED
}

function transferCall() {
  callStatus.value = CallStatus.TRANSFERRING
  // We should need to wait for the call to be transfered
  isCallTransfered.value = true
}
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
  </div>
</template>

<style scoped></style>
