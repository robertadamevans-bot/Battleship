# Bugs found and fixed

Defects that actually turned up while building Armada, in the order they were found. Each one has
the symptom, the cause, the fix, and how it is now kept fixed. Nothing here is hypothetical.

---

## 1. Keyboard focus was thrown away on every shot

**Symptom.** Playing with the keyboard, the aim moved with the arrow keys and Enter fired
correctly — and then the next arrow key did nothing. Focus had gone back to the top of the
document, so a keyboard player had to tab all the way back into the grid after every single shot.

**Repro.** Action screen → focus `C3` → Enter → press `ArrowRight`. Nothing moves.
`document.activeElement` is `<body>`.

**Cause.** `Action.tsx` rendered the fire board as `interactive={!locked}`, and `Board` used that
flag to decide between `<button>` cells and inert `<div>` cells. `locked` goes true the instant the
human fires (resolution beat, then North's turn), so every shot unmounted all one hundred cell
buttons — including the focused one. React had nothing to restore focus to. The same swap also
removed the whole grid from the accessibility tree for about a second and a half per turn.

**Fix.** `Board` gained a `locked` prop that is about *refusing input*, not about *changing
markup*: the buttons stay mounted for the whole match, carry `aria-disabled` while locked, and drop
their pointer/click handlers. `Action.tsx` now passes `interactive={!match.winner}` and
`locked={locked}`.

**Kept fixed by.** `src/screens/Action.test.tsx` — "keeps the focused cell mounted and focused
through the turn change", which fires with Enter and asserts the resolved cell is still
`document.activeElement`.

---

## 2. The resolution log did not say who fired

**Symptom.** Two consecutive lines reading `F6 miss` and `B3 hit`. In a game where both sides
shoot at the same kind of grid, there was no way to tell your ranging from North's.

**Cause.** `describe(result)` in `src/game/match.ts` formatted a shot without knowing who took it.

**Fix.** `describe(result, by: Commander)`. Your shots stay terse — `F4 hit`, `C2 — you sank the
Submarine`. North's are prefixed and personal: `North: F6 miss`, `C2 — your Submarine is gone`.

---

## 3. The sound switch had no name for a screen reader

**Symptom.** The briefing's sound control was announced as "Off, switch" with no indication of what
it switched. Found while driving the briefing screen by role rather than by pixel.

**Cause.** The visible word "Sound" sat in a `<span>` inside a wrapping `<label>`. A `<label>` only
names labelable form controls, and a `<button role="switch">` is not one, so the accessible name
fell back to the button's own text — "Off".

**Fix.** The wrapper is a `<div>`, the caption has an id, and the switch uses `aria-labelledby`.
The control is now "Sound, switch, off".

---

## 4. A QA harness "freeze" that was really the turn lock

**Symptom.** The first scripted playthrough stopped mid-match with `no unfired cells left,
shots=16` and never reached the after-action screen. Read literally, that is a hung game.

**Investigation.** The script selected `button[aria-label$="unfired"]`, which happily matches cells
that are `aria-disabled` while North is ranging; Playwright then waited thirty seconds on an
element that could not be clicked. Instrumenting the shot counters showed the game itself was
fine — human and AI shots alternated exactly one for one.

**Outcome.** No product change; the harness now waits for the turn to come back before tapping.
Recorded because it is the sort of finding that gets "fixed" in the wrong file: the honest answer
was that the test was wrong, not the game. The behaviour it accidentally exercised — taps during
North's turn are dropped, not queued and replayed later — is now pinned by
`src/screens/Action.test.tsx`.

---

## 5. Enemy ship positions could have leaked through the view model

**Symptom.** None observed — this one was hunted rather than stumbled over, because it is the
defect that would matter most in a game about hidden information. A single `data-ship="carrier"`
or a `.carrier` class name on the fire board hands the whole match to anyone who opens the
inspector.

**Verification.** `fireView(enemy, reveal)` builds no entry at all for an intact enemy ship, so
there is nothing for the DOM to carry. Checked two ways: `src/game/views.test.ts` asserts the map
is empty at the start of a match and contains no `reveal` state mid-match, and a scripted pass over
the live page's fire board looks for ship class names, ship words in labels, and any `data-*`
attribute — all three clean, and all seventeen squares appear only after the match ends.

---

## 6. `npm run build` was broken while the tests passed

**Symptom.** `npm test` was green; `npm run build` failed with

```
vite.config.ts: Object literal may only specify known properties,
and 'test' does not exist in type 'UserConfigExport'.
```

**Cause.** Vitest configuration lives in `vite.config.ts`, but the file imported `defineConfig`
from `vite`, whose type has no `test` key. Vitest reads the config at runtime regardless, so the
tests never noticed the type error — only `tsc -b` did.

**Fix.** Import `defineConfig` from `vitest/config`. The build script runs `tsc -b` before
`vite build` precisely so this class of drift cannot ship.

---

## 7. Interactive tests contaminated each other

**Symptom.** The first screen test in each file passed; every later one failed with
`Found multiple elements with the role "button" and name "A1 unfired"`.

**Cause.** Testing Library only registers its automatic DOM cleanup when Vitest is running with
globals enabled. Without it, each `render` appended another copy of the app to the same document.

**Fix.** `globals: true` in the Vitest config. All 44 tests pass, in any order.

---

## 8. Vitest and oxlint would not start at all

**Symptom.** Two separate cold-start failures on a clean install:

```
Error: Cannot find native binding.          # rolldown, used by Vitest 4
Error: require() of ES Module .../@csstools/css-calc/dist/index.mjs not supported
Cannot find module './oxlint.linux-x64-gnu.node'
```

**Cause.** The first and third are the well-known npm optional-dependency bug — platform-specific
binaries silently omitted from the lockfile install. The second is Node 20 refusing an ESM
dependency that jsdom's CSS stack reaches through `require`.

**Fix.** `@rolldown/binding-linux-x64-gnu` and `@oxlint/linux-x64-gnu` are now explicit dev
dependencies, and the project is on Node 22. Noted in the README so the next person does not lose
the same half hour.

---

## 9. Switching theatre mid-match left the previous theatre talking

**Symptom.** With the theme pack in, firing three shots in the default theatre and then switching to another
one (Ye Olde Times, since retired) left the signal log reading `F6 miss` and `North: D3 hit` above a banner that now said
*Admiral North takes the range*. Half the screen was in the old voice.

**Cause.** The match log stored finished sentences — `describe(result, by)` was called at the moment
of the shot, so the wording was frozen with the theme that happened to be active. Nothing could
re-word history.

**Fix.** `Match.log` is now `{ result, by }[]` — data, not prose — and a presentation-layer
`resolutionLine(entry, copy)` renders it with whatever theatre is current. Switching theatre now
re-words every past shot, and the engine no longer knows any English at all. The match test
asserts on `log[0].result.outcome` instead of a regex over a sentence.

---

## 10. A fogged miss looked like open water, so the tap was silently eaten

**Symptom.** Found while wiring fog into the fire board: four or five shots into an Admiral match a
cell you had already missed comes back as plain water, and tapping it does nothing at all — no
mark, no line in the log, no turn change, and the "latest shot" ring stays where it was.

**Repro.** Admiral rank → miss on five separate cells → the first one loses its miss marker →
tap it again.

**Cause.** Two layers disagreeing about what fog means. `fireView` correctly aged the miss to a new
`uncertain` view — the chart forgetting where a shot fell is the whole point of the rank — but
`Board` decided whether a cell was still tappable from its view state, and its spent list was
`['miss', 'hit', 'sunk']`. An `uncertain` cell therefore rendered as a live button while
`humanFires` went on refusing it through `canFire`. The engine was right and the UI was lying.

**Fix.** `uncertain` joined the spent list in `Board`, and its `aria-label` is "spent, uncharted" —
the cell reads as used without saying what happened there. Fog is now explicitly a presentation
state: it changes the mark, never the shot record.

**Kept fixed by.** `src/game/views.test.ts` — "keeps a forgotten miss spent, and never fogs a hit
or a sink", which walks every `uncertain` cell in the view and asserts `enemy.shots[key]` is still
a miss.

---

## 11. Sinking Admiral North's real fleet did not win the Fleet Legend match

**Symptom.** Written up from the Legend match test rather than a playthrough: with all five of
North's real ships sunk, `match.winner` was still `null` and the game expected more shots.

**Cause.** Legend puts two 2-square decoys on North's board, added to `Side.placements` so the
resolver can hit them like anything else. `isFleetDestroyed` asked whether *every* placement was
in `sunk` — so victory silently required sinking the decoys too, and the "win" only arrived after
four extra squares that no rule said you had to find.

**Fix.** `realShips(side)` filters `decoy` hulls out, and `isFleetDestroyed` is defined against
that. Decoys still resolve as hits and sinks, still count nothing, and `resolutionLine` reports
them as a ghost contact so the copy cannot leak a real ship name either.

**Kept fixed by.** `src/game/match.test.ts` — "does not end the match when only the decoys are
sunk" — and `src/game/resolve.test.ts`, which sinks both decoys and asserts the fleet is not
destroyed.

---

## 12. The clock could spend a shot on top of one that was still resolving

**Symptom.** A race rather than a sighting: reviewing the Admiral clock, expiry and the human's own
tap could both spend a shot for the same turn, one of them while the previous shot was still
resolving. The lint rule that flags a `setState` called synchronously inside an effect is what
pointed at the code.

**Cause.** Expiry lived in its own effect keyed on the derived `msLeft`, separate from the interval
that advanced the clock. `msLeft` is computed during render, so the effect could run on a render
that had already been triggered by the human's own shot: `autoFire` then fired again before the
260ms resolution beat had finished and before `turn` had flipped to the AI.

**Fix.** There is now one effect. The interval reads the clock, and when it finds no time left it
spends the shot itself through the same `autoFire` → `humanFires` path a tap takes, so the turn
lock, the budget check and the win check are the same code in both cases. `autoFire` also refuses
outright unless it is the human's turn and the match is live.

**Kept fixed by.** `src/game/match.test.ts` — "spends exactly one legal shot when time runs out,
and passes the turn", plus "never auto-fires once the match is over". The shot count after expiry
is asserted to be exactly one.

---

## 13. The moving-ship rule moved the wrong ship

**Symptom.** Caught by the movement test, not by eye: the hull that relocated after the fourth shot
was whichever ship happened to be first in the placement array — usually the carrier. A five-square ship walking
around the board makes the rank unplayable: nothing you learn about it stays true.

**Cause.** `driftAiFleet` picked its subject with `hulls.find(p => !sunk && untouched)`. The rule
is about the destroyer specifically, but the predicate never mentioned it.

**Fix.** The predicate now requires `p.id === 'destroyer'`, and still requires that the ship is
unsunk and that no cell of it has been hit. The move itself is one cell along the ship's existing
axis, tried in both directions, and refused if it would leave the grid, overlap another hull, or
step onto a cell already hit.

**Kept fixed by.** `src/game/match.test.ts` — "slips an untouched destroyer one cell after every
fourth human shot" checks the destroyer moved by exactly one cell and kept its orientation;
"keeps a wounded destroyer where it lies" and "leaves ships still on ranks without movement" pin
the two conditions that must stop it.

---

## 14. The rank cards advertised the wrong board

**Symptom.** The Fleet Legend card read `10×10 / 12×8`. Legend's fire board is eight rows of
twelve columns, so the badge had it transposed — and a badge that lies about the board is worse
than no badge, because the coordinate labels the player then sees are A–L across and 1–8 down.

**Cause.** `gridBadge` formatted `${cols}×${rows}` while every other dimension in the codebase,
including `Grid` itself, is written rows-first. Invisible on the four square ranks; wrong on the
only asymmetric one.

**Fix.** `gridBadge` reads rows then columns.

**Kept fixed by.** `src/game/rules.test.ts` asserts the five badges are exactly `12×12`, `10×10`,
`9×9`, `10×10 fog` and `10×10 / 8×12`.
---

## 15. Cadet's wide board pushed a 320px phone sideways

**Symptom.** On the deployment screen at a 320px viewport — an iPhone SE in portrait — the page
scrolled horizontally: `document.body.scrollWidth` measured 335 against a 320 client width. The
right-hand column of the 12×12 grid and the right edge of the Rotate/Randomise/Clear row sat off
screen. The action screen was fine, and 390px and 440px were fine, so it only showed on the widest
rank at the narrowest width.

**Cause.** Not the board's own width — the board is `width: 100%`. `.grid` carries
`aspect-ratio: cols / rows`, and an aspect-ratio box's automatic minimum size is derived from its
content in the other axis: twelve implicit rows of a button's line-height gave a 321px minimum
width, which the `1fr` tracks of `.body`, `.layout` and `.side` then honoured, because a bare
`1fr` track is `minmax(auto, 1fr)` and `auto` never shrinks below that minimum. The side column's
own width was the correct 292px while its grid track was still sized at 321px, so the fleet tray
and the controls overflowed their own parent.

**Fix.** Every track that has to be able to shrink is now `minmax(0, 1fr)` — the board's columns
and cells, `.body`, `.layout`, `.side`, `.tray`, `.trayItem` and `.controls` — and `.grid` also
carries `min-width: 0` and `grid-auto-rows: minmax(0, 1fr)` so the row heights follow the aspect
ratio instead of the cells' line-height.

**Kept fixed by.** The scripted narrow-viewport pass (`qa/narrow.mjs` in the QA harness) walks the
deployment screen of the widest rank at 320, 390 and 440px and fails on any element whose
right edge exceeds the viewport.
