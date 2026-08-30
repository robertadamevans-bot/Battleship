import { useTheme } from './useTheme'
import { isTheme, THEME_SPECS } from './themes'
import styles from './TheatreSwitch.module.css'

/**
 * Mid-match theatre change. It only writes the theme token, so boards, ships
 * and the turn order carry on untouched.
 */
export default function TheatreSwitch() {
  const { theme, setTheme } = useTheme()
  return (
    <label className={styles.wrap}>
      <span className="sr-only">Theatre</span>
      <select
        className={styles.select}
        value={theme}
        onChange={(event) => {
          if (isTheme(event.target.value)) setTheme(event.target.value)
        }}
      >
        {THEME_SPECS.map((spec) => (
          <option key={spec.id} value={spec.id}>
            {spec.name}
          </option>
        ))}
      </select>
    </label>
  )
}
