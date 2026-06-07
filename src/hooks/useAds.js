import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const cache = {}

export function useAds(position) {
  const [ads, setAds] = useState(cache[position] ?? [])

  useEffect(() => {
    if (!supabase) return
    const now = new Date().toISOString()
    supabase
      .from('ads')
      .select('*')
      .eq('position', position)
      .eq('is_active', true)
      .or(`starts_at.is.null,starts_at.lte.${now}`)
      .or(`ends_at.is.null,ends_at.gte.${now}`)
      .then(({ data, error }) => {
        if (error) { console.error('[useAds]', position, error.message); return }
        if (!data) return
        cache[position] = data
        setAds(data)
      })
  }, [position])

  return ads
}
