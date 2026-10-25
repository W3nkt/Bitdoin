import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { Currency, Language } from '@/types'

interface LanguageContextValue {
  language: Language
  setLanguage: (lang: Language) => void
  currency: Currency
  setCurrency: (currency: Currency) => void
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const { i18n } = useTranslation()

  const [language, setLanguageState] = useState<Language>(
    () => (localStorage.getItem('pwen_lang') as Language) ?? 'lo'
  )
  // <html lang> drives Lao line breaking, fonts and the screen reader's voice,
  // so it must follow the chosen language from the first render.
  useEffect(() => {
    document.documentElement.lang = language
  }, [language])

  const [currency, setCurrencyState] = useState<Currency>(
    () => (localStorage.getItem('pwen_currency') as Currency) ?? 'LAK'
  )

  function setLanguage(lang: Language) {
    setLanguageState(lang)
    i18n.changeLanguage(lang)
    localStorage.setItem('pwen_lang', lang)
  }

  function setCurrency(c: Currency) {
    setCurrencyState(c)
    localStorage.setItem('pwen_currency', c)
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, currency, setCurrency }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider')
  return ctx
}
