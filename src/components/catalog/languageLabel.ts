import type { TFunction } from 'i18next'

const LANGUAGE_KEYS: Record<string, string> = {
  Lao: 'sidebar.lao',
  English: 'sidebar.english',
  Thai: 'sidebar.thai',
  Chinese: 'sidebar.chinese',
  French: 'sidebar.french',
}

/** A book language as stored in the database ("Lao"), shown in the customer's language. */
export function languageLabel(t: TFunction, value: string) {
  return LANGUAGE_KEYS[value] ? t(LANGUAGE_KEYS[value]) : value
}
