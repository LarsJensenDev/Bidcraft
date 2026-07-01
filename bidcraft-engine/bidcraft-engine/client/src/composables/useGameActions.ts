import { useGameStore } from '@/stores/game'
import { useUiStore } from '@/stores/ui'

export function useGameActions() {
  const gameStore = useGameStore()
  const uiStore = useUiStore()

  return {
    gameStore,
    uiStore,
    submitBid: gameStore.submitHumanBid,
    selectTieCard: gameStore.selectTieCard,
    placeCard: gameStore.placeCard,
    placeBet: gameStore.placeBet,
    confirmBetting: gameStore.confirmBettingDone,
    chooseScoring: gameStore.chooseScoring,
    clearSelection: uiStore.clearSelection,
    toggleCard: uiStore.toggleCardSelection,
  }
}
