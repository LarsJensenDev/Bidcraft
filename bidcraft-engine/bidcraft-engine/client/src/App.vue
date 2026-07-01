<script setup lang="ts">
import AppHeader from './components/layout/AppHeader.vue'
import PhaseStatusBar from './components/layout/PhaseStatusBar.vue'
</script>

<template>
  <AppHeader />
  <PhaseStatusBar />
  <RouterView />
</template>
