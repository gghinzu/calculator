import { describe, expect, it } from 'vitest'
import { DISPLAY_MAX_LENGTH, formatEntry, formatNumber } from './format'

describe('formatNumber', () => {
  it.each([
    [0, '0'],
    [-0, '0'],
    [42, '42'],
    [-7.5, '-7.5'],
    [1234567, '1,234,567'],
    [0.3, '0.3'],
    [33.3333333333333, '33.3333333333'],
    [0.000123, '0.000123'],
  ])('formats %s as %s', (value, expected) => {
    expect(formatNumber(value)).toBe(expected)
  })

  it('never exceeds the display width', () => {
    const values = [
      1 / 3, 2 / 3, Math.PI, -Math.PI, 1e15, 9.99999998e17, 1.7976931348623157e308, 5e-324, -1e-20,
      123456789012345, -987654321.123456,
    ]
    for (const v of values) {
      expect(formatNumber(v).length).toBeLessThanOrEqual(DISPLAY_MAX_LENGTH)
    }
  })

  it('switches to exponent notation for numbers that do not fit', () => {
    expect(formatNumber(1e21)).toBe('1e+21')
    expect(formatNumber(1.5e21)).toBe('1.5e+21')
    expect(formatNumber(-2e-30)).toBe('-2e-30')
  })

  it('never rounds a tiny non-zero number to 0', () => {
    expect(formatNumber(1e-20)).toBe('1e-20')
    expect(formatNumber(1e-20)).not.toBe('0')
  })

  it('respects a custom width', () => {
    expect(formatNumber(1234567.891, 8).length).toBeLessThanOrEqual(8)
  })

  it.each([NaN, Infinity, -Infinity])('shows Error instead of %s', (value) => {
    expect(formatNumber(value)).toBe('Error')
  })
})

describe('formatEntry', () => {
  it.each([
    ['0', '0'],
    ['1234', '1,234'],
    ['-1234567', '-1,234,567'],
    ['12.', '12.'],
    ['1234.500', '1,234.500'],
    ['-0', '-0'],
    ['0.', '0.'],
  ])('keeps what the user typed: %s -> %s', (entry, expected) => {
    expect(formatEntry(entry)).toBe(expected)
  })
})
