import { createContext, useContext, useState, useCallback } from 'react'
import translations from '../i18n/translations'

const LanguageContext = createContext()

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem('ev-map-lang') || 'th')

  const toggleLang = useCallback(() => {
    setLang(prev => {
      const next = prev === 'th' ? 'en' : 'th'
      localStorage.setItem('ev-map-lang', next)
      return next
    })
  }, [])

  return (
    <LanguageContext.Provider value={{ lang, toggleLang }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  return useContext(LanguageContext)
}

export function useTranslation() {
  const { lang, toggleLang } = useLanguage()

  const t = useCallback((key, ...args) => {
    const val = translations[lang]?.[key]
    if (typeof val === 'function') return val(...args)
    return val ?? key
  }, [lang])

  return { t, lang, toggleLang }
}
