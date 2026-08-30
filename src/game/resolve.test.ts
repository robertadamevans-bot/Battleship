import { describe, expect, it } from 'vitest'
import {
  canFire,
  isFleetDestroyed,
  realShips,
  remainingSquares,
  resolveShot,
} from './resolve'
import { label, shipCells } from './geometry'
import { emptySide, type Placement, type Side } from './types'

const placements: Placement[] = [
  { id: 'carrier', row: 0, col: 0, orientation: 'horizontal', length: 5 },
  { id: 'battleship', row: 2, col: 0, orientation: 'horizontal', length: 4 },
  { id: 'cruiser', row: 4, col: 0, orientation: 'horizontal', length: 3 },
  { id: 'submarine', row: 6, col: 0, orientation: 'horizontal', length: 3 },
  { id: 'destroyer', row: 8, col: 0, orientation: 'horizontal', length: 2 },
]

const side = (): Side => emptySide({ rows: 10, cols: 10 }, placements)

describe('resolveShot', () => {
  it('reports a miss on empty water', () => {
    expect(resolveShot(side(), { row: 9, col: 9 }).result.outcome).toBe('miss')
  })

  it('reports a hit without sinking a longer ship', () => {
    const { result } = resolveShot(side(), { row: 0, col: 0 })
    expect(result.outcome).toBe('hit')
    expect(result.shipId).toBe('carrier')
  })

  it('reports sunk and names the ship on the killing shot', () => {
    let state = side()
    const first = resolveShot(state, { row: 8, col: 0 })
    state = first.side
    expect(first.result.outcome).toBe('hit')
    const second = resolveShot(state, { row: 8, col: 1 })
    expect(second.result.outcome).toBe('sunk')
    expect(second.result.shipId).toBe('destroyer')
    expect(second.side.sunk).toEqual(['destroyer'])
  })

  it('numbers every shot so fog can age it later', () => {
    let state = side()
    state = resolveShot(state, { row: 9, col: 0 }).side
    state = resolveShot(state, { row: 9, col: 1 }).side
    expect(state.order).toEqual({ '9,0': 1, '9,1': 2 })
  })

  it('refuses to resolve the same cell twice', () => {
    const { side: after } = resolveShot(side(), { row: 5, col: 5 })
    expect(canFire(after, { row: 5, col: 5 })).toBe(false)
    expect(() => resolveShot(after, { row: 5, col: 5 })).toThrow()
  })

  it('never mutates the side it was given', () => {
    const original = side()
    resolveShot(original, { row: 0, col: 0 })
    expect(original.shots).toEqual({})
    expect(original.sunk).toEqual([])
  })

  it('ends the game only when all seventeen squares are gone', () => {
    let state = side()
    let hits = 0
    for (const p of placements) {
      for (const cell of shipCells(p)) {
        if (!canFire(state, cell)) continue
        const step = resolveShot(state, cell)
        if (step.result.outcome !== 'miss') hits += 1
        state = step.side
      }
    }
    expect(hits).toBe(17)
    expect(isFleetDestroyed(state)).toBe(true)
    expect(remainingSquares(state)).toBe(0)
  })
})

describe('decoys', () => {
  const withDecoy = (): Side =>
    emptySide({ rows: 8, cols: 12 }, [
      ...placements,
      { id: 'decoy-a', row: 6, col: 6, orientation: 'horizontal', length: 2, decoy: true },
    ])

  it('marks a decoy strike so the copy can stay vague', () => {
    const { result } = resolveShot(withDecoy(), { row: 6, col: 6 })
    expect(result.decoy).toBe(true)
    expect(result.shipId).toBe('decoy-a')
  })

  it('does not count a sunk decoy toward the victory condition', () => {
    let state = withDecoy()
    state = resolveShot(state, { row: 6, col: 6 }).side
    state = resolveShot(state, { row: 6, col: 7 }).side
    expect(state.sunk).toContain('decoy-a')
    expect(isFleetDestroyed(state)).toBe(false)
    expect(realShips(state)).toHaveLength(5)
    expect(remainingSquares(state)).toBeGreaterThan(0)
  })
})

describe('coordinates', () => {
  it('labels A1 as the top-left square', () => {
    expect(label({ row: 0, col: 0 })).toBe('A1')
    expect(label({ row: 6, col: 1 })).toBe('B7')
    expect(label({ row: 9, col: 9 })).toBe('J10')
  })

  it('runs the letters out to L on a twelve-column board', () => {
    expect(label({ row: 11, col: 11 })).toBe('L12')
    expect(label({ row: 7, col: 11 })).toBe('L8')
  })
})
