import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const PROVINCES = [
  { th: 'กรุงเทพมหานคร', en: 'Bangkok', lat: 13.7563, lng: 100.5018 },
  { th: 'กระบี่', en: 'Krabi', lat: 8.0863, lng: 98.9063 },
  { th: 'กาญจนบุรี', en: 'Kanchanaburi', lat: 14.0227, lng: 99.5328 },
  { th: 'กาฬสินธุ์', en: 'Kalasin', lat: 16.4322, lng: 103.5067 },
  { th: 'กำแพงเพชร', en: 'Kamphaeng Phet', lat: 16.4827, lng: 99.5226 },
  { th: 'ขอนแก่น', en: 'Khon Kaen', lat: 16.4419, lng: 102.8360 },
  { th: 'จันทบุรี', en: 'Chanthaburi', lat: 12.6118, lng: 102.1039 },
  { th: 'ฉะเชิงเทรา', en: 'Chachoengsao', lat: 13.6904, lng: 101.0779 },
  { th: 'ชลบุรี', en: 'Chonburi', lat: 13.3611, lng: 100.9847 },
  { th: 'ชัยนาท', en: 'Chai Nat', lat: 15.1851, lng: 100.1296 },
  { th: 'ชัยภูมิ', en: 'Chaiyaphum', lat: 15.8068, lng: 102.0317 },
  { th: 'ชุมพร', en: 'Chumphon', lat: 10.4930, lng: 99.1800 },
  { th: 'เชียงราย', en: 'Chiang Rai', lat: 19.9105, lng: 99.8406 },
  { th: 'เชียงใหม่', en: 'Chiang Mai', lat: 18.7883, lng: 98.9853 },
  { th: 'ตรัง', en: 'Trang', lat: 7.5593, lng: 99.6115 },
  { th: 'ตราด', en: 'Trat', lat: 12.2438, lng: 102.5172 },
  { th: 'ตาก', en: 'Tak', lat: 16.8798, lng: 99.1266 },
  { th: 'นครนายก', en: 'Nakhon Nayok', lat: 14.2069, lng: 101.2130 },
  { th: 'นครปฐม', en: 'Nakhon Pathom', lat: 13.8199, lng: 100.0644 },
  { th: 'นครพนม', en: 'Nakhon Phanom', lat: 17.3922, lng: 104.7694 },
  { th: 'นครราชสีมา', en: 'Nakhon Ratchasima', lat: 14.9799, lng: 102.0978 },
  { th: 'นครศรีธรรมราช', en: 'Nakhon Si Thammarat', lat: 8.4325, lng: 100.0046 },
  { th: 'นครสวรรค์', en: 'Nakhon Sawan', lat: 15.7030, lng: 100.1370 },
  { th: 'นนทบุรี', en: 'Nonthaburi', lat: 13.8621, lng: 100.5144 },
  { th: 'นราธิวาส', en: 'Narathiwat', lat: 6.4255, lng: 101.8253 },
  { th: 'น่าน', en: 'Nan', lat: 18.7756, lng: 100.7730 },
  { th: 'บึงกาฬ', en: 'Bueng Kan', lat: 18.3609, lng: 103.6465 },
  { th: 'บุรีรัมย์', en: 'Buriram', lat: 14.9952, lng: 103.1029 },
  { th: 'ปทุมธานี', en: 'Pathum Thani', lat: 14.0208, lng: 100.5250 },
  { th: 'ประจวบคีรีขันธ์', en: 'Prachuap Khiri Khan', lat: 11.7994, lng: 99.7978 },
  { th: 'ปราจีนบุรี', en: 'Prachinburi', lat: 14.0508, lng: 101.3711 },
  { th: 'ปัตตานี', en: 'Pattani', lat: 6.8696, lng: 101.2501 },
  { th: 'พระนครศรีอยุธยา', en: 'Phra Nakhon Si Ayutthaya', lat: 14.3692, lng: 100.5877 },
  { th: 'พะเยา', en: 'Phayao', lat: 19.2154, lng: 99.8833 },
  { th: 'พังงา', en: 'Phang Nga', lat: 8.4519, lng: 98.5255 },
  { th: 'พัทลุง', en: 'Phatthalung', lat: 7.6168, lng: 100.0742 },
  { th: 'พิจิตร', en: 'Phichit', lat: 16.4422, lng: 100.3490 },
  { th: 'พิษณุโลก', en: 'Phitsanulok', lat: 16.8198, lng: 100.2659 },
  { th: 'เพชรบุรี', en: 'Phetchaburi', lat: 13.1119, lng: 99.9390 },
  { th: 'เพชรบูรณ์', en: 'Phetchabun', lat: 16.4192, lng: 101.1549 },
  { th: 'แพร่', en: 'Phrae', lat: 18.1445, lng: 100.1401 },
  { th: 'ภูเก็ต', en: 'Phuket', lat: 7.8804, lng: 98.3923 },
  { th: 'มหาสารคาม', en: 'Maha Sarakham', lat: 16.0135, lng: 103.1615 },
  { th: 'มุกดาหาร', en: 'Mukdahan', lat: 16.5424, lng: 104.7230 },
  { th: 'แม่ฮ่องสอน', en: 'Mae Hong Son', lat: 19.2986, lng: 97.9654 },
  { th: 'ยโสธร', en: 'Yasothon', lat: 15.7928, lng: 104.1454 },
  { th: 'ยะลา', en: 'Yala', lat: 6.5413, lng: 101.2803 },
  { th: 'ร้อยเอ็ด', en: 'Roi Et', lat: 16.0538, lng: 103.6520 },
  { th: 'ระนอง', en: 'Ranong', lat: 9.9528, lng: 98.6085 },
  { th: 'ระยอง', en: 'Rayong', lat: 12.6814, lng: 101.2816 },
  { th: 'ราชบุรี', en: 'Ratchaburi', lat: 13.5360, lng: 99.8173 },
  { th: 'ลพบุรี', en: 'Lopburi', lat: 14.7995, lng: 100.6533 },
  { th: 'ลำปาง', en: 'Lampang', lat: 18.2888, lng: 99.4917 },
  { th: 'ลำพูน', en: 'Lamphun', lat: 18.5744, lng: 99.0087 },
  { th: 'เลย', en: 'Loei', lat: 17.4860, lng: 101.7223 },
  { th: 'ศรีสะเกษ', en: 'Si Sa Ket', lat: 15.1186, lng: 104.3220 },
  { th: 'สกลนคร', en: 'Sakon Nakhon', lat: 17.1547, lng: 104.1348 },
  { th: 'สงขลา', en: 'Songkhla', lat: 7.1756, lng: 100.6142 },
  { th: 'สตูล', en: 'Satun', lat: 6.6238, lng: 100.0674 },
  { th: 'สมุทรปราการ', en: 'Samut Prakan', lat: 13.5991, lng: 100.5998 },
  { th: 'สมุทรสงคราม', en: 'Samut Songkhram', lat: 13.4098, lng: 100.0021 },
  { th: 'สมุทรสาคร', en: 'Samut Sakhon', lat: 13.5475, lng: 100.2747 },
  { th: 'สระแก้ว', en: 'Sa Kaeo', lat: 13.8241, lng: 102.0644 },
  { th: 'สระบุรี', en: 'Saraburi', lat: 14.5289, lng: 100.9103 },
  { th: 'สิงห์บุรี', en: 'Sing Buri', lat: 14.8905, lng: 100.4022 },
  { th: 'สุโขทัย', en: 'Sukhothai', lat: 17.0060, lng: 99.8265 },
  { th: 'สุพรรณบุรี', en: 'Suphan Buri', lat: 14.4745, lng: 100.1177 },
  { th: 'สุราษฎร์ธานี', en: 'Surat Thani', lat: 9.1382, lng: 99.3217 },
  { th: 'สุรินทร์', en: 'Surin', lat: 14.8823, lng: 103.4937 },
  { th: 'หนองคาย', en: 'Nong Khai', lat: 17.8782, lng: 102.7416 },
  { th: 'หนองบัวลำภู', en: 'Nong Bua Lam Phu', lat: 17.2218, lng: 102.4260 },
  { th: 'อ่างทอง', en: 'Ang Thong', lat: 14.5896, lng: 100.4548 },
  { th: 'อำนาจเจริญ', en: 'Amnat Charoen', lat: 15.8656, lng: 104.6259 },
  { th: 'อุดรธานี', en: 'Udon Thani', lat: 17.4138, lng: 102.7872 },
  { th: 'อุตรดิตถ์', en: 'Uttaradit', lat: 17.6200, lng: 100.0993 },
  { th: 'อุทัยธานี', en: 'Uthai Thani', lat: 15.3835, lng: 100.0246 },
  { th: 'อุบลราชธานี', en: 'Ubon Ratchathani', lat: 15.2448, lng: 104.8473 },
]

