// Calculator state machine.
//
// The reducer is pure: it never does arithmetic itself. Whenever a key needs
// math, it records a `request` describing the API call; the useCalculator
// hook performs that call and reports back with `resolved` / `failed`.
// Only input editing (typing digits, the decimal point, the sign,
// backspace) happens locally, because that is string editing, not math.
//
// Evaluation is immediate, like a basic pocket calculator: `2 + 3 ×` shows
// 5 before the multiplication. There is no operator precedence and there are
// no parentheses (out of scope by design).

import type { BinaryOperation, Operation } from '../api/calculatorApi'
import { formatNumber } from './format'

/** Digits a user can type into one number; float64 is exact to ~15. */
export const MAX_INPUT_DIGITS = 15

/** Length used for numbers inside the small expression line. */
const EXPRESSION_NUMBER_LENGTH = 12

export const OPERATOR_SYMBOLS: Record<BinaryOperation, string> = {
  add: '+',
  subtract: '−',
  multiply: '×',
  divide: '÷',
  power: '^',
  percentage: '%',
}

export type PendingRequest = {
  id: number
  operation: Operation
  a: number
  b?: number
} & (
  | { kind: 'chain'; nextOperator: BinaryOperation }
  | { kind: 'equals'; expression: string; repeat: { operator: BinaryOperation; operand: number } }
  | { kind: 'transform'; label: string }
)

export type CalculatorState = {
  /** The number being typed or the last result, as a string. */
  entry: string
  /** Shown in the expression instead of `entry` when the entry came from %, √. */
  entryLabel: string | null
  /** When true, the next digit starts a new number instead of appending. */
  overwrite: boolean
  /** Left-hand operand waiting for `pendingOperator`. */
  accumulator: number | null
  pendingOperator: BinaryOperation | null
  /** Pressing = again repeats the last operation (12 + 3 = = = ...). */
  repeat: { operator: BinaryOperation; operand: number } | null
  /** Small line above the result, e.g. "100 ÷ 3 =". */
  expression: string
  request: PendingRequest | null
  /** API error code of the last failed calculation. */
  error: string | null
  nextRequestId: number
}

export type CalculatorAction =
  | { type: 'digit'; digit: string }
  | { type: 'decimal' }
  | { type: 'toggleSign' }
  | { type: 'backspace' }
  | { type: 'clear' }
  | { type: 'operator'; operator: BinaryOperation }
  | { type: 'equals' }
  | { type: 'percent' }
  | { type: 'sqrt' }
  | { type: 'resolved'; id: number; result: number }
  | { type: 'failed'; id: number; code: string }

export const initialState: CalculatorState = {
  entry: '0',
  entryLabel: null,
  overwrite: false,
  accumulator: null,
  pendingOperator: null,
  repeat: null,
  expression: '',
  request: null,
  error: null,
  nextRequestId: 1,
}

const fmt = (n: number) => formatNumber(n, EXPRESSION_NUMBER_LENGTH)

function entryValue(state: CalculatorState): number {
  const n = Number(state.entry)
  return Number.isFinite(n) ? n : 0
}

/** How the current entry appears inside the expression line. */
function entryText(state: CalculatorState): string {
  return state.entryLabel ?? fmt(entryValue(state))
}

/** "200 + " part of the expression when an operator is pending. */
function pendingPrefix(state: CalculatorState): string {
  if (state.pendingOperator === null || state.accumulator === null) return ''
  return `${fmt(state.accumulator)} ${OPERATOR_SYMBOLS[state.pendingOperator]} `
}

/** Omit that keeps each member of a union separate. */
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never

function startRequest(state: CalculatorState, request: DistributiveOmit<PendingRequest, 'id'>): CalculatorState {
  return {
    ...state,
    request: { ...request, id: state.nextRequestId },
    nextRequestId: state.nextRequestId + 1,
  }
}

function countDigits(entry: string): number {
  return entry.replace(/[^0-9]/g, '').length
}

/** A fresh number starts; a finished "a op b =" sequence is forgotten. */
function beginNewEntry(state: CalculatorState, entry: string): CalculatorState {
  const finished = state.pendingOperator === null && state.repeat !== null
  return {
    ...state,
    entry,
    entryLabel: null,
    overwrite: false,
    repeat: finished ? null : state.repeat,
    expression: finished || state.pendingOperator === null ? '' : state.expression,
  }
}

