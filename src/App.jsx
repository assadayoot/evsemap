import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { ThemeProvider, useTheme } from './contexts/ThemeContext'
import { LanguageProvider, useTranslation } from './contexts/LanguageContext'
import { FontSizeProvider, useFontSize } from './contexts/FontSizeContext'
import { useStations } from './hooks/useStations'
import MapView from './components/MapView'
import StationCard from './components/StationCard'
import SearchBar from './components/SearchBar'
import FilterPanel, { getOperatorKey } from './components/FilterPanel'
import ThemeToggle from './components/ThemeToggle'
import LanguageToggle from './components/LanguageToggle'
import FontSizeToggle from './components/FontSizeToggle'
import RoutingPanel from './components/RoutingPanel'
import AdBanner from './components/AdBanner'
import HelpModal from './components/HelpModal'
import { useViewLog } from './hooks/useViewLog'
import { useOperators } from './hooks/useOperators'
import { findStationsNearRoute } from './utils/routeUtils'

const KNOWN_OPERATORS = [
  'pttor', 'ea', 'sharge', 'pea', 'elexa', 'evolt', 'spark', 'mea', 'mg',
  'altervim', 'espro', 'phithan', 'onion', 'gac', 'galvanic', 'chargeplus',
  'gwm', 'haup', 'chosen', 'charge24', 'tocharge', 'eosvolt', 'eigen', 'pump',
  'other',
]

