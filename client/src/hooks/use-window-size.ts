import { useState, useEffect } from "react"

export function useWindowSize() {
  const [isSmallScreen, setIsSmallScreen] = useState(false)

  useEffect(() => {
    const handleResize = () => {
      // Use a breakpoint that matches our web-first design system
      setIsSmallScreen(window.innerWidth < 1024)
    }

    // Initial check
    handleResize()

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return { isSmallScreen }
}