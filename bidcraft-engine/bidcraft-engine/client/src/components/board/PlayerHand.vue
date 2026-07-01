<script setup lang="ts">
import type { Card } from '@shared/types'
import CardView from '../shared/CardView.vue'

defineProps<{
  cards: Card[]
  clickable?: boolean
  selectedIds?: string[]
}>()

const emit = defineEmits<{
  cardClick: [card: Card]
}>()
</script>

<template>
  <div class="player-hand">
    <CardView
      v-for="card in cards"
      :key="card.id"
      :card="card"
      :clickable="clickable"
      :selected="selectedIds?.includes(card.id)"
      @click="emit('cardClick', card)"
    />
  </div>
</template>
