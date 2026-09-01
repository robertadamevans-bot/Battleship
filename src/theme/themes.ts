import type { ShipId } from '../game/types'

export const THEMES = ['armada', 'warfare', 'pirates'] as const

export type Theme = (typeof THEMES)[number]

export const DEFAULT_THEME: Theme = 'armada'

export interface ThemeSpec {
  id: Theme
  /** Name shown on the picker. */
  name: string
  /** Flavour line, eight words at most. */
  flavour: string
  /** Three colours for the miniature grid on the picker chip: water, hit, miss. */
  swatch: [string, string, string]
}

export const THEME_SPECS: readonly ThemeSpec[] = [
  {
    id: 'armada',
    name: 'Armada',
    flavour: 'Cold water. Short orders.',
    swatch: ['#101820', '#c8102e', '#7c9a82'],
  },
  {
    id: 'warfare',
    name: 'Modern Warfare',
    flavour: 'Glass cockpit. No speeches.',
    swatch: ['#05070a', '#ff3b3b', '#3ee0c4'],
  },
  {
    id: 'pirates',
    name: 'Pirates of the Caribbean',
    flavour: 'Black sails. Poor manners.',
    swatch: ['#120e0b', '#b42318', '#7a8b7a'],
  },
]

export function isTheme(value: unknown): value is Theme {
  return typeof value === 'string' && (THEMES as readonly string[]).includes(value)
}

export type ShipAlias = Record<ShipId, string>

export interface ThemeCopy {
  /** Briefing's submit button. */
  primaryCta: string
  /** Deployment's commit button. */
  engage: string
  miss: (coord: string) => string
  hit: (coord: string) => string
  sunk: (coord: string, shipAlias: string) => string
  /** The same three lines from Admiral North's side of the water. */
  theirMiss: (coord: string) => string
  theirHit: (coord: string) => string
  theirSunk: (coord: string, shipAlias: string) => string
  aiName: string
  yourTurn: (commander: string) => string
  theirTurn: string
  youWin: string
  youLose: string
  shipAlias: ShipAlias
  /** Deployment's one-line reminder of the placement rules. */
  rules: string
  /** The same reminder when hulls may not touch at all. */
  spacedRules: string
  /** Holding line before the first shot resolves. */
  waiting: string
  /** After-action closing line. */
  closing: (won: boolean) => string
  rematch: string
  standDown: string
  /** Rank furniture: the match-shot budget, the clock, decoys and one life. */
  powderLabel: string
  clockLabel: string
  powderSpent: string
  timeUp: string
  oneLifeBanner: string
  oneLifeLoss: (shipAlias: string) => string
  ghostHit: (coord: string) => string
  ghostSunk: (coord: string) => string
}

const MODERN_SHIPS: ShipAlias = {
  carrier: 'Carrier',
  battleship: 'Battleship',
  cruiser: 'Cruiser',
  submarine: 'Submarine',
  destroyer: 'Destroyer',
  patrol: 'Patrol',
  'decoy-a': 'Ghost',
  'decoy-b': 'Ghost',
}

