<script setup lang="ts">
import type { BidType } from '@shared/types'
import { useLocaleStore } from '@/stores/locale'
import type { MessageKey } from '@/i18n/messages'

defineProps<{
  availableTypes: BidType[]
  selected: BidType | null
}>()

const emit = defineEmits<{
  select: [type: BidType]
}>()

const { t } = useLocaleStore()
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
      {{ t(`bid.${type}` as MessageKey) }}
    </button>
  </div>
</template>
