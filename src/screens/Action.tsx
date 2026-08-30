import Board from '../components/Board'
import FleetStrip from '../components/FleetStrip'
import { fireView, fleetView } from '../game/views'
import { powderLeft, shotsFired, type Match } from '../game/match'
import type { Cell } from '../game/types'
import { resolutionLine } from '../theme/lines'
import TheatreSwitch from '../theme/TheatreSwitch'
import { useTheme } from '../theme/useTheme'
import styles from './Action.module.css'

interface ActionProps {
  commander: string
  match: Match
  /** True while the resolution animation plays or Admiral North is ranging. */
  locked: boolean
  lastHumanShot: Cell | null
  lastAiShot: Cell | null
  /** Milliseconds left on the human's clock; null on ranks without one. */
  msLeft: number | null
  onFire: (cell: Cell) => void
}

export default function Action({
  commander,
  match,
  locked,
  lastHumanShot,
  lastAiShot,
  msLeft,
  onFire,
}: ActionProps) {
  const { copy } = useTheme()
  const rules = match.rules
  const shots = shotsFired(match)
  const banner = match.turn === 'ai' ? copy.theirTurn : copy.yourTurn(commander)
  const latest = match.log[0]
  const powder = powderLeft(match)
  // Fog ranks keep the log short: the chart is meant to be unreliable.
  const logLimit = rules.fog.enabled ? 3 : 12

  return (
    <main className={styles.screen}>
      <header className={styles.head}>
        <span className={`wordmark ${styles.mark}`}>Armada</span>
        <span className={`${styles.shots} mono-num`}>
          {commander} {shots.human} · North {shots.ai}
        </span>
        <TheatreSwitch />
      </header>

      <div className={styles.status}>
        <p className={`${styles.banner} ${locked ? styles.waiting : ''}`}>
          <span className={styles.pip} aria-hidden="true" />
          {banner}
        </p>
        <p className={styles.resolution} role="status" aria-live="polite">
          {latest ? resolutionLine(latest, copy) : copy.waiting}
        </p>
      </div>

      <div className={styles.meters}>
        <span className={`${styles.rank} mono-num`}>
          Rank: {rules.rank} — {rules.humanGrid.rows}×{rules.humanGrid.cols}
          {powder === null ? '' : `, ${rules.matchShotBudgetHuman} shots`}
        </span>
        {powder !== null && (
          <span
            className={`${styles.meter} ${powder <= 5 ? styles.low : ''} mono-num`}
            role="status"
          >
            {copy.powderLabel} {powder}
          </span>
        )}
        {msLeft !== null && (
          <span
            className={`${styles.meter} ${msLeft <= 3000 ? styles.low : ''} mono-num`}
            role="timer"
            aria-label={`${copy.clockLabel} ${Math.ceil(msLeft / 1000)} seconds`}
          >
            {copy.clockLabel} {(msLeft / 1000).toFixed(1)}s
          </span>
        )}
      </div>

      {rules.oneLife && <p className={styles.oneLife}>{copy.oneLifeBanner}</p>}

      <div className={styles.boards}>
        <section className={styles.primary}>
          <h2 className={styles.boardTitle}>
            <span className="eyebrow">Fire</span>
            {copy.aiName}
          </h2>
          <Board
            name="Admiral North's water — choose a target"
            grid={match.enemy.grid}
            views={fireView(match.enemy, {
              fog: rules.fog,
              adjacentHitIndicators: rules.hints.adjacentHitIndicators,
            })}
            interactive={!match.winner}
            locked={locked}
            lastShot={lastHumanShot}
            onFire={onFire}
          />
          <FleetStrip title="North's fleet" fleet={rules.fleet} sunk={match.enemy.sunk} />
        </section>

        <section className={styles.secondary}>
          <h2 className={styles.boardTitle}>
            <span className="eyebrow">Fleet</span>
            {commander}&rsquo;s water
          </h2>
          <Board
            name={`${commander}'s water`}
            grid={match.fleet.grid}
            views={fleetView(match.fleet)}
            interactive={false}
            lastShot={lastAiShot}
          />
          <FleetStrip title="Your fleet" fleet={rules.fleet} sunk={match.fleet.sunk} />
        </section>
      </div>

      {match.log.length > 1 && (
        <details className={styles.logWrap}>
          <summary className="eyebrow">Signal log</summary>
          <ol className={styles.log}>
            {match.log.slice(0, logLimit).map((entry, i) => (
              <li key={`${entry.result.cell.row}-${entry.result.cell.col}-${entry.by}-${i}`}>
                {resolutionLine(entry, copy)}
              </li>
            ))}
          </ol>
        </details>
      )}
    </main>
  )
}
