import Board from '../components/Board'
import FleetStrip from '../components/FleetStrip'
import { powderLeft, shotsFired, type Match } from '../game/match'
import { fireView } from '../game/views'
import { useTheme } from '../theme/useTheme'
import styles from './AfterAction.module.css'

interface AfterActionProps {
  commander: string
  match: Match
  onRematch: () => void
  onNewBriefing: () => void
}

export default function AfterAction({
  commander,
  match,
  onRematch,
  onNewBriefing,
}: AfterActionProps) {
  const { copy } = useTheme()
  const rules = match.rules
  const shots = shotsFired(match)
  const humanWon = match.winner === 'human'
  const real = rules.fleet.filter((s) => !s.decoy)
  const survivors = {
    human: real.length - match.fleet.sunk.length,
    ai: real.length - match.enemy.sunk.filter((id) => real.some((s) => s.id === id)).length,
  }
  const powder = powderLeft(match)

  /** One true sentence about how this particular rank ended. */
  const verdict = (() => {
    switch (match.ending) {
      case 'powder-spent':
        return copy.powderSpent
      case 'one-life':
        return copy.oneLifeLoss(
          copy.shipAlias[match.fleet.sunk[0] ?? 'destroyer'],
        )
      default:
        return humanWon
          ? `North's fleet is on the bottom. You had ${survivors.human} ship${
              survivors.human === 1 ? '' : 's'
            } still afloat.`
          : `Your fleet is on the bottom. North still had ${survivors.ai} ship${
              survivors.ai === 1 ? '' : 's'
            } afloat.`
    }
  })()

  return (
    <main className={styles.screen}>
      <header className={styles.head}>
        <span className="eyebrow">{copy.closing(humanWon)}</span>
        <h1 className={`wordmark ${styles.verdict} ${humanWon ? styles.win : styles.loss}`}>
          {humanWon ? `${commander} ${copy.youWin}` : copy.youLose}
        </h1>
        <p className={styles.line}>{verdict}</p>
      </header>

      <dl className={styles.stats}>
        <div>
          <dt className="eyebrow">Rank</dt>
          <dd>{rules.rank}</dd>
        </div>
        <div>
          <dt className="eyebrow">{commander} shots</dt>
          <dd className="mono-num">{shots.human}</dd>
        </div>
        <div>
          <dt className="eyebrow">North shots</dt>
          <dd className="mono-num">{shots.ai}</dd>
        </div>
        {powder !== null && (
          <div>
            <dt className="eyebrow">{copy.powderLabel} left</dt>
            <dd className="mono-num">{powder}</dd>
          </div>
        )}
        <div>
          <dt className="eyebrow">Your ships left</dt>
          <dd className="mono-num">{survivors.human}</dd>
        </div>
        <div>
          <dt className="eyebrow">North ships left</dt>
          <dd className="mono-num">{survivors.ai}</dd>
        </div>
      </dl>

      <section className={styles.reveal}>
        <h2 className={styles.boardTitle}>
          <span className="eyebrow">Reveal</span>
          {copy.aiName}
        </h2>
        <Board
          name="Admiral North's revealed fleet"
          grid={match.enemy.grid}
          views={fireView(match.enemy, { reveal: true })}
          interactive={false}
        />
        <div className={styles.strips}>
          <FleetStrip title="North's fleet" fleet={rules.fleet} sunk={match.enemy.sunk} />
          <FleetStrip title="Your fleet" fleet={rules.fleet} sunk={match.fleet.sunk} />
        </div>
      </section>

      <div className={styles.actions}>
        <button type="button" className="btn btn-primary" onClick={onRematch}>
          {copy.rematch}
        </button>
        <button type="button" className="btn" onClick={onNewBriefing}>
          {copy.standDown}
        </button>
      </div>
    </main>
  )
}
