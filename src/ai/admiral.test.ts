import { describe, expect, it } from 'vitest'
import { EMPTY_MEMORY, nextShot, rememberShot, targetCandidates, type AiMemory } from './admiral'
import { key, label } from '../game/geometry'
import { randomFleet } from '../game/placement'
import { canFire, isFleetDestroyed, resolveShot, shotCount } from '../game/resolve'
import { seeded } from '../game/rng'
import type { Cell, Side } from '../game/types'

const rng = seeded(7)

function fire(memory: AiMemory, cell: Cell, outcome: 'miss' | 'hit'): AiMemory {
  return rememberShot(memory, { cell, outcome })
}

describe('Admiral North', () => {
  it('hunts on a parity lattice while nothing is wounded', () => {
    let memory = EMPTY_MEMORY
    for (let i = 0; i < 40; i += 1) {
      const shot = nextShot(memory, 'admiral', rng)
      expect(shot.mode).toBe('hunt')
      expect((shot.cell.row + shot.cell.col) % 2).toBe(0)
      memory = fire(memory, shot.cell, 'miss')
    }
  })

  it('probes orthogonal neighbours after a single hit', () => {
    const memory = fire(EMPTY_MEMORY, { row: 4, col: 4 }, 'hit')
    const probes = targetCandidates(memory).map(label).sort()
    expect(probes).toEqual(['D5', 'E4', 'E6', 'F5'].sort())
  })

  it('locks the axis once two hits share a row', () => {
    let memory = fire(EMPTY_MEMORY, { row: 4, col: 4 }, 'hit')
    memory = fire(memory, { row: 4, col: 5 }, 'hit')
    expect(targetCandidates(memory).map(label).sort()).toEqual(['D5', 'G5'])
  })

  it('walks the far end when one end of the axis is a miss', () => {
    let memory = fire(EMPTY_MEMORY, { row: 4, col: 4 }, 'hit')
    memory = fire(memory, { row: 4, col: 5 }, 'hit')
    memory = fire(memory, { row: 4, col: 3 }, 'miss')
    expect(targetCandidates(memory).map(label)).toEqual(['G5'])
  })

  it('returns to hunting once a sunk ship accounts for every hit', () => {
    let memory = fire(EMPTY_MEMORY, { row: 4, col: 4 }, 'hit')
    memory = rememberShot(memory, {
      cell: { row: 4, col: 5 },
      outcome: 'sunk',
      shipId: 'destroyer',
    })
    expect(targetCandidates(memory)).toEqual([])
    expect(nextShot(memory, 'admiral', rng).mode).toBe('hunt')
    expect(memory.resolved.sort()).toEqual(['4,4', '4,5'])
  })

  it('keeps hunting a second ship whose hits are not explained by the sink', () => {
    let memory = fire(EMPTY_MEMORY, { row: 0, col: 0 }, 'hit')
    memory = fire(memory, { row: 4, col: 4 }, 'hit')
    memory = rememberShot(memory, {
      cell: { row: 4, col: 5 },
      outcome: 'sunk',
      shipId: 'destroyer',
    })
    expect(targetCandidates(memory).map(label).sort()).toEqual(['A2', 'B1'])
  })

  it('never fires at a square it has already resolved', () => {
    let memory = EMPTY_MEMORY
    const seen = new Set<string>()
    for (let i = 0; i < 100; i += 1) {
      const shot = nextShot(memory, 'admiral', rng)
      expect(seen.has(key(shot.cell))).toBe(false)
      seen.add(key(shot.cell))
      memory = fire(memory, shot.cell, i % 3 === 0 ? 'hit' : 'miss')
    }
    expect(seen.size).toBe(100)
  })
})

/** Plays the AI against a real board through the shared resolver. */
function playOut(seed: number, difficulty: 'admiral' | 'cadet'): number {
  const local = seeded(seed)
  let side: Side = { placements: randomFleet(local), shots: {}, sunk: [] }
  let memory = EMPTY_MEMORY
  while (!isFleetDestroyed(side)) {
    const shot = nextShot(memory, difficulty, local)
    expect(canFire(side, shot.cell)).toBe(true)
    const step = resolveShot(side, shot.cell)
    side = step.side
    memory = rememberShot(memory, step.result)
    if (shotCount(side) > 100) throw new Error('AI failed to finish the board')
  }
  return shotCount(side)
}

describe('AI strength', () => {
  it('clears a fleet well inside 100 shots and beats its own cadet mode', () => {
    const games = 60
    const admiral: number[] = []
    const cadet: number[] = []
    for (let seed = 0; seed < games; seed += 1) {
      admiral.push(playOut(seed, 'admiral'))
      cadet.push(playOut(seed, 'cadet'))
    }
    const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length
    expect(Math.max(...admiral)).toBeLessThan(90)
    // A random shooter needs ~95; hunt/target ~60; heatmap hunt/target ~45.
    expect(mean(admiral)).toBeLessThan(52)
    expect(mean(admiral)).toBeLessThan(mean(cadet))
  })
})
