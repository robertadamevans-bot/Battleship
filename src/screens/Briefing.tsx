import { useState } from 'react'
import type { Difficulty } from '../ai/admiral'
import { useTheme } from '../theme/useTheme'
import { THEME_SPECS } from '../theme/themes'
import styles from './Briefing.module.css'

export interface Settings {
  name: string
  difficulty: Difficulty
  sound: boolean
}

interface BriefingProps {
  settings: Settings
  onDeploy: (settings: Settings) => void
}

const DIFFICULTIES: { id: Difficulty; label: string; note: string }[] = [
  { id: 'admiral', label: 'Admiral', note: 'Parity search, occupancy heatmap, relentless follow-up.' },
  { id: 'cadet', label: 'Cadet', note: 'Hunt and target, but fires without reading the water.' },
]

/** Nine cells of the theatre's palette: water, water, hit, miss and so on. */
const MINI: readonly number[] = [0, 0, 1, 0, 2, 0, 0, 0, 1]

export default function Briefing({ settings, onDeploy }: BriefingProps) {
  const { theme, setTheme, copy } = useTheme()
  const [name, setName] = useState(settings.name)
  const [difficulty, setDifficulty] = useState<Difficulty>(settings.difficulty)
  const [sound, setSound] = useState(settings.sound)

  const commander = name.trim() === '' ? 'Rob' : name.trim()

  return (
    <main className={styles.screen}>
      <div className={styles.card}>
        <header className={styles.head}>
          <h1 className={`wordmark sway ${styles.mark}`}>Solent</h1>
          <p className={styles.tagline}>Fleet action. Human vs machine.</p>
        </header>

        <p className={styles.blurb}>
          Ten by ten of cold water between Southampton and the Isle of Wight. Five ships each.
          Admiral North hunts by parity and probability, so place carefully and fire first.
        </p>

        <form
          className={styles.form}
          onSubmit={(event) => {
            event.preventDefault()
            onDeploy({ name: commander, difficulty, sound })
          }}
        >
          <label className={styles.field}>
            <span className="eyebrow">Commander</span>
            <input
              value={name}
              maxLength={18}
              autoComplete="off"
              spellCheck={false}
              placeholder="Rob"
              onChange={(event) => setName(event.target.value)}
            />
          </label>

          <fieldset className={styles.field}>
            <legend className="eyebrow">Theatre</legend>
            <div className={styles.theatre}>
              {THEME_SPECS.map((spec) => (
                <button
                  key={spec.id}
                  type="button"
                  className={styles.chip}
                  aria-pressed={theme === spec.id}
                  onClick={() => setTheme(spec.id)}
                >
                  <span className={styles.mini} aria-hidden="true">
                    {MINI.map((slot, i) => (
                      <i key={i} style={{ background: spec.swatch[slot] }} />
                    ))}
                  </span>
                  <span>
                    <span className={styles.chipName}>{spec.name}</span>
                    <span className={styles.chipFlavour}>{spec.flavour}</span>
                  </span>
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className={styles.field}>
            <legend className="eyebrow">Opponent</legend>
            <div className={styles.segments}>
              {DIFFICULTIES.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={`${styles.segment} ${difficulty === option.id ? styles.on : ''}`}
                  aria-pressed={difficulty === option.id}
                  onClick={() => setDifficulty(option.id)}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <p className={styles.note}>
              {DIFFICULTIES.find((d) => d.id === difficulty)!.note}
            </p>
          </fieldset>

          <div className={styles.toggle}>
            <span className="eyebrow" id="sound-label">
              Sound
            </span>
            <button
              type="button"
              className={`${styles.switch} ${sound ? styles.on : ''}`}
              role="switch"
              aria-checked={sound}
              aria-labelledby="sound-label"
              onClick={() => setSound(!sound)}
            >
              <span>{sound ? 'On' : 'Off'}</span>
            </button>
          </div>

          <button type="submit" className={`btn btn-primary ${styles.deploy}`}>
            {copy.primaryCta}
          </button>
        </form>

        <footer className={styles.foot}>A single-match fleet action. No accounts.</footer>
      </div>
    </main>
  )
}
