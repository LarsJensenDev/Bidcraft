<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import type { ScoringMode } from '@shared/types'
import { useGameStore } from '../stores/game'
import { useUiStore } from '../stores/ui'
import { useLocaleStore } from '../stores/locale'
import DeckGrid from '../components/board/DeckGrid.vue'
import SinglesArea from '../components/board/SinglesArea.vue'

const gameStore = useGameStore()
const uiStore = useUiStore()
const { t } = useLocaleStore()
const router = useRouter()

const players = computed(() => gameStore.gameState?.players ?? [])

const MODE_LABELS: Record<ScoringMode, string> = {
  high: 'High',
  low: 'Low',
  spread: 'Spread',
}

function playAgain() {
  gameStore.$reset()
  uiStore.clearSelection()
  router.push({ name: 'home' })
}

function playerName(playerId: string) {
  return gameStore.gameState?.players.find(p => p.id === playerId)?.name ?? playerId
}
</script>

<template>
  <main class="score-view">
    <h2>{{ t('score.title') }}</h2>
    <table class="score-table" v-if="gameStore.finalScores">
      <thead>
        <tr>
          <th>{{ t('score.col.player') }}</th>
          <th>{{ t('score.col.deck') }}</th>
          <th>{{ t('score.col.singles') }}</th>
          <th>{{ t('score.col.penalty') }}</th>
          <th>{{ t('score.col.raw') }}</th>
          <th>{{ t('score.col.victory') }}</th>
          <th>{{ t('score.col.final') }}</th>
          <th>{{ t('score.col.bet') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="(score, playerId) in gameStore.finalScores"
          :key="playerId"
          :class="{ 'score-row--human': gameStore.gameState?.players.find(p => p.id === playerId)?.isHuman }"
        >
          <td>{{ playerName(playerId) }}</td>
          <td>{{ score.deckScore }}</td>
          <td>{{ score.singlesScore }}</td>
          <td class="score-penalty">-{{ score.drawPenalty }}</td>
          <td>{{ score.rawScore }}</td>
          <td>{{ score.victoryPoints }}</td>
          <td class="score-final">{{ score.finalPoints }}</td>
          <td>
            <span v-if="score.betWon === true">{{ t('score.betWon') }}</span>
            <span v-else-if="score.betWon === false">{{ t('score.betLost') }}</span>
            <span v-else>—</span>
          </td>
        </tr>
      </tbody>
    </table>

    <section class="score-breakdown" v-if="players.length">
      <h3>{{ t('score.breakdownTitle') }}</h3>
      <p class="score-breakdown__hint">{{ t('score.breakdownHint') }}</p>
      <div class="score-breakdown__players">
        <article
          v-for="player in players"
          :key="player.id"
          class="score-player"
          :class="{ 'score-player--human': player.isHuman }"
        >
          <header class="score-player__header">
            <span class="score-player__name">{{ player.name }}</span>
            <span class="score-player__mode" v-if="player.scoringMode">
              {{ MODE_LABELS[player.scoringMode] }}
            </span>
          </header>
          <DeckGrid :deck="player.deck" />
          <SinglesArea :singles="player.singles" />
        </article>
      </div>
    </section>

    <button class="btn btn--primary" @click="playAgain">{{ t('score.playAgain') }}</button>
  </main>
</template>

<style scoped>
.score-breakdown {
  margin: 2rem 0;
}

.score-breakdown__hint {
  margin: 0.25rem 0 1rem;
  opacity: 0.7;
  font-size: 0.9rem;
}

.score-breakdown__players {
  display: flex;
  flex-wrap: wrap;
  gap: 1.25rem;
  justify-content: center;
}

.score-player {
  border: 1px solid rgba(128, 128, 128, 0.35);
  border-radius: 0.5rem;
  padding: 0.75rem 1rem 1rem;
  min-width: 12rem;
}

.score-player--human {
  border-color: #4a90d9;
  box-shadow: 0 0 0 1px #4a90d9 inset;
}

.score-player__header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.score-player__name {
  font-weight: 600;
}

.score-player__mode {
  font-size: 0.8rem;
  padding: 0.1rem 0.5rem;
  border-radius: 999px;
  background: rgba(74, 144, 217, 0.18);
  color: #4a90d9;
}
</style>
