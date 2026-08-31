# Armada

**Fleet action. Human vs machine.**

Battleship against Admiral North — a search algorithm that hunts on parity, weighs an occupancy
heatmap, and finishes what it starts. Five ranks, and a rank is not a label on the same game: it
is a rule pack the engine loads at match start, so the board size, the fleet, the spacing rule,
your shot budget, your clock, the fog on your chart and whether losing one ship loses the match
all change with it.

- Live: <https://dist-dafkqrcs.devinapps.com>
- The five ranks, measured against each other: [docs/AI.md](docs/AI.md)
- Bugs found and fixed while building it: [docs/BUGS.md](docs/BUGS.md)
- Handover notes: [HANDOFF.md](HANDOFF.md)

Armada was called *Solent* while it was being built; the name survives only in the localStorage
migration and in this paragraph.

## The five ranks

Picked on the briefing screen, fixed for the length of a match, remembered for the next one.
Officer is the default and is classic Battleship.

| Rank | Boards | Fleet | Spacing | Your shots | Clock | Chart | Twist |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **Cadet** | 12×12 both | Standard 5 (17 squares) | Clear cell all round, corners included | Unlimited | None | Full | Adjacent-hit pips, verbose signals, a wandering opponent |
| **Officer** | 10×10 both | Standard 5 | May touch, not overlap | Unlimited | None | Full | The classic game, no favours |
| **Commander** | 9×9 both | Standard 5 + Patrol 2 (19 squares) | May touch | **42 for the match** | None | Full | Run out of powder with North afloat and you lose |
| **Admiral** | 10×10 both | Standard 5 | May touch | Unlimited | **12s per shot** | Misses older than three round trips fade to uncertain | Time out and the engine spends a shot for you |
| **Fleet Legend** | Yours 10×10, North's **8×12** | Standard 5; North also has two 2-square decoys | May touch | Unlimited | **8s per shot** | Misses fade after two round trips | One life, and North's destroyer moves |

Details that matter in play:

- A faded miss is *presentation only*. The shot is still spent and the cell cannot be fired again.
- Decoys can be hit and sunk, are never named as real ships, and never count towards victory —
  sinking both of them wins nothing.
- Legend's destroyer slips one cell along its own axis after every fourth shot you fire, only
  while it is untouched, on-grid and clear of the rest of the fleet. Nothing announces it.
- One life means the first of *your* ships to go down ends the match, with four still afloat.
- You place ships only on your own board. Legend's 8×12 is North's water; you never deploy there.

## Admiral North

`src/ai/admiral.ts` is a pure function of the AI's own memory:

```ts
nextShot(memory: AiMemory, profile: AiProfile, rng: Rng): AiShot
```

`AiMemory` holds only what the AI is entitled to know — the grid, the fleet list it is up against,
the cells it has fired at, the outcome of each, and which ships it has sunk. It is never handed
the human's placements, so it cannot cheat even by accident.

Each rank selects a profile: `lax` (no parity, no axis lock, fires blind), `standard`
(parity hunt, axis lock), `packedHunt` and `smartTarget` (both add the occupancy heatmap), and
`probability` (heatmap-ranked hunting with no parity lattice at all). `npm run sim` plays them
headlessly against random fleets; [docs/AI.md](docs/AI.md) has the shots-to-win table and the
control run that shows `probability` beating `standard` by seven shots on the same 10×10 board.

## Fog of war

The enemy board's view model (`fireView` in `src/game/views.ts`) omits intact enemy ships entirely
rather than hiding them with CSS. Before the reveal there is nothing in the DOM, the React tree,
the class names or the data attributes that says where North's ships are; `docs/BUGS.md` records
the test that keeps it that way. Admiral and Legend then fog *your own* misses on top of that,
which is a second, unrelated thing: the chart forgets where you have already fired, but the engine
does not.

## Layout

Four screens: briefing, deployment, action, after-action. Mobile-first — the two boards stack on
a phone, both are sized from the ruleset rather than a hardcoded ten, coordinate headers regenerate
from the grid, and the layout is checked for horizontal overflow at 320, 390 and 440 px. Cells are
buttons: arrow keys move the aim, Enter or Space fires, focus survives the turn change.

## Theatres

Four visual themes — Armada (original), Ye Olde Times, Modern Warfare, Pirates of the Caribbean —
picked on the briefing screen and switchable mid-match from the header. A theatre is one
`data-theme` attribute on `<html>` plus the CSS custom properties in `src/styles/global.css`; there
is no per-theme route, component or board, and no hex values live in the components. Tone shifts
through `themeCopy` in `src/theme/themes.ts` (button labels, turn banners, resolution lines, ship
aliases, and the wording of the powder, clock, fog and one-life lines), while the ruleset, the
coordinates, the AI and win detection are untouched. Switching theatre mid-match keeps the boards,
the ships, the turn and the rank exactly as they were.

Shots are logged structurally (`{ result, by }`) rather than as sentences, so switching theatre
mid-match re-words the existing signal log instead of leaving English from the previous skin.

## Persistence

Three keys, all in localStorage, all client-side; there is no account and no backend.

| Key | Holds |
| --- | --- |
| `armada.theme` | The chosen theatre |
| `armada.commanderName` | The commander's name (default `Rob`) |
| `armada.difficulty` | The chosen rank (default `officer`) |

The old `solent.theme` and `solent.commanderName` keys are read once if present and rewritten
under the new names. In-flight matches are deliberately *not* persisted: a reload cannot resurrect
expired time or uncleared fog.

## Running it

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # Vitest: rules, ranks, AI, and the interactive screens
npm run sim      # headless AI bench, the numbers in docs/AI.md
npm run lint     # oxlint
npm run build    # tsc -b && vite build
```

Node 22 is required; Vitest's dependency graph does not load under Node 20 (see `docs/BUGS.md`).

## Layout of the source

```
src/game      rulesets, board geometry, placement rules, shot resolver, match state — no React
src/ai        Admiral North and its search profiles
src/components Board, FleetStrip
src/screens   Briefing, Deployment, Action, AfterAction
src/theme     theatre tokens, copy map, provider, localStorage
scripts       headless AI bench
```

Game logic is deliberately free of React so it can be unit-tested and, if it ever mattered, run
on a server.

## Licence

MIT — see [LICENSE](LICENSE).
