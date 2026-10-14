import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

import { runBackup } from './backup.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// CSV parser เต็มรูปแบบ: รองรับ "..." ที่มีเครื่องหมายจุลภาค, "" และขึ้นบรรทัดใหม่ภายในช่อง
function parseCSV(filePath) {
  const text = readFileSync(filePath, 'utf-8').replace(/^\uFEFF/, '')
  const records = []
  let row = [], cur = '', inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { cur += '"'; i++ } else inQuotes = false
      } else cur += c
    } else if (c === '"') inQuotes = true
    else if (c === ',') { row.push(cur.trim()); cur = '' }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      row.push(cur.trim()); cur = ''
      if (row.some(v => v !== '')) records.push(row)
      row = []
    } else cur += c
  }
  row.push(cur.trim())
  if (row.some(v => v !== '')) records.push(row)

  const headers = records[0]
  return records.slice(1).map(values =>
    Object.fromEntries(headers.map((h, i) => [h, values[i] ?? '']))
  )
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


// ── แปลงไฟล์ CSV รูปแบบใหม่ → รูปแบบเดิมของฐานข้อมูล ───────────────────────────────
// operators.csv:   operator_id, operator_name, …
// stations.csv:    station_id, operator_id, station_name, address, subdistrict, district, province, postcode, lat, lng
// connections.csv: connector_id, station_id, connector_type, quantity, brand, power_kw

// ชื่อ operator ในไฟล์ → key (slug) ที่แอปและโลโก้ใช้อยู่
const OPERATOR_KEYS = {
  'OR / PTTOR': 'pttor',  'EleXA': 'elexa',         'PEA VOLTA': 'pea',
  'EA Anywhere': 'ea',    'SHARGE': 'sharge',       'Evolt': 'evolt',
  'Spark EV': 'spark',    'MEA': 'mea',             'MG Super Charge': 'mg',
  'Altervim': 'altervim', 'ESPRO': 'espro',         'Phithan Green': 'phithan',
  'on-ion / ARUN+': 'onion', 'Galvanic': 'galvanic', 'GAC AION': 'gac',
  'CHARGE+': 'chargeplus', 'Haupcar': 'haup',       'CHOSEN': 'chosen',
  'Tocharge': 'tocharge', 'Charge24': 'charge24',   'EOSVOLT': 'eosvolt',
  'Eigen Energy': 'eigen', 'PumpCharge': 'pump',
}

// ชนิดหัวชาร์จในไฟล์ใหม่ → ค่าเดิมในฐานข้อมูล
const CONNECTOR_TYPES = { AC: 'AC_TYPE2', DC_CCS2: 'DC_CCS2', DC_CHAdeMO: 'DC_CHADEMO' }

function fail(msg) { console.error(msg + ' — ยกเลิก seed (ยังไม่ได้ลบอะไร)'); process.exit(1) }

async function buildData() {
  // โลโก้เดิมของ operator ดึงจาก DB ก่อนถูกลบ
  const { data: old, error } = await supabase.from('operators').select('key, logo_url')
  if (error) fail(`อ่าน operators เดิมไม่ได้: ${error.message}`)
  const logos = Object.fromEntries(old.map(o => [o.key, o.logo_url]))

  const operatorKeyById = new Map()
  const operators = parseCSV(join(ROOT, 'operators.csv')).filter(r => r.operator_id).map(r => {
    const key = OPERATOR_KEYS[r.operator_name]
    if (!key) fail(`operator ที่ไม่รู้จัก "${r.operator_name}" (เพิ่มใน OPERATOR_KEYS)`)
    operatorKeyById.set(r.operator_id, key)
    return { key, name: r.operator_name, logo_url: logos[key] ?? null }
  })

  // station id = {operator}_{ลำดับในไฟล์ 4 หลัก}
  const counters = {}
  const stationIdByCsvId = new Map()
  const stations = parseCSV(join(ROOT, 'stations.csv')).filter(r => r.station_id).map(r => {
    const operator = operatorKeyById.get(r.operator_id)
    if (!operator) fail(`station_id ${r.station_id}: ไม่รู้จัก operator_id ${r.operator_id}`)
    counters[operator] = (counters[operator] ?? 0) + 1
    const id = `${operator}_${String(counters[operator]).padStart(4, '0')}`
    stationIdByCsvId.set(r.station_id, id)
    const lat = parseFloat(r.lat), lng = parseFloat(r.lng)
    return {
      id,
      name:     r.station_name?.trim() || id,
      address:  r.address || null,
      town:     r.subdistrict || null, // ข้อมูลเดิม: town = ตำบล/แขวง
      province: r.province || null,
      lat:      isNaN(lat) ? null : lat,
      lng:      isNaN(lng) ? null : lng,
      operator,
      num_points: 1,
      status:   'active',
    }
  })

  const all = parseCSV(join(ROOT, 'connections.csv')).filter(r => r.station_id && r.connector_type)
  const connections = []
  const qtyByStation = {}
  const unknownTypes = new Set()
  let skipped = 0
  for (const r of all) {
    const stationId = stationIdByCsvId.get(r.station_id.trim())
    const type = CONNECTOR_TYPES[r.connector_type.trim()]
    if (!stationId) { skipped++; continue }
    if (!type) { unknownTypes.add(r.connector_type); continue }
    const quantity = parseInt(r.quantity) || 1
    qtyByStation[stationId] = (qtyByStation[stationId] ?? 0) + quantity
    connections.push({
      station_id: stationId,
      connector_type: type,
      power_kw: r.power_kw ? parseFloat(r.power_kw) : null,
      quantity,
    })
  }
  if (unknownTypes.size) fail(`connector_type ที่ไม่รู้จัก: ${[...unknownTypes].join(', ')} (เพิ่มใน CONNECTOR_TYPES)`)
  if (skipped) console.log(`  ข้าม ${skipped} connections (station_id ไม่มีใน stations.csv)`)

  // จำนวนจุดชาร์จ = ผลรวม quantity ของหัวชาร์จ (ตรงกับข้อมูลเดิมส่วนใหญ่)
  for (const s of stations) s.num_points = qtyByStation[s.id] || 1

  return { operators, stations, connections }
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
  const dryRun = process.argv.includes('--dry-run')
  console.log(`=== Seed เริ่มต้น${dryRun ? ' (dry-run: ไม่แก้ฐานข้อมูล)' : ''} ===\n`)
  const missing = ['operators.csv', 'stations.csv', 'connections.csv']
    .filter(f => !existsSync(join(ROOT, f)))
  if (missing.length) fail(`ไม่พบไฟล์: ${missing.join(', ')} (ที่ ${ROOT})`)

  // แปลง + ตรวจข้อมูลทั้งหมดก่อน — ถ้าผิดพลาดตรงนี้ ยังไม่มีอะไรถูกลบ
  const { operators, stations, connections } = await buildData()
  console.log(`operators: ${operators.length}, stations: ${stations.length}, connections: ${connections.length}`)
  if (dryRun) {
    console.log('\nตัวอย่าง:', stations[0], connections[0], operators[0])
    return
  }

  try {
    await runBackup(supabase)
  } catch (err) {
    fail(`Backup ล้มเหลว: ${err.message}`)
  }
  console.log()
  await clearTables()
  await insertBatches('operators', operators, 100)
  await insertBatches('stations', stations, 100)
  await insertBatches('connections', connections, 200)
  console.log('\n=== เสร็จแล้ว ✓ ===')
}

main()
