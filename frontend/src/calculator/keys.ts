import type { CalculatorAction } from './calculatorReducer'

export type KeyVariant = 'digit' | 'operator' | 'function' | 'equals'

export type KeyDefinition = {
  id: string
  /** Text printed on the key. */
  label: string
  /** Accessible name, for keys whose label is a symbol. */
  ariaLabel: string
  action: CalculatorAction
  variant: KeyVariant
  /** Grid columns the key spans (default 1). */
  span?: 2
  /** Keyboard keys (KeyboardEvent.key) that press this key. */
  shortcuts: string[]
}

const digit = (d: string): KeyDefinition => ({
  id: `digit-${d}`,
  label: d,
  ariaLabel: d,
  action: { type: 'digit', digit: d },
  variant: 'digit',
  shortcuts: [d],
})

/** Keypad layout, row by row, four columns wide. */
export const KEYPAD: KeyDefinition[] = [
  { id: 'sqrt', label: '√', ariaLabel: 'square root', action: { type: 'sqrt' }, variant: 'function', shortcuts: ['r', 'R'] },
  { id: 'power', label: 'xʸ', ariaLabel: 'power', action: { type: 'operator', operator: 'power' }, variant: 'function', shortcuts: ['^'] },
  { id: 'sign', label: '±', ariaLabel: 'toggle sign', action: { type: 'toggleSign' }, variant: 'function', shortcuts: ['n', 'N'] },
  { id: 'backspace', label: 'Del', ariaLabel: 'delete last digit', action: { type: 'backspace' }, variant: 'function', shortcuts: ['Backspace'] },

  { id: 'clear', label: 'C', ariaLabel: 'clear', action: { type: 'clear' }, variant: 'function', span: 2, shortcuts: ['Escape', 'Delete', 'c', 'C'] },
  { id: 'percent', label: '%', ariaLabel: 'percent', action: { type: 'percent' }, variant: 'function', shortcuts: ['%'] },
  { id: 'divide', label: '÷', ariaLabel: 'divide', action: { type: 'operator', operator: 'divide' }, variant: 'operator', shortcuts: ['/'] },

  digit('7'), digit('8'), digit('9'),
  { id: 'multiply', label: '×', ariaLabel: 'multiply', action: { type: 'operator', operator: 'multiply' }, variant: 'operator', shortcuts: ['*', 'x', 'X'] },

  digit('4'), digit('5'), digit('6'),
  { id: 'subtract', label: '−', ariaLabel: 'subtract', action: { type: 'operator', operator: 'subtract' }, variant: 'operator', shortcuts: ['-'] },

  digit('1'), digit('2'), digit('3'),
  { id: 'add', label: '+', ariaLabel: 'add', action: { type: 'operator', operator: 'add' }, variant: 'operator', shortcuts: ['+'] },

  digit('0'),
  { id: 'decimal', label: '.', ariaLabel: 'decimal point', action: { type: 'decimal' }, variant: 'digit', shortcuts: ['.', ','] },
  { id: 'equals', label: '=', ariaLabel: 'equals', action: { type: 'equals' }, variant: 'equals', span: 2, shortcuts: ['=', 'Enter'] },
]

const BY_SHORTCUT = new Map(KEYPAD.flatMap((key) => key.shortcuts.map((s) => [s, key] as const)))

export function keyForShortcut(key: string): KeyDefinition | undefined {
  return BY_SHORTCUT.get(key)
}
