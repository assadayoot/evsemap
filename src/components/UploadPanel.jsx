import { useRef, useState } from 'react'
import { parseFile, TEMPLATE_CSV } from '../utils/parseFile'
import { useTranslation } from '../contexts/LanguageContext'

function downloadTemplate() {
  const blob = new Blob(['﻿' + TEMPLATE_CSV], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'ev_stations_template.csv'
  a.click()
  URL.revokeObjectURL(url)
}

export default function UploadPanel({ onUpload, uploadedCount, onClear, operatorLogos, onLogoUpload, onLogoRemove }) {
  const { t } = useTranslation()
  const inputRef = useRef(null)
  const logoFileRef = useRef(null)
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [logoName, setLogoName] = useState('')

  const handleFile = async (file) => {
    if (!file) return
    const ext = file.name.split('.').pop().toLowerCase()
    if (!['csv', 'json'].includes(ext)) {
      setError(t('onlyCsvJson'))
      return
    }
    setLoading(true)
    setError(null)
    try {
      const stations = await parseFile(file)
      onUpload(stations)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const onDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    handleFile(e.dataTransfer.files[0])
  }

  const handleLogoFile = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const name = logoName.trim()
    if (!name) {
      setError(t('enterOperatorName'))
      e.target.value = ''
      return
    }
    if (!file.type.startsWith('image/')) {
      setError(t('onlyImageFiles'))
      e.target.value = ''
      return
    }
    setError(null)
    const reader = new FileReader()
    reader.onload = (ev) => {
      onLogoUpload(name, ev.target.result)
      setLogoName('')
      e.target.value = ''
    }
    reader.readAsDataURL(file)
  }

  const logoEntries = Object.entries(operatorLogos ?? {})

  return (
    <div className="flex-shrink-0 px-4 py-3 bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-700 space-y-2">

      {/* Row 1: CSV/JSON upload */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide flex-shrink-0">
          {t('uploadData')}
        </span>

        <div
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border-2 border-dashed cursor-pointer transition-colors text-sm
            ${dragging
              ? 'border-green-400 bg-green-50 dark:bg-green-900/30 text-green-600'
              : 'border-gray-300 dark:border-gray-600 hover:border-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 text-gray-600 dark:text-gray-400'
            }`}
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
            </svg>
          )}
          <span>{loading ? t('readingFile') : 'CSV / JSON'}</span>
        </div>
        <input ref={inputRef} type="file" accept=".csv,.json" className="hidden"
          onChange={e => handleFile(e.target.files[0])} />

        <button
          onClick={downloadTemplate}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
          </svg>
          {t('downloadTemplate')}
        </button>

        {uploadedCount > 0 && (
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-xs text-green-600 dark:text-green-400 font-medium">
              {t('uploadedStations', uploadedCount)}
            </span>
            <button onClick={onClear} className="text-xs text-red-500 hover:text-red-600 dark:hover:text-red-400 transition-colors">
              {t('clearData')}
            </button>
          </div>
        )}

        {error && (
          <span className="text-xs text-red-500 dark:text-red-400">⚠️ {error}</span>
        )}
      </div>

      <p className="text-xs text-gray-400 dark:text-gray-500">
        {t('columnsLabel')}{' '}
        <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">
          name, <span className="text-blue-500 dark:text-blue-400">name-eng</span>, lat, lng, address, <span className="text-blue-500 dark:text-blue-400">address-eng</span>, <span className="text-green-600 dark:text-green-400">province</span>, <span className="text-blue-500 dark:text-blue-400">province-eng</span>, operator, num_chargers, ccs2, chademo, ac7kw, ac22kw, status
        </code>
      </p>

      {/* Row 2: Operator logo upload */}
      <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-gray-200 dark:border-gray-700">
        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide flex-shrink-0">
          {t('operatorLogosLabel')}
        </span>

        <input
          type="text"
          value={logoName}
          onChange={e => setLogoName(e.target.value)}
          placeholder={t('operatorNamePlaceholder')}
          className="flex-1 min-w-0 max-w-48 text-xs px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-green-400"
        />

        <button
          onClick={() => logoFileRef.current?.click()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 border border-blue-200 dark:border-blue-700 transition-colors flex-shrink-0"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <path d="m21 15-5-5L5 21" />
          </svg>
          {t('selectPNG')}
        </button>
        <input ref={logoFileRef} type="file" accept="image/*" className="hidden" onChange={handleLogoFile} />

        {/* Logo chips */}
        {logoEntries.map(([name, src]) => (
          <div key={name} className="flex items-center gap-1.5 pl-1 pr-2 py-0.5 rounded-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-xs text-gray-700 dark:text-gray-300">
            <img src={src} alt={name} className="w-5 h-5 rounded-full object-contain bg-gray-50 dark:bg-gray-600" />
            <span className="max-w-24 truncate">{name}</span>
            <button
              onClick={() => onLogoRemove(name)}
              className="text-gray-400 hover:text-red-500 transition-colors leading-none"
              title={t('deleteLogoTitle')}
            >
              ×
            </button>
          </div>
        ))}

        {logoEntries.length === 0 && (
          <span className="text-xs text-gray-400 dark:text-gray-500 italic">{t('noLogos')}</span>
        )}
      </div>
    </div>
  )
}
