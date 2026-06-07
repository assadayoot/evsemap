export const STATUS_LABELS = {
  'ว่าง': 'ว่าง',
  'ทำงาน': 'ทำงาน',
  'นอน': 'นอน',
  'พักผ่อน': 'พักผ่อน',
}

export const STATUS_COLORS = {
  'ว่าง':     { bg: '#16a34a', label: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' },
  'ทำงาน':   { bg: '#dc2626', label: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' },
  'นอน':     { bg: '#6b7280', label: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400' },
  'พักผ่อน': { bg: '#d97706', label: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300' },
}

function normalizeStatus(raw) {
  if (!raw) return 'ว่าง'
  const s = raw.trim()
  if (['ว่าง', 'available', 'free', 'idle'].includes(s.toLowerCase())) return 'ว่าง'
  if (['ทำงาน', 'busy', 'in-use', 'charging', 'occupied'].includes(s.toLowerCase())) return 'ทำงาน'
  if (['นอน', 'offline', 'inactive', 'down'].includes(s.toLowerCase())) return 'นอน'
  if (['พักผ่อน', 'maintenance', 'resting', 'standby'].includes(s.toLowerCase())) return 'พักผ่อน'
  return 'ว่าง'
}

function rowToStation(row, index) {
  const lat = parseFloat(row.lat ?? row.latitude ?? row.Latitude)
  const lng = parseFloat(row.lng ?? row.lon ?? row.longitude ?? row.Longitude)
  if (isNaN(lat) || isNaN(lng)) return null

  const ccs2    = parseInt(row.ccs2    ?? row.CCS2    ?? 0) || 0
  const chademo = parseInt(row.chademo ?? row.CHAdeMO ?? row.chAdeMO ?? 0) || 0
  const ac7kw   = parseInt(row.ac7kw   ?? row.AC7KW   ?? row['ac 7kw']  ?? row['AC 7kW']  ?? 0) || 0
  const ac22kw  = parseInt(row.ac22kw  ?? row.AC22KW  ?? row['ac 22kw'] ?? row['AC 22kW'] ?? 0) || 0

  const connections = []
  if (ccs2    > 0) connections.push({ ConnectionType: { Title: 'CCS2'    }, PowerKW: 50, Quantity: ccs2    })
  if (chademo > 0) connections.push({ ConnectionType: { Title: 'CHAdeMO' }, PowerKW: 50, Quantity: chademo })
  if (ac7kw   > 0) connections.push({ ConnectionType: { Title: 'AC 7kW'  }, PowerKW: 7,  Quantity: ac7kw   })
  if (ac22kw  > 0) connections.push({ ConnectionType: { Title: 'AC 22kW' }, PowerKW: 22, Quantity: ac22kw  })

  // backward compat: old single connector_type column
  if (connections.length === 0) {
    connections.push({
      ConnectionType: { Title: row.connector ?? row.connector_type ?? row.หัวชาร์จ ?? 'ไม่ระบุ' },
      PowerKW: parseFloat(row.power_kw ?? row.power ?? row.กำลังวัตต์) || null,
      Quantity: parseInt(row.quantity ?? row.จำนวน) || 1,
    })
  }

  const nameEng     = row['name-eng']     || row.nameEng     || row.name_eng     || ''
  const addressEng  = row['address-eng']  || row.addressEng  || row.address_eng  || ''
  const province    = row.province        || row.จังหวัด     || ''
  const provinceEng = row['province-eng'] || row.provinceEng || row.province_eng || ''

  return {
    ID: `upload-${index}`,
    _uploaded: true,
    _status: normalizeStatus(row.status ?? row.สถานะ),
    AddressInfo: {
      Title: row.name ?? row.ชื่อ ?? `สถานี ${index + 1}`,
      ...(nameEng     && { TitleEn: nameEng }),
      AddressLine1: row.address ?? row.ที่อยู่ ?? '',
      ...(addressEng  && { AddressLine1En: addressEng }),
      Town: row.area ?? row.พื้นที่ ?? '',
      ...(province    && { Province: province }),
      ...(provinceEng && { ProvinceEn: provinceEng }),
      Latitude: lat,
      Longitude: lng,
    },
    OperatorInfo: { Title: row.operator ?? row.ผู้ให้บริการ ?? 'อัปโหลด' },
    NumberOfPoints: parseInt(row.num_chargers ?? row.จำนวนเครื่อง ?? row.points ?? row.จุดชาร์จ) || 1,
    Connections: connections,
  }
}

export function parseCSV(text) {
  const lines = text.trim().split('\n').filter(l => l.trim())
  if (lines.length < 2) throw new Error('ไฟล์ CSV ต้องมี header และข้อมูลอย่างน้อย 1 แถว')

  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))
  const rows = lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''))
    return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? '']))
  })

  const stations = rows.map((r, i) => rowToStation(r, i)).filter(Boolean)
  if (stations.length === 0) throw new Error('ไม่พบข้อมูลที่ถูกต้อง — ตรวจสอบคอลัมน์ lat/lng')
  return stations
}

export function parseJSON(text) {
  const data = JSON.parse(text)
  const arr = Array.isArray(data) ? data : data.stations ?? data.data ?? []
  const stations = arr.map((r, i) => rowToStation(r, i)).filter(Boolean)
  if (stations.length === 0) throw new Error('ไม่พบข้อมูลที่ถูกต้อง — ตรวจสอบ field lat/lng')
  return stations
}

export function parseFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = e => {
      try {
        const text = e.target.result
        const stations = file.name.endsWith('.json') ? parseJSON(text) : parseCSV(text)
        resolve(stations)
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = () => reject(new Error('อ่านไฟล์ไม่ได้'))
    reader.readAsText(file, 'utf-8')
  })
}

export const TEMPLATE_CSV = `name,name-eng,lat,lng,address,address-eng,province,province-eng,operator,num_chargers,ccs2,chademo,ac7kw,ac22kw,status
สถานีทดสอบ A,Test Station A,13.7466,100.5393,ถ.พระราม 1 ปทุมวัน,Rama I Rd Pathum Wan,กรุงเทพมหานคร,Bangkok,EA Anywhere,4,2,1,0,1,ว่าง
สถานีทดสอบ B,,13.7301,100.5301,ถ.พระราม 4 บางรัก,,กรุงเทพมหานคร,Bangkok,PEA Volta,6,2,0,2,2,ทำงาน
สถานีทดสอบ C,Test Station C,18.7883,98.9853,ถ.นิมมานเหมินท์ สุเทพ,Nimman Rd Suthep,เชียงใหม่,Chiang Mai,Sharge,3,2,1,0,0,นอน
สถานีทดสอบ D,,7.8804,98.3923,ถ.เฉลิมพระเกียรติ เมืองภูเก็ต,Chaloem Phrakiat Rd Mueang,ภูเก็ต,Phuket,Shell Recharge,2,0,0,1,1,พักผ่อน`
