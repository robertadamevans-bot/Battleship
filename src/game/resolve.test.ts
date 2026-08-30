import { describe, expect, it } from 'vitest'
import { canFire, isFleetDestroyed, remainingSquares, resolveShot } from './resolve'
import { label } from './geometry'
import type { Placement, Side } from './types'

const placements: Placement[] = [
  { id: 'carrier', row: 0, col: 0, orientation: 'horizontal' },
  { id: 'battleship', row: 2, col: 0, orientation: 'horizontal' },
  { id: 'cruiser', row: 4, col: 0, orientation: 'horizontal' },
  { id: 'submarine', row: 6, col: 0, orientation: 'horizontal' },
  { id: 'destroyer', row: 8, col: 0, orientation: 'horizontal' },
]

const side = (): Side => ({ placements, shots: {}, sunk: [] })

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
    let shots = 0
    for (const p of placements) {
      for (let i = 0; i < 5; i += 1) {
        const cell = { row: p.row, col: p.col + i }
        if (!canFire(state, cell)) continue
        const before = remainingSquares(state)
        const step = resolveShot(state, cell)
        if (step.result.outcome !== 'miss') shots += 1
        expect(remainingSquares(step.side)).toBeLessThanOrEqual(before)
        state = step.side
        if (isFleetDestroyed(state)) break
      }
    }
    expect(shots).toBe(17)
    expect(isFleetDestroyed(state)).toBe(true)
    expect(remainingSquares(state)).toBe(0)
  })
})

describe('coordinates', () => {
  it('labels A1 as the top-left square', () => {
    expect(label({ row: 0, col: 0 })).toBe('A1')
    expect(label({ row: 6, col: 1 })).toBe('B7')
    expect(label({ row: 9, col: 9 })).toBe('J10')
  })
})
