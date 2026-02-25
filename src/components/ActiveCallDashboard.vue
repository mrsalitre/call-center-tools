<script setup lang="ts">
import { useQueueStore } from '@/stores/queue'

const queueStore = useQueueStore()
</script>

<template>
  <div>
    <h2>Current Active Call</h2>
    <p v-if="queueStore.hasActiveCall">
      Customer Name: {{ queueStore.activeCall?.callerName }}<br />
      Phone: {{ queueStore.activeCall?.phoneNumber }}
    </p>
    <p v-else>No active call</p>
    <p>Call Status: {{ queueStore.callStatus }}</p>
    <p>Call Duration: {{ queueStore.formattedDuration }}</p>
    <button v-on:click="queueStore.endCall()" :disabled="!queueStore.canEndCallAction">
      End Call
    </button>
    <button v-on:click="queueStore.transferCall()" :disabled="!queueStore.canTransferCallAction">
      Transfer Call
    </button>
    <button
      v-on:click="queueStore.handleHoldOrResume()"
      :disabled="!queueStore.canHoldOrResumeCallAction"
    >
      {{ queueStore.holdOrResumeLabel }}
    </button>
  </div>
</template>

<style scoped></style>
