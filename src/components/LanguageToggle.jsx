import { useLanguage } from '../contexts/LanguageContext'

export default function LanguageToggle() {
  const { lang, toggleLang } = useLanguage()

  return (
    <div className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600 text-xs font-semibold flex-shrink-0">
      <button
        onClick={() => lang !== 'th' && toggleLang()}
        className={`px-2.5 py-1.5 transition-colors ${
          lang === 'th'
            ? 'bg-green-500 text-white'
            : 'bg-white dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600'
        }`}
      >
        TH
      </button>
      <button
        onClick={() => lang !== 'en' && toggleLang()}
        className={`px-2.5 py-1.5 transition-colors ${
          lang === 'en'
            ? 'bg-green-500 text-white'
            : 'bg-white dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600'
        }`}
      >
        EN
      </button>
    </div>
  )
}
