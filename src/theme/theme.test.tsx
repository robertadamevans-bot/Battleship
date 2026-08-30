import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import type { LogEntry } from '../game/match'
import Briefing from '../screens/Briefing'
import { resolutionLine } from './lines'
import { storedCommander, storedDifficulty, storedTheme } from './storage'
import { ThemeProvider } from './ThemeProvider'
import { themeCopy, THEMES, THEME_SPECS } from './themes'

afterEach(() => {
  window.localStorage.clear()
  delete document.documentElement.dataset.theme
})

const hit: LogEntry = {
  by: 'human',
  result: { cell: { row: 6, col: 1 }, outcome: 'sunk', shipId: 'cruiser' },
}

function briefing() {
  return (
    <ThemeProvider>
      <Briefing
        settings={{ name: 'Rob', difficulty: 'officer', sound: false }}
        onDeploy={() => {}}
      />
    </ThemeProvider>
  )
}

describe('theme tokens', () => {
  it('offers all four theatres with the default Armada skin first', () => {
    expect(THEME_SPECS.map((t) => t.id)).toEqual(['armada', 'olde', 'warfare', 'pirates'])
    expect(THEMES).toContain('armada')
  })

  it('sets data-theme on the document and remembers the choice', async () => {
    const user = userEvent.setup()
    render(briefing())
    expect(document.documentElement.dataset.theme).toBe('armada')

    await user.click(screen.getByRole('button', { name: /pirates of the caribbean/i }))

    expect(document.documentElement.dataset.theme).toBe('pirates')
    expect(window.localStorage.getItem('armada.theme')).toBe('pirates')
    expect(screen.getByRole('button', { name: /weigh anchor/i })).toBeTruthy()
  })

  it('titles the document Armada', async () => {
    const user = userEvent.setup()
    render(briefing())
    expect(document.title).toBe('Armada — Fleet action')
    await user.click(screen.getByRole('button', { name: /ye olde times/i }))
    expect(document.title).toBe('Armada — Ye Olde Times')
  })

  it('words the same result differently per theatre', () => {
    expect(resolutionLine(hit, themeCopy.armada)).toBe('B7 — you sank the Cruiser')
    expect(resolutionLine(hit, themeCopy.olde)).toBe('B7 — thou hast sunk the Frigate')
    expect(resolutionLine(hit, themeCopy.pirates)).toBe("B7 — you've sent the Brig under")
    expect(resolutionLine({ ...hit, by: 'ai' }, themeCopy.warfare)).toBe(
      'B7 own unit lost — cruiser',
    )
  })

  it('never names the hull behind a decoy', () => {
    const ghost: LogEntry = {
      by: 'human',
      result: { cell: { row: 0, col: 0 }, outcome: 'hit', shipId: 'decoy-a', decoy: true },
    }
    for (const theme of THEMES) {
      const line = resolutionLine(ghost, themeCopy[theme])
      expect(line.toLowerCase()).not.toContain('destroyer')
      expect(line).toContain('A1')
    }
  })

  it('keeps a ship alias and rank copy for every hull in every theatre', () => {
    for (const theme of THEMES) {
      const copy = themeCopy[theme]
      const aliases = Object.values(copy.shipAlias)
      expect(aliases).toHaveLength(8)
      expect(aliases.every((name) => name.length > 0)).toBe(true)
      for (const line of [copy.powderLabel, copy.clockLabel, copy.powderSpent, copy.timeUp]) {
        expect(line.length).toBeGreaterThan(0)
      }
      expect(copy.oneLifeLoss('Cruiser').toLowerCase()).toContain('cruiser')
    }
  })
})

describe('remembered settings', () => {
  it('migrates the old Solent keys once, then writes the Armada ones', () => {
    window.localStorage.setItem('solent.theme', 'warfare')
    window.localStorage.setItem('solent.commanderName', 'Nelson')

    expect(storedTheme()).toBe('warfare')
    expect(storedCommander('Rob')).toBe('Nelson')
    expect(window.localStorage.getItem('armada.theme')).toBe('warfare')
    expect(window.localStorage.getItem('armada.commanderName')).toBe('Nelson')

    // The new key wins from here on, even if the old one changes.
    window.localStorage.setItem('solent.theme', 'pirates')
    expect(storedTheme()).toBe('warfare')
  })

  it('falls back to Armada when the stored theatre was the old default id', () => {
    window.localStorage.setItem('solent.theme', 'solent')
    expect(storedTheme()).toBe('armada')
  })

  it('defaults an unknown or absent rank to Officer', () => {
    expect(storedDifficulty()).toBe('officer')
    window.localStorage.setItem('armada.difficulty', 'grand-admiral')
    expect(storedDifficulty()).toBe('officer')
    window.localStorage.setItem('armada.difficulty', 'legend')
    expect(storedDifficulty()).toBe('legend')
  })
})
