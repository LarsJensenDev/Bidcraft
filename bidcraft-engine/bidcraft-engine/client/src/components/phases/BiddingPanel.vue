<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useGameStore } from '@/stores/game'
import { useUiStore } from '@/stores/ui'
import MarketArea from '../board/MarketArea.vue'
import PlayerHand from '../board/PlayerHand.vue'
import type { BidType, Card } from '@shared/types'

const gameStore = useGameStore()
const uiStore = useUiStore()

// Kartengeber-Abfrage (nur 4-Spieler): Ist der Mensch Kartengeber, wird er
// gefragt, ob er mitbieten oder aussetzen möchte. Die Wahl gilt pro Runde.
const dealerChoseToBid = ref(false)
watch(() => gameStore.currentRound, () => { dealerChoseToBid.value = false })
const showDealerPrompt = computed(() => gameStore.humanCanSitOut && !dealerChoseToBid.value)

function chooseBidAsDealer() {
  dealerChoseToBid.value = true
}
function sitOutAsDealer() {
  gameStore.dealerSitOut()
}

const hand = computed(() => gameStore.humanPlayer?.hand ?? [])
const round = computed(() => gameStore.currentRound)
const availableTypes = computed(() => gameStore.humanAvailableBidTypes)

// Erzwungenes Gebot (vorletzte/letzte Karte) — von der Engine vorgegeben.
const forcedBid = computed(() => gameStore.humanForcedBid)

// Im Tie-Card-Spiel liegt die Karte nicht in hand, sondern in tieCard.
const cardsToShow = computed<Card[]>(() => {
  if (forcedBid.value?.isTieCardPlay && gameStore.humanPlayer?.tieCard) {
    return [gameStore.humanPlayer.tieCard]
  }
  return hand.value
})

// Bei erzwungenem Gebot werden die Karten automatisch "ausgewählt" angezeigt.
const autoSelectedIds = computed<string[]>(() =>
  forcedBid.value ? forcedBid.value.cards.map(c => c.id) : uiStore.selectedCardIds
)

const selectedCards = computed<Card[]>(() =>
  uiStore.selectedCardIds
    .map(id => hand.value.find(c => c.id === id))
    .filter((c): c is Card => c !== undefined)
)

// Deterministically derived type; null when cards aren't fully selected.
const derivedBidType = computed<BidType | null>(() => {
  if (forcedBid.value) return forcedBid.value.type
  if (selectedCards.value.length !== 2) return null
  const twos = selectedCards.value.filter(c => c.rank === 2)
  const nonTwos = selectedCards.value.filter(c => c.rank !== 2)
  // 2 + Rundenkarte im gültigen Fenster → immer Leergebot (keine Wahl laut Regelwerk).
  if (
    twos.length === 1 &&
    nonTwos.length === 1 &&
    nonTwos[0].rank === round.value &&
    availableTypes.value.includes('empty')
  ) return 'empty'
  if (twos.length === 0) return 'double'
  return 'single'
})

const bidLabel = computed(() => {
  if (forcedBid.value) {
    return forcedBid.value.isTieCardPlay
      ? 'Tie Card (letzte Karte)'
      : 'Letzte Handkarte: 2 wird allein ausgespielt'
  }
  switch (derivedBidType.value) {
    case 'single': return 'Einzelgebot'
    case 'double': return 'Doppelgebot'
    case 'empty': return 'Leergebot'
    default: return null
  }
})

const canSubmit = computed(() => derivedBidType.value !== null)

function onCardClick(card: Card) {
  if (forcedBid.value) return
  uiStore.toggleCardSelection(card.id)
}

function submit() {
  if (!canSubmit.value || !derivedBidType.value) return
  if (forcedBid.value) {
    gameStore.submitHumanBid(forcedBid.value.type, forcedBid.value.cards.map(c => c.id))
  } else {
    gameStore.submitHumanBid(derivedBidType.value, [...uiStore.selectedCardIds])
  }
  uiStore.clearSelection()
}
</script>

<template>
  <div class="phase-panel">
    <h3>Runde {{ gameStore.currentRound }} — Bieten</h3>
    <MarketArea :cards="gameStore.marketCards" />

    <div v-if="showDealerPrompt" class="dealer-prompt">
      <p class="dealer-prompt__title">Du bist in dieser Runde Kartengeber.</p>
      <p class="dealer-prompt__text">
        Möchtest du mitbieten oder diese Runde aussetzen?
      </p>
      <div class="dealer-prompt__actions">
        <button class="btn btn--primary" @click="chooseBidAsDealer">Mitbieten</button>
        <button class="btn" @click="sitOutAsDealer">Aussetzen</button>
      </div>
    </div>

    <template v-else>
      <PlayerHand
        :cards="cardsToShow"
        :clickable="!forcedBid"
        :selected-ids="autoSelectedIds"
        @card-click="onCardClick"
      />
      <p v-if="bidLabel" class="selection-hint">{{ bidLabel }}</p>
      <p v-if="uiStore.errorMessage" class="error-message">{{ uiStore.errorMessage }}</p>
      <p class="selection-hint">
        Ausgewählt: {{ autoSelectedIds.length }} / {{ forcedBid ? 1 : 2 }} Karten
      </p>
      <button class="btn btn--primary" :disabled="!canSubmit" @click="submit">
        Gebot abgeben
      </button>
    </template>
  </div>
</template>

<style scoped>
.dealer-prompt {
  margin: 1.5rem auto;
  max-width: 22rem;
  padding: 1rem 1.25rem;
  border: 1px solid #4a90d9;
  border-radius: 0.5rem;
  text-align: center;
}

.dealer-prompt__title {
  font-weight: 600;
  margin: 0 0 0.25rem;
}

.dealer-prompt__text {
  margin: 0 0 1rem;
  opacity: 0.8;
}

.dealer-prompt__actions {
  display: flex;
  gap: 0.75rem;
  justify-content: center;
}
</style>
