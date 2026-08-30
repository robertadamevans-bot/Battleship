import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import type { LogEntry } from '../game/match'
import Briefing from '../screens/Briefing'
import { resolutionLine } from './lines'
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

describe('theme tokens', () => {
  it('offers all four theatres with Solent first', () => {
    expect(THEME_SPECS.map((t) => t.id)).toEqual(['solent', 'olde', 'warfare', 'pirates'])
    expect(THEMES).toContain('solent')
  })

  it('sets data-theme on the document and remembers the choice', async () => {
    const user = userEvent.setup()
    render(
      <ThemeProvider>
        <Briefing settings={{ name: 'Rob', difficulty: 'admiral', sound: false }} onDeploy={() => {}} />
      </ThemeProvider>,
    )
    expect(document.documentElement.dataset.theme).toBe('solent')

    await user.click(screen.getByRole('button', { name: /pirates of the caribbean/i }))

    expect(document.documentElement.dataset.theme).toBe('pirates')
    expect(window.localStorage.getItem('solent.theme')).toBe('pirates')
    expect(screen.getByRole('button', { name: /weigh anchor/i })).toBeTruthy()
  })

  it('words the same result differently per theatre', () => {
    expect(resolutionLine(hit, themeCopy.solent)).toBe('B7 — you sank the Cruiser')
    expect(resolutionLine(hit, themeCopy.olde)).toBe('B7 — thou hast sunk the Frigate')
    expect(resolutionLine(hit, themeCopy.pirates)).toBe("B7 — you've sent the Brig under")
    expect(resolutionLine({ ...hit, by: 'ai' }, themeCopy.warfare)).toBe(
      'B7 own unit lost — cruiser',
    )
  })

  it('keeps a ship alias for every hull in every theatre', () => {
    for (const theme of THEMES) {
      const aliases = Object.values(themeCopy[theme].shipAlias)
      expect(aliases).toHaveLength(5)
      expect(aliases.every((name) => name.length > 0)).toBe(true)
    }
  })
})
