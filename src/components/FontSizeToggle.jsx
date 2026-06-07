import { useFontSize } from '../contexts/FontSizeContext'
import { useTranslation } from '../contexts/LanguageContext'

const SIZES = ['small', 'medium', 'large', 'xlarge']

const DISPLAY = {
  small:  { label: 'A', style: { fontSize: '11px' } },
  medium: { label: 'A', style: { fontSize: '13px' } },
  large:  { label: 'A', style: { fontSize: '16px' } },
  xlarge: { label: 'A', style: { fontSize: '19px' } },
}

export default function FontSizeToggle() {
  const { size, setFontSize } = useFontSize()
  const { lang } = useTranslation()

  const cycle = () => {
    const next = SIZES[(SIZES.indexOf(size) + 1) % SIZES.length]
    setFontSize(next)
  }

  const { label, style } = DISPLAY[size] ?? DISPLAY.medium

  const { t } = useTranslation()
  return (
    <button
      onClick={cycle}
      title={lang === 'en' ? 'Font Size' : 'ขนาดตัวอักษร'}
      className="flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-gray-700 dark:text-gray-200"
    >
      <span className="w-5 h-5 flex items-center justify-center font-bold" style={style}>{label}</span>
      <span className="text-[9px] leading-none font-medium">{t('fontLabel')}</span>
    </button>
  )
}
