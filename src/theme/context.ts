import { createContext } from 'react'
import type { Theme, ThemeCopy } from './themes'

export interface ThemeState {
  theme: Theme
  setTheme: (theme: Theme) => void
  copy: ThemeCopy
}

export const ThemeContext = createContext<ThemeState | null>(null)
