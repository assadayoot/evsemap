import { useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { getProvinceFromCoords } from '../utils/reverseGeocode'

function getSessionId() {
  let id = sessionStorage.getItem('ev_session_id')
  if (!id) {
    id = crypto.randomUUID()
    sessionStorage.setItem('ev_session_id', id)
  }
  return id
}

const IP_CACHE_KEY = 'ev_origin_ip'
let ipPromise = null

async function fetchIP() {
  const cached = sessionStorage.getItem(IP_CACHE_KEY)
  if (cached) return cached
  try {
    const res = await fetch('https://api.ipify.org?format=json')
    const ip = (await res.json()).ip
    sessionStorage.setItem(IP_CACHE_KEY, ip)
    return ip
  } catch {
    return null
  }
}

function getDeviceCoords() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      console.warn('[viewLog] geolocation not supported')
      return resolve(null)
    }
    navigator.geolocation.getCurrentPosition(
      pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      err => {
        console.warn('[viewLog] geolocation error:', err.code, err.message)
        resolve(null)
      },
      { timeout: 5000, maximumAge: 300000 }
    )
  })
}

export function useViewLog() {
  const sessionId = useRef(getSessionId())

  if (!ipPromise) ipPromise = fetchIP()

  const logView = useCallback(async (station) => {
    if (!supabase || !station?.ID) return

    const [origin_ip, deviceCoords] = await Promise.all([
      ipPromise,
      getDeviceCoords(),
    ])

    const origin_province = deviceCoords
      ? await getProvinceFromCoords(deviceCoords.lat, deviceCoords.lng)
      : null
    console.log('[viewLog] deviceCoords:', deviceCoords, '→ origin_province:', origin_province)

    supabase
      .from('view_logs')
      .insert({
        station_id: station.ID,
        session_id: sessionId.current,
        origin_ip,
        origin_province,
        origin_lat: deviceCoords?.lat ?? null,
        origin_lng: deviceCoords?.lng ?? null,
      })
      .then(({ error }) => { if (error) console.warn('view_log error:', error) })
  }, [])

  return { logView }
}
