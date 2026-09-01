---
name: testing-armada-ui
description: How to run and UI-test the Armada (Battleship) Vite+React app locally, including phone-width viewport checks, rank/theatre flows and fog behaviour.
---

# Testing the Armada fleet-action UI

## Run it
- Node 22 is required: `source ~/.nvm/nvm.sh && nvm use 22`, then `npm run dev` from the repo root.
- App serves at `http://localhost:5173`. Client-side only — no accounts, no credentials, no secrets needed.
- Devin Secrets Needed: none.

## Browser setup
- Chrome DevTools device emulation, "Responsive", 390×844 is the primary phone target; spot-check 320 and 440 widths.
- Change width by triple-clicking the width field in the device toolbar and typing the new value + Enter.
- The theatre `<select>` on the action screen may render its option list unreliably in emulation. Click the select, then use `Down` + `Return` to advance one option at a time.

## Useful measurements (console)
- Horizontal overflow: `document.body.scrollWidth` vs `document.documentElement.clientWidth`. `documentElement.scrollWidth` can be clamped to the viewport, so check `body.scrollWidth` too — that is where clipped grids show up.
- Cell tap-target size: `document.querySelector('[aria-label="A1 unfired"]').getBoundingClientRect()` (~29px at 390px on a 12×12 board).
- Persisted rank: `localStorage.getItem('armada.difficulty')` (`cadet|officer|commander|admiral|legend`).
- Persisted theatre: `localStorage.getItem('armada.theme')` (`armada|warfare|pirates`). Also check `document.documentElement.dataset.theme`.
- Selected chips: count `document.querySelectorAll('[aria-pressed="true"]')` — on the briefing there should be exactly one pressed theatre chip and one pressed rank card.
- Single-column grid proof: compare `getBoundingClientRect()` `left`/`width` of every chip in the Theatre fieldset. Identical `left` + identical `width` + strictly increasing `top` proves a real single column (at 390px: left 14, width 362; at 320px: left 14, width 292).
- Retired-copy scan: `/olde/i.test(document.body.innerText)`. When grepping the repo instead, exclude the word "placeholder" — it contains "olde" and produces false positives.

## Theatres (currently three)
`armada`, `warfare` (Modern Warfare), `pirates` (Pirates of the Caribbean). "Ye Olde Times" (`olde`) was retired. Each theatre restyles briefing, deployment, action and after-action, and swaps ship names and CTA copy — a fast way to prove restyling without pixel-diffing:

| Theatre | Ship names | After-action CTAs |
| --- | --- | --- |
| Armada | Carrier / Battleship / Cruiser / Submarine / Destroyer | Rematch / New briefing |
| Modern Warfare | same as Armada, uppercase "NORTH / CIC" framing | Re-engage / New tasking |
| Pirates | Galleon / Ship of War / Brig / Phantom / Sloop | Weigh anchor again / Strike colours |

Timer labels also differ (`T-minus` under Warfare, `Sand` under Pirates), which is handy to confirm the theatre applied on the action screen.

## Invalid persisted theme
`storedTheme()` in `src/theme/storage.ts` validates the stored id: an unknown/retired value (e.g. `olde`) falls back to the default `armada` **and is rewritten** to `armada` on load. To test: `localStorage.setItem('armada.theme','olde')`, reload, then assert `localStorage.getItem('armada.theme') === 'armada'`. Expect no crash and no console error.

## Reading game state without guessing pixels
Board cells expose `aria-label`s: `"A1 unfired"`, `"A1 miss"`, `"A1 hit"`, `"A1 your ship"`, and — under fog (Admiral / Fleet Legend) — `"A1 spent, uncharted"`. A "spent, uncharted" cell is a forgotten miss and must refuse clicks (no new shot, no turn change). Counting these labels in the DOM is far more reliable than reading the screenshot.

## Fast paths through a match
- Deployment: `Randomise` then the engage button (its label is theatre-dependent: "Engage" / "Fire the guns" / "Weigh anchor").
- Fleet Legend ends the first time North sinks one of your ships, so it is the quickest rank for after-action / Rematch tests. Commander (42-shot powder) and Cadet (12×12) are the slowest.
- Timed ranks (Admiral 12s, Legend 8s) auto-spend one shot on expiry — useful to advance a match by simply waiting.
- Rematch returns to deployment keeping rank + theatre; the deployment header "Briefing" button returns to the briefing where rank cards are editable again.

## Known trade-offs / things that might be broken
- Cadet's 12×12 cells are intentionally small (~29px at 390px) to avoid page scroll — only flag if play is impractical.
- The header theatre `<select>` on the action screen measures ~128×32px, i.e. **below the common 44px tap-target minimum**. If a task asks for ≥44px targets, report this; it is a styling issue in `TheatreSwitch.module.css`, not a functional one.
- Reaching the after-action screen under a *non-default* theatre requires playing a whole match in that theatre — the after-action screen has no theatre switcher. Use Fleet Legend + waiting on the 8s clock (~90s hands-free) as the cheapest route per theatre.
- Narrow viewports (~320px) once clipped the 12×12 deployment grid and its controls; every grid track is now `minmax(0, 1fr)`, so check `body.scrollWidth` at 320px on the *deployment* screen after any layout change.
- `document.title` follows the selected theatre (e.g. "Armada — Pirates of the Caribbean"), so a title assertion of "Armada — Fleet action" only holds with the default Armada theatre.
- The console should only contain Vite connect messages and the React DevTools notice. The DevTools **Issues** panel legitimately shows info-level "A form field element should have an id or name attribute" for the Commander input — that is info, not an error, and its count grows with each briefing re-render.

## Mid-match state-preservation check
Switching theatre mid-match must not reset anything. Snapshot before/after and compare as strings:
```js
JSON.stringify({
  shots: document.querySelector('header span').innerText,
  rank: [...document.querySelectorAll('span')].find(s=>s.innerText.startsWith('Rank:')).innerText,
  marks: [...document.querySelectorAll('[aria-label]')].map(e=>e.getAttribute('aria-label')).filter(l=>/ (miss|hit|sunk|your ship|spent, uncharted)$/.test(l)).sort()
})
```
Note the rank meter line is theatre-cased (`Rank: Cadet — 12×12` vs `RANK: CADET — 12×12` via CSS `text-transform`), so compare `innerText` semantics, not raw case, or read the value from the DOM before styling.
