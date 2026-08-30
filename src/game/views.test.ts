import { describe, expect, it } from 'vitest'
import { fireView, fleetView } from './views'
import { resolveShot } from './resolve'
import { seeded } from './rng'
import { randomFleet } from './placement'
import { shipCells, key } from './geometry'
import type { Side } from './types'

const side = (): Side => ({
  placements: randomFleet(seeded(7)),
  shots: {},
  sunk: [],
})

describe('enemy fog of war', () => {
  it('keeps intact enemy ships out of the view model entirely', () => {
    const enemy = side()
    const views = fireView(enemy, false)
    expect(views.size).toBe(0)
    for (const value of views.values()) expect(value).not.toBe('reveal')
  })

  it('shows only shot outcomes during the match', () => {
    let enemy = side()
    const target = shipCells(enemy.placements[0])[0]
    enemy = resolveShot(enemy, target).side
    const views = fireView(enemy, false)
    expect(views.get(key(target))).toBe('hit')
    expect([...views.values()]).not.toContain('reveal')
  })

  it('reveals all seventeen enemy squares after the match', () => {
    const enemy = side()
    const views = fireView(enemy, true)
    const revealed = [...views.values()].filter((v) => v === 'reveal')
    expect(revealed).toHaveLength(17)
  })

  it('draws a sunk enemy ship as a sunk outline, not a bare hit', () => {
    let enemy = side()
    const destroyer = enemy.placements.find((p) => p.id === 'destroyer')!
    for (const cell of shipCells(destroyer)) enemy = resolveShot(enemy, cell).side
    const views = fireView(enemy, false)
    for (const cell of shipCells(destroyer)) {
      expect(views.get(key(cell))).toBe('sunk')
    }
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
