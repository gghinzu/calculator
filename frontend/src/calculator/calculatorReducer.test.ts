import { describe, expect, it } from 'vitest'
import {
  calculatorReducer,
  initialState,
  MAX_INPUT_DIGITS,
  type CalculatorAction,
  type CalculatorState,
} from './calculatorReducer'

// Tiny DSL: "12+3=" etc. Requests are answered by `answer`, which plays the
// role of the backend so the reducer can be tested in isolation.
const KEYS: Record<string, CalculatorAction> = {
  '+': { type: 'operator', operator: 'add' },
  '-': { type: 'operator', operator: 'subtract' },
  '*': { type: 'operator', operator: 'multiply' },
  '/': { type: 'operator', operator: 'divide' },
  '^': { type: 'operator', operator: 'power' },
  '=': { type: 'equals' },
  '%': { type: 'percent' },
  r: { type: 'sqrt' },
  n: { type: 'toggleSign' },
  '<': { type: 'backspace' },
  C: { type: 'clear' },
  '.': { type: 'decimal' },
}

function fakeBackend(op: string, a: number, b = 0): number {
  switch (op) {
    case 'add': return a + b
    case 'subtract': return a - b
    case 'multiply': return a * b
    case 'divide': return a / b
    case 'power': return a ** b
    case 'percentage': return (a / 100) * b
    case 'sqrt': return Math.sqrt(a)
    default: throw new Error(op)
  }
}

/** Presses keys; every request is answered immediately by the fake backend. */
function press(keys: string, state: CalculatorState = initialState): CalculatorState {
  for (const k of keys) {
    const action: CalculatorAction = /\d/.test(k) ? { type: 'digit', digit: k } : KEYS[k]
    state = calculatorReducer(state, action)
    const req = state.request
    if (req) {
      state = calculatorReducer(state, { type: 'resolved', id: req.id, result: fakeBackend(req.operation, req.a, req.b) })
    }
  }
  return state
}

/** Presses keys but leaves the last request unanswered. */
function pressPending(keys: string): CalculatorState {
  const before = press(keys.slice(0, -1))
  return calculatorReducer(before, KEYS[keys.at(-1)!] ?? { type: 'digit', digit: keys.at(-1)! })
}

describe('typing numbers', () => {
  it('replaces the leading zero and appends digits', () => {
    expect(press('0012').entry).toBe('12')
  })

  it('allows only one decimal point', () => {
    expect(press('1.2.3').entry).toBe('1.23')
    expect(press('.5').entry).toBe('0.5')
  })

  it(`stops at ${MAX_INPUT_DIGITS} digits`, () => {
    expect(press('1234567890123456789').entry).toBe('123456789012345')
  })

  it('toggles the sign, including on zero', () => {
    expect(press('5n').entry).toBe('-5')
    expect(press('5nn').entry).toBe('5')
    expect(press('n7').entry).toBe('-7')
  })

  it('deletes the last digit and falls back to 0', () => {
    expect(press('123<').entry).toBe('12')
    expect(press('7<').entry).toBe('0')
    expect(press('7n<').entry).toBe('0')
  })

  it('does not delete digits of a result', () => {
    expect(press('2+3=<').entry).toBe('5')
  })
})