function AppContent() {
  const { dark } = useTheme()
  const { t, lang } = useTranslation()
  const { size: fontSize } = useFontSize()
  const { stations, loading } = useStations()
  const { logView } = useViewLog()
  const operatorsMap = useOperators()

  useEffect(() => {
    const html = document.documentElement
    html.classList.remove('fs-small', 'fs-medium', 'fs-large', 'fs-xlarge')
    html.classList.add(`fs-${fontSize}`)
  }, [fontSize])
  const [selectedStation, setSelectedStation] = useState(null)
  const [search, setSearch] = useState('')
  const [activeFilters, setActiveFilters] = useState(KNOWN_OPERATORS)
  const [locating, setLocating] = useState(false)
  const [locateError, setLocateError] = useState(null)
  const [userLocation, setUserLocation] = useState(null)
  const mapRef = useRef(null)

  // Routing state
  const [helpOpen, setHelpOpen] = useState(false)
  const [routeMode, setRouteMode] = useState(false)
  const [routeOrigin, setRouteOrigin] = useState(null)
  const [routeDest, setRouteDest] = useState(null)
  const [routeResult, setRouteResult] = useState(null)
  const [routeClickMode, setRouteClickMode] = useState(null)
  const [mapsLoaded, setMapsLoaded] = useState(false)

  const operators = useMemo(() => {
    const seen = new Set()
    const extras = []
    for (const s of stations) {
      const lat = s.AddressInfo?.Latitude
      const lng = s.AddressInfo?.Longitude
      if (!lat || !lng) continue
      const key = getOperatorKey(s.OperatorInfo?.Title)
      if (!seen.has(key)) {
        seen.add(key)
        if (!KNOWN_OPERATORS.includes(key)) extras.push(key)
      }
    }
    const known = KNOWN_OPERATORS.filter(op => seen.has(op))
    return [...known, ...extras]
  }, [stations])

  useEffect(() => {
    setActiveFilters(prev => {
      const toAdd = operators.filter(op => !prev.includes(op))
      return toAdd.length > 0 ? [...prev, ...toAdd] : prev
    })
  }, [operators])

  const filteredByOperator = useMemo(() => {
    return stations.filter(s =>
      activeFilters.includes(getOperatorKey(s.OperatorInfo?.Title))
    )
  }, [stations, activeFilters])

  const filtered = useMemo(() => {
    let result = stations

    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(s =>
        s.AddressInfo?.Title?.toLowerCase().includes(q) ||
        s.AddressInfo?.TitleEn?.toLowerCase().includes(q) ||
        s.AddressInfo?.AddressLine1?.toLowerCase().includes(q) ||
        s.AddressInfo?.AddressLine1En?.toLowerCase().includes(q) ||
        s.AddressInfo?.Town?.toLowerCase().includes(q) ||
        s.AddressInfo?.TownEn?.toLowerCase().includes(q) ||
        s.AddressInfo?.Province?.toLowerCase().includes(q) ||
        s.AddressInfo?.ProvinceEn?.toLowerCase().includes(q) ||
        s.OperatorInfo?.Title?.toLowerCase().includes(q)
      )
    }

    result = result.filter(s =>
      activeFilters.includes(getOperatorKey(s.OperatorInfo?.Title))
    )

    return result
  }, [stations, search, activeFilters])

  const mapStations = useMemo(() => {
    const seen = new Set()
    return filtered.filter(s => {
      if (s._status === 'maintenance' || s._status === 'พักผ่อน') return false
      const lat = s.AddressInfo?.Latitude
      const lng = s.AddressInfo?.Longitude
      if (!lat || !lng) return false
      const key = `${lat},${lng}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }, [filtered])

  const routeMapStations = useMemo(() => {
    if (!routeResult) return mapStations
    return findStationsNearRoute(mapStations, routeResult, 2000)
  }, [mapStations, routeResult])

  const handleSelectStation = useCallback((station) => {
    setSelectedStation(station)
    if (station) logView(station)
  }, [logView])

  const handleLocate = useCallback(() => {
    setLocateError(null)
    if (!navigator.geolocation) {
      setLocateError('เบราว์เซอร์นี้ไม่รองรับ GPS')
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      pos => {
        setLocating(false)
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        setUserLocation(loc)
        if (mapRef.current) {
          mapRef.current.panTo(loc)
          mapRef.current.setZoom(14)
        }
      },
      err => {
        setLocating(false)
        if (err.code === 1) setLocateError('ไม่ได้รับอนุญาตให้เข้าถึงตำแหน่ง กรุณาอนุญาตใน settings')
        else if (err.code === 2) setLocateError('ไม่สามารถระบุตำแหน่งได้')
        else setLocateError('หมดเวลา กรุณาลองใหม่')
      },
      { timeout: 10000 }
    )
  }, [])

  const handleOpenRoute = useCallback(() => {
    setRouteMode(true)
    setSelectedStation(null)
  }, [])

  const handleCloseRoute = useCallback(() => {
    setRouteMode(false)
    setRouteOrigin(null)
    setRouteDest(null)
    setRouteResult(null)
    setRouteClickMode(null)
  }, [])

  const handleRouteToStation = useCallback((station) => {
    const info = station.AddressInfo
    const label = lang === 'en'
      ? (info?.TitleEn || info?.Title || t('defaultStationTitle'))
      : (info?.Title || info?.TitleEn || t('defaultStationTitle'))

    setRouteMode(true)
    setSelectedStation(null)
    setRouteDest({ lat: info.Latitude, lng: info.Longitude, label })
    setRouteResult(null)
    setRouteClickMode(null)

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(pos => {
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        const fallback = `${lat.toFixed(5)}, ${lng.toFixed(5)}`
        if (mapsLoaded) {
          new window.google.maps.Geocoder().geocode(
            { location: { lat, lng } },
            (results, status) => {
              const originLabel = status === 'OK' && results[0]
                ? results[0].formatted_address
                : fallback
              setRouteOrigin({ lat, lng, label: originLabel })
            }
          )
        } else {
          setRouteOrigin({ lat, lng, label: fallback })
        }
      })
    }
  }, [lang, t, mapsLoaded])

  const handleStationClickRoute = useCallback((station) => {
    const lat = station.AddressInfo.Latitude
    const lng = station.AddressInfo.Longitude
    const info = station.AddressInfo
    const label = lang === 'en'
      ? (info?.TitleEn || info?.Title || t('defaultStationTitle'))
      : (info?.Title || info?.TitleEn || t('defaultStationTitle'))
    if (routeClickMode === 'origin') {
      setRouteOrigin({ lat, lng, label })
    } else {
      setRouteDest({ lat, lng, label })
      logView(station)
    }
    setRouteClickMode(null)
  }, [lang, t, routeClickMode, logView])

  const handleMapClick = useCallback(({ lat, lng }) => {
    if (!routeClickMode || !mapsLoaded) return
    const geocoder = new window.google.maps.Geocoder()
    geocoder.geocode({ location: { lat, lng } }, (results, status) => {
      const label =
        status === 'OK' && results[0]
          ? results[0].formatted_address
          : `${lat.toFixed(5)}, ${lng.toFixed(5)}`
      const loc = { lat, lng, label }
      if (routeClickMode === 'origin') setRouteOrigin(loc)
      else setRouteDest(loc)
      setRouteClickMode(null)
    })
  }, [routeClickMode, mapsLoaded])

  return (
    <div className="flex flex-col h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-white transition-colors">
      <header className="flex-shrink-0 px-4 py-3 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-sm z-10">

        {/* Row 1: logo (left) + action buttons (right).
            On desktop the SearchBar sits between them; on mobile it wraps to row 2. */}
        <div className="flex items-center gap-2 mb-2 flex-wrap">

          {/* Logo + title */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <img src="/logo.jpg" alt="logo" className="h-8 w-auto object-contain" />
            <h1 className="text-base font-bold text-gray-900 dark:text-white leading-tight whitespace-nowrap">
              {t('appTitle')}
            </h1>
          </div>

          {/* SearchBar: wraps to its own row on mobile (order-last + w-full),
              sits inline between logo and buttons on sm+ */}
          <div className="order-last w-full sm:order-none sm:flex-1 sm:min-w-0 sm:w-auto">
            <p className="text-[9px] text-gray-400 dark:text-gray-500 font-medium mb-0.5 sm:hidden">
              🔍 {lang === 'en' ? 'Search stations' : 'ค้นหาสถานี'}
            </p>
            <SearchBar value={search} onChange={setSearch} />
          </div>

          {/* Action buttons: pushed right on mobile via ml-auto */}
          <div className="flex gap-1.5 flex-shrink-0 ml-auto sm:ml-0 items-end">
            <FontSizeToggle />

            <button
              onClick={handleLocate}
              disabled={locating}
              title={t('myLocation')}
              className="flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-gray-700 dark:text-gray-200 disabled:opacity-50"
            >
              {locating ? (
                <div className="w-5 h-5 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <circle cx="12" cy="12" r="3" />
                  <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
                  <circle cx="12" cy="12" r="9" />
                </svg>
              )}
              <span className="text-[9px] leading-none font-medium">{t('locationLabel')}</span>
            </button>

            <button
              onClick={routeMode ? handleCloseRoute : handleOpenRoute}
              title={t('navigate')}
              className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg transition-colors ${
                routeMode
                  ? 'bg-green-500 text-white hover:bg-green-600'
                  : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200'
              }`}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <circle cx="6" cy="19" r="2" />
                <circle cx="18" cy="5" r="2" />
                <path d="M6 17V9a6 6 0 0 1 6-6h2M18 7v8a6 6 0 0 1-6 6H10" />
              </svg>
              <span className="text-[9px] leading-none font-medium">{t('navigateLabel')}</span>
            </button>

            <LanguageToggle />
            <ThemeToggle />

            <button
              onClick={() => setHelpOpen(true)}
              title={t('helpLabel')}
              className="flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-gray-700 dark:text-gray-200"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <circle cx="12" cy="12" r="10" />
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                <circle cx="12" cy="17" r="0.5" fill="currentColor" />
              </svg>
              <span className="text-[9px] leading-none font-medium">{t('helpLabel')}</span>
            </button>
          </div>
        </div>

        {/* Filter row */}
        <div className="flex items-center gap-2">
          <span className="text-[9px] text-gray-400 dark:text-gray-500 font-medium whitespace-nowrap flex-shrink-0 leading-tight">
            🏷️<br />{lang === 'en' ? 'Filter' : 'กรอง'}
          </span>
          <div className="flex-1 min-w-0 overflow-x-auto">
            <FilterPanel
              operators={operators}
              selected={activeFilters}
              onChange={setActiveFilters}
              operatorsMap={operatorsMap}
            />
          </div>
          <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0 pl-1">
            {loading ? t('loading') : t('stationCount', mapStations.length)}
          </span>
        </div>

        {/* Top banner ad */}
        <AdBanner position="top_banner" />
      </header>

      <div className="flex-1 relative min-h-0">
        {locateError && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 bg-red-50 dark:bg-red-900/40 text-red-600 dark:text-red-300 text-sm px-4 py-2 rounded-lg shadow flex items-center gap-2">
            <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
            {locateError}
            <button onClick={() => setLocateError(null)} className="ml-1 text-red-400 hover:text-red-600">✕</button>
          </div>
        )}
        {loading && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-sm px-4 py-2 rounded-lg shadow flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
            {t('loadingStations')}
          </div>
        )}

        <MapView
          stations={routeMapStations}
          selectedStation={selectedStation}
          onSelectStation={routeMode ? handleStationClickRoute : handleSelectStation}
          dark={dark}
          onMapLoad={ref => { mapRef.current = ref }}
          onApiLoaded={() => setMapsLoaded(true)}
          userLocation={userLocation}
          routeMode={routeMode}
          routeResult={routeResult}
          routeOrigin={routeOrigin}
          routeDest={routeDest}
          routeClickMode={routeClickMode}
          onMapClick={handleMapClick}
          stationClickTitle={routeMode ? t('clickStationForDest') : undefined}
        />


        {selectedStation && !routeMode && (
          <StationCard
            station={selectedStation}
            onClose={() => setSelectedStation(null)}
            onRouteToHere={handleRouteToStation}
            operatorsMap={operatorsMap}
          />
        )}

        <RoutingPanel
          isOpen={routeMode}
          mapsLoaded={mapsLoaded}
          origin={routeOrigin}
          dest={routeDest}
          onOriginChange={setRouteOrigin}
          onDestChange={setRouteDest}
          routeResult={routeResult}
          onRouteResult={setRouteResult}
          routeClickMode={routeClickMode}
          onRouteClickModeChange={setRouteClickMode}
          allStations={filteredByOperator}
          dark={dark}
          onClose={handleCloseRoute}
          operatorsMap={operatorsMap}
          userLocation={userLocation}
        />

        {/* Bottom bar ad */}
        <div className="absolute bottom-0 left-0 right-0 z-10 pointer-events-none overflow-hidden" style={{ height: '50px' }}>
          <div className="pointer-events-auto h-full">
            <AdBanner position="bottom_bar" />
          </div>
        </div>
      </div>

      {helpOpen && <HelpModal onClose={() => setHelpOpen(false)} />}
    </div>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <FontSizeProvider>
          <AppContent />
        </FontSizeProvider>
      </LanguageProvider>
    </ThemeProvider>
  )
}
