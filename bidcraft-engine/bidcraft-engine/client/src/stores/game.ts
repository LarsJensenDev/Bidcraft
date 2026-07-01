import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { GameState, BidType, ScoringMode, RoundResult, NewGameConfig } from '@shared/types'
import { createGame } from '@engine/setup'
import {
  selectTieCard as engineSelectTieCard,
  maybeStartFirstRound,
  submitBid,
  resolveRound,
  placeCard as enginePlaceCard,
  placeBet as enginePlaceBet,
  closeBettingWindow,
  chooseScoring as engineChooseScoring,
  canSitOut,
  declareSitOut,
  getForcedBid,
} from '@engine/gameEngine'
import { validateBid, availableBidTypes } from '@engine/validation'
import { decideBid, decidePlacement } from '@engine/ai'
import { bestScoringMode } from '@engine/scoring'
import { useUiStore } from './ui'

export const useGameStore = defineStore('game', () => {
  const gameState = ref<GameState | null>(null)
  const lastRoundResult = ref<RoundResult | null>(null)
  let pendingResolutionAction: (() => void) | null = null

  const phase = computed(() => gameState.value?.phase ?? 'setup')
  const humanPlayer = computed(() => gameState.value?.players.find(p => p.isHuman) ?? null)
  const opponents = computed(() => gameState.value?.players.filter(p => !p.isHuman) ?? [])
  const marketCards = computed(() => gameState.value?.marketCards ?? [])
  const currentRound = computed(() => gameState.value?.round ?? 0)
  const totalRounds = computed(() => gameState.value?.totalRounds ?? 0)
  const finalScores = computed(() => gameState.value?.finalScores ?? null)
  const humanAvailableBidTypes = computed(() => {
    if (!gameState.value || !humanPlayer.value) return []
    return availableBidTypes(humanPlayer.value, gameState.value)
  })

  const humanForcedBid = computed(() =>
    humanPlayer.value ? getForcedBid(humanPlayer.value) : null
  )

  // ID des aktuellen Kartengebers (rotiert jede Runde, Start zufällig).
  const dealerId = computed(() => {
    const s = gameState.value
    return s ? s.players[s.dealerIndex]?.id ?? null : null
  })

  // Darf der menschliche Spieler diese Runde aussetzen? (nur 4-Spieler, wenn er
  // Kartengeber ist und es nicht die letzte Runde ist.)
  const humanCanSitOut = computed(() => {
    const s = gameState.value
    const h = humanPlayer.value
    return !!(s && h && canSitOut(s, h.id))
  })

  function initGame(config: NewGameConfig) {
    gameState.value = createGame(config)
    lastRoundResult.value = null
  }

  function selectTieCard(cardId: string) {
    const state = gameState.value
    const human = humanPlayer.value
    if (!state || !human) return
    engineSelectTieCard(state, human.id, cardId)
    for (const ai of opponents.value) {
      if (!ai.tieCard && ai.hand.length > 0) {
        const best = [...ai.hand].sort((a, b) => b.rank - a.rank)[0]
        engineSelectTieCard(state, ai.id, best.id)
      }
    }
    maybeStartFirstRound(state)
  }

  function submitHumanBid(type: BidType, cardIds: string[]) {
    const ui = useUiStore()
    const state = gameState.value
    const human = humanPlayer.value
    if (!state || !human) return

    // Erzwungene Gebote (letzte/vorletzte Karte) überspringen die Validierung —
    // die Engine ignoriert cardIds und type ohnehin und nutzt getForcedBid intern.
    const forced = getForcedBid(human)
    if (!forced) {
      const validation = validateBid(human, state, type, cardIds)
      if (!validation.valid) {
        ui.errorMessage = validation.reason ?? 'Ungültiges Gebot.'
        return
      }
    }
    ui.errorMessage = null

    submitBid(state, human.id, type, cardIds)
    resolveOpponentsAndRound(state)
  }

  /**
   * Der menschliche Spieler ist Kartengeber und setzt diese Runde aus.
   * Nur im 4-Spieler-Modus und nicht in der letzten Runde möglich (canSitOut).
   */
  function dealerSitOut() {
    const ui = useUiStore()
    const state = gameState.value
    const human = humanPlayer.value
    if (!state || !human || !canSitOut(state, human.id)) return
    ui.errorMessage = null
    declareSitOut(state, human.id)
    resolveOpponentsAndRound(state)
    ui.clearSelection()
  }

  /**
   * Nachdem der Mensch geboten oder ausgesetzt hat: KI-Kartengeber aussetzen
   * lassen, übrige KI-Gebote bestimmen, Runde auflösen und ggf. die
   * KI-Platzierung für nach dem Auflösungs-Overlay vormerken.
   */
  function resolveOpponentsAndRound(state: GameState) {
    const ui = useUiStore()

    // 4-Spieler: KI-Kartengeber setzt aus (außer in der letzten Runde).
    for (const ai of opponents.value) {
      if (state.currentBids[ai.id] === null && canSitOut(state, ai.id)) {
        declareSitOut(state, ai.id)
      }
    }

    for (const ai of opponents.value) {
      if (state.currentBids[ai.id] !== null) continue
      const forced = getForcedBid(ai)
      if (forced) {
        submitBid(state, ai.id, forced.type, forced.cards.map(c => c.id))
        continue
      }
      const available = availableBidTypes(ai, state)
      if (available.length === 0) {
        // No valid bid possible (e.g. only 1 non-2 card left after drawing).
        // Treat as a pass so resolveWinner doesn't crash on a null bid.
        state.currentBids[ai.id] = { type: 'empty', cards: [], value: 0 }
        continue
      }
      const decision = decideBid(state, ai)
      submitBid(state, ai.id, decision.type, decision.cardIds)
    }

    const roundResult = resolveRound(state)
    lastRoundResult.value = roundResult

    if (roundResult.winnerId && roundResult.winnerId !== humanPlayer.value?.id) {
      pendingResolutionAction = () => autoPlaceForAI(state, roundResult.winnerId!)
    } else {
      pendingResolutionAction = null
    }
    ui.showResolutionOverlay = true
  }

  function confirmResolution() {
    const ui = useUiStore()
    ui.showResolutionOverlay = false
    if (pendingResolutionAction) {
      pendingResolutionAction()
      pendingResolutionAction = null
    }
  }

  function autoPlaceForAI(state: GameState, aiId: string) {
    if (state.marketCards.length === 0) return
    const ai = state.players.find(p => p.id === aiId)
    if (!ai) return
    const decision = decidePlacement(state, ai)
    enginePlaceCard(state, aiId, decision.cardId, decision.asDeck, decision.position)
  }

  function placeCard(chosenCardId: string, asDeck: boolean, position?: number) {
    const state = gameState.value
    if (!state || !state.awaitingPlacementBy) return
    enginePlaceCard(state, state.awaitingPlacementBy, chosenCardId, asDeck, position)
  }

  function placeBet(bet: boolean) {
    const state = gameState.value
    const human = humanPlayer.value
    if (!state || !human) return
    enginePlaceBet(state, human.id, bet)
  }

  function confirmBettingDone() {
    const state = gameState.value
    if (!state) return
    for (const ai of opponents.value) {
      enginePlaceBet(state, ai.id, Math.random() > 0.5)
    }
    closeBettingWindow(state)
  }

  function chooseScoring(mode: ScoringMode) {
    const state = gameState.value
    const human = humanPlayer.value
    if (!state || !human) return
    engineChooseScoring(state, human.id, mode)
    for (const ai of opponents.value) {
      if (!ai.scoringMode) {
        // KI wählt den für ihr Deck punktbesten Modus (wie der Mensch).
        engineChooseScoring(state, ai.id, bestScoringMode(ai.deck).mode)
      }
    }
  }

  function $reset() {
    gameState.value = null
    lastRoundResult.value = null
  }

  return {
    gameState,
    lastRoundResult,
    phase,
    humanPlayer,
    opponents,
    marketCards,
    currentRound,
    totalRounds,
    finalScores,
    humanAvailableBidTypes,
    humanForcedBid,
    dealerId,
    humanCanSitOut,
    initGame,
    selectTieCard,
    submitHumanBid,
    dealerSitOut,
    confirmResolution,
    placeCard,
    placeBet,
    confirmBettingDone,
    chooseScoring,
    $reset,
  }
})
