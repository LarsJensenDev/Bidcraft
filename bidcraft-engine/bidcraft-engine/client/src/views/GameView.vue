<script setup lang="ts">
import { computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useGameStore } from '../stores/game'
import { useUiStore } from '../stores/ui'
import TieCardSelectionPanel from '../components/phases/TieCardSelectionPanel.vue'
import BiddingPanel from '../components/phases/BiddingPanel.vue'
import CardPlacementPanel from '../components/phases/CardPlacementPanel.vue'
import BettingWindowPanel from '../components/phases/BettingWindowPanel.vue'
import ScoringPanel from '../components/phases/ScoringPanel.vue'
import OpponentSummary from '../components/board/OpponentSummary.vue'
import CardView from '../components/shared/CardView.vue'

const gameStore = useGameStore()
const uiStore = useUiStore()
const router = useRouter()

const phaseComponents = {
  tieCardSelection: TieCardSelectionPanel,
  bidding: BiddingPanel,
  cardPlacement: CardPlacementPanel,
  bettingWindow: BettingWindowPanel,
  scoring: ScoringPanel,
}

type KnownPhase = keyof typeof phaseComponents

const activePanel = computed(() => {
  const p = gameStore.phase as KnownPhase
  return phaseComponents[p] ?? null
})

watch(() => gameStore.phase, (phase) => {
  if (phase === 'finished') {
    router.push({ name: 'score' })
  }
})

const winnerName = computed(() => {
  const result = gameStore.lastRoundResult
  if (!result?.winnerId) return null
  return gameStore.gameState?.players.find(p => p.id === result.winnerId)?.name ?? null
})

const allBids = computed(() => {
  const result = gameStore.lastRoundResult
  if (!result) return []
  return gameStore.gameState?.players.map(p => ({
    player: p,
    bid: result.bids[p.id] ?? null,
    isWinner: p.id === result.winnerId,
  })) ?? []
})
</script>

<template>
  <div class="game-view">
    <div class="game-board">
      <component :is="activePanel" v-if="activePanel" />
    </div>
    <OpponentSummary class="opponent-sidebar" />

    <Transition name="fade">
      <div v-if="uiStore.showResolutionOverlay" class="resolution-overlay">
        <div class="resolution-card">
          <p class="resolution-round">Runde {{ gameStore.lastRoundResult?.round }}</p>
          <p v-if="winnerName" class="resolution-winner">{{ winnerName }} gewinnt!</p>
          <p v-else class="resolution-no-winner">Keine Gewinner — alle Leergebote</p>

          <div class="resolution-bids">
            <div
              v-for="entry in allBids"
              :key="entry.player.id"
              class="resolution-bid-row"
              :class="{ 'resolution-bid-row--winner': entry.isWinner }"
            >
              <span class="resolution-bid-name">
                {{ entry.player.name }}{{ entry.player.isHuman ? ' (Du)' : '' }}
              </span>
              <span v-if="!entry.bid || entry.bid.cards.length === 0" class="resolution-bid-sitout">
                aussetzt
              </span>
              <template v-else>
                <div class="resolution-bid-cards">
                  <CardView v-for="card in entry.bid.cards" :key="card.id" :card="card" />
                </div>
                <span class="resolution-bid-value">= {{ entry.bid.value }}</span>
              </template>
            </div>
          </div>
          <button class="btn btn--primary resolution-confirm-btn" @click="gameStore.confirmResolution()">
            OK
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>
