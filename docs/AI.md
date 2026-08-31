# Admiral North, measured

Every number here comes from `npm run sim` (`scripts/simulate.ts`), which plays the shipped AI
against randomly placed fleets through the same `resolveShot` the game uses. The AI is handed a
grid, a fleet list and the outcome of its own shots — never the placements — so a bench game is
the same problem a real one is. Seeds are fixed (`seeded(0..n)`), so the table reproduces.

Shots-to-win is the count of squares fired at before the last real ship went down. Lower is
better. Hit rate is fleet squares ÷ shots.

## Per rank, against that rank's human board

| Rank | Profile | Board | Games | Mean | Median | Best | Worst | Hit rate |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Cadet | `lax` | 12×12, 17 squares | 30 | 86.1 | 86 | 53 | 116 | 20.6% |
| Officer | `standard` | 10×10, 17 squares | 30 | 52.9 | 54 | 30 | 73 | 33.5% |
| Commander | `packedHunt` | 9×9, 19 squares | 30 | 43.8 | 43 | 30 | 61 | 45.0% |
| Admiral | `smartTarget` | 10×10, 17 squares | 30 | 46.1 | 46 | 28 | 61 | 38.0% |
| Fleet Legend | `probability` | 10×10, 17 squares | 20 | 46.3 | 48 | 35 | 61 | 37.8% |

Cadet's 86 shots on a 144-square board is the point of the rank: North wanders, and the player
has time to find five ships with verbose feedback and adjacent-hit pips. Commander's 43.8 looks
strong but the board is smaller and the fleet is denser; the interesting number there is the
player's 42-shot cap against 19 squares — a 45% hit rate is roughly what it takes to survive it,
which is why the rank is hard without the AI shooting any better.

## Same board for every profile, so the ranking is honest

10×10, the standard five ships, 30 games, identical seeds.

| Profile | Mean | Median | Best | Worst | Hit rate |
| --- | --- | --- | --- | --- | --- |
| `lax` | 65.6 | 67 | 28 | 91 | 27.7% |
| `standard` | 52.9 | 54 | 30 | 73 | 33.5% |
| `packedHunt` | 46.1 | 46 | 28 | 61 | 38.0% |
| `smartTarget` | 46.1 | 46 | 28 | 61 | 38.0% |
| `probability` | 46.1 | 48 | 26 | 64 | 38.5% |

`probability` beats `standard` by 6.8 shots on the same control, which is the requirement the
rules brief sets. It does not beat the heatmap profiles by much, and that is not a bug: once a
profile ranks every candidate square by how many legal ship positions still cover it, the parity
lattice it starts from stops mattering — `packedHunt` gets there with parity, `probability`
without it, and they converge at roughly 46 shots. The remaining gap to a theoretical optimum
(low 40s, with exhaustive position counting rather than a per-ship heatmap) is left on the table
deliberately: the point of Legend is the rules, not a slower search.

`src/ai/admiral.test.ts` locks the ordering in — `probability` under 52 shots, and
`probability < standard < lax` — so a change that quietly makes the AI worse fails the suite.

## Fleet Legend is asymmetric, so it is scored twice

North fires at the human's 10×10 (the table above). The player fires at North's 8×12 water,
which holds the standard five plus two 2-square decoys that can be hit but never count towards a
win. Running the same `probability` search over that board:

| Board | Games | Mean | Median | Best | Worst | Hit rate |
| --- | --- | --- | --- | --- | --- | --- |
| 8×12, 5 ships + 2 decoys | 20 | 44.7 | 43 | 34 | 59 | 48.1% |

Slightly fewer shots than the 10×10 despite four extra occupied squares: 96 squares of water
instead of 100, and the decoys draw fire that still resolves as a hit. The player's version is
harder than the number suggests, because the human is also on an 8-second clock, cannot see
misses older than two round trips, is looking at a destroyer that moves every fourth shot, and
loses outright the first time North sinks one of theirs.
