import { useState, useEffect, useRef, useCallback } from 'react'
import { findStationsNearRoute } from '../utils/routeUtils'
import { getOperatorColor, getOperatorKey } from './FilterPanel'
import { useDraggable } from '../hooks/useDraggable'
import { useTranslation } from '../contexts/LanguageContext'
import { useRouteRateLimit, ROUTE_LIMIT } from '../hooks/useRouteRateLimit'
import { useRouteLog } from '../hooks/useRouteLog'
import { getRecaptchaToken, recaptchaEnabled } from '../utils/recaptcha'
import AdBanner from './AdBanner'

function doGeocode(lat, lng, cb) {
  new window.google.maps.Geocoder().geocode({ location: { lat, lng } }, (results, status) => {
    cb(status === 'OK' && results[0] ? results[0].formatted_address : `${lat.toFixed(5)}, ${lng.toFixed(5)}`)
  })
}

function calcRoute(from, to, waypoint, onResult, onError, setLoading, errorMsg) {
  setLoading(true)
  const req = {
    origin: { lat: from.lat, lng: from.lng },
    destination: { lat: to.lat, lng: to.lng },
    travelMode: window.google.maps.TravelMode.DRIVING,
  }
  if (waypoint) {
    req.waypoints = [{ location: { lat: waypoint.lat, lng: waypoint.lng }, stopover: true }]
  }
  new window.google.maps.DirectionsService().route(req, (result, status) => {
    setLoading(false)
    if (status === 'OK') onResult(result)
    else {
      console.error('[Directions] status:', status, result)
      onError(`${errorMsg} (${status})`)
    }
  })
}

