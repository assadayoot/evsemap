import { readFileSync, existsSync } from 'fs'
import { join, resolve } from 'path'
import { TABLES, createSupabase, latestBackup } from './backup.js'

// ใช้: npm run restore [-- <โฟลเดอร์ backup>]   (ไม่ระบุ = ล่าสุด)
const dir = process.argv[2] ? resolve(process.argv[2]) : latestBackup()
if (!dir || !existsSync(dir)) { console.error('ไม่พบโฟลเดอร์ backup'); process.exit(1) }

const supabase = createSupabase()
const load = name => {
  const f = join(dir, `${name}.json`)
  return existsSync(f) ? JSON.parse(readFileSync(f, 'utf-8')) : null
}

async function upsertBatches(table, pk, rows, size = 200) {
  for (let i = 0; i < rows.length; i += size) {
    const { error } = await supabase.from(table).upsert(rows.slice(i, i + size), { onConflict: pk })
    if (error) throw new Error(`${table}: ${error.message}`)
  }
}

console.log(`Restore จาก ${dir}`)

// 1) ล้างข้อมูลปัจจุบันเฉพาะตารางที่ seed แตะ (ลูกก่อนแม่)
for (const { table, col, op, val } of [
  { table: 'connections', col: 'id',  op: 'gte', val: 0 },
  { table: 'stations',    col: 'id',  op: 'gte', val: '' },
  { table: 'operators',   col: 'key', op: 'gte', val: '' },
]) {
  const { error } = await supabase.from(table).delete()[op](col, val)
  if (error) { console.error(`clear ${table}:`, error.message); process.exit(1) }
}

// 2) ใส่กลับโดย upsert ตาม primary key (แม่ก่อนลูก)
//    view_logs/route_logs/ads ที่ station_id ถูกเปลี่ยนเป็น NULL จะถูกคืนค่าเดิมด้วย
for (const { name, pk } of TABLES) {
  const rows = load(name)
  if (!rows) { console.log(`  ${name}: ไม่มีไฟล์ — ข้าม`); continue }
  await upsertBatches(name, pk, rows)
  console.log(`  ${name}: ${rows.length} rows ✓`)
}
console.log('Restore เสร็จแล้ว ✓')
