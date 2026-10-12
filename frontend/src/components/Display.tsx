import styles from './Display.module.css'

type DisplayProps = {
  expression: string
  value: string
  isLoading: boolean
  hasError: boolean
}

export function Display({ expression, value, isLoading, hasError }: DisplayProps) {
  // Long values (big grouped numbers, error messages) get a smaller size so
  // they always fit on one line.
  const size = value.length > 12 ? styles.small : value.length > 9 ? styles.medium : ''

  return (
    <div className={styles.screen}>
      <p className={styles.expression} data-testid="expression">
        {expression || ' '}
      </p>
      <p
        className={`${styles.value} ${size} ${hasError ? styles.error : ''}`}
        data-testid="display"
        role="status"
        aria-live="polite"
        aria-busy={isLoading}
      >
        {isLoading ? <span className={styles.cursor} aria-label="Calculating" /> : value}
      </p>
    </div>
  )
}
