import { useRef, useCallback, useEffect } from 'react'
import { GoogleMap, useJsApiLoader, Marker, DirectionsRenderer } from '@react-google-maps/api'
import { getOperatorKey } from './FilterPanel'
import { STATUS_COLORS } from '../utils/parseFile'

const LIBRARIES = ['places']
const GMAPS_LANG = localStorage.getItem('ev-map-lang') || 'th'
const THAILAND_CENTER = { lat: 13.0, lng: 101.5 }

const OPERATOR_PIN_COLORS = {
  'pttor':      '#0f766e',
  'ea':         '#1d4ed8',
  'sharge':     '#c2410c',
  'pea':        '#7e22ce',
  'elexa':      '#0e7490',
  'evolt':      '#4d7c0f',
  'spark':      '#a16207',
  'mea':        '#4338ca',
  'mg':         '#be185d',
  'altervim':   '#be123c',
  'espro':      '#b45309',
  'phithan':    '#15803d',
  'onion':      '#a21caf',
  'gac':        '#b91c1c',
  'galvanic':   '#0369a1',
  'chargeplus': '#047857',
  'gwm':        '#6d28d9',
  'haup':       '#334155',
  'chosen':     '#78716c',
  'charge24':   '#52525b',
  'tocharge':   '#7c2d12',
  'eosvolt':    '#581c87',
  'eigen':      '#0c4a6e',
  'pump':       '#365314',
  'other':      '#6b7280',
}

function makePin(color, symbol = '⚡') {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40">
    <path d="M16 0C9.37 0 4 5.37 4 12c0 9 12 28 12 28S28 21 28 12C28 5.37 22.63 0 16 0Z" fill="${color}"/>
    <path d="M16 0C9.37 0 4 5.37 4 12c0 9 12 28 12 28S28 21 28 12C28 5.37 22.63 0 16 0Z" fill="none" stroke="white" stroke-width="1.5"/>
    <text x="16" y="16" text-anchor="middle" font-size="13" font-family="sans-serif" fill="white">${symbol}</text>
  </svg>`
  return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`
}

const PIN_ICONS = Object.fromEntries(
  Object.entries(OPERATOR_PIN_COLORS).map(([k, v]) => [k, makePin(v)])
)

const STATUS_SYMBOLS = { 'ว่าง': '⚡', 'ทำงาน': '🔌', 'นอน': '💤', 'พักผ่อน': '🔧' }

const STATUS_PIN_ICONS = Object.fromEntries(
  Object.entries(STATUS_COLORS).map(([status, { bg }]) => [
    status,
    makePin(bg, STATUS_SYMBOLS[status] ?? '⚡'),
  ])
)

