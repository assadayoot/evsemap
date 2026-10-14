import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import { mkdirSync, writeFileSync, readdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
export const BACKUP_ROOT = join(__dirname, '..', 'backups')

// ลำดับ: ตารางแม่ก่อน ตารางลูกทีหลัง (ใช้ลำดับเดียวกันตอน restore)
export const TABLES = [
  { name: 'operators',   pk: 'key' },
  { name: 'stations',    pk: 'id' },
  { name: 'connections', pk: 'id' },
  { name: 'view_logs',   pk: 'id' },
  { name: 'route_logs',  pk: 'id', optional: true },
  { name: 'ads',         pk: 'id', optional: true },
]

export function createSupabase() {
  return createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
}

async function fetchAll(supabase, table, pk) {
  const rows = []
  const size = 1000 // Supabase จำกัด 1000 แถวต่อ request
  for (let from = 0; ; from += size) {
    const { data, error } = await supabase
      .from(table).select('*').order(pk).range(from, from + size - 1)
    if (error) throw error
    rows.push(...data)
    if (data.length < size) break
  }
  return rows
}

// คืน path ของโฟลเดอร์ backup; throw ถ้าไม่สำเร็จ
export async function runBackup(supabase = createSupabase()) {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const dir = join(BACKUP_ROOT, stamp)
  mkdirSync(dir, { recursive: true })

  console.log(`Backup → ${dir}`)
  for (const { name, pk, optional } of TABLES) {
    try {
      const rows = await fetchAll(supabase, name, pk)
      writeFileSync(join(dir, `${name}.json`), JSON.stringify(rows))
      console.log(`  ${name}: ${rows.length} rows ✓`)
    } catch (err) {
      if (optional) { console.log(`  ${name}: ข้าม (${err.message})`); continue }
      throw new Error(`backup ${name} ล้มเหลว: ${err.message}`)
    }
  }
  return dir
}

export function latestBackup() {
  try {
    const dirs = readdirSync(BACKUP_ROOT).sort()
    return dirs.length ? join(BACKUP_ROOT, dirs[dirs.length - 1]) : null
  } catch { return null }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runBackup().then(() => console.log('เสร็จแล้ว ✓')).catch(e => { console.error(e.message); process.exit(1) })
}
