// Display formatting. Whatever number comes in, the user only ever sees
// something that fits the screen: no float noise, no "-0", no NaN/Infinity.

/** Characters that fit on the main display line. */
export const DISPLAY_MAX_LENGTH = 14

/** Most significant digits ever shown; float64 is reliable to ~15. */
const MAX_SIGNIFICANT_DIGITS = 12

const formatters = new Map<number, Intl.NumberFormat>()

function plainFormatter(significantDigits: number): Intl.NumberFormat {
  let f = formatters.get(significantDigits)
  if (!f) {
    f = new Intl.NumberFormat('en-US', { maximumSignificantDigits: significantDigits })
    formatters.set(significantDigits, f)
  }
  return f
}

/**
 * Formats a computed number to fit in `maxLength` characters.
 * Tries grouped decimal notation first (losing trailing precision before
 * anything else), then falls back to exponent notation like `1.5e+21`.
 */
export function formatNumber(value: number, maxLength = DISPLAY_MAX_LENGTH): string {
  if (!Number.isFinite(value)) return 'Error'
  if (value === 0) return '0' // also normalizes -0

  for (let digits = MAX_SIGNIFICANT_DIGITS; digits >= 1; digits--) {
    const text = plainFormatter(digits).format(value)
    // Rounding can turn a tiny number into "0"; that would be a lie.
    if (text.length <= maxLength && text !== '0' && text !== '-0') return text
  }

  for (let fractionDigits = MAX_SIGNIFICANT_DIGITS - 1; fractionDigits >= 0; fractionDigits--) {
    const text = trimExponent(value.toExponential(fractionDigits))
    if (text.length <= maxLength) return text
  }
  return trimExponent(value.toExponential(0))
}

/** "1.50000e+21" -> "1.5e+21", "2.000e-7" -> "2e-7" */
function trimExponent(text: string): string {
  return text.replace(/\.?0+e/, 'e')
}

/**
 * Formats the number the user is typing, keeping exactly what they typed
 * (a trailing "." or trailing zeros) and only adding thousands separators.
 */
export function formatEntry(entry: string): string {
  const negative = entry.startsWith('-')
  const unsigned = negative ? entry.slice(1) : entry
  const [integer, fraction] = unsigned.split('.')
  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return (negative ? '-' : '') + grouped + (fraction !== undefined ? `.${fraction}` : '')
}
