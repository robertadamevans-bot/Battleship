import { STANDARD_FLEET, type Grid, type ShipSpec } from './types'

export type DifficultyId = 'cadet' | 'officer' | 'commander' | 'admiral' | 'legend'

export type AiProfile = 'lax' | 'standard' | 'packedHunt' | 'smartTarget' | 'probability'

export interface FogConfig {
  /** Fog only ever touches the Fire board; own water is never fogged. */
  enabled: boolean
  /**
   * How many of the human's own later shots it takes for a miss to fade to an
   * uncertain mark. The cell stays spent either way.
   */
  fadeAfterRounds: number
}

export interface Ruleset {
  id: DifficultyId
  label: string
  rank: string
  /** One line of stakes, shown on the rank card. */
  stakes: string
  /** An unusual rule this rank must declare up front. */
  caution?: string
  humanGrid: Grid
  aiGrid: Grid
  fleet: readonly ShipSpec[]
  /** Extra ships on Admiral North's board that never count toward victory. */
  aiExtras: readonly ShipSpec[]
  minShipGap: 0 | 1
  shotsPerTurnHuman: number
  shotsPerTurnAi: number
  matchShotBudgetHuman: number | null
  moveTimeMs: number | null
  fog: FogConfig
  hints: { adjacentHitIndicators: boolean; verboseFeedback: boolean }
  decoys: number
  movingShips: boolean
  /** First fully sunk human ship ends the match as a loss. */
  oneLife: boolean
  aiProfile: AiProfile
}

const NO_FOG: FogConfig = { enabled: false, fadeAfterRounds: 0 }

const COMMANDER_FLEET: readonly ShipSpec[] = [
  ...STANDARD_FLEET,
  { id: 'patrol', name: 'Patrol', length: 2 },
]

const DECOYS: readonly ShipSpec[] = [
  { id: 'decoy-a', name: 'Ghost', length: 2, decoy: true },
  { id: 'decoy-b', name: 'Ghost', length: 2, decoy: true },
]

const square = (n: number): Grid => ({ rows: n, cols: n })

export const RULESETS: readonly Ruleset[] = [
  {
    id: 'cadet',
    label: 'Cadet',
    rank: 'Cadet',
    stakes: 'Wide water. Clear signals. No clock.',
    humanGrid: square(12),
    aiGrid: square(12),
    fleet: STANDARD_FLEET,
    aiExtras: [],
    minShipGap: 1,
    shotsPerTurnHuman: 1,
    shotsPerTurnAi: 1,
    matchShotBudgetHuman: null,
    moveTimeMs: null,
    fog: NO_FOG,
    hints: { adjacentHitIndicators: true, verboseFeedback: true },
    decoys: 0,
    movingShips: false,
    oneLife: false,
    aiProfile: 'lax',
  },
  {
    id: 'officer',
    label: 'Officer',
    rank: 'Officer',
    stakes: 'Standard action. No favours.',
    humanGrid: square(10),
    aiGrid: square(10),
    fleet: STANDARD_FLEET,
    aiExtras: [],
    minShipGap: 0,
    shotsPerTurnHuman: 1,
    shotsPerTurnAi: 1,
    matchShotBudgetHuman: null,
    moveTimeMs: null,
    fog: NO_FOG,
    hints: { adjacentHitIndicators: false, verboseFeedback: true },
    decoys: 0,
    movingShips: false,
    oneLife: false,
    aiProfile: 'standard',
  },
  {
    id: 'commander',
    label: 'Commander',
    rank: 'Commander',
    stakes: 'Tight water. Count your powder.',
    humanGrid: square(9),
    aiGrid: square(9),
    fleet: COMMANDER_FLEET,
    aiExtras: [],
    minShipGap: 0,
    shotsPerTurnHuman: 1,
    shotsPerTurnAi: 1,
    matchShotBudgetHuman: 42,
    moveTimeMs: null,
    fog: NO_FOG,
    hints: { adjacentHitIndicators: false, verboseFeedback: true },
    decoys: 0,
    movingShips: false,
    oneLife: false,
    aiProfile: 'packedHunt',
  },
  {
    id: 'admiral',
    label: 'Admiral',
    rank: 'Admiral',
    stakes: 'The chart forgets. The clock does not.',
    humanGrid: square(10),
    aiGrid: square(10),
    fleet: STANDARD_FLEET,
    aiExtras: [],
    minShipGap: 0,
    shotsPerTurnHuman: 1,
    shotsPerTurnAi: 1,
    matchShotBudgetHuman: null,
    moveTimeMs: 12000,
    fog: { enabled: true, fadeAfterRounds: 3 },
    hints: { adjacentHitIndicators: false, verboseFeedback: true },
    decoys: 0,
    movingShips: false,
    oneLife: false,
    aiProfile: 'smartTarget',
  },
  {
    id: 'legend',
    label: 'Fleet Legend',
    rank: 'Fleet Legend',
    stakes: 'One life. Moving prey. No mercy.',
    caution: 'Decoys on the chart. An untouched destroyer may slip a cell.',
    humanGrid: square(10),
    aiGrid: { rows: 8, cols: 12 },
    fleet: STANDARD_FLEET,
    aiExtras: DECOYS,
    minShipGap: 0,
    shotsPerTurnHuman: 1,
    shotsPerTurnAi: 1,
    matchShotBudgetHuman: null,
    moveTimeMs: 8000,
    fog: { enabled: true, fadeAfterRounds: 2 },
    hints: { adjacentHitIndicators: false, verboseFeedback: true },
    decoys: 2,
    movingShips: true,
    oneLife: true,
    aiProfile: 'probability',
  },
]

export const DEFAULT_DIFFICULTY: DifficultyId = 'officer'

export function ruleset(id: DifficultyId): Ruleset {
  const rules = RULESETS.find((r) => r.id === id)
  if (!rules) throw new Error(`unknown rank: ${id}`)
  return rules
}

export function isDifficultyId(value: unknown): value is DifficultyId {
  return RULESETS.some((r) => r.id === value)
}

/** Grid badge for the rank card, e.g. "10×10 fog" or "10×10 / 8×12". */
export function gridBadge(rules: Ruleset): string {
  const human = `${rules.humanGrid.rows}×${rules.humanGrid.cols}`
  const ai = `${rules.aiGrid.rows}×${rules.aiGrid.cols}`
  if (human !== ai) return `${human} / ${ai}`
  return rules.fog.enabled ? `${human} fog` : human
}

/** The ships on Admiral North's board, decoys included. */
export function aiFleetSpec(rules: Ruleset): readonly ShipSpec[] {
  return [...rules.fleet, ...rules.aiExtras]
}

/** How many cells across the whole board a rank moves the tap target to. */
export function boardSpan(grid: Grid): number {
  return Math.max(grid.rows, grid.cols)
}
