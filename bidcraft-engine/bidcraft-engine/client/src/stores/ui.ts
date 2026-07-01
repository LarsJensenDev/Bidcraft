import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { BidType } from '@shared/types'

export const useUiStore = defineStore('ui', () => {
  const selectedCardIds = ref<string[]>([])
  const selectedBidType = ref<BidType | null>(null)
  const placementTarget = ref<'deck' | 'singles' | null>(null)
  const selectedDeckPosition = ref<0 | 1 | 2 | 3 | null>(null)
  const errorMessage = ref<string | null>(null)
  const showResolutionOverlay = ref(false)

  function toggleCardSelection(cardId: string) {
    const idx = selectedCardIds.value.indexOf(cardId)
    if (idx === -1) {
      if (selectedCardIds.value.length < 2) selectedCardIds.value.push(cardId)
    } else {
      selectedCardIds.value.splice(idx, 1)
    }
  }

  function clearSelection() {
    selectedCardIds.value = []
    selectedBidType.value = null
    placementTarget.value = null
    selectedDeckPosition.value = null
    errorMessage.value = null
  }

  return {
    selectedCardIds,
    selectedBidType,
    placementTarget,
    selectedDeckPosition,
    errorMessage,
    showResolutionOverlay,
    toggleCardSelection,
    clearSelection,
  }
})
