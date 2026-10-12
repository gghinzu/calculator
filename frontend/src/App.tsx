import { useState } from 'react'
import styles from './App.module.css'
import { Calculator } from './components/Calculator'
import { DesktopIcon } from './components/DesktopIcon'
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
  const [isOpen, setIsOpen] = useState(true)
  // Only move focus into the window when the user reopened it themselves.
  const [reopened, setReopened] = useState(false)

  return (
    <>
      <PixelBackground seed={backgroundSeed} />
      <main className={styles.desktop}>
        {isOpen ? (
          <Calculator onClose={() => setIsOpen(false)} autoFocus={reopened} />
        ) : (
          <DesktopIcon
            onOpen={() => {
              setIsOpen(true)
              setReopened(true)
            }}
          />
        )}
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
