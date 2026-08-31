import {
  allCells,
  fromKey,
  inBounds,
  key,
  neighbours,
  spanCells,
} from '../game/geometry'
import { pick, type Rng } from '../game/rng'
import type { AiProfile } from '../game/rules'
import type { Cell, Grid, Orientation, ShipId, ShipSpec, ShotResult } from '../game/types'

/**
 * Everything Admiral North is allowed to know: the water it fires into, the
 * fleet list it is up against, and the results of its own shots. It never sees
 * the human's placements — only what the shot resolver told it.
 */
export interface AiMemory {
  grid: Grid
  fleet: readonly ShipSpec[]
  shots: Record<string, 'miss' | 'hit'>
  /** Hit cells attributed to a ship that is already sunk. */
  resolved: string[]
  sunk: ShipId[]
}

export function emptyMemory(grid: Grid, fleet: readonly ShipSpec[]): AiMemory {
  return { grid, fleet, shots: {}, resolved: [], sunk: [] }
}

function hitKeys(memory: AiMemory): string[] {
  return Object.keys(memory.shots).filter((k) => memory.shots[k] === 'hit')
}

function unresolvedHits(memory: AiMemory): Cell[] {
  const resolved = new Set(memory.resolved)
  return hitKeys(memory)
    .filter((k) => !resolved.has(k))
    .map(fromKey)
}

function lengthOf(memory: AiMemory, id: ShipId): number {
  return memory.fleet.find((s) => s.id === id)?.length ?? 2
}

/** Walks the contiguous run of hits through `cell` along one axis. */
function hitRun(hits: Set<string>, cell: Cell, orientation: Orientation, grid: Grid): Cell[] {
  const step = orientation === 'horizontal' ? { row: 0, col: 1 } : { row: 1, col: 0 }
  const run: Cell[] = [cell]
  for (const dir of [-1, 1]) {
    let next = { row: cell.row + step.row * dir, col: cell.col + step.col * dir }
    while (inBounds(next, grid) && hits.has(key(next))) {
      if (dir < 0) run.unshift(next)
      else run.push(next)
      next = { row: next.row + step.row * dir, col: next.col + step.col * dir }
    }
  }
  return run
}

/**
 * A sink names the ship but not its squares, so work out which hits belonged to
 * it: the contiguous run through the killing shot that matches the ship length.
 */
function attributeSunkCells(memory: AiMemory, killing: Cell, id: ShipId): string[] {
  const length = lengthOf(memory, id)
  const resolved = new Set(memory.resolved)
  const hits = new Set(hitKeys(memory).filter((k) => !resolved.has(k)))
  hits.add(key(killing))

  for (const orientation of ['horizontal', 'vertical'] as Orientation[]) {
    const run = hitRun(hits, killing, orientation, memory.grid)
    if (run.length < length) continue
    const index = run.findIndex((c) => c.row === killing.row && c.col === killing.col)
    const start = Math.max(0, Math.min(index, run.length - length))
    return run.slice(start, start + length).map(key)
  }
  return [key(killing)]
}

export function rememberShot(memory: AiMemory, result: ShotResult): AiMemory {
  const k = key(result.cell)
  const next: AiMemory = {
    ...memory,
    shots: { ...memory.shots, [k]: result.outcome === 'miss' ? 'miss' : 'hit' },
  }
  if (result.outcome === 'sunk' && result.shipId) {
    next.sunk = [...memory.sunk, result.shipId]
    next.resolved = [...memory.resolved, ...attributeSunkCells(memory, result.cell, result.shipId)]
  }
  return next
}

function afloat(memory: AiMemory): ShipSpec[] {
  return memory.fleet.filter((s) => !memory.sunk.includes(s.id))
}

/**
 * Occupancy heatmap: for every square, how many ways could each remaining ship
 * still sit there given the misses and the ships already sunk. Squares that
 * would complete a known-but-unsunk hit are weighted heavily.
 */
export function heatmap(memory: AiMemory, largestOnly = false): Map<string, number> {
  const scores = new Map<string, number>()
  const resolved = new Set(memory.resolved)
  const live = new Set(unresolvedHits(memory).map(key))
  const blocked = (c: Cell) => memory.shots[key(c)] === 'miss' || resolved.has(key(c))

  const ships = afloat(memory)
  const longest = Math.max(...ships.map((s) => s.length), 0)
  const considered = largestOnly ? ships.filter((s) => s.length === longest) : ships

  for (const spec of considered) {
    for (const orientation of ['horizontal', 'vertical'] as Orientation[]) {
      for (let row = 0; row < memory.grid.rows; row += 1) {
        for (let col = 0; col < memory.grid.cols; col += 1) {
          const cells = spanCells({ row, col }, spec.length, orientation)
          if (!cells.every((c) => inBounds(c, memory.grid)) || cells.some(blocked)) continue
          const covered = cells.filter((c) => live.has(key(c))).length
          const weight = 1 + covered * 12
          for (const c of cells) {
            if (memory.shots[key(c)] !== undefined) continue
            scores.set(key(c), (scores.get(key(c)) ?? 0) + weight)
          }
        }
      }
    }
  }
  return scores
}

