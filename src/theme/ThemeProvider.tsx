import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { ThemeContext } from './context'
import { storedTheme, THEME_KEY, write } from './storage'
import { themeCopy, THEME_SPECS, type Theme } from './themes'

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(storedTheme)

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next)
    write(THEME_KEY, next)
  }, [])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    const spec = THEME_SPECS.find((t) => t.id === theme)!
    document.title =
      theme === 'armada' ? 'Armada — Fleet action' : `Armada — ${spec.name}`
  }, [theme])

  const value = useMemo(
    () => ({ theme, setTheme, copy: themeCopy[theme] }),
    [theme, setTheme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