const BRANDS = [
  {
    operator: 'ptt_ev',
    titleTh: 'PTT EV Station',
    titleEn: 'PTT EV Station',
    addressTh: 'สถานีบริการ PTT ถนนสายหลัก',
    addressEn: 'PTT Service Station, Main Road',
    points: 4,
    dLat:  0.0025,
    dLng:  0.0030,
  },
  {
    operator: 'bangchak_evolt',
    titleTh: 'Bangchak EVolt',
    titleEn: 'Bangchak EVolt',
    addressTh: 'สถานีบริการบางจาก ถนนกลางเมือง',
    addressEn: 'Bangchak Service Station, City Road',
    points: 2,
    dLat: -0.0020,
    dLng:  0.0010,
  },
  {
    operator: 'alteo',
    titleTh: 'ALTEO Charging Station',
    titleEn: 'ALTEO Charging Station',
    addressTh: 'ศูนย์การค้า ถนนเศรษฐกิจ',
    addressEn: 'Shopping Center, Commerce Road',
    points: 6,
    dLat:  0.0010,
    dLng: -0.0030,
  },
  {
    operator: 'mg_super_charge',
    titleTh: 'MG Super Charge',
    titleEn: 'MG Super Charge',
    addressTh: 'โชว์รูม MG ถนนวงแหวน',
    addressEn: 'MG Showroom, Ring Road',
    points: 2,
    dLat: -0.0015,
    dLng: -0.0015,
  },
]