function clusters(hits: Cell[], grid: Grid): Cell[][] {
  const remaining = new Map(hits.map((c) => [key(c), c]))
  const groups: Cell[][] = []
  while (remaining.size > 0) {
    const [firstKey] = remaining.keys()
    const stack = [remaining.get(firstKey)!]
    remaining.delete(firstKey)
    const group: Cell[] = []
    while (stack.length > 0) {
      const cell = stack.pop()!
      group.push(cell)
      for (const n of neighbours(cell, grid)) {
        if (remaining.has(key(n))) {
          stack.push(remaining.get(key(n))!)
          remaining.delete(key(n))
        }
      }
    }
    groups.push(group)
  }
  return groups
}

function unfired(memory: AiMemory, cell: Cell): boolean {
  return inBounds(cell, memory.grid) && memory.shots[key(cell)] === undefined
}

/** Cells worth probing next given an unresolved cluster of hits. */
export function targetCandidates(memory: AiMemory, axisLock = true): Cell[] {
  const groups = clusters(unresolvedHits(memory), memory.grid).sort((a, b) => b.length - a.length)
  for (const group of groups) {
    const sameRow = group.every((c) => c.row === group[0].row)
    const sameCol = group.every((c) => c.col === group[0].col)

    if (axisLock && group.length > 1 && (sameRow || sameCol)) {
      const orientation: Orientation = sameRow ? 'horizontal' : 'vertical'
      const sorted = [...group].sort((a, b) =>
        orientation === 'horizontal' ? a.col - b.col : a.row - b.row,
      )
      const step = orientation === 'horizontal' ? { row: 0, col: 1 } : { row: 1, col: 0 }
      const head = sorted[0]
      const tail = sorted[sorted.length - 1]
      const ends = [
        { row: head.row - step.row, col: head.col - step.col },
        { row: tail.row + step.row, col: tail.col + step.col },
      ].filter((c) => unfired(memory, c))
      if (ends.length > 0) return ends
    }

    const probes = group.flatMap((c) => neighbours(c, memory.grid)).filter((c) => unfired(memory, c))
    if (probes.length > 0) return probes
  }
  return []
}

function huntCandidates(memory: AiMemory, parity: boolean): Cell[] {
  const open = allCells(memory.grid).filter((c) => unfired(memory, c))
  if (!parity) return open
  const smallest = Math.min(...afloat(memory).map((s) => s.length))
  const spaced = open.filter((c) => (c.row + c.col) % smallest === 0)
  return spaced.length > 0 ? spaced : open
}

interface Brain {
  parity: boolean
  axisLock: boolean
  /** 'none' fires blind, 'full' ranks every remaining ship, 'largest' the biggest. */
  ranking: 'none' | 'full' | 'largest'
}

const BRAINS: Record<AiProfile, Brain> = {
  lax: { parity: false, axisLock: false, ranking: 'none' },
  standard: { parity: true, axisLock: true, ranking: 'none' },
  packedHunt: { parity: true, axisLock: true, ranking: 'full' },
  smartTarget: { parity: true, axisLock: true, ranking: 'full' },
  probability: { parity: false, axisLock: true, ranking: 'full' },
}

function best(cells: Cell[], memory: AiMemory, brain: Brain, rng: Rng): Cell {
  if (brain.ranking === 'none') return pick(cells, rng)
  const scores = heatmap(memory, brain.ranking === 'largest')
  const fallback = brain.ranking === 'largest' ? heatmap(memory) : scores
  const rank = (c: Cell) => (scores.get(key(c)) ?? 0) * 1000 + (fallback.get(key(c)) ?? 0)
  const top = cells.reduce((max, c) => Math.max(max, rank(c)), -1)
  const shortlist = cells.filter((c) => rank(c) === top)
  return pick(shortlist.length > 0 ? shortlist : cells, rng)
}

export interface AiShot {
  cell: Cell
  mode: 'hunt' | 'target'
}

/** Hunt/target with the profile's search. Never returns a square already fired at. */
export function nextShot(memory: AiMemory, profile: AiProfile, rng: Rng): AiShot {
  const brain = BRAINS[profile]
  const targets = targetCandidates(memory, brain.axisLock)
  if (targets.length > 0) {
    return { cell: best(targets, memory, brain, rng), mode: 'target' }
  }
  const hunt = huntCandidates(memory, brain.parity)
  if (hunt.length === 0) throw new Error('no squares left to fire at')
  return { cell: best(hunt, memory, brain, rng), mode: 'hunt' }
}
