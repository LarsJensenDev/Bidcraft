<script setup lang="ts">
import { ref, computed } from 'vue'
import { useGameStore } from '@/stores/game'
import { useUiStore } from '@/stores/ui'
import CardView from '../shared/CardView.vue'
import DeckGrid from '../board/DeckGrid.vue'
import type { Card } from '@shared/types'

const gameStore = useGameStore()
const uiStore = useUiStore()

const chosenCardId = ref<string | null>(null)
const draggingCardId = ref<string | null>(null)
const singlesDropOver = ref(false)

const humanPlayer = computed(() => gameStore.humanPlayer)
const isHumanTurn = computed(
  () => gameStore.gameState?.awaitingPlacementBy === humanPlayer.value?.id
)

function selectMarketCard(card: Card) {
  chosenCardId.value = card.id
  uiStore.placementTarget = null
  uiStore.selectedDeckPosition = null
}

function selectDeckSlot(pos: number) {
  uiStore.placementTarget = 'deck'
  uiStore.selectedDeckPosition = pos as 0 | 1 | 2 | 3
}

function placeAsSingle() {
  uiStore.placementTarget = 'singles'
  uiStore.selectedDeckPosition = null
}

const canConfirm = computed(() => {
  if (!chosenCardId.value || !uiStore.placementTarget) return false
  if (uiStore.placementTarget === 'deck' && uiStore.selectedDeckPosition === null) return false
  return true
})

function confirm() {
  if (!canConfirm.value || !chosenCardId.value) return
  const asDeck = uiStore.placementTarget === 'deck'
  gameStore.placeCard(
    chosenCardId.value,
    asDeck,
    asDeck ? (uiStore.selectedDeckPosition ?? undefined) : undefined
  )
  chosenCardId.value = null
  uiStore.clearSelection()
}

// --- Drag-and-drop ---

function onDragStart(card: Card, event: DragEvent) {
  draggingCardId.value = card.id
  event.dataTransfer?.setData('text/plain', card.id)
}

function onDragEnd() {
  draggingCardId.value = null
}

function onDropDeckSlot(pos: number) {
  const cardId = draggingCardId.value
  draggingCardId.value = null
  if (!cardId) return
  gameStore.placeCard(cardId, true, pos)
  chosenCardId.value = null
  uiStore.clearSelection()
}

function onDropSingles() {
  singlesDropOver.value = false
  const cardId = draggingCardId.value
  draggingCardId.value = null
  if (!cardId) return
  gameStore.placeCard(cardId, false)
  chosenCardId.value = null
  uiStore.clearSelection()
}
</script>

<template>
  <div class="phase-panel">
    <h3>Karte platzieren</h3>
    <template v-if="isHumanTurn">
      <p>Wähle eine Marktkarte und ziehe sie ins Deck oder zu den Einzelkarten:</p>
      <div class="market-choice">
        <div
          v-for="card in gameStore.marketCards"
          :key="card.id"
          draggable="true"
          class="placement-drag-source"
          @dragstart="onDragStart(card, $event)"
          @dragend="onDragEnd"
        >
          <CardView
            :card="card"
            :clickable="true"
            :selected="chosenCardId === card.id"
            @click="selectMarketCard(card)"
          />
        </div>
      </div>
      <DeckGrid
        :deck="humanPlayer?.deck ?? []"
        :selectable="true"
        :droppable="true"
        :selected-position="uiStore.selectedDeckPosition"
        @select-slot="selectDeckSlot"
        @drop-on-slot="onDropDeckSlot"
      />
      <div
        class="singles-drop-zone"
        :class="{ 'singles-drop-zone--over': singlesDropOver, 'btn--active': uiStore.placementTarget === 'singles' }"
        @click="placeAsSingle"
        @dragover.prevent="singlesDropOver = true"
        @dragleave="singlesDropOver = false"
        @drop.prevent="onDropSingles"
      >
        Als Einzelkarte
      </div>
      <button class="btn btn--primary" :disabled="!canConfirm" @click="confirm">
        Bestätigen
      </button>
    </template>
    <template v-else>
      <p>KI platziert Karte…</p>
    </template>
  </div>
</template>
