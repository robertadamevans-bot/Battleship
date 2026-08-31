import { describe, expect, it } from 'vitest'
import { fireView, fleetView } from './views'
import { resolveShot } from './resolve'
import { seeded } from './rng'
import { randomFleet } from './placement'
import { shipCells, key, columnLabels, rowLabels } from './geometry'
import { ruleset } from './rules'
import { emptySide, type Cell, type Side } from './types'

const grid = { rows: 10, cols: 10 }
const officer = ruleset('officer')

const side = (): Side =>
  emptySide(grid, randomFleet(officer.fleet, { grid, minShipGap: 0 }, seeded(7)))

/** Fires a sequence of misses in open water, oldest first. */
function missAt(state: Side, cells: Cell[]): Side {
  let next = state
  for (const cell of cells) next = resolveShot(next, cell).side
  return next
}

/** Water that no ship in this layout occupies. */
function openWater(state: Side, count: number): Cell[] {
  const taken = new Set(state.placements.flatMap(shipCells).map(key))
  const cells: Cell[] = []
  for (let row = 0; row < grid.rows && cells.length < count; row += 1) {
    for (let col = 0; col < grid.cols && cells.length < count; col += 1) {
      if (!taken.has(`${row},${col}`)) cells.push({ row, col })
    }
  }
  return cells
}

describe('enemy fog of war', () => {
  it('keeps intact enemy ships out of the view model entirely', () => {
    const views = fireView(side())
    expect(views.size).toBe(0)
    for (const value of views.values()) expect(value).not.toBe('reveal')
  })

  it('shows only shot outcomes during the match', () => {
    let enemy = side()
    const target = shipCells(enemy.placements[0])[0]
    enemy = resolveShot(enemy, target).side
    const views = fireView(enemy)
    expect(views.get(key(target))).toBe('hit')
    expect([...views.values()]).not.toContain('reveal')
  })

  it('reveals all seventeen enemy squares after the match', () => {
    const views = fireView(side(), { reveal: true })
    expect([...views.values()].filter((v) => v === 'reveal')).toHaveLength(17)
  })

  it('draws a sunk enemy ship as a sunk outline, not a bare hit', () => {
    let enemy = side()
    const destroyer = enemy.placements.find((p) => p.id === 'destroyer')!
    for (const cell of shipCells(destroyer)) enemy = resolveShot(enemy, cell).side
    const views = fireView(enemy)
    for (const cell of shipCells(destroyer)) {
      expect(views.get(key(cell))).toBe('sunk')
    }
  })
})

describe('fog aging', () => {
  it('forgets an Admiral miss once it is more than three round trips old', () => {
    const water = openWater(side(), 5)
    const fog = ruleset('admiral').fog
    let enemy = missAt(side(), water.slice(0, 4))
    // Four shots in: the first miss is three round trips old and still marked.
    expect(fireView(enemy, { fog }).get(key(water[0]))).toBe('miss')
    enemy = missAt(enemy, [water[4]])
    expect(fireView(enemy, { fog }).get(key(water[0]))).toBe('uncertain')
    expect(fireView(enemy, { fog }).get(key(water[4]))).toBe('miss')
  })

  it('forgets a Legend miss after two round trips', () => {
    const water = openWater(side(), 4)
    const fog = ruleset('legend').fog
    const enemy = missAt(side(), water)
    const views = fireView(enemy, { fog })
    expect(views.get(key(water[0]))).toBe('uncertain')
    expect(views.get(key(water[1]))).toBe('miss')
  })

  it('keeps a forgotten miss spent, and never fogs a hit or a sink', () => {
    const fog = ruleset('admiral').fog
    let enemy = side()
    const hit = shipCells(enemy.placements[0])[0]
    enemy = resolveShot(enemy, hit).side
    enemy = missAt(enemy, openWater(enemy, 6))
    const views = fireView(enemy, { fog })
    expect(views.get(key(hit))).toBe('hit')
    for (const [k, view] of views) {
      if (view !== 'uncertain') continue
      // Uncertain is presentation only: the shot is still on the record.
      expect(enemy.shots[k]).toBe('miss')
    }
  })

  it('does not fog anything for a rank without fog', () => {
    const enemy = missAt(side(), openWater(side(), 8))
    const views = fireView(enemy, { fog: ruleset('officer').fog })
    expect([...views.values()]).not.toContain('uncertain')
  })
})

describe('cadet hints', () => {
  it('pips the orthogonal neighbours of an unsunk hit', () => {
    let enemy = side()
    const target = shipCells(enemy.placements[0])[0]
    enemy = resolveShot(enemy, target).side
    const views = fireView(enemy, { adjacentHitIndicators: true })
    const pips = [...views.values()].filter((v) => v === 'range')
    expect(pips.length).toBeGreaterThan(0)
    // A hint about neighbours is not a reveal of what is under them.
    expect([...views.values()]).not.toContain('reveal')
  })

  it('offers no pips when the rank withholds them', () => {
    let enemy = side()
    enemy = resolveShot(enemy, shipCells(enemy.placements[0])[0]).side
    expect([...fireView(enemy).values()]).not.toContain('range')
  })
})

describe('own water', () => {
  it('marks hits on afloat ships and misses in open water', () => {
    let own = side()
    const hit = shipCells(own.placements[0])[0]
    own = resolveShot(own, hit).side
    const views = fleetView(own)
    expect(views.get(key(hit))).toBe('ship-hit')
    expect([...views.values()].filter((v) => v === 'ship').length).toBe(16)
  })
})

describe('dynamic coordinates', () => {
  it('labels each rank grid to its own size', () => {
    expect(columnLabels(ruleset('cadet').humanGrid).join('')).toBe('ABCDEFGHIJKL')
    expect(rowLabels(ruleset('cadet').humanGrid)).toHaveLength(12)
    expect(columnLabels(ruleset('commander').humanGrid).join('')).toBe('ABCDEFGHI')
    expect(columnLabels(ruleset('legend').aiGrid).join('')).toBe('ABCDEFGHIJKL')
    expect(rowLabels(ruleset('legend').aiGrid)).toEqual(['1', '2', '3', '4', '5', '6', '7', '8'])
  })
})