describe('calculating', () => {
  it('sends a = b to the backend and shows the expression', () => {
    const s = press('100/3=')
    expect(Number(s.entry)).toBeCloseTo(33.333333, 5)
    expect(s.expression).toBe('100 ÷ 3 =')
  })

  it('records exactly what to ask the backend', () => {
    const s = pressPending('12*4=')
    expect(s.request).toMatchObject({ kind: 'equals', operation: 'multiply', a: 12, b: 4 })
  })

  it('evaluates left to right when chaining operators', () => {
    const s = press('2+3*')
    expect(s.accumulator).toBe(5)
    expect(s.expression).toBe('5 ×')
    expect(press('4=', s).entry).toBe('20')
  })

  it('lets the user change the operator', () => {
    const s = press('5+*')
    expect(s.pendingOperator).toBe('multiply')
    expect(s.request).toBeNull()
    expect(press('2=', s).entry).toBe('10')
  })

  it('repeats the last operation on repeated =', () => {
    expect(press('2+3==').entry).toBe('8')
    expect(press('2+3===').entry).toBe('11')
  })

  it('uses the left operand twice for "a op ="', () => {
    expect(press('5+=').entry).toBe('10')
  })

  it('starts fresh when typing after a result', () => {
    const s = press('2+3=7')
    expect(s.entry).toBe('7')
    expect(s.expression).toBe('')
    expect(press('=', s).request).toBeNull()
  })

  it('continues from a result when an operator follows', () => {
    const s = press('2+3=*2=')
    expect(s.entry).toBe('10')
    expect(s.expression).toBe('5 × 2 =')
  })

  it('computes powers', () => {
    expect(press('2^10=').entry).toBe('1024')
  })

  it('takes square roots of the current entry', () => {
    const s = press('81r')
    expect(s.entry).toBe('9')
    expect(s.expression).toBe('√(81)')
  })

  it('ignores = with nothing to calculate', () => {
    expect(press('5=')).toMatchObject({ entry: '5', request: null })
  })
})

describe('percent (iPhone behaviour)', () => {
  it('after + it means percent of the left operand', () => {
    const s = press('200+10%')
    expect(s.entry).toBe('20')
    expect(s.expression).toBe('200 + 10%')
    const done = press('=', s)
    expect(done.entry).toBe('220')
    expect(done.expression).toBe('200 + 10% =')
  })

  it('after − it means percent of the left operand', () => {
    expect(press('200-10%=').entry).toBe('180')
  })

  it('after × it means b / 100', () => {
    expect(press('50*10%=').entry).toBe('5')
  })

  it('on its own it means b / 100', () => {
    expect(press('10%').entry).toBe('0.1')
  })
})

describe('waiting for the server', () => {
  it('ignores keys while a request is in flight', () => {
    const s = pressPending('2+3=')
    expect(s.request).not.toBeNull()
    expect(calculatorReducer(s, { type: 'digit', digit: '9' })).toBe(s)
  })

  it('C cancels the request', () => {
    const s = calculatorReducer(pressPending('2+3='), { type: 'clear' })
    expect(s.request).toBeNull()
    expect(s.entry).toBe('0')
  })

  it('ignores responses to a cancelled or older request', () => {
    const pending = pressPending('2+3=')
    const id = pending.request!.id
    const cleared = calculatorReducer(pending, { type: 'clear' })
    expect(calculatorReducer(cleared, { type: 'resolved', id, result: 5 })).toBe(cleared)
    expect(calculatorReducer(cleared, { type: 'failed', id, code: 'timeout' })).toBe(cleared)
  })
})

describe('errors', () => {
  function failed(keys: string, code = 'division_by_zero'): CalculatorState {
    const s = pressPending(keys)
    return calculatorReducer(s, { type: 'failed', id: s.request!.id, code })
  }

  it('stores the error and keeps the attempted expression visible', () => {
    const s = failed('5/0=')
    expect(s.error).toBe('division_by_zero')
    expect(s.expression).toBe('5 ÷ 0 =')
  })

  it('shows the attempted chain or transform', () => {
    expect(failed('5/0*').expression).toBe('5 ÷ 0')
    expect(failed('4nr', 'undefined_result').expression).toBe('√(-4)')
  })

  it('ignores operators after an error', () => {
    const s = failed('5/0=')
    expect(press('+', s)).toBe(s)
  })

  it('a new number clears the error', () => {
    const s = press('7', failed('5/0='))
    expect(s).toMatchObject({ error: null, entry: '7', expression: '' })
    expect(press('.', failed('5/0=')).entry).toBe('0.')
  })

  it('C clears the error', () => {
    expect(press('C', failed('5/0=')).error).toBeNull()
  })
})
