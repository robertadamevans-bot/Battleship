import type { ShipId } from '../game/types'

export const THEMES = ['solent', 'olde', 'warfare', 'pirates'] as const

export type Theme = (typeof THEMES)[number]

export const DEFAULT_THEME: Theme = 'solent'

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
    id: 'solent',
    name: 'Solent',
    flavour: 'Cold water. Short orders.',
    swatch: ['#101820', '#c8102e', '#7c9a82'],
  },
  {
    id: 'olde',
    name: 'Ye Olde Times',
    flavour: 'Oak, powder, and lettered shot.',
    swatch: ['#e7d8b8', '#8b1e1e', '#6e6a60'],
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
  /** Holding line before the first shot resolves. */
  waiting: string
  /** After-action closing line. */
  closing: (won: boolean) => string
  rematch: string
  standDown: string
}

const MODERN_SHIPS: ShipAlias = {
  carrier: 'Carrier',
  battleship: 'Battleship',
  cruiser: 'Cruiser',
  submarine: 'Submarine',
  destroyer: 'Destroyer',
}

export const themeCopy: Record<Theme, ThemeCopy> = {
  solent: {
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
    youWin: 'holds the Solent',
    youLose: 'Admiral North holds the Solent',
    shipAlias: MODERN_SHIPS,
    rules: 'Horizontal or vertical. No overlap. Touching allowed.',
    waiting: 'Open fire when ready.',
    closing: () => 'The water is quiet again.',
    rematch: 'Rematch',
    standDown: 'New briefing',
  },
  olde: {
    primaryCta: 'Deploy thy fleet',
    engage: 'Engage',
    miss: (c) => `${c} misses the mark`,
    hit: (c) => `${c} finds timber`,
    sunk: (c, ship) => `${c} — thou hast sunk the ${ship}`,
    theirMiss: (c) => `North: ${c} misses the mark`,
    theirHit: (c) => `North: ${c} finds thy timber`,
    theirSunk: (c, ship) => `${c} — thy ${ship} is lost`,
    aiName: 'Admiral North, RN',
    yourTurn: (commander) => `${commander}, give the order`,
    theirTurn: 'Admiral North takes the range',
    youWin: 'carries the day',
    youLose: 'The action is concluded. North carries the day.',
    shipAlias: {
      carrier: 'Flagship',
      battleship: 'Ship of the Line',
      cruiser: 'Frigate',
      submarine: 'Bomb Ketch',
      destroyer: 'Sloop',
    },
    rules: 'Athwart or along. No two ships in one berth. Touching permitted.',
    waiting: 'Await thy order.',
    closing: () => 'The action is concluded.',
    rematch: 'Engage again',
    standDown: 'Return to the briefing',
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
    waiting: 'Weapons free.',
    closing: () => 'Action complete. Fleet status attached.',
    rematch: 'Re-engage',
    standDown: 'New tasking',
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
    },
    rules: 'Along or athwart. No two hulls in one berth. Touching allowed.',
    waiting: 'Wait for the word.',
    closing: (won) => (won ? 'The prize is yours.' : 'Your colours are struck.'),
    rematch: 'Weigh anchor again',
    standDown: 'Strike colours',
  },
}
