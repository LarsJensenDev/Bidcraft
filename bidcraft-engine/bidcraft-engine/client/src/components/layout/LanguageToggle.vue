<script setup lang="ts">
import { useLocaleStore } from '@/stores/locale'
import { LOCALES, LOCALE_LABELS, LOCALE_SHORT } from '@/i18n/messages'

const localeStore = useLocaleStore()
</script>

<template>
  <div class="lang-toggle" role="group" :aria-label="localeStore.t('lang.aria')">
    <button
      v-for="l in LOCALES"
      :key="l"
      type="button"
      class="lang-toggle__btn"
      :class="{ 'lang-toggle__btn--active': localeStore.locale === l }"
      :aria-pressed="localeStore.locale === l"
      :title="LOCALE_LABELS[l]"
      @click="localeStore.setLocale(l)"
    >
      {{ LOCALE_SHORT[l] }}
    </button>
  </div>
</template>

<style scoped>
.lang-toggle {
  display: inline-flex;
  gap: 2px;
  padding: 2px;
  border: 1px solid var(--color-border);
  border-radius: 999px;
  background: var(--color-surface-raised);
}

.lang-toggle__btn {
  border: none;
  background: transparent;
  color: var(--color-text-muted);
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.03em;
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.lang-toggle__btn:hover {
  color: var(--color-text);
}

.lang-toggle__btn--active {
  background: var(--color-accent);
  color: #fff;
}
</style>
