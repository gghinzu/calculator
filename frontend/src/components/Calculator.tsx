import { useCallback, useEffect, useRef, useState } from 'react'
import type { CalculatorAction } from '../calculator/calculatorReducer'
import { keyForShortcut, type KeyDefinition } from '../calculator/keys'
import { useCalculator } from '../calculator/useCalculator'
import styles from './Calculator.module.css'
import { Display } from './Display'
import { Keypad } from './Keypad'

/** How long a key looks pressed after a keyboard shortcut. */
const PRESS_FLASH_MS = 120

export function Calculator() {
  const { display, expression, isLoading, hasError, dispatch } = useCalculator()
  const [flashedKey, setFlashedKey] = useState<string | null>(null)
  const flashTimer = useRef<number | undefined>(undefined)

  const press = useCallback(
    (action: CalculatorAction) => {
      dispatch(action)
    },
    [dispatch],
  )

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.ctrlKey || event.metaKey || event.altKey) return
      const key: KeyDefinition | undefined = keyForShortcut(event.key)
      if (!key) return

      // Stops Enter from also "clicking" a focused key, and "/" from
      // opening the browser's quick-find.
      event.preventDefault()
      press(key.action)

      setFlashedKey(key.id)
      window.clearTimeout(flashTimer.current)
      flashTimer.current = window.setTimeout(() => setFlashedKey(null), PRESS_FLASH_MS)
    }

    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.clearTimeout(flashTimer.current)
    }
  }, [press])

  return (
    <div className={styles.frame}>
      <section className={styles.window} aria-label="Calculator">
        <header className={styles.titleBar}>
          <h1 className={styles.title}>Calculator</h1>
          <div className={styles.titleButtons} aria-hidden="true">
            <span className={`${styles.titleButton} ${styles.minimize}`} />
            <span className={`${styles.titleButton} ${styles.maximize}`} />
            <span className={`${styles.titleButton} ${styles.close}`} />
          </div>
        </header>

        <div className={`${styles.body} ${hasError ? styles.shake : ''}`}>
          <Display expression={expression} value={display} isLoading={isLoading} hasError={hasError} />
          <Keypad onPress={press} disabled={isLoading} flashedKey={flashedKey} />
        </div>
      </section>
    </div>
  )
}