const MAP_STYLES_DARK = [
  { elementType: 'geometry', stylers: [{ color: '#212121' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#212121' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#373737' }] },
  { featureType: 'road.arterial', elementType: 'labels.text.fill', stylers: [{ color: '#8a8a8a' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#000000' }] },
]

function makeEndpointIcon(color) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 22 22">
    <circle cx="11" cy="11" r="8" fill="${color}" stroke="white" stroke-width="3"/>
  </svg>`
  return `data:image/svg+xml;base64,${btoa(svg)}`
}

const USER_LOCATION_ICON = (() => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="40" viewBox="0 0 28 40">
    <circle cx="14" cy="14" r="13" fill="white" stroke="#dc2626" stroke-width="3"/>
    <circle cx="14" cy="14" r="6" fill="#22c55e"/>
    <line x1="14" y1="27" x2="14" y2="40" stroke="#dc2626" stroke-width="2.5" stroke-linecap="round"/>
  </svg>`
  return `data:image/svg+xml;base64,${btoa(svg)}`
})()

const ORIGIN_ICON_URL = makeEndpointIcon('#22c55e')
const DEST_ICON_URL = makeEndpointIcon('#ef4444')

export default function MapView({
  stations,
  selectedStation,
  onSelectStation,
  dark,
  onMapLoad,
  onApiLoaded,
  userLocation,
  // routing
  routeMode,
  routeResult,
  routeOrigin,
  routeDest,
  routeClickMode,
  onMapClick,
  stationClickTitle,
}) {
  const mapRef = useRef(null)

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_KEY,
    libraries: LIBRARIES,
    language: GMAPS_LANG,
    region: 'TH',
  })

  useEffect(() => {
    if (isLoaded) onApiLoaded?.()
  }, [isLoaded, onApiLoaded])

  const onLoad = useCallback((map) => {
    mapRef.current = map
    onMapLoad?.(map)
  }, [onMapLoad])

  const handleMapClick = useCallback((e) => {
    if (!routeClickMode) return
    onMapClick?.({ lat: e.latLng.lat(), lng: e.latLng.lng() })
  }, [routeClickMode, onMapClick])

  if (loadError) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-100 dark:bg-gray-800">
        <div className="text-center text-red-500">
          <p className="font-semibold">ไม่สามารถโหลด Google Maps ได้</p>
          <p className="text-sm mt-1">{loadError.message}</p>
        </div>
      </div>
    )
  }

  if (!isLoaded) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-100 dark:bg-gray-800">
        <div className="text-center text-gray-500 dark:text-gray-400">
          <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          กำลังโหลดแผนที่...
        </div>
      </div>
    )
  }

  const endpointSize = new window.google.maps.Size(22, 22)
  const endpointAnchor = new window.google.maps.Point(11, 11)

  return (
    <GoogleMap
      mapContainerStyle={{ width: '100%', height: '100%' }}
      center={THAILAND_CENTER}
      zoom={6}
      onLoad={onLoad}
      onClick={handleMapClick}
      options={{
        styles: dark ? MAP_STYLES_DARK : [],
        streetViewControl: false,
        mapTypeControl: false,
        fullscreenControl: false,
        clickableIcons: false,
        draggableCursor: routeClickMode ? 'crosshair' : undefined,
      }}
    >
      {/* Route polyline */}
      {routeResult && (
        <DirectionsRenderer
          directions={routeResult}
          options={{
            suppressMarkers: true,
            polylineOptions: {
              strokeColor: '#22c55e',
              strokeWeight: 5,
              strokeOpacity: 0.85,
            },
          }}
        />
      )}

      {/* Origin marker */}
      {routeOrigin && (
        <Marker
          position={{ lat: routeOrigin.lat, lng: routeOrigin.lng }}
          icon={{ url: ORIGIN_ICON_URL, scaledSize: endpointSize, anchor: endpointAnchor }}
          title="ต้นทาง"
          zIndex={1001}
        />
      )}

      {/* Destination marker */}
      {routeDest && (
        <Marker
          position={{ lat: routeDest.lat, lng: routeDest.lng }}
          icon={{ url: DEST_ICON_URL, scaledSize: endpointSize, anchor: endpointAnchor }}
          title="ปลายทาง"
          zIndex={1001}
        />
      )}

      {/* User location marker */}
      {userLocation && (
        <Marker
          position={userLocation}
          icon={{
            url: USER_LOCATION_ICON,
            scaledSize: new window.google.maps.Size(28, 40),
            anchor: new window.google.maps.Point(14, 40),
          }}
          title="ตำแหน่งของฉัน"
          zIndex={1002}
        />
      )}

      {/* Station markers */}
      {stations.map(station => {
        const lat = station.AddressInfo?.Latitude
        const lng = station.AddressInfo?.Longitude
        if (!lat || !lng) return null

        const isSelected = selectedStation?.ID === station.ID
        const pinUrl = station._uploaded
          ? (STATUS_PIN_ICONS[station._status] ?? STATUS_PIN_ICONS['ว่าง'])
          : (PIN_ICONS[getOperatorKey(station.OperatorInfo?.Title)] ?? PIN_ICONS['other'])

        return (
          <Marker
            key={station.ID}
            position={{ lat, lng }}
            icon={{
              url: pinUrl,
              scaledSize: new window.google.maps.Size(isSelected ? 32 : 20, isSelected ? 40 : 26),
              anchor: new window.google.maps.Point(isSelected ? 16 : 10, isSelected ? 40 : 26),
            }}
            zIndex={isSelected ? 999 : station._uploaded ? 2 : 1}
            onClick={() => onSelectStation(station)}
            title={routeMode && stationClickTitle
              ? `${station.AddressInfo?.Title ?? ''}\n${stationClickTitle}`
              : station.AddressInfo?.Title}
          />
        )
      })}
    </GoogleMap>
  )
}

export { THAILAND_CENTER }
