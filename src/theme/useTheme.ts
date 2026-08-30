import { useContext } from 'react'
import { ThemeContext, type ThemeState } from './context'
import { DEFAULT_THEME, themeCopy } from './themes'

/** Outside a provider (unit tests, isolated screens) the original theatre applies. */
const FALLBACK: ThemeState = {
  theme: DEFAULT_THEME,
  setTheme: () => {},
  copy: themeCopy[DEFAULT_THEME],
}

export function useTheme(): ThemeState {
  return useContext(ThemeContext) ?? FALLBACK
}
