import { describe, expect, it } from 'vitest'
import { checkPlacement, isLegalPlacement, legalStems, randomFleet } from './placement'
import { key, shipCells } from './geometry'
import { FLEET, FLEET_SQUARES, type Placement } from './types'
import { seeded } from './rng'

const carrier: Placement = { id: 'carrier', row: 0, col: 0, orientation: 'horizontal' }

describe('placement rules', () => {
  it('accepts a ship that fits on the board', () => {
    expect(isLegalPlacement([], carrier)).toBe(true)
  })

  it('rejects a ship hanging off the right edge', () => {
    expect(checkPlacement([], { ...carrier, col: 6 }).error).toBe('off-board')
  })

  it('rejects a ship hanging off the bottom edge', () => {
    expect(checkPlacement([], { ...carrier, row: 6, orientation: 'vertical' }).error).toBe(
      'off-board',
    )
  })

  it('rejects overlap and reports the clashing cells', () => {
    const check = checkPlacement([carrier], {
      id: 'destroyer',
      row: 0,
      col: 4,
      orientation: 'vertical',
    })
    expect(check.error).toBe('overlap')
    expect(check.cells.map(key)).toEqual(['0,4'])
  })

  it('allows ships to touch', () => {
    expect(
      isLegalPlacement([carrier], { id: 'destroyer', row: 1, col: 0, orientation: 'horizontal' }),
    ).toBe(true)
  })

  it('re-placing the same ship ignores its own old squares', () => {
    expect(isLegalPlacement([carrier], { ...carrier, col: 1 })).toBe(true)
  })

  it('lists only legal stems', () => {
    expect(legalStems([], 'carrier', 'horizontal')).toHaveLength(60)
    expect(legalStems([], 'destroyer', 'vertical')).toHaveLength(90)
  })
})

describe('randomFleet', () => {
  it('always produces five legal, non-overlapping ships', () => {
    for (let seed = 0; seed < 300; seed += 1) {
      const fleet = randomFleet(seeded(seed))
      expect(fleet).toHaveLength(FLEET.length)
      const cells = fleet.flatMap(shipCells).map(key)
      expect(new Set(cells).size).toBe(FLEET_SQUARES)
      fleet.forEach((p, i) => {
        expect(isLegalPlacement(fleet.filter((_, j) => j !== i), p)).toBe(true)
      })
    }
  })

  it('spreads the fleet rather than stacking it in one corner', () => {
    for (let seed = 0; seed < 100; seed += 1) {
      const cells = randomFleet(seeded(seed)).flatMap(shipCells)
      const rows = cells.map((c) => c.row)
      const cols = cells.map((c) => c.col)
      const height = Math.max(...rows) - Math.min(...rows) + 1
      const width = Math.max(...cols) - Math.min(...cols) + 1
      expect(Math.min(width, height)).toBeGreaterThanOrEqual(5)
    }
  })
})
