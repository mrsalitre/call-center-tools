<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'
import { CallStatus } from '@/enums/callStatus'
import { useQueueStore } from '@/stores/queue'

type CallStatusValue = (typeof CallStatus)[keyof typeof CallStatus]

const queueStore = useQueueStore()

const callStatus = ref<CallStatusValue>(CallStatus.IDLE)
const callDuration = ref(0)

let durationInterval: ReturnType<typeof setInterval> | null = null
const canStartCall: CallStatusValue[] = [CallStatus.IDLE, CallStatus.ENDED, CallStatus.TRANSFERRED]

const formattedDuration = computed(() => {
  const minutes = Math.floor(callDuration.value / 60)
  const seconds = callDuration.value % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
})
const isActive = computed(() => callStatus.value === CallStatus.ACTIVE)
const isOnHold = computed(() => callStatus.value === CallStatus.ON_HOLD)
const canStartCallAction = computed(
  () => canStartCall.includes(callStatus.value) && queueStore.hasActiveCall,
)
const canEndCallAction = computed(() => isActive.value || isOnHold.value)
const canTransferCallAction = computed(() => isActive.value || isOnHold.value)
const canHoldOrResumeCallAction = computed(() => isActive.value || isOnHold.value)
const holdOrResumeLabel = computed(() => {
  if (!canHoldOrResumeCallAction.value) {
    return 'Hold/Resume Unavailable'
  }
  return isOnHold.value ? 'Resume Call' : 'Hold Call'
})

const activeCustomerName = computed(() => queueStore.activeCall?.callerName ?? 'No active call')
const activePhoneNumber = computed(() => queueStore.activeCall?.phoneNumber ?? '')

function clearDurationInterval() {
  if (durationInterval) {
    clearInterval(durationInterval)
    durationInterval = null
  }
}

function startCall() {
  if (!canStartCall.includes(callStatus.value) || !queueStore.activeCall) {
    return
  }

  callStatus.value = CallStatus.RINGING
  setTimeout(() => {
    callStatus.value = CallStatus.ACTIVE
    callDuration.value = 0
  }, 800)
}

function endCall() {
  if (callStatus.value !== CallStatus.ACTIVE && callStatus.value !== CallStatus.ON_HOLD) {
    return
  }
  callStatus.value = CallStatus.ENDED
  queueStore.endCall()
}

function transferCall() {
  if (callStatus.value !== CallStatus.ACTIVE && callStatus.value !== CallStatus.ON_HOLD) {
    return
  }
  callStatus.value = CallStatus.TRANSFERRING
  setTimeout(() => {
    callStatus.value = CallStatus.TRANSFERRED
    queueStore.endCall()
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

watch(
  () => queueStore.activeCall,
  (newActiveCall) => {
    if (newActiveCall && callStatus.value === CallStatus.IDLE) {
      callStatus.value = CallStatus.RINGING
      setTimeout(() => {
        callStatus.value = CallStatus.ACTIVE
        callDuration.value = 0
      }, 800)
    }
  },
)

onUnmounted(() => {
  clearDurationInterval()
})
</script>

<template>
  <div>
    <h2>Current Active Call</h2>
    <p v-if="queueStore.hasActiveCall">
      Customer Name: {{ activeCustomerName }}<br />
      Phone: {{ activePhoneNumber }}
    </p>
    <p v-else>No active call</p>
    <p>Call Status: {{ callStatus }}</p>
    <p>Call Duration: {{ formattedDuration }}</p>
    <button v-on:click="startCall" :disabled="!canStartCallAction">Start Call</button>
    <button v-on:click="endCall" :disabled="!canEndCallAction">End Call</button>
    <button v-on:click="transferCall" :disabled="!canTransferCallAction">Transfer Call</button>
    <button v-on:click="handleHoldOrResumeCall" :disabled="!canHoldOrResumeCallAction">
      {{ holdOrResumeLabel }}
    </button>
  </div>
</template>

<style scoped></style>
