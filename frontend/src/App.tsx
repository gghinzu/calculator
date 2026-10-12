import { useState } from 'react'
import styles from './App.module.css'
import { Calculator } from './components/Calculator'
import { PixelBackground } from './components/PixelBackground'
import { randomSeed } from './theme/random'

function App() {
  // A new background scene on every page load.
  const [backgroundSeed] = useState(randomSeed)

  return (
    <>
      <PixelBackground seed={backgroundSeed} />
      <main className={styles.desktop}>
        <Calculator />
        <p className={styles.hint}>Your keyboard works too: numbers, + − * / ^ %, Enter, Backspace, Esc.</p>
      </main>
    </>
  )
}

export default App
