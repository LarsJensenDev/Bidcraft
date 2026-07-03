import { defineStore } from 'pinia'
import { ref } from 'vue'
import { messages, LOCALES, type Locale, type MessageKey } from '@/i18n/messages'

const STORAGE_KEY = 'bidcraft.locale'

/** Ermittelt die Startsprache: gespeicherte Wahl → Browsersprache → Englisch. */
function detectInitialLocale(): Locale {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved && (LOCALES as string[]).includes(saved)) return saved as Locale
  } catch {
    // localStorage evtl. nicht verfügbar (z.B. Privatmodus) — ignorieren.
  }
  const nav = (navigator.language || 'en').slice(0, 2).toLowerCase()
  if ((LOCALES as string[]).includes(nav)) return nav as Locale
  return 'en'
}

export const useLocaleStore = defineStore('locale', () => {
  const locale = ref<Locale>(detectInitialLocale())

  function setLocale(next: Locale) {
    locale.value = next
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // Persistenz optional — bei Fehler einfach nur im Speicher halten.
    }
  }

  /**
   * Übersetzt einen Key in die aktuelle Sprache.
   * Platzhalter der Form {name} werden aus `params` ersetzt.
   * Fällt auf Englisch und zuletzt auf den Key selbst zurück.
   *
   * Liest reaktiv `locale.value`, d.h. in Templates/Computeds aufgerufen,
   * rendert die UI bei Sprachwechsel automatisch neu.
   */
  function t(key: MessageKey, params?: Record<string, string | number>): string {
    const table = messages[locale.value] ?? messages.en
    let str = table[key] ?? messages.en[key] ?? key
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        str = str.split(`{${k}}`).join(String(v))
      }
    }
    return str
  }

  return { locale, setLocale, t }
})
