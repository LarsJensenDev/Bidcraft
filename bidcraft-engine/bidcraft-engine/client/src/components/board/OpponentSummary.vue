<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '@/stores/game'
import { useLocaleStore } from '@/stores/locale'
import DeckGrid from './DeckGrid.vue'
import CardView from '../shared/CardView.vue'

const gameStore = useGameStore()
const { t } = useLocaleStore()

const humanPlayer = computed(() => gameStore.humanPlayer)
const opponents = computed(() => gameStore.opponents)
const dealerId = computed(() => gameStore.dealerId)

function sortedDiscard(discard: typeof opponents.value[0]['discard']) {
  return [...discard].sort((a, b) => a.rank - b.rank)
}
</script>

<template>
  <aside class="opponent-summary">
    <div class="players-grid">
      <div v-if="humanPlayer" class="opponent-card human-player-card">
        <strong>
          {{ humanPlayer.name }} {{ t('common.you') }}
          <span v-if="humanPlayer.id === dealerId" class="dealer-badge">{{ t('opp.dealer') }}</span>
        </strong>
        <div class="opponent-deck-grid">
          <DeckGrid :deck="humanPlayer.deck" />
        </div>
        <ul>
          <li>{{ t('opp.hand') }}: {{ humanPlayer.hand.length }}</li>
          <li>{{ t('opp.singles') }}: {{ humanPlayer.singles.length }}</li>
          <li>{{ t('opp.double') }}: {{ humanPlayer.doubleBidsUsed }}</li>
          <li>{{ t('opp.empty') }}: {{ humanPlayer.emptyBidsUsed }}</li>
        </ul>
      </div>
      <div v-for="opp in opponents" :key="opp.id" class="opponent-card">
        <strong>
          {{ opp.name }}
          <span v-if="opp.id === dealerId" class="dealer-badge">{{ t('opp.dealer') }}</span>
        </strong>
        <div class="opponent-deck-grid">
          <DeckGrid :deck="opp.deck" />
        </div>
        <ul>
          <li>{{ t('opp.hand') }}: {{ opp.hand.length }}</li>
          <li>{{ t('opp.singles') }}: {{ opp.singles.length }}</li>
          <li>{{ t('opp.double') }}: {{ opp.doubleBidsUsed }}</li>
          <li>{{ t('opp.empty') }}: {{ opp.emptyBidsUsed }}</li>
        </ul>
        <div v-if="opp.discard.length > 0" class="opponent-discard">
          <span class="opponent-discard-label">{{ t('opp.discard', { n: opp.discard.length }) }}</span>
          <div class="opponent-discard-cards">
            <CardView
              v-for="card in sortedDiscard(opp.discard)"
              :key="card.id"
              :card="card"
              :small="true"
            />
          </div>
        </div>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.dealer-badge {
  display: inline-block;
  margin-left: 0.4rem;
  padding: 0.05rem 0.4rem;
  font-size: 0.7rem;
  font-weight: 600;
  vertical-align: middle;
  border-radius: 999px;
  background: #4a90d9;
  color: #fff;
}
</style>
