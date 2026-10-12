import { useCallback, useEffect, useRef, useState } from 'react'
import type { CalculatorAction } from '../calculator/calculatorReducer'
import { keyForShortcut, type KeyDefinition } from '../calculator/keys'
import { useCalculator } from '../calculator/useCalculator'
import styles from './Calculator.module.css'
import { Display } from './Display'
import { Keypad } from './Keypad'

/** How long a key looks pressed after a keyboard shortcut. */
const PRESS_FLASH_MS = 120

type CalculatorProps = {
  /** Called by the window's close button. */
  onClose: () => void
  /** Move focus into the window when it appears (e.g. after reopening). */
  autoFocus?: boolean
}

export function Calculator({ onClose, autoFocus = false }: CalculatorProps) {
  const { display, expression, isLoading, hasError, dispatch } = useCalculator()
  const [flashedKey, setFlashedKey] = useState<string | null>(null)
  const [minimized, setMinimized] = useState(false)
  const [maximized, setMaximized] = useState(false)
  const flashTimer = useRef<number | undefined>(undefined)
  const windowRef = useRef<HTMLElement>(null)

  const press = useCallback(
    (action: CalculatorAction) => {
      dispatch(action)
    },
    [dispatch],
  )

  useEffect(() => {
    if (autoFocus) windowRef.current?.focus()
  }, [autoFocus])

  useEffect(() => {
    // A minimized calculator must not take keyboard input it can't show.
    if (minimized) return

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
      // Cancelling the timer must not leave a key stuck in the pressed look.
      window.clearTimeout(flashTimer.current)
      setFlashedKey(null)
    }
  }, [press, minimized])

  return (
    <div className={`${styles.frame} ${maximized ? styles.maximized : ''}`}>
      <section ref={windowRef} className={styles.window} aria-label="Calculator" tabIndex={-1}>
        {minimized ? (
          // Minimized: only the title remains, as one button that restores the
          // window (like a taskbar entry). Size and close make no sense here.
          <h1 className={styles.titleBar}>
            <button
              type="button"
              className={styles.restore}
              aria-label="Restore Calculator"
              onClick={() => setMinimized(false)}
            >
              Calculator
            </button>
          </h1>
        ) : (
          <header className={styles.titleBar}>
            <h1 className={styles.title}>Calculator</h1>
            <div className={styles.titleButtons}>
              <button
                type="button"
                className={`${styles.titleButton} ${styles.minimize}`}
                aria-label="Minimize"
                onClick={() => setMinimized(true)}
              />
              <button
                type="button"
                className={`${styles.titleButton} ${styles.maximize}`}
                aria-label={maximized ? 'Restore size' : 'Maximize'}
                aria-pressed={maximized}
                onClick={() => setMaximized((m) => !m)}
              />
              <button
                type="button"
                className={`${styles.titleButton} ${styles.close}`}
                aria-label="Close"
                onClick={onClose}
              />
            </div>
          </header>
        )}

        {/* Hidden rather than unmounted, so the number on screen survives. */}
        <div className={`${styles.body} ${hasError ? styles.shake : ''}`} hidden={minimized}>
          <Display expression={expression} value={display} isLoading={isLoading} hasError={hasError} />
          <Keypad onPress={press} disabled={isLoading} flashedKey={flashedKey} />
        </div>
      </section>
    </div>
  )
}
