import { useTranslation } from '../contexts/LanguageContext'

const USER_LOCATION_ICON = (() => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="40" viewBox="0 0 28 40">
    <circle cx="14" cy="14" r="13" fill="white" stroke="#dc2626" stroke-width="3"/>
    <circle cx="14" cy="14" r="6" fill="#22c55e"/>
    <line x1="14" y1="27" x2="14" y2="40" stroke="#dc2626" stroke-width="2.5" stroke-linecap="round"/>
  </svg>`
  return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`
})()

const STATION_PIN_ICON = (() => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40">
    <path d="M16 0C9.37 0 4 5.37 4 12c0 9 12 28 12 28S28 21 28 12C28 5.37 22.63 0 16 0Z" fill="#22c55e"/>
    <path d="M16 0C9.37 0 4 5.37 4 12c0 9 12 28 12 28S28 21 28 12C28 5.37 22.63 0 16 0Z" fill="none" stroke="white" stroke-width="1.5"/>
    <circle cx="16" cy="12" r="4" fill="white" fill-opacity="0.85"/>
  </svg>`
  return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`
})()

const HELP = {
  th: {
    title: 'วิธีใช้งาน Thailand EVSE Map',
    stepsTitle: 'ขั้นตอนการใช้งาน',
    steps: [
      {
        icon: '🔍',
        title: 'ค้นหาสถานี',
        body: 'มองหาสัญลักษณ์ 🔍 ค้นหาสถานี ที่ header แล้วพิมพ์ชื่อสถานี จังหวัด หรือพื้นที่ แผนที่จะกรองเฉพาะสถานีที่ตรงกับคำค้นหาทันที',
      },
      {
        icon: '🏷️',
        title: 'กรองผู้ให้บริการ',
        body: 'มองหาสัญลักษณ์ 🏷️ กรอง ที่แถว filter กด chip ชื่อผู้ให้บริการเพื่อเปิด/ปิดสถานีของแต่ละราย กด ALL เพื่อเลือกหรือยกเลิกทั้งหมดพร้อมกัน',
      },
      {
        icon: STATION_PIN_ICON,
        title: 'ดูรายละเอียดสถานี',
        body: 'กดที่หมุดสีบนแผนที่เพื่อดูรายละเอียด ได้แก่ ชื่อสถานี ผู้ให้บริการ จำนวนเครื่องชาร์จ และประเภทหัวชาร์จ (Connectors) ที่มีให้บริการ',
      },
      {
        icon: USER_LOCATION_ICON,
        title: 'ดูตำแหน่งของฉัน',
        body: 'กดปุ่ม "ตำแหน่งของฉัน" ที่ header แผนที่จะเลื่อนมาที่ตำแหน่งปัจจุบันและปักหมุดสีขาวขอบแดงวงในเขียวไว้บนแผนที่ หมุดนี้จะถูกใช้เป็นจุดเริ่มต้นอัตโนมัติเมื่อเปิดโหมดนำทาง',
      },
      {
        icon: '🗺️',
        title: 'วางแผนเส้นทาง',
        body: 'กดปุ่ม "นำทาง" ที่ header หรือกด "เส้นทางไปที่นี่" ในหน้ารายละเอียดสถานี ในแผงนำทางมีปุ่ม GPS (ใช้ตำแหน่งปัจจุบัน) และปุ่ม แผนที่ (คลิกเลือกจุดบนแผนที่) สำหรับกำหนดจุดเริ่มต้นและจุดหมาย',
      },
    ],
    btnsTitle: 'คำอธิบายปุ่ม',
    buttons: [
      { symbol: USER_LOCATION_ICON, label: 'ตำแหน่งของฉัน', desc: 'แสดงตำแหน่งปัจจุบันบนแผนที่ด้วยหมุดสีขาวขอบแดงวงในเขียว และจดจำพิกัดไว้ใช้กับโหมดนำทาง' },
      { symbol: '🗺️', label: 'นำทาง', desc: 'เปิดโหมดวางแผนเส้นทาง มีปุ่ม GPS และปุ่มแผนที่สำหรับเลือกจุดเริ่มต้น/จุดหมาย' },
      { symbol: 'TH/EN', label: 'ภาษา', desc: 'สลับภาษาการแสดงผลระหว่างภาษาไทยและภาษาอังกฤษ' },
      { symbol: '☀️/🌙', label: 'โหมด', desc: 'สลับโหมดแสงสว่าง (Light) และโหมดมืด (Dark)' },
      { symbol: 'A', label: 'ขนาด', desc: 'ปรับขนาดตัวอักษรทั้งแอป มี 4 ระดับ กดวนซ้ำเพื่อเปลี่ยน' },
      { symbol: 'ALL', label: 'ALL', desc: 'กดครั้งเดียวเพื่อยกเลิกทุกผู้ให้บริการ กดอีกครั้งเพื่อเลือกทั้งหมด' },
    ],
    tip: '💡 บน mobile กดปุ่ม "X/Y operators ▼" เพื่อขยาย filter แสดงผู้ให้บริการทั้งหมด และกด "ตำแหน่งของฉัน" ก่อนเปิดนำทางเพื่อให้ระบบจำพิกัดไว้ใช้งานได้ทันที',
    close: 'ปิด',
  },
  en: {
    title: 'How to Use Thailand EVSE Map',
    stepsTitle: 'Getting Started',
    steps: [
      {
        icon: '🔍',
        title: 'Search for Stations',
        body: 'Look for the 🔍 Search stations hint in the header, then type a station name, province, or area. The map filters instantly to show only matching stations.',
      },
      {
        icon: '🏷️',
        title: 'Filter by Operator',
        body: 'Look for the 🏷️ Filter hint beside the filter bar. Tap operator chips to show or hide stations from each provider. Tap ALL to select or deselect all at once.',
      },
      {
        icon: STATION_PIN_ICON,
        title: 'View Station Details',
        body: 'Tap a colored pin on the map to see station details: name, operator, number of chargers, and available connector types.',
      },
      {
        icon: USER_LOCATION_ICON,
        title: 'My Location',
        body: 'Tap "My Location" in the header to pan the map to your current position and drop a white pin with red border and green center. This pin is automatically reused as the start point when you open Navigate mode.',
      },
      {
        icon: '🗺️',
        title: 'Plan a Route',
        body: 'Tap "Navigate" in the header or "Route to here" inside a station card. In the routing panel, use the GPS button (current location) or Map button (tap a point on the map) to set your start and destination.',
      },
    ],
    btnsTitle: 'Button Reference',
    buttons: [
      { symbol: USER_LOCATION_ICON, label: 'My Location', desc: 'Drops a white pin (red border, green center) at your current location and saves coordinates for Navigate mode' },
      { symbol: '🗺️', label: 'Navigate', desc: 'Opens route planning panel with GPS and Map buttons for setting origin and destination' },
      { symbol: 'TH/EN', label: 'Language', desc: 'Switch display language between Thai and English' },
      { symbol: '☀️/🌙', label: 'Theme', desc: 'Toggle between light mode and dark mode' },
      { symbol: 'A', label: 'Font', desc: 'Cycle through 4 font size levels for the whole app' },
      { symbol: 'ALL', label: 'ALL', desc: 'One tap to deselect all operators; tap again to select all' },
    ],
    tip: '💡 On mobile, tap "X/Y operators ▼" to expand all operator filters. Tap "My Location" before opening Navigate so the app remembers your position.',
    close: 'Close',
  },
}

