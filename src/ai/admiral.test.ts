import { describe, expect, it } from 'vitest'
import { emptyMemory, nextShot, rememberShot, targetCandidates, type AiMemory } from './admiral'
import { key, label } from '../game/geometry'
import { randomFleet } from '../game/placement'
import { canFire, isFleetDestroyed, resolveShot, shotCount } from '../game/resolve'
import { seeded } from '../game/rng'
import type { AiProfile } from '../game/rules'
import { ruleset } from '../game/rules'
import { emptySide, STANDARD_FLEET, type Cell, type Grid, type Side } from '../game/types'

const rng = seeded(7)
const grid: Grid = { rows: 10, cols: 10 }
const blank = () => emptyMemory(grid, STANDARD_FLEET)

function fire(memory: AiMemory, cell: Cell, outcome: 'miss' | 'hit'): AiMemory {
  return rememberShot(memory, { cell, outcome })
}

describe('Admiral North', () => {
  it('hunts on a parity lattice while nothing is wounded', () => {
    let memory = blank()
    for (let i = 0; i < 40; i += 1) {
      const shot = nextShot(memory, 'smartTarget', rng)
      expect(shot.mode).toBe('hunt')
      expect((shot.cell.row + shot.cell.col) % 2).toBe(0)
      memory = fire(memory, shot.cell, 'miss')
    }
  })

  it('probes orthogonal neighbours after a single hit', () => {
    const memory = fire(blank(), { row: 4, col: 4 }, 'hit')
    const probes = targetCandidates(memory).map(label).sort()
    expect(probes).toEqual(['D5', 'E4', 'E6', 'F5'].sort())
  })

  it('locks the axis once two hits share a row', () => {
    let memory = fire(blank(), { row: 4, col: 4 }, 'hit')
    memory = fire(memory, { row: 4, col: 5 }, 'hit')
    expect(targetCandidates(memory).map(label).sort()).toEqual(['D5', 'G5'])
  })

  it('walks the far end when one end of the axis is a miss', () => {
    let memory = fire(blank(), { row: 4, col: 4 }, 'hit')
    memory = fire(memory, { row: 4, col: 5 }, 'hit')
    memory = fire(memory, { row: 4, col: 3 }, 'miss')
    expect(targetCandidates(memory).map(label)).toEqual(['G5'])
  })

  it('returns to hunting once a sunk ship accounts for every hit', () => {
    let memory = fire(blank(), { row: 4, col: 4 }, 'hit')
    memory = rememberShot(memory, {
      cell: { row: 4, col: 5 },
      outcome: 'sunk',
      shipId: 'destroyer',
    })
    expect(targetCandidates(memory)).toEqual([])
    expect(nextShot(memory, 'smartTarget', rng).mode).toBe('hunt')
    expect(memory.resolved.sort()).toEqual(['4,4', '4,5'])
  })

  it('keeps hunting a second ship whose hits are not explained by the sink', () => {
    let memory = fire(blank(), { row: 0, col: 0 }, 'hit')
    memory = fire(memory, { row: 4, col: 4 }, 'hit')
    memory = rememberShot(memory, {
      cell: { row: 4, col: 5 },
      outcome: 'sunk',
      shipId: 'destroyer',
    })
    expect(targetCandidates(memory).map(label).sort()).toEqual(['A2', 'B1'])
  })

  it('never fires at a square it has already resolved', () => {
    let memory = blank()
    const seen = new Set<string>()
    for (let i = 0; i < 100; i += 1) {
      const shot = nextShot(memory, 'smartTarget', rng)
      expect(seen.has(key(shot.cell))).toBe(false)
      seen.add(key(shot.cell))
      memory = fire(memory, shot.cell, i % 3 === 0 ? 'hit' : 'miss')
    }
    expect(seen.size).toBe(100)
  })

  it('stays inside a rank grid that is not square', () => {
    let memory = emptyMemory({ rows: 8, cols: 12 }, STANDARD_FLEET)
    for (let i = 0; i < 60; i += 1) {
      const shot = nextShot(memory, 'probability', rng)
      expect(shot.cell.row).toBeLessThan(8)
      expect(shot.cell.col).toBeLessThan(12)
      memory = fire(memory, shot.cell, 'miss')
    }
  })

  it('hunts without a parity lattice on the lax cadet profile', () => {
    let memory = blank()
    const parities = new Set<number>()
    for (let i = 0; i < 30; i += 1) {
      const shot = nextShot(memory, 'lax', rng)
      parities.add((shot.cell.row + shot.cell.col) % 2)
      memory = fire(memory, shot.cell, 'miss')
    }
    expect(parities.size).toBe(2)
  })

  it('still finishes a wounded ship on the lax profile', () => {
    const memory = fire(blank(), { row: 4, col: 4 }, 'hit')
    const shot = nextShot(memory, 'lax', rng)
    expect(shot.mode).toBe('target')
    expect(['D5', 'E4', 'E6', 'F5']).toContain(label(shot.cell))
  })
})

/** Plays a profile against a real board through the shared resolver. */
function playOut(seed: number, profile: AiProfile): number {
  const local = seeded(seed)
  const officer = ruleset('officer')
  let side: Side = emptySide(
    grid,
    randomFleet(officer.fleet, { grid, minShipGap: 0 }, local),
  )
  let memory = emptyMemory(grid, officer.fleet)
  while (!isFleetDestroyed(side)) {
    const shot = nextShot(memory, profile, local)
    expect(canFire(side, shot.cell)).toBe(true)
    const step = resolveShot(side, shot.cell)
    side = step.side
    memory = rememberShot(memory, step.result)
    if (shotCount(side) > 100) throw new Error('AI failed to finish the board')
  }
  return shotCount(side)
}

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length

describe('AI profiles on the same control board', () => {
  it('ranks lax below standard below probability', () => {
    const games = 30
    const results: Record<'lax' | 'standard' | 'probability', number[]> = {
      lax: [],
      standard: [],
      probability: [],
    }
    for (let seed = 0; seed < games; seed += 1) {
      for (const profile of ['lax', 'standard', 'probability'] as const) {
        results[profile].push(playOut(seed, profile))
      }
    }
    expect(Math.max(...results.probability)).toBeLessThan(90)
    // A random shooter needs ~95; hunt/target ~60; heatmap hunt/target ~45.
    expect(mean(results.probability)).toBeLessThan(52)
    expect(mean(results.probability)).toBeLessThan(mean(results.standard))
    expect(mean(results.standard)).toBeLessThan(mean(results.lax))
  })
})
