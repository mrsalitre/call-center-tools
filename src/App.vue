<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <h1>Call Center Tools</h1>
  <nav>
    <RouterLink to="/">Queue</RouterLink>
    <RouterLink to="/attended">Attended Calls</RouterLink>
  </nav>
  <RouterView />
</template>

<style>
html,
body {
  padding: 0;
  margin: 0;
  background-color: #000;
  color: #fff;
}

nav {
  margin-bottom: 1rem;
}

nav a {
  margin-right: 1rem;
  color: #4a9eff;
  text-decoration: none;
}

nav a.router-link-active {
  color: #fff;
  text-decoration: underline;
}
</style>
