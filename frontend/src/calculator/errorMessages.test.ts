import { describe, expect, it } from 'vitest'
import { DISPLAY_MAX_LENGTH } from './format'
import { errorMessage } from './errorMessages'

describe('errorMessage', () => {
  it.each([
    ['division_by_zero', "Can't divide by 0"],
    ['undefined_result', 'Not a real number'],
    ['result_out_of_range', 'Number too big'],
    ['network_error', 'Server offline'],
    ['timeout', 'Server too slow'],
    ['internal_server_error', 'Something went wrong'],
    ['anything_else', 'Something went wrong'],
  ])('%s -> %s', (code, message) => {
    expect(errorMessage(code)).toBe(message)
  })

  it('keeps every message short enough for the display', () => {
    for (const code of ['division_by_zero', 'undefined_result', 'result_out_of_range', 'network_error', 'timeout', 'x']) {
      expect(errorMessage(code).length).toBeLessThanOrEqual(DISPLAY_MAX_LENGTH + 6)
    }
  })
})
