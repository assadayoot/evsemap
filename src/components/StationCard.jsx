import { useState } from 'react'
import { getOperatorColor, getOperatorKey } from './FilterPanel'
import { STATUS_COLORS } from '../utils/parseFile'
import { useDraggable } from '../hooks/useDraggable'
import { useTranslation } from '../contexts/LanguageContext'
import AdBanner from './AdBanner'

const STATUS_ICONS = { 'ว่าง': '⚡', 'ทำงาน': '🔌', 'นอน': '💤', 'พักผ่อน': '🔧' }

const CONNECTOR_DISPLAY = [
  { key: 'CCS2_std',   label: 'CCS2 ≤100kW',    cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300' },
  { key: 'CCS2_hpc',   label: 'CCS2 101-239kW',  cls: 'bg-sky-100 text-sky-700 dark:bg-sky-900/60 dark:text-sky-300' },
  { key: 'CCS2_ultra', label: 'CCS2 ≥240kW',     cls: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300' },
  { key: 'CHAdeMO',    label: 'CHAdeMO',          cls: 'bg-purple-100 text-purple-700 dark:bg-purple-900/60 dark:text-purple-300' },
  { key: 'AC',         label: 'AC 7-22kW',        cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300', span: 2 },
]

function categorizeConnectors(connections) {
  const counts = { CCS2_std: 0, CCS2_hpc: 0, CCS2_ultra: 0, CHAdeMO: 0, AC: 0 }
  const others = []

  for (const c of connections) {
    const t = (c.ConnectionType?.Title ?? '').toLowerCase()
    const qty = c.Quantity || 1
    const power = c.PowerKW || 0

    if (t.includes('ccs')) {
      if (power >= 240) counts.CCS2_ultra += qty
      else if (power > 100) counts.CCS2_hpc += qty
      else counts.CCS2_std += qty
    } else if (t.includes('chademo')) {
      counts.CHAdeMO += qty
    } else if (
      t.includes('ac') ||
      t.includes('type 2') ||
      t.includes('iec 62196')
    ) {
      if (!t.includes('tesla')) counts.AC += qty
      else others.push(c)
    } else {
      others.push(c)
    }
  }

  return { counts, others }
}

function OtherConnectorBadge({ connection }) {
  const type = connection.ConnectionType?.Title ?? 'Unknown'
  const power = connection.PowerKW ? `${connection.PowerKW} kW` : ''
  const qty = connection.Quantity ? `×${connection.Quantity}` : ''
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-xs text-gray-700 dark:text-gray-300">
      <span className="font-medium">{type}</span>
      {power && <span className="text-green-600 dark:text-green-400">{power}</span>}
      {qty && <span className="text-gray-500">{qty}</span>}
    </span>
  )
}

export default function StationCard({ station, onClose, onRouteToHere, operatorsMap = {} }) {
  const { t, lang } = useTranslation()
  const [collapsed, setCollapsed] = useState(false)

  const isMobile = window.innerWidth < 640
  const initX = isMobile ? 16 : Math.max(16, (window.innerWidth - 448) / 2)
  const initY = isMobile ? Math.max(8, window.innerHeight - 530) : Math.max(80, window.innerHeight - 340)
  const { pos, onPointerDown, onPointerMove, onPointerUp } = useDraggable(initX, initY)

  if (!station) return null

  const info = station.AddressInfo
  const operator = station.OperatorInfo?.Title ?? t('unknownOperator')
  const operatorKey = getOperatorKey(operator)
  const operatorDisplayName = operatorsMap[operatorKey]?.name || operator
  const connections = station.Connections ?? []
  const points = station.NumberOfPoints
  const numCharger = station._numCharger

  const stationTitle = lang === 'en'
    ? (info?.TitleEn || info?.Title || t('defaultStationTitle'))
    : (info?.Title || t('defaultStationTitle'))
  const stationAddress = lang === 'en'
    ? [info?.AddressLine1En || info?.AddressLine1, info?.TownEn || info?.Town].filter(Boolean).join(', ')
    : [info?.AddressLine1, info?.Town].filter(Boolean).join(', ')
  const stationProvince = lang === 'en'
    ? (info?.ProvinceEn || info?.Province || '')
    : (info?.Province || '')

  const uploadedStatus = station._uploaded ? station._status : null
  const ocmStatus = station.StatusType?.Title
  const isOcmOpen = ocmStatus?.toLowerCase().includes('operational') || ocmStatus?.toLowerCase().includes('open')

  const { counts, others } = categorizeConnectors(connections)
  const hasKnownCounts = Object.values(counts).some(v => v > 0)

  return (
    <div
      className="z-20 w-[calc(100%-2rem)] max-w-md"
      style={{ position: 'fixed', left: pos.x, top: pos.y }}
    >
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-4">

        {/* Header: drag handle + name + close */}
        <div
          className="flex items-start justify-between gap-2 mb-3 cursor-move select-none"
          style={{ touchAction: 'none' }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        >
          <div className="flex items-start gap-2.5 min-w-0">
            <svg className="w-3 h-3 text-gray-300 dark:text-gray-600 flex-shrink-0 mt-1" viewBox="0 0 16 16" fill="currentColor">
              <circle cx="5" cy="4" r="1.2"/><circle cx="11" cy="4" r="1.2"/>
              <circle cx="5" cy="8" r="1.2"/><circle cx="11" cy="8" r="1.2"/>
              <circle cx="5" cy="12" r="1.2"/><circle cx="11" cy="12" r="1.2"/>
            </svg>
            <div className="min-w-0">
              {station._uploaded && (
                <span className="inline-block text-xs bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300 px-2 py-0.5 rounded-full mb-1">
                  {t('fromUploadedFile')}
                </span>
              )}
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm leading-tight">
                {stationTitle}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-tight">
                {stationAddress}
              </p>
              {stationProvince && (
                <span className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-700">
                  📍 {stationProvince}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={() => setCollapsed(c => !c)}
              onPointerDown={e => e.stopPropagation()}
              className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400"
              title={collapsed ? 'ขยาย' : 'ยุบ'}
            >
              <svg className={`w-4 h-4 transition-transform duration-200 ${collapsed ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>
            <button
              onClick={onClose}
              onPointerDown={e => e.stopPropagation()}
              className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {!collapsed && <>{/* Operator + Status + Charger count */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          {operatorsMap[operatorKey]?.logo_url ? (
            <img
              src={operatorsMap[operatorKey].logo_url}
              alt={operatorDisplayName}
              className="h-6 max-w-[80px] object-contain"
            />
          ) : (
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getOperatorColor(operator)}`}>
              {operatorDisplayName}
            </span>
          )}

          {uploadedStatus && (
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[uploadedStatus]?.label ?? ''}`}>
              {STATUS_ICONS[uploadedStatus]} {uploadedStatus}
            </span>
          )}

          {!uploadedStatus && ocmStatus && (
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
              isOcmOpen
                ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
            }`}>
              {isOcmOpen ? t('operational') : ocmStatus}
            </span>
          )}

          {numCharger > 0 && (
            <span className="ml-auto text-xs font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">
              {t('chargerCount', numCharger)}
            </span>
          )}
        </div>

        {/* Connector breakdown */}
        {(hasKnownCounts || connections.length > 0) && (
          <div className="mb-3">
            <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1.5">
              {t('connectorsLabel')}
            </p>
            {hasKnownCounts && (
              <div className="grid grid-cols-2 gap-1.5 mb-2">
                {CONNECTOR_DISPLAY.map(({ key, label, cls, span }) => (
                  <div
                    key={key}
                    className={`rounded-lg py-2 px-1 text-center transition-opacity ${span === 2 ? 'col-span-2' : ''} ${
                      counts[key] > 0 ? cls : 'bg-gray-50 dark:bg-gray-800/50 text-gray-400 dark:text-gray-600 opacity-50'
                    }`}
                  >
                    <p className="text-base font-bold leading-none">
                      {counts[key] > 0 ? counts[key] : '—'}
                    </p>
                    <p className="text-[10px] leading-tight mt-1 font-medium">{label}</p>
                  </div>
                ))}
              </div>
            )}
            {others.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {others.map((c, i) => <OtherConnectorBadge key={i} connection={c} />)}
              </div>
            )}
          </div>
        )}

        {/* Station card ad */}
        <div className="mb-3 rounded-lg overflow-hidden">
          <AdBanner position="station_card" />
        </div>

        {/* Action buttons */}
        <div className="flex flex-col gap-2">
          {onRouteToHere && (
            <button
              onClick={() => onRouteToHere(station)}
              className="flex items-center justify-center gap-2 w-full py-2 rounded-lg bg-green-500 hover:bg-green-600 active:scale-95 text-white text-sm font-semibold transition-all"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <circle cx="6" cy="19" r="2" />
                <circle cx="18" cy="5" r="2" />
                <path d="M6 17V9a6 6 0 0 1 6-6h2M18 7v8a6 6 0 0 1-6 6H10" />
              </svg>
              {t('routeToHere')}
            </button>
          )}

          <a
            href={`https://www.google.com/maps/search/?api=1&query=${info?.Latitude},${info?.Longitude}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-2 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 text-sm font-medium transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7Z" />
              <circle cx="12" cy="9" r="2.5" />
            </svg>
            {t('openInGoogleMaps')}
          </a>
        </div>
        </>}
      </div>
    </div>
  )
}
