import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './en'
import lo from './lo'

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    lo: { translation: lo },
  },
  lng: localStorage.getItem('pwen_lang') ?? 'lo',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
})

export default i18n
