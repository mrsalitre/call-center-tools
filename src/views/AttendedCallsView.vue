<script setup lang="ts">
import { useAttendedCallsStore } from '@/stores/attendedCalls'

const attendedCallsStore = useAttendedCallsStore()
</script>

<template>
  <div>
    <h2>Attended Calls</h2>
    <p>Total attended calls: {{ attendedCallsStore.totalAttended }}</p>

    <div v-if="attendedCallsStore.sortedByDate.length === 0">
      <p>No attended calls yet.</p>
    </div>

    <table v-else>
      <thead>
        <tr>
          <th>Caller Name</th>
          <th>Phone Number</th>
          <th>Agent</th>
          <th>Priority</th>
          <th>Duration</th>
          <th>Attended At</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="call in attendedCallsStore.sortedByDate" :key="call.id">
          <td>{{ call.callerName }}</td>
          <td>{{ call.phoneNumber }}</td>
          <td>{{ call.agentName }}</td>
          <td>{{ call.priority }}</td>
          <td>{{ attendedCallsStore.formatDuration(call.duration) }}</td>
          <td>{{ attendedCallsStore.formatDate(call.attendedAt) }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 1rem;
}

th,
td {
  border: 1px solid #333;
  padding: 0.5rem;
  text-align: left;
}

th {
  background-color: #222;
}
</style>
