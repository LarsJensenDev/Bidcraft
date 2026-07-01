<script setup lang="ts">
import type { BidType } from '@shared/types'

defineProps<{
  availableTypes: BidType[]
  selected: BidType | null
}>()

const emit = defineEmits<{
  select: [type: BidType]
}>()

const TYPE_LABELS: Record<BidType, string> = {
  single: 'Einzelgebot',
  double: 'Doppelgebot',
  empty: 'Leergebot',
}
</script>

<template>
  <div class="bid-type-selector">
    <button
      v-for="type in availableTypes"
      :key="type"
      class="btn"
      :class="{ 'btn--active': selected === type }"
      @click="emit('select', type)"
    >
      {{ TYPE_LABELS[type] }}
    </button>
  </div>
</template>
