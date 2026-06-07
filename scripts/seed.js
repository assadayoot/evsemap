import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

function parseLine(line) {
  const values = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') { cur += '"'; i++ }
      else inQuotes = !inQuotes
    } else if (c === ',' && !inQuotes) {
      values.push(cur.trim())
      cur = ''
    } else {
      cur += c
    }
  }
  values.push(cur.trim())
  return values
}

function parseCSV(filePath) {
  const text = readFileSync(filePath, 'utf-8')
  const lines = text.trim().split('\n').filter(l => l.trim())
  const headers = parseLine(lines[0])
  return lines.slice(1).map(line => {
    const values = parseLine(line)
    return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? '']))
  })
}

async function insertBatches(table, rows, batchSize = 100) {
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize)
    const { error } = await supabase.from(table).insert(batch)
    if (error) {
      console.error(`${table} error (batch ${i + 1}):`, error.message)
      process.exit(1)
    }
    console.log(`  ${table} ${i + 1}–${Math.min(i + batchSize, rows.length)} ✓`)
  }
}

// ── Operators ─────────────────────────────────────────────────────────────────

async function seedOperators() {
  const filePath = join(ROOT, 'operators.csv')
  if (!existsSync(filePath)) { console.log('ไม่พบ operators.csv — ข้าม'); return }

  const rows = parseCSV(filePath).filter(r => r.key)
  const operatorRows = rows.map(r => ({
    key:      r.key.trim(),
    name:     r.name?.trim() || r.key.trim(),
    logo_url: r.logo_url?.trim() || null,
  }))

  console.log(`operators.csv: ${operatorRows.length} rows`)
  await insertBatches('operators', operatorRows, 100)
}

// ── Stations ──────────────────────────────────────────────────────────────────

async function seedStations() {
  const filePath = join(ROOT, 'stations.csv')
  if (!existsSync(filePath)) { console.log('ไม่พบ stations.csv — ข้าม'); return [] }

  const rows = parseCSV(filePath)
  const stationRows = rows
    .filter(r => r.id)
    .map(r => {
      const lat = r.lat ? parseFloat(r.lat) : null
      const lng = r.lng ? parseFloat(r.lng) : null
      const numCharger = r.num_charger ? parseInt(r.num_charger) : null
      return {
        id:          r.id.trim(),
        name:        r.name?.trim()  || r.id.trim(),
        name_en:     r.name_en     || null,
        address:     r.address     || null,
        address_en:  r.address_en  || null,
        town:        r.town        || null,
        town_en:     r.town_en     || null,
        province:    r.province    || null,
        province_en: r.province_en || null,
        lat:         lat && !isNaN(lat) ? lat : null,
        lng:         lng && !isNaN(lng) ? lng : null,
        operator:    r.operator    || 'other',
        num_points:  parseInt(r.num_points) || 1,
        num_charger: numCharger && !isNaN(numCharger) ? numCharger : null,
        status:      r.status      || 'active',
        created_at:  r.created_at  || undefined,
      }
    })

  console.log(`stations.csv: ${stationRows.length} rows`)
  await insertBatches('stations', stationRows, 100)
  return new Set(stationRows.map(r => r.id))
}

// ── Connections ───────────────────────────────────────────────────────────────

async function seedConnections(validStationIds) {
  const filePath = join(ROOT, 'connections.csv')
  if (!existsSync(filePath)) { console.log('ไม่พบ connections.csv — ข้าม'); return }

  const rows = parseCSV(filePath)
  const all = rows.filter(r => r.station_id && r.connector_type)
  const connectionRows = all
    .filter(r => !validStationIds || validStationIds.has(r.station_id.trim()))
    .map(r => ({
      station_id:     r.station_id.trim(),
      connector_type: r.connector_type.trim(),
      power_kw:       r.power_kw ? parseFloat(r.power_kw) : null,
      quantity:       r.quantity ? parseInt(r.quantity) : 1,
    }))

  const skipped = all.length - connectionRows.length
  if (skipped > 0) console.log(`  ข้าม ${skipped} rows (station_id ไม่มีใน stations)`)
  console.log(`connections.csv: ${connectionRows.length} rows`)
  await insertBatches('connections', connectionRows, 200)
}

// ── Main ───────────────────────────────────────────────────────────────────────

async function clearTables() {
  console.log('ล้างข้อมูลเก่า...')
  // connections ก่อน (FK → stations), แล้ว stations, แล้ว operators
  const steps = [
    { table: 'connections', col: 'id',  op: 'gte', val: 0 },
    { table: 'stations',    col: 'id',  op: 'gte', val: '' },
    { table: 'operators',   col: 'key', op: 'gte', val: '' },
  ]
  for (const { table, col, op, val } of steps) {
    const { error } = await supabase.from(table).delete()[op](col, val)
    if (error) { console.error(`clear ${table} error:`, error.message); process.exit(1) }
    console.log(`  ${table} ✓`)
  }
  console.log()
}

async function main() {
  console.log('=== Seed เริ่มต้น ===\n')
  await clearTables()
  await seedOperators()
  console.log()
  const stationIds = await seedStations()
  console.log()
  await seedConnections(stationIds)
  console.log('\n=== เสร็จแล้ว ✓ ===')
}

main()
