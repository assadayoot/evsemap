// Point-in-polygon (ray casting) — handles Polygon and MultiPolygon with holes
function pointInRing(lng, lat, ring) {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    if ((yi > lat) !== (yj > lat) && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) {
      inside = !inside
    }
  }
  return inside
}

function pointInFeature(lng, lat, feature) {
  const { type, coordinates } = feature.geometry
  if (type === 'Polygon') {
    return pointInRing(lng, lat, coordinates[0]) &&
      !coordinates.slice(1).some(hole => pointInRing(lng, lat, hole))
  }
  if (type === 'MultiPolygon') {
    return coordinates.some(polygon =>
      pointInRing(lng, lat, polygon[0]) &&
      !polygon.slice(1).some(hole => pointInRing(lng, lat, hole))
    )
  }
  return false
}

function extractName(props) {
  // Cover common property name conventions across different GeoJSON sources
  return (
    props?.NAME_TH   ||
    props?.name_th   ||
    props?.PROV_NAMT ||
    props?.CHA_NE_T  ||
    props?.name      ||
    props?.NAME_1    ||
    null
  )
}

// Load once, cache in memory
let geojsonPromise = null

function loadGeoJSON() {
  if (!geojsonPromise) {
    geojsonPromise = fetch('/thailand-provinces.json')
      .then(r => r.json())
      .catch(() => null)
  }
  return geojsonPromise
}

export async function getProvinceFromCoords(lat, lng) {
  const geojson = await loadGeoJSON()
  if (!geojson?.features) return null

  for (const feature of geojson.features) {
    if (pointInFeature(lng, lat, feature)) {
      return extractName(feature.properties)
    }
  }
  return null
}
