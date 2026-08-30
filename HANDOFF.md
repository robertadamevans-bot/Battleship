# Handoff

Solent is a single-match Battleship game — four screens (briefing, deployment, action, after-action), no accounts, no backend, nothing persisted between matches.
Rules live in `src/game` as pure functions: geometry, placement legality, the shot resolver both sides share, and match/turn state; React never owns a rule.
Admiral North is `src/ai/admiral.ts` — parity hunt, occupancy heatmap, orthogonal probe, axis lock, sunk-cell cleanup — and it sees only its own shot history, so it cannot cheat.
Intact enemy ships are absent from the fire board's view model entirely rather than hidden with CSS, which is why nothing leaks into the DOM before the reveal.
Input during North's turn is refused, not unmounted; that distinction is bug #1 in `docs/BUGS.md` and is the thing a refactor is most likely to break.
Four visual theatres are a presentation layer only: one `data-theme` attribute plus the tokens in `src/styles/global.css`, and the `themeCopy` map in `src/theme/themes.ts` — the engine holds no colours and no English.
`npm test` (Vitest, 48 tests) covers the rules, the AI, and the two interactive screens; `npm run lint` is oxlint; `npm run build` runs `tsc -b` first, which is what catches config drift.
Node 22 is required — Vitest's dependency graph does not load under Node 20, and two native bindings are pinned as explicit dev dependencies for the same class of reason.
Mobile is the primary target: boards stack, layout is safe-area aware, and it is checked for horizontal overflow at 320, 390 and 440 px.
Known gaps: no persistence, no undo, three synthesised sound cues rather than real assets, and the heatmap is recomputed on every AI shot.
Next moves worth making: a scrolling shot log on the action screen, and difficulty tuning driven by Admiral's average shots-to-win in self-play.
