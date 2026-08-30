# Solent

**Fleet action. Human vs machine.**

Battleship in the water between Southampton and the Isle of Wight. Ten by ten, five ships each,
one match against Admiral North — a search algorithm that hunts on parity, weighs an occupancy
heatmap, and finishes what it starts.

- Live: <https://dist-dafkqrcs.devinapps.com>
- Bugs found and fixed while building it: [docs/BUGS.md](docs/BUGS.md)
- Handover notes: [HANDOFF.md](HANDOFF.md)

## The game

10×10 grid, columns A–J and rows 1–10, A1 top-left. Carrier 5, Battleship 4, Cruiser 3,
Submarine 3, Destroyer 2. Horizontal or vertical placement, no overlap, touching allowed. The
human fires first, one shot per turn; repeat and illegal shots are refused rather than wasted.
The match ends the moment a fleet is destroyed — the losing side does not get a courtesy turn.

## Admiral North

`src/ai/admiral.ts` is a pure function of the AI's own memory:

```ts
nextShot(memory: AiMemory, difficulty: Difficulty, rng: Rng): AiShot
```

`AiMemory` holds only what the AI is entitled to know — the cells it has fired at, the outcome of
each, and which ships it has sunk. It is never handed the human's placements, so it cannot cheat
even by accident.

- **Admiral** hunts on a parity lattice, ranks candidates with an occupancy heatmap (how many
  legal positions of the surviving ships cover each cell), probes orthogonally around a fresh hit,
  locks the axis once two hits line up, works both ends of the line, then clears the sunk ship's
  cells and returns to the hunt with any unresolved hits still on the books.
- **Cadet** hunts and targets, but fires without reading the water.

## Fog of war

The enemy board's view model (`fireView` in `src/game/views.ts`) omits intact enemy ships entirely
rather than hiding them with CSS. Before the reveal there is nothing in the DOM, the React tree,
the class names or the data attributes that says where North's ships are; `docs/BUGS.md` records
the test that keeps it that way.

## Layout

Four screens: briefing, deployment, action, after-action. Mobile-first — the two boards stack on
a phone, the layout is safe-area aware, and it is checked for horizontal overflow at 320, 390 and
440 px. Cells are buttons: arrow keys move the aim, Enter or Space fires, focus survives the turn
change.

## Theatres

Four visual themes — Solent (original), Ye Olde Times, Modern Warfare, Pirates of the Caribbean —
picked on the briefing screen and switchable mid-match from the header. A theatre is one
`data-theme` attribute on `<html>` plus the CSS custom properties in `src/styles/global.css`; there
is no per-theme route, component or board, and no hex values live in the components. Tone shifts
through `themeCopy` in `src/theme/themes.ts` (button labels, turn banners, resolution lines, ship
aliases on the tray), while ship IDs, lengths, coordinates, delays, the AI and win detection are
untouched. The choice and the commander's name persist in localStorage; every theatre respects
`prefers-reduced-motion`.

Shots are logged structurally (`{ result, by }`) rather than as sentences, so switching theatre
mid-match re-words the existing signal log instead of leaving English from the previous skin.

## Running it

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # Vitest: game logic, AI, and the two interactive screens
npm run lint     # oxlint
npm run build    # tsc -b && vite build
```

Node 22 is required; Vitest's dependency graph does not load under Node 20 (see `docs/BUGS.md`).

## Layout of the source

```
src/game      board geometry, placement rules, shot resolver, match state — no React
src/ai        Admiral North
src/components Board, FleetStrip
src/screens   Briefing, Deployment, Action, AfterAction
src/theme     theatre tokens, copy map, provider, localStorage
```

Game logic is deliberately free of React so it can be unit-tested and, if it ever mattered, run
on a server.

## Licence

MIT — see [LICENSE](LICENSE).
