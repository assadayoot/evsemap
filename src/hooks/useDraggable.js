import { useState, useRef, useCallback } from 'react'

export function useDraggable(initialX, initialY) {
  const [pos, setPos] = useState({ x: initialX, y: initialY })
  const drag = useRef({ active: false, startX: 0, startY: 0, startPosX: 0, startPosY: 0 })
  const posRef = useRef({ x: initialX, y: initialY })

  const onPointerDown = useCallback((e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    drag.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      startPosX: posRef.current.x,
      startPosY: posRef.current.y,
    }
    e.currentTarget.setPointerCapture(e.pointerId)
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const onPointerMove = useCallback((e) => {
    if (!drag.current.active) return
    const x = Math.max(0, drag.current.startPosX + e.clientX - drag.current.startX)
    const y = Math.max(0, drag.current.startPosY + e.clientY - drag.current.startY)
    posRef.current = { x, y }
    setPos({ x, y })
  }, [])

  const onPointerUp = useCallback(() => {
    drag.current.active = false
  }, [])

  const resetPos = useCallback((x, y) => {
    posRef.current = { x, y }
    setPos({ x, y })
  }, [])

  return { pos, onPointerDown, onPointerMove, onPointerUp, resetPos }
}
