const OPERATOR_COLORS = {
  'pttor':      'bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-200 border-teal-300 dark:border-teal-700',
  'ea':         'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200 border-blue-300 dark:border-blue-700',
  'sharge':     'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-200 border-orange-300 dark:border-orange-700',
  'pea':        'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-200 border-purple-300 dark:border-purple-700',
  'elexa':      'bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-200 border-cyan-300 dark:border-cyan-700',
  'evolt':      'bg-lime-100 text-lime-700 dark:bg-lime-900 dark:text-lime-200 border-lime-300 dark:border-lime-700',
  'spark':      'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-200 border-yellow-300 dark:border-yellow-700',
  'mea':        'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200 border-indigo-300 dark:border-indigo-700',
  'mg':         'bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-200 border-pink-300 dark:border-pink-700',
  'altervim':   'bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-200 border-rose-300 dark:border-rose-700',
  'espro':      'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-700',
  'phithan':    'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200 border-green-300 dark:border-green-700',
  'onion':      'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900 dark:text-fuchsia-200 border-fuchsia-300 dark:border-fuchsia-700',
  'gac':        'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200 border-red-300 dark:border-red-700',
  'galvanic':   'bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-200 border-sky-300 dark:border-sky-700',
  'chargeplus': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700',
  'gwm':        'bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-200 border-violet-300 dark:border-violet-700',
  'haup':       'bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-200 border-slate-300 dark:border-slate-700',
  'chosen':     'bg-stone-100 text-stone-700 dark:bg-stone-900 dark:text-stone-200 border-stone-300 dark:border-stone-700',
  'charge24':   'bg-zinc-100 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 border-zinc-300 dark:border-zinc-700',
  'tocharge':   'bg-red-200 text-red-900 dark:bg-red-900/50 dark:text-red-100 border-red-400 dark:border-red-600',
  'eosvolt':    'bg-purple-200 text-purple-900 dark:bg-purple-900/50 dark:text-purple-100 border-purple-400 dark:border-purple-600',
  'eigen':      'bg-sky-200 text-sky-900 dark:bg-sky-900/50 dark:text-sky-100 border-sky-400 dark:border-sky-600',
  'pump':       'bg-lime-200 text-lime-900 dark:bg-lime-900/50 dark:text-lime-100 border-lime-400 dark:border-lime-600',
  'other':      'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600',
}

const KNOWN_KEYS = new Set(Object.keys(OPERATOR_COLORS))

export function getOperatorKey(operatorName) {
  if (!operatorName) return 'other'
  const trimmed = operatorName.trim()
  if (KNOWN_KEYS.has(trimmed)) return trimmed
  const n = trimmed.toLowerCase()
  if (n === 'pttor' || n.includes('ptt'))                return 'pttor'
  if (n.includes('pea') || n.includes('volta'))          return 'pea'
  if (n.includes('ea') || n.includes('energy absolute')) return 'ea'
  if (n.includes('sharge'))                              return 'sharge'
  if (n.includes('elexa'))                               return 'elexa'
  if (n.includes('evolt'))                               return 'evolt'
  if (n.includes('spark'))                               return 'spark'
  if (n.includes('mea'))                                 return 'mea'
  if (n.includes('altervim'))                            return 'altervim'
  if (n.includes('espro'))                               return 'espro'
  if (n.includes('phithan'))                             return 'phithan'
  if (n.includes('onion'))                               return 'onion'
  if (n.includes('galvanic'))                            return 'galvanic'
  if (n.includes('gac'))                                 return 'gac'
  if (n.includes('chargeplus') || n.includes('charge+')) return 'chargeplus'
  if (n.includes('gwm'))                                 return 'gwm'
  if (n.includes('haup'))                                return 'haup'
  if (n.includes('chosen'))                              return 'chosen'
  if (n.includes('charge24') || n.includes('charge 24')) return 'charge24'
  if (n.includes('tocharge') || n.includes('to charge')) return 'tocharge'
  if (n.includes('eosvolt') || n.includes('eos'))        return 'eosvolt'
  if (n.includes('eigen'))                               return 'eigen'
  if (n.includes('pump'))                                return 'pump'
  if (n.includes('mg'))                                  return 'mg'
  return 'other'
}

export function getOperatorColor(operatorName) {
  const key = getOperatorKey(operatorName)
  return OPERATOR_COLORS[key] ?? OPERATOR_COLORS['other']
}

import { useState } from 'react'
import { useTranslation } from '../contexts/LanguageContext'

export default function FilterPanel({ operators, selected, onChange, operatorsMap = {} }) {
  const { t } = useTranslation()
  const [mobileOpen, setMobileOpen] = useState(false)

  const toggle = (op) => {
    onChange(
      selected.includes(op)
        ? selected.filter(o => o !== op)
        : [...selected, op]
    )
  }

  const allSelected = operators.every(op => selected.includes(op))
  const toggleAll = () => onChange(allSelected ? [] : [...operators])

  if (operators.length === 0) return null

  const selectedCount = operators.filter(op => selected.includes(op)).length

  const chips = operators.map(op => {
    const active = selected.includes(op)
    const colorClass = OPERATOR_COLORS[op] ?? OPERATOR_COLORS['other']
    const entry = operatorsMap[op]
    const logoUrl = entry?.logo_url
    const displayName = entry?.name || op
    return (
      <button
        key={op}
        onClick={() => toggle(op)}
        className={`px-3 py-1 rounded-full text-xs font-medium border transition-all flex items-center gap-1.5 flex-shrink-0 ${
          active
            ? colorClass
            : 'bg-white dark:bg-gray-800 text-gray-400 dark:text-gray-500 border-gray-200 dark:border-gray-600 hover:border-gray-400'
        }`}
      >
        {logoUrl && (
          <img src={logoUrl} alt="" className="h-3.5 w-auto object-contain flex-shrink-0" />
        )}
        {op === 'other' ? t('otherOperator') : displayName}
      </button>
    )
  })

  const allBtn = (
    <button
      onClick={toggleAll}
      className={`px-3 py-1 rounded-full text-xs font-bold border transition-all flex-shrink-0 ${
        allSelected
          ? 'bg-gray-800 text-white border-gray-800 dark:bg-gray-100 dark:text-gray-900 dark:border-gray-100'
          : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-400 dark:border-gray-500 hover:border-gray-600'
      }`}
    >
      ALL
    </button>
  )

  return (
    <div>
      {/* Mobile: summary bar + expandable panel */}
      <div className="sm:hidden">
        <div className="flex items-center gap-2">
          {allBtn}
          <button
            onClick={() => setMobileOpen(o => !o)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300"
          >
            <span>{selectedCount}/{operators.length} operators</span>
            <svg
              className={`w-3 h-3 transition-transform ${mobileOpen ? 'rotate-180' : ''}`}
              viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
        </div>
        {mobileOpen && (
          <div className="flex flex-wrap gap-2 mt-2 pb-1">
            {chips}
          </div>
        )}
      </div>

      {/* Desktop: always show all chips inline */}
      <div className="hidden sm:flex flex-wrap gap-2">
        {allBtn}
        {chips}
      </div>
    </div>
  )
}
