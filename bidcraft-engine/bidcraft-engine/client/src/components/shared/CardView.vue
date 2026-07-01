<script setup lang="ts">
import { computed } from 'vue'
import type { Card } from '@shared/types'

const props = defineProps<{
  card: Card
  faceDown?: boolean
  selected?: boolean
  clickable?: boolean
  small?: boolean
}>()

const emit = defineEmits<{
  click: [card: Card]
}>()

const SUIT_SYMBOLS: Record<string, string> = {
  diamonds: '♦',
  hearts: '♥',
  spades: '♠',
  clubs: '♣',
}

const RANK_LABELS: Record<number, string> = {
  11: 'J', 12: 'D', 13: 'K', 14: 'A',
}

const rankLabel = computed(() => RANK_LABELS[props.card.rank] ?? String(props.card.rank))
const suitSymbol = computed(() => SUIT_SYMBOLS[props.card.suit])
const isRed = computed(() => props.card.suit === 'diamonds' || props.card.suit === 'hearts')
</script>

<template>
  <div
    class="card"
    :class="{
      'card--face-down': faceDown,
      'card--selected': selected,
      'card--red': isRed && !faceDown,
      'card--clickable': clickable,
      'card--small': small,
    }"
    @click="clickable ? emit('click', card) : undefined"
  >
    <template v-if="!faceDown">
      <span class="card__rank">{{ rankLabel }}</span>
      <span class="card__suit">{{ suitSymbol }}</span>
    </template>
    <template v-else>
      <span class="card__back">■</span>
    </template>
  </div>
</template>
