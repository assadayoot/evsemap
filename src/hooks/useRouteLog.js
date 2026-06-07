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

export function useRouteLog() {
  const sessionId = useRef(getSessionId())

  if (!ipPromise) ipPromise = fetchIP()

  const logRoute = useCallback(async ({ origin, dest, result }) => {
    if (!supabase) return

    const legs = result?.routes?.[0]?.legs ?? []
    const distance_m = legs.reduce((s, l) => s + l.distance.value, 0)
    const duration_s = legs.reduce((s, l) => s + l.duration.value, 0)

    const [origin_ip, origin_province] = await Promise.all([
      ipPromise,
      origin?.lat != null ? getProvinceFromCoords(origin.lat, origin.lng) : null,
    ])

    supabase
      .from('route_logs')
      .insert({
        session_id: sessionId.current,
        origin_ip,
        origin_lat: origin?.lat ?? null,
        origin_lng: origin?.lng ?? null,
        origin_label: origin?.label ?? null,
        origin_province,
        dest_lat: dest?.lat ?? null,
        dest_lng: dest?.lng ?? null,
        dest_label: dest?.label ?? null,
        distance_m,
        duration_s,
      })
      .then(({ error }) => { if (error) console.warn('route_log error:', error) })
  }, [])

  return { logRoute }
}
