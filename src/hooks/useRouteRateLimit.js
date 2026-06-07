import { useState, useEffect, useRef } from 'react'

export const ROUTE_LIMIT = 10         // max requests per window
export const ROUTE_WINDOW_MS = 60 * 60 * 1000  // 1 hour
export const ROUTE_COOLDOWN_S = 10    // seconds to wait between requests
const LS_KEY = 'ev_route_ts'

function getStoredTimestamps() {
  try {
    const raw = localStorage.getItem(LS_KEY)
    const arr = raw ? JSON.parse(raw) : []
    const cutoff = Date.now() - ROUTE_WINDOW_MS
    return arr.filter(t => t > cutoff)
  } catch {
    return []
  }
}

export function useRouteRateLimit() {
  const [cooldown, setCooldown] = useState(0)
  const [remaining, setRemaining] = useState(ROUTE_LIMIT - getStoredTimestamps().length)
  const timerRef = useRef(null)

  useEffect(() => () => clearInterval(timerRef.current), [])

  function check() {
    const ts = getStoredTimestamps()
    if (ts.length >= ROUTE_LIMIT) {
      const oldest = Math.min(...ts)
      const waitMin = Math.ceil((ROUTE_WINDOW_MS - (Date.now() - oldest)) / 60000)
      return { allowed: false, waitMin }
    }
    return { allowed: true }
  }

  function record() {
    const ts = [...getStoredTimestamps(), Date.now()]
    try { localStorage.setItem(LS_KEY, JSON.stringify(ts)) } catch {}
    setRemaining(ROUTE_LIMIT - ts.length)

    setCooldown(ROUTE_COOLDOWN_S)
    clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setCooldown(c => {
        if (c <= 1) { clearInterval(timerRef.current); return 0 }
        return c - 1
      })
    }, 1000)
  }

  return { cooldown, remaining, check, record }
}