export default function RoutingPanel({
  isOpen,
  mapsLoaded,
  origin,
  dest,
  onOriginChange,
  onDestChange,
  routeResult,
  onRouteResult,
  routeClickMode,
  onRouteClickModeChange,
  allStations,
  onClose,
  operatorsMap = {},
  userLocation,
}) {
  const { t, lang } = useTranslation()
  const { cooldown, remaining, check, record } = useRouteRateLimit()
  const { logRoute } = useRouteLog()
  const [originText, setOriginText] = useState('')
  const [destText, setDestText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [routeStations, setRouteStations] = useState([])
  const [expandedStation, setExpandedStation] = useState(null)
  const [honeypot, setHoneypot] = useState('')
  const [collapsed, setCollapsed] = useState(false)
  const isMobile = window.innerWidth < 640
  const initX = isMobile ? 8 : 16
  const initY = isMobile ? Math.max(8, window.innerHeight - 520) : 16
  const { pos, onPointerDown, onPointerMove, onPointerUp, resetPos } = useDraggable(initX, initY)

  const originInputRef = useRef(null)
  const destInputRef = useRef(null)
  const originAcRef = useRef(null)
  const destAcRef = useRef(null)
  const prevOrigin = useRef(null)
  const prevDest = useRef(null)

  useEffect(() => {
    if (isOpen) {
      resetPos(initX, initY)
      setCollapsed(false)
    }
  }, [isOpen, resetPos])

  useEffect(() => {
    if (origin && origin !== prevOrigin.current) {
      prevOrigin.current = origin
      setOriginText(origin.label || '')
    }
  }, [origin])

  useEffect(() => {
    if (dest && dest !== prevDest.current) {
      prevDest.current = dest
      setDestText(dest.label || '')
    }
  }, [dest])

  useEffect(() => {
    if (!mapsLoaded || !isOpen) return
    const opts = {
      fields: ['formatted_address', 'geometry', 'name'],
      componentRestrictions: { country: 'th' },
    }
    if (originInputRef.current && !originAcRef.current) {
      originAcRef.current = new window.google.maps.places.Autocomplete(originInputRef.current, opts)
      originAcRef.current.addListener('place_changed', () => {
        const place = originAcRef.current.getPlace()
        if (place.geometry?.location) {
          const label = place.name || place.formatted_address
          setOriginText(label)
          onOriginChange({ lat: place.geometry.location.lat(), lng: place.geometry.location.lng(), label })
        }
      })
    }
    if (destInputRef.current && !destAcRef.current) {
      destAcRef.current = new window.google.maps.places.Autocomplete(destInputRef.current, opts)
      destAcRef.current.addListener('place_changed', () => {
        const place = destAcRef.current.getPlace()
        if (place.geometry?.location) {
          const label = place.name || place.formatted_address
          setDestText(label)
          onDestChange({ lat: place.geometry.location.lat(), lng: place.geometry.location.lng(), label })
        }
      })
    }
  }, [mapsLoaded, isOpen, onOriginChange, onDestChange])

  useEffect(() => {
    if (!routeResult) { setRouteStations([]); return }
    setRouteStations(findStationsNearRoute(allStations, routeResult, 500))
    setExpandedStation(null)
  }, [routeResult, allStations])

  const handleGps = useCallback(() => {
    if (userLocation) {
      doGeocode(userLocation.lat, userLocation.lng, label => {
        setOriginText(label)
        onOriginChange({ lat: userLocation.lat, lng: userLocation.lng, label })
      })
      return
    }
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(pos => {
      const { latitude: lat, longitude: lng } = pos.coords
      doGeocode(lat, lng, label => {
        setOriginText(label)
        onOriginChange({ lat, lng, label })
      })
    })
  }, [onOriginChange, userLocation])

  const handleSwap = useCallback(() => {
    const [newOrigin, newDest] = [dest, origin]
    const [newOT, newDT] = [destText, originText]
    setOriginText(newOT)
    setDestText(newDT)
    onOriginChange(newOrigin)
    onDestChange(newDest)
  }, [origin, dest, originText, destText, onOriginChange, onDestChange])

  const handleCalculate = useCallback(async () => {
    if (!origin || !dest) return

    // ── Honeypot: bot filled the hidden field ─────────────────────────
    if (honeypot) return

    // ── Client-side rate limit ────────────────────────────────────────
    if (cooldown > 0) return
    const rateCheck = check()
    if (!rateCheck.allowed) {
      setError(`ถึงขีดจำกัด ${ROUTE_LIMIT} ครั้ง/ชั่วโมงแล้ว กรุณารออีก ${rateCheck.waitMin} นาที`)
      return
    }

    setError(null)

    // ── reCAPTCHA v3 (invisible) ──────────────────────────────────────
    if (recaptchaEnabled) {
      const token = await getRecaptchaToken('find_route')
      if (!token) {
        setError('ไม่สามารถยืนยันตัวตนได้ กรุณาลองใหม่อีกครั้ง')
        return
      }
    }

    // ── Record & proceed ──────────────────────────────────────────────
    record()
    calcRoute(origin, dest, null, (result) => {
      onRouteResult(result)
      logRoute({ origin, dest, result })
    }, setError, setLoading, t('routeError'))
  }, [origin, dest, honeypot, cooldown, check, record, onRouteResult, logRoute, t])

  const handleAddWaypoint = useCallback((station) => {
    const stLat = station.AddressInfo.Latitude
    const stLng = station.AddressInfo.Longitude

    let url = 'https://www.google.com/maps/dir/?api=1&travelmode=driving'
    if (origin) url += `&origin=${origin.lat},${origin.lng}`
    if (dest) {
      url += `&waypoints=${stLat},${stLng}&destination=${dest.lat},${dest.lng}`
    } else {
      url += `&destination=${stLat},${stLng}`
    }

    window.open(url, '_blank', 'noopener,noreferrer')
  }, [origin, dest])

  const handleClose = useCallback(() => {
    setOriginText('')
    setDestText('')
    setError(null)
    setExpandedStation(null)
    prevOrigin.current = null
    prevDest.current = null
    originAcRef.current = null
    destAcRef.current = null
    onClose()
  }, [onClose])

  const legs = routeResult?.routes?.[0]?.legs ?? []
  const totalDistM = legs.reduce((s, l) => s + l.distance.value, 0)
  const totalDurS = legs.reduce((s, l) => s + l.duration.value, 0)
  const fmtDist = totalDistM >= 1000
    ? `${(totalDistM / 1000).toFixed(1)} ${t('km')}`
    : `${totalDistM} ${t('m')}`
  const fmtDur = totalDurS >= 3600
    ? `${Math.floor(totalDurS / 3600)} ${t('hr')} ${Math.ceil((totalDurS % 3600) / 60)} ${t('min')}`
    : `${Math.ceil(totalDurS / 60)} ${t('min')}`

  return (
    <div
      className={`z-20 transition-opacity duration-200 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      style={{ position: 'fixed', left: pos.x, top: pos.y, width: isMobile ? 'calc(100vw - 16px)' : '20rem' }}
    >
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col max-h-[80vh]">

        {/* Header — drag handle */}
        <div
          className="flex items-center justify-between px-4 pt-3 pb-2 flex-shrink-0 cursor-move select-none"
          style={{ touchAction: 'none' }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        >
          <h2 className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-gray-400" viewBox="0 0 16 16" fill="currentColor">
              <circle cx="5" cy="4" r="1.2"/><circle cx="11" cy="4" r="1.2"/>
              <circle cx="5" cy="8" r="1.2"/><circle cx="11" cy="8" r="1.2"/>
              <circle cx="5" cy="12" r="1.2"/><circle cx="11" cy="12" r="1.2"/>
            </svg>
            <span className="text-base">🗺️</span> {t('routingTitle')}
          </h2>
          <div className="flex items-center gap-1">
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
              onClick={handleClose}
              onPointerDown={e => e.stopPropagation()}
              className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body — hidden when collapsed */}
        {!collapsed && <>

        {/* Map-click mode banner */}
        {routeClickMode && (
          <div className="mx-4 mb-2 px-3 py-2 bg-green-50 dark:bg-green-900/30 rounded-lg flex items-center justify-between flex-shrink-0">
            <span className="text-xs text-green-700 dark:text-green-300">
              {routeClickMode === 'origin' ? t('clickOrigin') : t('clickDest')}
            </span>
            <button
              onClick={() => onRouteClickModeChange(null)}
              className="text-xs font-semibold text-green-600 dark:text-green-400 ml-3"
            >
              {t('cancel')}
            </button>
          </div>
        )}

        {/* Inputs */}
        <div className="px-4 pb-3 flex-shrink-0">
          {/* Origin row */}
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2.5 h-2.5 rounded-full bg-green-500 flex-shrink-0" />
            <input
              ref={originInputRef}
              value={originText}
              onChange={e => setOriginText(e.target.value)}
              onFocus={() => onRouteClickModeChange('origin')}
              placeholder={t('originPlaceholder')}
              className={`flex-1 text-sm px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 outline-none min-w-0 transition-shadow ${
                routeClickMode === 'origin' ? 'ring-2 ring-green-500' : 'focus:ring-2 focus:ring-green-500'
              }`}
            />
            {/* GPS */}
            <button
              onClick={handleGps}
              title={t('useCurrentLocation')}
              className="flex-shrink-0 flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /><circle cx="12" cy="12" r="9" />
              </svg>
              <span className="text-[9px] leading-none font-medium">{t('gpsLabel')}</span>
            </button>
            {/* Map click for origin */}
            <button
              onClick={() => onRouteClickModeChange(routeClickMode === 'origin' ? null : 'origin')}
              title={t('clickOnMap')}
              className={`flex-shrink-0 flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg transition-colors ${
                routeClickMode === 'origin'
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400'
              }`}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7Z" /><circle cx="12" cy="9" r="2.5" />
              </svg>
              <span className="text-[9px] leading-none font-medium">{t('mapClickLabel')}</span>
            </button>
          </div>

          {/* Vertical line + swap */}
          <div className="flex items-center gap-2 my-0.5 ml-1">
            <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 ml-0.5" />
            <button
              onClick={handleSwap}
              title={t('swapPoints')}
              className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M7 16V4m0 0L3 8m4-4 4 4M17 8v12m0 0 4-4m-4 4-4-4" />
              </svg>
            </button>
          </div>

          {/* Destination row */}
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500 flex-shrink-0" />
            <input
              ref={destInputRef}
              value={destText}
              onChange={e => setDestText(e.target.value)}
              onFocus={() => onRouteClickModeChange('dest')}
              placeholder={t('destPlaceholder')}
              className={`flex-1 text-sm px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 outline-none min-w-0 transition-shadow ${
                routeClickMode === 'dest' ? 'ring-2 ring-red-500' : 'focus:ring-2 focus:ring-green-500'
              }`}
            />
            {/* Map click for dest */}
            <button
              onClick={() => onRouteClickModeChange(routeClickMode === 'dest' ? null : 'dest')}
              title={t('clickOnMap')}
              className={`flex-shrink-0 flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg transition-colors ${
                routeClickMode === 'dest'
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400'
              }`}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7Z" /><circle cx="12" cy="9" r="2.5" />
              </svg>
              <span className="text-[9px] leading-none font-medium">{t('mapClickLabel')}</span>
            </button>
          </div>

          {/* Hint: click station on map */}
          {!dest && (
            <p className="mt-1.5 text-[11px] text-gray-400 dark:text-gray-500 flex items-center gap-1">
              <svg className="w-3 h-3 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7Z" /><circle cx="12" cy="9" r="2.5" />
              </svg>
              {t('stationAsDestHint')}
            </p>
          )}

          {/* Honeypot — visually hidden, bots may fill it */}
          <input
            tabIndex={-1}
            autoComplete="off"
            name="website"
            value={honeypot}
            onChange={e => setHoneypot(e.target.value)}
            aria-hidden="true"
            style={{ position: 'absolute', left: '-9999px', width: '1px', height: '1px', opacity: 0 }}
          />

          {/* Quota indicator */}
          {remaining < ROUTE_LIMIT && (
            <p className={`mt-2 text-[11px] text-right ${remaining <= 2 ? 'text-red-400' : 'text-amber-400'}`}>
              เหลือ {remaining}/{ROUTE_LIMIT} คำขอ/ชั่วโมง
            </p>
          )}

          {/* Calculate button */}
          <button
            onClick={handleCalculate}
            disabled={!origin || !dest || loading || cooldown > 0}
            className="w-full mt-3 py-2.5 rounded-xl bg-green-500 hover:bg-green-600 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-sm transition-all"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />
                {t('calculatingRoute')}
              </span>
            ) : cooldown > 0 ? (
              `รอ ${cooldown} วินาที...`
            ) : t('findRoute')}
          </button>

          {error && <p className="mt-2 text-xs text-red-500 dark:text-red-400">{error}</p>}
        </div>

        {/* Results */}
        {routeResult && (
          <div className="border-t border-gray-200 dark:border-gray-700 flex flex-col min-h-0 overflow-y-auto">

            {/* Summary bar */}
            <div className="px-4 py-3 flex items-center gap-3 bg-green-50 dark:bg-green-900/20 flex-shrink-0">
              <div className="text-center flex-1">
                <p className="text-base font-bold text-green-600 dark:text-green-400 leading-tight">{fmtDist}</p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">{t('distance')}</p>
              </div>
              <div className="w-px h-8 bg-green-200 dark:bg-green-800" />
              <div className="text-center flex-1">
                <p className="text-base font-bold text-green-600 dark:text-green-400 leading-tight">{fmtDur}</p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">{t('travelTime')}</p>
              </div>
              <div className="w-px h-8 bg-green-200 dark:bg-green-800" />
              <div className="text-center flex-1">
                <p className="text-base font-bold text-gray-700 dark:text-gray-200 leading-tight">{routeStations.length}</p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">{t('chargingStations')}</p>
              </div>
            </div>

            {/* Ad banner */}
            <div className="px-3 py-2 flex-shrink-0">
              <AdBanner position="routing_panel" />
            </div>

            {/* Station list */}
            <div>
              {routeStations.length === 0 ? (
                <p className="px-4 py-4 text-sm text-center text-gray-500 dark:text-gray-400">
                  {t('noStationsNearRoute')}
                </p>
              ) : (
                <>
                  <p className="px-4 pt-2.5 pb-1 text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">
                    {t('stationsAlongRoute', routeStations.length)}
                  </p>
                  {routeStations.map(station => (
                    <StationRow
                      key={station.ID}
                      station={station}
                      isExpanded={expandedStation?.ID === station.ID}
                      onToggle={() => setExpandedStation(prev => prev?.ID === station.ID ? null : station)}
                      onNavigate={() => handleAddWaypoint(station)}
                      t={t}
                      lang={lang}
                      operatorsMap={operatorsMap}
                    />
                  ))}
                </>
              )}
            </div>
          </div>
        )}

        </>}
      </div>
    </div>
  )
}

const COMPACT_CONNECTORS = [
  { key: 'CCS2_std',   short: 'CCS2 ≤100kW',    cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300' },
  { key: 'CCS2_hpc',   short: 'CCS2 101-239kW',  cls: 'bg-sky-100 text-sky-700 dark:bg-sky-900/60 dark:text-sky-300' },
  { key: 'CCS2_ultra', short: 'CCS2 ≥240kW',     cls: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300' },
  { key: 'CHAdeMO',    short: 'CHAdeMO',          cls: 'bg-purple-100 text-purple-700 dark:bg-purple-900/60 dark:text-purple-300' },
  { key: 'AC',         short: 'AC',               cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300' },
]

function countConnectors(connections) {
  const counts = { CCS2_std: 0, CCS2_hpc: 0, CCS2_ultra: 0, CHAdeMO: 0, AC: 0 }
  for (const c of connections) {
    const name = (c.ConnectionType?.Title ?? '').toLowerCase()
    const qty = c.Quantity || 1
    const power = c.PowerKW || 0
    if (name.includes('ccs')) {
      if (power >= 240) counts.CCS2_ultra += qty
      else if (power > 100) counts.CCS2_hpc += qty
      else counts.CCS2_std += qty
    } else if (name.includes('chademo')) {
      counts.CHAdeMO += qty
    } else if (name.includes('ac') || name.includes('type 2') || name.includes('iec 62196')) {
      if (!name.includes('tesla')) counts.AC += qty
    }
  }
  return counts
}

function StationRow({ station, isExpanded, onToggle, onNavigate, t, lang, operatorsMap = {} }) {
  const info = station.AddressInfo
  const title = lang === 'en'
    ? (info?.TitleEn || info?.Title || t('defaultStationTitle'))
    : (info?.Title || t('defaultStationTitle'))
  const address = lang === 'en'
    ? [info?.AddressLine1En || info?.AddressLine1, info?.TownEn || info?.Town].filter(Boolean).join(', ')
    : [info?.AddressLine1, info?.Town].filter(Boolean).join(', ')
  const dist = station._distFromRoute
  const distLabel = dist < 1000
    ? `${dist} ${t('m')}`
    : `${(dist / 1000).toFixed(1)} ${t('km')}`
  const distFromStart = station._distFromStart
  const distFromStartLabel = distFromStart != null
    ? (distFromStart < 1000
      ? `${distFromStart} ${t('m')}`
      : `${(distFromStart / 1000).toFixed(1)} ${t('km')}`)
    : null
  const operator = station.OperatorInfo?.Title ?? ''
  const operatorKey = getOperatorKey(operator)
  const operatorDisplayName = operatorsMap[operatorKey]?.name || operator
  const numCharger = station._numCharger
  const connCounts = countConnectors(station.Connections ?? [])
  const activeConnectors = COMPACT_CONNECTORS.filter(c => connCounts[c.key] > 0)

  return (
    <div className="border-b border-gray-100 dark:border-gray-800 last:border-0">
      <button
        onClick={onToggle}
        className="w-full px-4 py-2.5 flex items-center gap-2.5 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
      >
        {operatorsMap[operatorKey]?.logo_url
          ? <img src={operatorsMap[operatorKey].logo_url} alt={operatorDisplayName} className="w-14 h-14 object-contain flex-shrink-0 rounded" />
          : <span className="text-base mt-0.5 flex-shrink-0">⚡</span>
        }
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 dark:text-white truncate leading-snug">{title}</p>
          {address && <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate">{address}</p>}

          {/* Distance + charger count */}
          <div className="flex items-center gap-x-2 mt-0.5 flex-wrap">
            <span className="text-[11px] text-gray-400 dark:text-gray-500">{t('fromRoute')} {distLabel}</span>
            {distFromStartLabel && (
              <span className="text-[11px] text-blue-400 dark:text-blue-500">{t('fromStart')} {distFromStartLabel}</span>
            )}
            {numCharger > 0 && (
              <span className="ml-auto text-[11px] font-semibold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded-full">
                EVSE {numCharger}
              </span>
            )}
          </div>

          {/* Connector chips */}
          {activeConnectors.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {activeConnectors.map(({ key, short, cls }) => (
                <span key={key} className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${cls}`}>
                  {short} ×{connCounts[key]}
                </span>
              ))}
            </div>
          )}
        </div>
        <svg
          className={`w-4 h-4 text-gray-400 flex-shrink-0 mt-1 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {isExpanded && (
        <div className="px-4 pb-3 pt-0">
          {operator && !operatorsMap[operatorKey]?.logo_url && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
              {t('operatorLabel')} <span className={`font-medium px-1.5 py-0.5 rounded ${getOperatorColor(operator)}`}>{operatorDisplayName}</span>
            </p>
          )}
          <p className="text-[10px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-lg px-2.5 py-1.5 mb-2 leading-relaxed">
            ⚠️ {lang === 'en'
              ? 'Please verify station availability with the operator\'s app before visiting.'
              : 'กรุณาตรวจสอบข้อมูลสถานีกับแอปของ operator เพื่อยืนยันความถูกต้องอีกครั้ง'}
          </p>
          <button
            onClick={onNavigate}
            className="w-full py-2 rounded-lg bg-green-500 hover:bg-green-600 active:scale-95 text-white text-sm font-semibold transition-all flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7Z" /><circle cx="12" cy="9" r="2.5" />
            </svg>
            {t('chargeHere')}
          </button>
        </div>
      )}
    </div>
  )
}