function makeStations() {
  const stations = []
  let id = 100001
  for (const prov of PROVINCES) {
    for (const brand of BRANDS) {
      stations.push({
        ID: id++,
        AddressInfo: {
          Title: `${brand.titleTh} ${prov.th}`,
          TitleEn: `${brand.titleEn} ${prov.en}`,
          AddressLine1: `${brand.addressTh} จ.${prov.th}`,
          AddressLine1En: `${brand.addressEn}, ${prov.en}`,
          Town: prov.th,
          TownEn: prov.en,
          Province: prov.th,
          ProvinceEn: prov.en,
          Latitude: prov.lat + brand.dLat,
          Longitude: prov.lng + brand.dLng,
        },
        OperatorInfo: { Title: brand.operator },
        NumberOfPoints: brand.points,
      })
    }
  }
  return stations
}

const MOCK_STATIONS = makeStations()

function dbToStation(row) {
  return {
    ID: row.id,
    AddressInfo: {
      Title:        row.name,
      TitleEn:      row.name_en    || undefined,
      AddressLine1: row.address    || '',
      AddressLine1En: row.address_en || undefined,
      Town:         row.town       || '',
      TownEn:       row.town_en    || undefined,
      Province:     row.province   || '',
      ProvinceEn:   row.province_en || undefined,
      Latitude:     row.lat,
      Longitude:    row.lng,
    },
    OperatorInfo:   { Title: row.operator || '' },
    NumberOfPoints: row.num_points || 1,
    _numCharger:    row.num_charger ?? null,
    Connections:    (row.connections || []).map(c => ({
      ConnectionType: { Title: c.connector_type },
      PowerKW:        c.power_kw,
      Quantity:       c.quantity,
    })),
    _status: row.status || 'ว่าง',
  }
}

export function useStations() {
  const [stations, setStations] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!supabase) {
      const t = setTimeout(() => {
        setStations(MOCK_STATIONS)
        setLoading(false)
      }, 300)
      return () => clearTimeout(t)
    }

    async function fetchAll() {
      const PAGE = 1000
      let all = []
      let from = 0
      while (true) {
        const { data, error } = await supabase
          .from('stations')
          .select('*, connections(*)')
          .range(from, from + PAGE - 1)
        if (error) {
          console.error('Supabase fetch error:', error)
          return setStations(MOCK_STATIONS)
        }
        all = all.concat(data || [])
        if (!data || data.length < PAGE) break
        from += PAGE
      }
      setStations(all.map(dbToStation))
    }
    fetchAll().finally(() => setLoading(false))
  }, [])

  return { stations, loading }
}