export const themeCopy: Record<Theme, ThemeCopy> = {
  armada: {
    primaryCta: 'Deploy fleet',
    engage: 'Engage',
    miss: (c) => `${c} miss`,
    hit: (c) => `${c} hit`,
    sunk: (c, ship) => `${c} — you sank the ${ship}`,
    theirMiss: (c) => `North: ${c} miss`,
    theirHit: (c) => `North: ${c} hit`,
    theirSunk: (c, ship) => `${c} — your ${ship} is gone`,
    aiName: 'Admiral North',
    yourTurn: (commander) => `${commander} to fire`,
    theirTurn: 'Admiral North ranging',
    youWin: 'holds the water',
    youLose: 'Admiral North holds the water',
    shipAlias: MODERN_SHIPS,
    rules: 'Horizontal or vertical. No overlap. Touching allowed.',
    spacedRules: 'Horizontal or vertical. No touching, not even corners.',
    waiting: 'Open fire when ready.',
    closing: () => 'The water is quiet again.',
    rematch: 'Rematch',
    standDown: 'New briefing',
    powderLabel: 'Shots',
    clockLabel: 'Clock',
    powderSpent: 'Shots spent. The action is lost.',
    timeUp: 'Time. Shot chosen for you.',
    oneLifeBanner: 'One life. The first ship you lose ends it.',
    oneLifeLoss: (ship) => `Your ${ship} is gone. One life. Action over.`,
    ghostHit: (c) => `${c} — ghost contact`,
    ghostSunk: (c) => `${c} — decoy struck`,
  },
  warfare: {
    primaryCta: 'Deploy fleet',
    engage: 'Commit fire',
    miss: (c) => `${c} no contact`,
    hit: (c) => `${c} contact — hit`,
    sunk: (c, ship) => `${c} target destroyed — ${ship.toLowerCase()}`,
    theirMiss: (c) => `NORTH ${c} no contact`,
    theirHit: (c) => `NORTH ${c} hit sustained`,
    theirSunk: (c, ship) => `${c} own unit lost — ${ship.toLowerCase()}`,
    aiName: 'NORTH / CIC',
    yourTurn: (commander) => `${commander.toUpperCase()} // YOUR FIRE`,
    theirTurn: 'NORTH // RANGING',
    youWin: 'action complete — fleet intact',
    youLose: 'Action complete. Fleet status: lost.',
    shipAlias: MODERN_SHIPS,
    rules: 'Axis locked to grid. No overlap. Adjacency permitted.',
    spacedRules: 'Axis locked to grid. One cell separation, diagonals included.',
    waiting: 'Weapons free.',
    closing: () => 'Action complete. Fleet status attached.',
    rematch: 'Re-engage',
    standDown: 'New tasking',
    powderLabel: 'Salvo',
    clockLabel: 'T-minus',
    powderSpent: 'SALVO EXPENDED. ACTION LOST.',
    timeUp: 'TIME. SHOT RESOLVED FOR YOU.',
    oneLifeBanner: 'ONE LIFE. FIRST UNIT LOST ENDS THE ACTION.',
    oneLifeLoss: (ship) => `OWN UNIT LOST — ${ship.toLowerCase()}. ONE LIFE. ACTION OVER.`,
    ghostHit: (c) => `${c} unresolved contact`,
    ghostSunk: (c) => `${c} contact resolved — decoy`,
  },
  pirates: {
    primaryCta: 'Weigh anchor',
    engage: 'Fire the guns',
    miss: (c) => `${c} — open water`,
    hit: (c) => `${c} — you've holed her`,
    sunk: (c, ship) => `${c} — you've sent the ${ship} under`,
    theirMiss: (c) => `North: ${c} — open water`,
    theirHit: (c) => `North: ${c} — she's holed`,
    theirSunk: (c, ship) => `${c} — your ${ship} goes down`,
    aiName: 'Admiral North, scourge of the Channel',
    yourTurn: (commander) => `${commander}, run out the guns`,
    theirTurn: 'North lays her broadside',
    youWin: 'takes the prize',
    youLose: 'Your colours are struck.',
    shipAlias: {
      carrier: 'Galleon',
      battleship: 'Ship of War',
      cruiser: 'Brig',
      submarine: 'Phantom',
      destroyer: 'Sloop',
      patrol: 'Cutter',
      'decoy-a': 'Ghost ship',
      'decoy-b': 'Ghost ship',
    },
    rules: 'Along or athwart. No two hulls in one berth. Touching allowed.',
    spacedRules: 'Along or athwart. Clear water all round, corners and all.',
    waiting: 'Wait for the word.',
    closing: (won) => (won ? 'The prize is yours.' : 'Your colours are struck.'),
    rematch: 'Weigh anchor again',
    standDown: 'Strike colours',
    powderLabel: 'Powder',
    clockLabel: 'Sand',
    powderSpent: 'Powder gone. The action is lost.',
    timeUp: 'The sand ran out. A shot goes off regardless.',
    oneLifeBanner: 'One life. Lose one hull and it is over.',
    oneLifeLoss: (ship) => `Your ${ship} is gone. One life. It is over.`,
    ghostHit: (c) => `${c} — ghost contact`,
    ghostSunk: (c) => `${c} — a ghost ship, no prize`,
  },
}
