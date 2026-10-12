import styles from './App.module.css'
import { Calculator } from './components/Calculator'

function App() {
  return (
    <main className={styles.desktop}>
      <Calculator />
      <p className={styles.hint}>Your keyboard works too: numbers, + − * / ^ %, Enter, Backspace, Esc.</p>
    </main>
  )
}

export default App
