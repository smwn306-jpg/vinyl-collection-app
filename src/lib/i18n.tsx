import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

type Lang = 'he' | 'en'

const translations = {
  he: {
    tagline: 'האוסף שלך, במקום אחד',
    tabCollection: 'אוסף',
    tabWantlist: 'חוסרים',
    tabSets: 'סטים',
    tabMessages: 'הודעות',
    tabAdmin: 'ניהול',
    tabSettings: 'הגדרות',
    tabFeedback: 'תמיכה',
    logout: 'התנתקות',
    records: (n: number) => `${n} תקליטים`,
    myCollection: 'האוסף שלי',
    addRecord: '+ הוסף תקליט',
    missing: (n: number) => `${n} חוסרים`,
    completeCollection: 'להשלמת האוסף',
    addToWantlist: '+ הוסף לרשימה',
  },
  en: {
    tagline: 'Your collection, all in one place',
    tabCollection: 'Collection',
    tabWantlist: 'Want List',
    tabSets: 'Sets',
    tabMessages: 'Messages',
    tabAdmin: 'Admin',
    tabSettings: 'Settings',
    tabFeedback: 'Support',
    logout: 'Log out',
    records: (n: number) => `${n} records`,
    myCollection: 'My Collection',
    addRecord: '+ Add Record',
    missing: (n: number) => `${n} missing`,
    completeCollection: 'Complete Your Collection',
    addToWantlist: '+ Add to List',
  },
}

type TranslationSet = typeof translations.he

interface LangContextValue {
  lang: Lang
  dir: 'rtl' | 'ltr'
  t: TranslationSet
  toggle: () => void
}

const LangContext = createContext<LangContextValue | null>(null)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>('he')
  const dir: 'rtl' | 'ltr' = lang === 'he' ? 'rtl' : 'ltr'

  useEffect(() => {
    document.documentElement.dir = dir
    document.documentElement.lang = lang
  }, [dir, lang])

  const toggle = () => setLang((prev) => (prev === 'he' ? 'en' : 'he'))

  return (
    <LangContext.Provider value={{ lang, dir, t: translations[lang], toggle }}>
      {children}
    </LangContext.Provider>
  )
}

export function useLang() {
  const ctx = useContext(LangContext)
  if (!ctx) throw new Error('useLang must be used within LanguageProvider')
  return ctx
}
