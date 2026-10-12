import type { ApiErrorCode } from '../api/calculatorApi'

// Short enough to fit the display, specific enough to tell the user what
// happened. Anything unexpected falls back to a generic message.
const MESSAGES: Partial<Record<ApiErrorCode, string>> = {
  division_by_zero: "Can't divide by 0",
  undefined_result: 'Not a real number',
  result_out_of_range: 'Number too big',
  invalid_operand: 'Number too big',
  network_error: 'Server offline',
  timeout: 'Server too slow',
}

export function errorMessage(code: string): string {
  return MESSAGES[code as ApiErrorCode] ?? 'Something went wrong'
}
