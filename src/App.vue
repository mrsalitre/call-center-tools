<script setup lang="ts">
import ActiveCallDashboard from '@/components/ActiveCallDashboard.vue' // Maybe we can dinamically import this component based on the call status
import LiveQueueMonitor from '@/components/LiveQueueMonitor.vue'
</script>

<template>
  <h1>Call Center Tools</h1>
  <ActiveCallDashboard customerName="Jhon Doe" />
  <LiveQueueMonitor />
</template>

<style>
html,
body {
  padding: 0;
  margin: 0;
  background-color: #000;
  color: #fff;
}
</style>
