import { createContext, useContext, useState } from 'react'

const FontSizeContext = createContext()

const SIZES = ['small', 'medium', 'large', 'xlarge']

export function FontSizeProvider({ children }) {
  const [size, setSize] = useState(() => localStorage.getItem('ev-font-size') || 'medium')

  const setFontSize = (s) => {
    localStorage.setItem('ev-font-size', s)
    setSize(s)
  }

  return (
    <FontSizeContext.Provider value={{ size, setFontSize, SIZES }}>
      {children}
    </FontSizeContext.Provider>
  )
}

export function useFontSize() {
  return useContext(FontSizeContext)
}
