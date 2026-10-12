import type { CalculatorAction } from '../calculator/calculatorReducer'
import { KEYPAD } from '../calculator/keys'
import styles from './Keypad.module.css'

type KeypadProps = {
  onPress: (action: CalculatorAction) => void
  disabled: boolean
  /** Key to show as pressed (used for keyboard input). */
  flashedKey: string | null
}

export function Keypad({ onPress, disabled, flashedKey }: KeypadProps) {
  return (
    <div className={styles.keypad}>
      {KEYPAD.map((key) => (
        <button
          key={key.id}
          type="button"
          className={[
            styles.key,
            styles[key.variant],
            key.span === 2 ? styles.wide : '',
            flashedKey === key.id ? styles.pressed : '',
          ].join(' ')}
          aria-label={key.ariaLabel}
          // C must stay usable while waiting, to cancel a slow request.
          disabled={disabled && key.id !== 'clear'}
          onClick={() => onPress(key.action)}
        >
          {key.label}
        </button>
      ))}
    </div>
  )
}