export default function HelpModal({ onClose }) {
  const { lang } = useTranslation()
  const h = HELP[lang] ?? HELP.th

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-lg bg-white dark:bg-gray-900 rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-base font-bold text-gray-900 dark:text-white">{h.title}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-lg leading-none"
          >
            ✕
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto px-5 py-4 space-y-5">

          {/* Steps */}
          <section>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-3">
              {h.stepsTitle}
            </p>
            <div className="space-y-3">
              {h.steps.map((step, i) => (
                <div key={i} className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-50 dark:bg-green-900/30 flex items-center justify-center text-base">
                    {typeof step.icon === 'string' && step.icon.startsWith('data:')
                      ? <img src={step.icon} alt="" className="w-5 h-6" />
                      : step.icon}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{step.title}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">{step.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Buttons reference */}
          <section>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-3">
              {h.btnsTitle}
            </p>
            <div className="space-y-2">
              {h.buttons.map((btn, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-10 h-7 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-700 dark:text-gray-200">
                    {typeof btn.symbol === 'string' && btn.symbol.startsWith('data:')
                      ? <img src={btn.symbol} alt="" className="w-4 h-6" />
                      : btn.symbol}
                  </span>
                  <div>
                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">{btn.label}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400"> — {btn.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Tip */}
          <p className="text-xs text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 rounded-xl px-4 py-3 leading-relaxed">
            {h.tip}
          </p>

        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-800">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-green-500 hover:bg-green-600 text-white text-sm font-semibold transition-colors"
          >
            {h.close}
          </button>
        </div>
      </div>
    </div>
  )
}
