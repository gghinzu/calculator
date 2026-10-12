import { useEffect, useReducer } from 'react'
import { ApiError, calculate } from '../api/calculatorApi'
import { calculatorReducer, initialState, type CalculatorAction } from './calculatorReducer'
import { errorMessage } from './errorMessages'
import { formatEntry, formatNumber } from './format'

export type CalculatorView = {
  /** Main line: the typed number, the result, or an error message. */
  display: string
  /** Small line above it, e.g. "100 ÷ 3 =". */
  expression: string
  isLoading: boolean
  hasError: boolean
  dispatch: (action: CalculatorAction) => void
}

/**
 * Connects the pure reducer to the API: whenever the reducer records a
 * request, it is sent here; the response (or error) is fed back in.
 */
export function useCalculator(): CalculatorView {
  const [state, dispatch] = useReducer(calculatorReducer, initialState)
  const { request } = state

  useEffect(() => {
    if (!request) return
    const controller = new AbortController()
    const options = { signal: controller.signal }

    const call =
      request.operation === 'sqrt'
        ? calculate('sqrt', request.a, undefined, options)
        : calculate(request.operation, request.a, request.b ?? 0, options)

    call.then(
      (result) => dispatch({ type: 'resolved', id: request.id, result }),
      (err: unknown) => {
        if (controller.signal.aborted) return // cleared or superseded
        // The display shows a short message; the console keeps the details.
        console.error(`Calculation failed: ${request.operation}(${request.a}, ${request.b ?? ''})`, err)
        const code = err instanceof ApiError ? err.code : 'internal_error'
        dispatch({ type: 'failed', id: request.id, code })
      },
    )
    return () => controller.abort()
  }, [request])

  let display: string
  if (state.error) {
    display = errorMessage(state.error)
  } else if (state.overwrite) {
    display = formatNumber(Number(state.entry))
  } else {
    display = formatEntry(state.entry)
  }

  return {
    display,
    expression: state.expression,
    isLoading: state.request !== null,
    hasError: state.error !== null,
    dispatch,
  }
}
