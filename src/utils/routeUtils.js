export function haversineDistance(a, b) {
  const R = 6371000
  const dLat = (b.lat - a.lat) * Math.PI / 180
  const dLng = (b.lng - a.lng) * Math.PI / 180
  const s1 = Math.sin(dLat / 2)
  const s2 = Math.sin(dLng / 2)
  const h = s1 * s1 + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * s2 * s2
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
}

// Returns { dist, t } — perpendicular distance (m) and projection parameter t∈[0,1] along segment.
function distanceToSegment(pt, p1, p2) {
  const R = 6371000
  const cosLat = Math.cos(((p1.lat + p2.lat) / 2) * Math.PI / 180)
  const toM = (Math.PI / 180) * R

  const qx = (pt.lng - p1.lng) * cosLat * toM
  const qy = (pt.lat - p1.lat) * toM
  const dx = (p2.lng - p1.lng) * cosLat * toM
  const dy = (p2.lat - p1.lat) * toM

  const lenSq = dx * dx + dy * dy
  if (lenSq === 0) return { dist: Math.sqrt(qx * qx + qy * qy), t: 0 }

  const t = Math.max(0, Math.min(1, (qx * dx + qy * dy) / lenSq))
  return { dist: Math.sqrt((qx - t * dx) ** 2 + (qy - t * dy) ** 2), t }
}

export function findStationsNearRoute(stations, routeResult, radiusMeters = 2000) {
  if (!routeResult?.routes?.[0]) return []
  const path = routeResult.routes[0].overview_path
  if (!path?.length) return []

  const pts = Array.from(path).map(p => ({ lat: p.lat(), lng: p.lng() }))

  // Cumulative distance from start along the path (index i = distance from pts[0] to pts[i])
  const cumDist = new Array(pts.length).fill(0)
  for (let i = 1; i < pts.length; i++) {
    cumDist[i] = cumDist[i - 1] + haversineDistance(pts[i - 1], pts[i])
  }

  const out = []

  for (const s of stations) {
    const lat = s.AddressInfo?.Latitude
    const lng = s.AddressInfo?.Longitude
    if (lat == null || lng == null) continue

    const pt = { lat, lng }
    let minDist = Infinity
    let closestIdx = 0
    let closestT = 0

    if (pts.length === 1) {
      minDist = haversineDistance(pt, pts[0])
    } else {
      for (let i = 0; i < pts.length - 1; i++) {
        const { dist, t } = distanceToSegment(pt, pts[i], pts[i + 1])
        if (dist < minDist) { minDist = dist; closestIdx = i; closestT = t }
      }
    }

    if (minDist <= radiusMeters) {
      const segLen = closestIdx < pts.length - 1
        ? haversineDistance(pts[closestIdx], pts[closestIdx + 1])
        : 0
      const distFromStart = cumDist[closestIdx] + closestT * segLen

      out.push({
        ...s,
        _distFromRoute: Math.round(minDist),
        _distFromStart: Math.round(distFromStart),
        _routeIdx: closestIdx,
      })
    }
  }

  return out.sort((a, b) => a._routeIdx - b._routeIdx)
}
