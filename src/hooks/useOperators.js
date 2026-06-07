import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

let cache = null

export function useOperators() {
  const [operators, setOperators] = useState(cache ?? {})

  useEffect(() => {
    if (cache) return
    if (!supabase) return
    supabase
      .from('operators')
      .select('key, name, logo_url')
      .then(({ data }) => {
        if (!data) return
        const map = Object.fromEntries(data.map(r => [r.key, { name: r.name, logo_url: r.logo_url }]))
        cache = map
        setOperators(map)
      })
  }, [])

  return operators
}
