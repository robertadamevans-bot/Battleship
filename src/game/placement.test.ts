import { describe, expect, it } from 'vitest'
import {
  checkPlacement,
  isLegalPlacement,
  legalStems,
  randomFleet,
  specFor,
  type PlacementRules,
} from './placement'
import { key, shipCells } from './geometry'
import { ruleset } from './rules'
import { STANDARD_FLEET, fleetSquares, placementOf, type Placement } from './types'
import { seeded } from './rng'

const officer: PlacementRules = { grid: { rows: 10, cols: 10 }, minShipGap: 0 }
const cadet: PlacementRules = { grid: { rows: 12, cols: 12 }, minShipGap: 1 }

const carrier: Placement = {
  id: 'carrier',
  row: 0,
  col: 0,
  orientation: 'horizontal',
  length: 5,
}

describe('placement rules', () => {
  it('accepts a ship that fits on the board', () => {
    expect(isLegalPlacement([], carrier, officer)).toBe(true)
  })

  it('rejects a ship hanging off the right edge', () => {
    expect(checkPlacement([], { ...carrier, col: 6 }, officer).error).toBe('off-board')
  })

  it('rejects a ship hanging off the bottom edge', () => {
    expect(
      checkPlacement([], { ...carrier, row: 6, orientation: 'vertical' }, officer).error,
    ).toBe('off-board')
  })

  it('rejects overlap and reports the clashing cells', () => {
    const check = checkPlacement(
      [carrier],
      { id: 'destroyer', row: 0, col: 4, orientation: 'vertical', length: 2 },
      officer,
    )
    expect(check.error).toBe('overlap')
    expect(check.cells.map(key)).toEqual(['0,4'])
  })

  it('lets hulls touch edge to edge at Officer', () => {
    expect(
      isLegalPlacement(
        [carrier],
        { id: 'destroyer', row: 1, col: 0, orientation: 'horizontal', length: 2 },
        officer,
      ),
    ).toBe(true)
  })

  it('rejects a king-adjacent hull at Cadet, corners included', () => {
    const edge = checkPlacement(
      [carrier],
      { id: 'destroyer', row: 1, col: 0, orientation: 'horizontal', length: 2 },
      cadet,
    )
    expect(edge.error).toBe('too-close')

    const corner = checkPlacement(
      [carrier],
      { id: 'destroyer', row: 1, col: 5, orientation: 'horizontal', length: 2 },
      cadet,
    )
    expect(corner.error).toBe('too-close')

    // Two clear cells away is fine.
    expect(
      isLegalPlacement(
        [carrier],
        { id: 'destroyer', row: 2, col: 0, orientation: 'horizontal', length: 2 },
        cadet,
      ),
    ).toBe(true)
  })

  it('re-placing the same ship ignores its own old squares', () => {
    expect(isLegalPlacement([carrier], { ...carrier, col: 1 }, officer)).toBe(true)
  })

  it('lists only legal stems for the rank grid', () => {
    const spec = specFor(STANDARD_FLEET, 'carrier')
    expect(legalStems([], spec, 'horizontal', officer)).toHaveLength(60)
    expect(legalStems([], spec, 'horizontal', cadet)).toHaveLength(96)
    expect(
      legalStems([], specFor(STANDARD_FLEET, 'destroyer'), 'vertical', officer),
    ).toHaveLength(90)
  })
})

describe('randomFleet', () => {
  it('lays every rank out legally, including the packed 9×9 and the 8×12', () => {
    for (const rank of ['cadet', 'officer', 'commander', 'admiral', 'legend'] as const) {
      const rules = ruleset(rank)
      const placing: PlacementRules = { grid: rules.humanGrid, minShipGap: rules.minShipGap }
      for (let seed = 0; seed < 40; seed += 1) {
        const fleet = randomFleet(rules.fleet, placing, seeded(seed))
        expect(fleet).toHaveLength(rules.fleet.length)
        const cells = fleet.flatMap(shipCells)
        expect(new Set(cells.map(key)).size).toBe(fleetSquares(rules.fleet))
        fleet.forEach((p, i) => {
          expect(isLegalPlacement(fleet.filter((_, j) => j !== i), p, placing)).toBe(true)
        })
      }
    }
  })

  it('fits the decoys onto the shallow 8×12 fire board', () => {
    const legend = ruleset('legend')
    const placing: PlacementRules = { grid: legend.aiGrid, minShipGap: legend.minShipGap }
    const fleet = [...legend.fleet, ...legend.aiExtras]
    for (let seed = 0; seed < 40; seed += 1) {
      const laid = randomFleet(fleet, placing, seeded(seed))
      expect(laid).toHaveLength(7)
      expect(laid.filter((p) => p.decoy)).toHaveLength(2)
      expect(new Set(laid.flatMap(shipCells).map(key)).size).toBe(21)
    }
  })

  it('spreads the fleet rather than stacking it in one corner', () => {
    const officerRules = ruleset('officer')
    const placing: PlacementRules = { grid: officerRules.humanGrid, minShipGap: 0 }
    for (let seed = 0; seed < 60; seed += 1) {
      const cells = randomFleet(officerRules.fleet, placing, seeded(seed)).flatMap(shipCells)
      const rows = cells.map((c) => c.row)
      const cols = cells.map((c) => c.col)
      const height = Math.max(...rows) - Math.min(...rows) + 1
      const width = Math.max(...cols) - Math.min(...cols) + 1
      expect(Math.min(width, height)).toBeGreaterThanOrEqual(5)
    }
  })

  it('places a ship from its spec at the stem it was given', () => {
    const spec = specFor(STANDARD_FLEET, 'cruiser')
    expect(placementOf(spec, { row: 3, col: 4 }, 'vertical')).toEqual({
      id: 'cruiser',
      length: 3,
      orientation: 'vertical',
      row: 3,
      col: 4,
    })
  })
})
