import { describe, expect, it } from 'vitest'
import { aiFires, humanFires, startMatch } from './match'
import { nextShot } from '../ai/admiral'
import { seeded } from './rng'
import { shipCells } from './geometry'
import { randomFleet } from './placement'
import type { Cell } from './types'

const rng = seeded(3)

function match() {
  return startMatch(randomFleet(seeded(11)), 'admiral', seeded(12))
}

describe('turn structure', () => {
  it('gives the human the first shot and then passes the turn', () => {
    const start = match()
    expect(start.turn).toBe('human')
    const turn = humanFires(start, { row: 0, col: 0 })!
    expect(turn.match.turn).toBe('ai')
  })

  it('ignores a second human shot before the AI has replied', () => {
    const turn = humanFires(match(), { row: 0, col: 0 })!
    expect(humanFires(turn.match, { row: 1, col: 1 })).toBeNull()
  })

  it('ignores a repeat shot at an already resolved cell', () => {
    let state = humanFires(match(), { row: 0, col: 0 })!.match
    state = aiFires(state, nextShot(state.memory, 'admiral', rng).cell)!.match
    expect(humanFires(state, { row: 0, col: 0 })).toBeNull()
  })

  it('ends immediately when the last enemy square falls, with no ghost AI turn', () => {
    let state = match()
    const enemyCells: Cell[] = state.enemy.placements.flatMap(shipCells)
    for (const cell of enemyCells) {
      const turn = humanFires(state, cell)
      expect(turn).not.toBeNull()
      state = turn!.match
      if (state.winner) break
      state = aiFires(state, nextShot(state.memory, 'admiral', rng).cell)!.match
    }
    expect(state.winner).toBe('human')
    expect(state.enemy.sunk).toHaveLength(5)
    expect(aiFires(state, { row: 0, col: 0 })).toBeNull()
    expect(humanFires(state, { row: 9, col: 9 })).toBeNull()
  })

  it('plays a full match to a single winner', () => {
    let state = match()
    let guard = 0
    while (!state.winner && guard < 400) {
      guard += 1
      if (state.turn === 'human') {
        const open = state.enemy.placements
          .flatMap(shipCells)
          .find((c) => state.enemy.shots[`${c.row},${c.col}`] === undefined)
        const cell = open ?? { row: guard % 10, col: Math.floor(guard / 10) % 10 }
        const turn = humanFires(state, cell)
        if (turn) state = turn.match
      } else {
        state = aiFires(state, nextShot(state.memory, 'admiral', rng).cell)!.match
      }
    }
    expect(state.winner).not.toBeNull()
    expect(state.log[0]).toMatch(/miss|hit|sank|gone/)
  })
})
