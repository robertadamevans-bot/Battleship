import { DEFAULT_DIFFICULTY, isDifficultyId, type DifficultyId } from '../game/rules'
import { DEFAULT_THEME, isTheme, type Theme } from './themes'

export const THEME_KEY = 'armada.theme'
export const NAME_KEY = 'armada.commanderName'
export const RANK_KEY = 'armada.difficulty'

/** Solent was the working title; a returning commander keeps their settings. */
const LEGACY_KEYS: Record<string, string> = {
  [THEME_KEY]: 'solent.theme',
  [NAME_KEY]: 'solent.commanderName',
}

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

/** Reads the current key, falling back to the old one once and rewriting it. */
function readMigrated(key: string): string | null {
  const current = read(key)
  if (current !== null) return current
  const legacy = LEGACY_KEYS[key] ? read(LEGACY_KEYS[key]) : null
  if (legacy !== null) write(key, legacy)
  return legacy
}

export function storedTheme(): Theme {
  const stored = readMigrated(THEME_KEY)
  if (isTheme(stored)) return stored
  // Covers the old `solent` default id and any theatre since retired.
  if (stored !== null) write(THEME_KEY, DEFAULT_THEME)
  return DEFAULT_THEME
}

export function storedCommander(fallback: string): string {
  return readMigrated(NAME_KEY)?.trim() || fallback
}

export function rememberCommander(name: string): void {
  write(NAME_KEY, name)
}

export function storedDifficulty(): DifficultyId {
  const stored = read(RANK_KEY)
  return isDifficultyId(stored) ? stored : DEFAULT_DIFFICULTY
}

export function rememberDifficulty(id: DifficultyId): void {
  write(RANK_KEY, id)
}
