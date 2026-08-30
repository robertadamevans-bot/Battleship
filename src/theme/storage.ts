import { DEFAULT_THEME, isTheme, type Theme } from './themes'

export const THEME_KEY = 'solent.theme'
export const NAME_KEY = 'solent.commanderName'

/** localStorage is unavailable in private modes and some embeds; never throw over it. */
function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

export function write(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    /* the session simply will not be remembered */
  }
}

export function storedTheme(): Theme {
  const stored = read(THEME_KEY)
  return isTheme(stored) ? stored : DEFAULT_THEME
}

export function storedCommander(fallback: string): string {
  return read(NAME_KEY)?.trim() || fallback
}

export function rememberCommander(name: string): void {
  write(NAME_KEY, name)
}
