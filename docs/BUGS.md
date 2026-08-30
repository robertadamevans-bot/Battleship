# Bugs found and fixed

Defects that actually turned up while building Solent, in the order they were found. Each one has
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

**Symptom.** With the theme pack in, firing three shots as Solent and then switching to Ye Olde
Times left the signal log reading `F6 miss` and `North: D3 hit` above a banner that now said
*Admiral North takes the range*. Half the screen was in the old voice.

**Cause.** The match log stored finished sentences — `describe(result, by)` was called at the moment
of the shot, so the wording was frozen with the theme that happened to be active. Nothing could
re-word history.

**Fix.** `Match.log` is now `{ result, by }[]` — data, not prose — and a presentation-layer
`resolutionLine(entry, copy)` renders it with whatever theatre is current. Switching theatre now
re-words every past shot, and the engine no longer knows any English at all. The match test
asserts on `log[0].result.outcome` instead of a regex over a sentence.
