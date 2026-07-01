<script setup lang="ts">
import type { Card } from '@shared/types'
import CardView from '../shared/CardView.vue'

defineProps<{
  deck: (Card | null)[]
  selectable?: boolean
  selectedPosition?: number | null
  droppable?: boolean
}>()

const emit = defineEmits<{
  selectSlot: [position: number]
  dropOnSlot: [position: number]
}>()

const POSITION_LABELS = ['↖', '↗', '↙', '↘']
</script>

<template>
  <div class="deck-grid">
    <div
      v-for="(card, pos) in deck"
      :key="pos"
      class="deck-slot"
      :class="{
        'deck-slot--empty': card === null,
        'deck-slot--selectable': selectable && card === null,
        'deck-slot--selected': selectedPosition === pos,
        'deck-slot--droppable': droppable && card === null,
      }"
      @click="selectable && card === null ? emit('selectSlot', pos) : undefined"
      @dragover="droppable && card === null ? $event.preventDefault() : undefined"
      @drop.prevent="droppable && card === null ? emit('dropOnSlot', pos) : undefined"
    >
      <CardView v-if="card" :card="card" />
      <span v-else class="deck-slot__label">{{ POSITION_LABELS[pos] }}</span>
    </div>
  </div>
</template>
