import { useState, useEffect } from 'react'
import { useAds } from '../hooks/useAds'

function AdSlot({ n, bg, textCls = 'text-white', borderCls = 'border-white/30', labelCls = 'text-white/60' }) {
  return (
    <div className={`w-full h-full ${bg} flex flex-col items-center justify-center px-4 rounded-lg relative`}>
      <p className={`${textCls} text-sm font-bold leading-tight`}>พื้นที่โฆษณาที่ {n}</p>
      <p className={`${textCls} text-xs leading-tight mt-1 opacity-80`}>
        ผู้สนใจลงโฆษณาติดต่อ contact@evat.or.th
      </p>
      <span className={`absolute top-1.5 right-2 ${labelCls} text-[10px] border ${borderCls} rounded px-1.5 py-0.5`}>โฆษณา</span>
    </div>
  )
}

const MOCK = {
  top_banner: {
    h: 'h-[60px]',
    fit: 'object-cover',
    content: <AdSlot n={1} bg="bg-gradient-to-r from-blue-500 to-indigo-600" />,
  },
  station_card: {
    h: 'h-[100px]',
    fit: 'object-fill',
    content: <AdSlot n={2} bg="bg-gradient-to-r from-amber-400 to-orange-500" />,
  },
  routing_panel: {
    h: 'h-[70px]',
    fit: 'object-fill',
    content: <AdSlot n={3} bg="bg-gradient-to-r from-indigo-900 to-indigo-700" textCls="text-indigo-100" labelCls="text-indigo-300" borderCls="border-indigo-500" />,
  },
  bottom_bar: {
    h: 'h-[50px]',
    fit: 'object-fill',
    content: <AdSlot n={4} bg="bg-gradient-to-r from-green-500 to-teal-600" />,
  },
}

function AdLabel() {
  return (
    <span className="absolute top-0.5 right-1 text-[9px] text-gray-400 dark:text-gray-600 leading-none pointer-events-none">
      โฆษณา
    </span>
  )
}

export default function AdBanner({ position }) {
  const ads = useAds(position)
  const [idx, setIdx] = useState(0)
  const mock = MOCK[position]

  useEffect(() => {
    if (ads.length <= 1) return
    const t = setInterval(() => setIdx(i => (i + 1) % ads.length), 8000)
    return () => clearInterval(t)
  }, [ads.length])

  if (ads.length === 0) {
    return (
      <div className={`relative w-full ${mock.h} overflow-hidden flex-shrink-0`}>
        {mock.content}
        <AdLabel />
      </div>
    )
  }

  const ad = ads[idx]
  const isMobile = window.innerWidth < 640
  const mobileUrl = ad.image_url_mobile || ad.image_url.replace(/(\.[^.]+)$/, '_mobile$1')
  const src = isMobile ? mobileUrl : ad.image_url
  return (
    <div className={`relative w-full ${mock.h} flex-shrink-0 overflow-hidden`}>
      <img
        src={src}
        alt={ad.title}
        className={`w-full h-full ${mock.fit}`}
        onError={e => { if (e.target.src !== ad.image_url) e.target.src = ad.image_url }}
      />
      <AdLabel />
    </div>
  )
}