export function calculatorReducer(state: CalculatorState, action: CalculatorAction): CalculatorState {
  switch (action.type) {
    case 'resolved':
      return state.request?.id === action.id ? applyResult(state, state.request, action.result) : state
    case 'failed':
      if (state.request?.id !== action.id) return state
      // Keep what was being calculated visible next to the error message.
      return { ...state, request: null, error: action.code, expression: attemptedExpression(state, state.request) }
    case 'clear':
      // Also cancels an in-flight request (the hook aborts it).
      return { ...initialState, nextRequestId: state.nextRequestId }
  }

  // Ignore input while waiting for the server, so results can't race.
  if (state.request) return state

  // After an error only a new number (or C) makes sense.
  if (state.error) {
    if (action.type !== 'digit' && action.type !== 'decimal') return state
    state = { ...initialState, nextRequestId: state.nextRequestId }
  }

  switch (action.type) {
    case 'digit': {
      if (state.overwrite) return beginNewEntry(state, action.digit)
      if (countDigits(state.entry) >= MAX_INPUT_DIGITS) return state
      if (state.entry === '0') return { ...state, entry: action.digit }
      return { ...state, entry: state.entry + action.digit }
    }

    case 'decimal': {
      if (state.overwrite) return beginNewEntry(state, '0.')
      if (state.entry.includes('.')) return state
      return { ...state, entry: `${state.entry}.` }
    }

    case 'toggleSign': {
      // Zero has no sign: "-0" would be meaningless on the display.
      if (entryValue(state) === 0) return state
      const entry = state.entry.startsWith('-') ? state.entry.slice(1) : `-${state.entry}`
      return { ...state, entry, entryLabel: null }
    }

    case 'backspace': {
      if (state.overwrite) return state
      const trimmed = state.entry.slice(0, -1)
      const entry = trimmed === '' || trimmed === '-' ? '0' : trimmed
      return { ...state, entry }
    }

    case 'operator': {
      // Changing your mind: "5 + ×" means "5 ×".
      if (state.pendingOperator !== null && state.accumulator !== null && state.overwrite) {
        return {
          ...state,
          pendingOperator: action.operator,
          expression: `${fmt(state.accumulator)} ${OPERATOR_SYMBOLS[action.operator]}`,
        }
      }
      // Chaining: "2 + 3 ×" evaluates 2 + 3 first.
      if (state.pendingOperator !== null && state.accumulator !== null) {
        return startRequest(
          { ...state, expression: `${pendingPrefix(state)}${entryText(state)}` },
          {
            kind: 'chain',
            operation: state.pendingOperator,
            a: state.accumulator,
            b: entryValue(state),
            nextOperator: action.operator,
          },
        )
      }
      const value = entryValue(state)
      return {
        ...state,
        accumulator: value,
        pendingOperator: action.operator,
        overwrite: true,
        repeat: null,
        expression: `${entryText(state)} ${OPERATOR_SYMBOLS[action.operator]}`,
      }
    }

    case 'equals': {
      if (state.pendingOperator !== null && state.accumulator !== null) {
        const operand = entryValue(state)
        return startRequest(state, {
          kind: 'equals',
          operation: state.pendingOperator,
          a: state.accumulator,
          b: operand,
          expression: `${pendingPrefix(state)}${entryText(state)} =`,
          repeat: { operator: state.pendingOperator, operand },
        })
      }
      if (state.repeat !== null && state.overwrite) {
        const { operator, operand } = state.repeat
        const a = entryValue(state)
        return startRequest(state, {
          kind: 'equals',
          operation: operator,
          a,
          b: operand,
          expression: `${fmt(a)} ${OPERATOR_SYMBOLS[operator]} ${fmt(operand)} =`,
          repeat: state.repeat,
        })
      }
      return state
    }

    case 'percent': {
      // iPhone behaviour: after + or −, "b %" means b percent of the left
      // operand (200 + 10 % -> 200 + 20). Otherwise it means b / 100.
      const value = entryValue(state)
      const label = `${fmt(value)}%`
      const relative =
        state.accumulator !== null &&
        (state.pendingOperator === 'add' || state.pendingOperator === 'subtract')
      return startRequest(state, {
        kind: 'transform',
        operation: 'percentage',
        a: relative ? state.accumulator! : value,
        b: relative ? value : 1,
        label,
      })
    }

    case 'sqrt': {
      const value = entryValue(state)
      return startRequest(state, {
        kind: 'transform',
        operation: 'sqrt',
        a: value,
        label: `√(${fmt(value)})`,
      })
    }
  }
}

function attemptedExpression(state: CalculatorState, request: PendingRequest): string {
  switch (request.kind) {
    case 'chain':
      return `${pendingPrefix(state)}${entryText(state)}`
    case 'equals':
      return request.expression
    case 'transform':
      return `${pendingPrefix(state)}${request.label}`
  }
}

function applyResult(state: CalculatorState, request: PendingRequest, result: number): CalculatorState {
  const base = { ...state, request: null, entry: String(result), overwrite: true }

  switch (request.kind) {
    case 'chain':
      return {
        ...base,
        entryLabel: null,
        accumulator: result,
        pendingOperator: request.nextOperator,
        expression: `${fmt(result)} ${OPERATOR_SYMBOLS[request.nextOperator]}`,
      }
    case 'equals':
      return {
        ...base,
        entryLabel: null,
        accumulator: null,
        pendingOperator: null,
        repeat: request.repeat,
        expression: request.expression,
      }
    case 'transform':
      return {
        ...base,
        entryLabel: request.label,
        repeat: null,
        expression: `${pendingPrefix(state)}${request.label}`,
      }
  }
}
