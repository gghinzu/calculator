import { useState } from 'react'
import styles from './App.module.css'
import { Calculator } from './components/Calculator'
import { PixelBackground } from './components/PixelBackground'
import { randomSeed } from './theme/random'
import { THEME_LABELS, type ThemeName } from './theme/theme'

type AppProps = {
  /** Theme picked for this page load (see theme.ts). */
  theme?: ThemeName
}

function App({ theme }: AppProps) {
  // A new background scene on every page load.
  const [backgroundSeed] = useState(randomSeed)

  return (
    <>
      <PixelBackground seed={backgroundSeed} />
      <main className={styles.desktop}>
        <Calculator />
        <p className={styles.hint}>Your keyboard works too: numbers, + − * / ^ %, Enter, Backspace, Esc.</p>
        {theme && (
          <p className={styles.themeNote}>
            {THEME_LABELS[theme]} theme · refresh the page for a new look
          </p>
        )}
      </main>
    </>
  )
}

export default App
