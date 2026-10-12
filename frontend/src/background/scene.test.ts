import { describe, expect, it } from 'vitest'
import { createScene, DRIFTER_COUNT, SPARKLE_COUNT, SPRITE_COLOURS } from './scene'
import { SPARKLE, SPRITE_NAMES, SPRITES } from './sprites'

describe('sprites', () => {
  it.each(SPRITE_NAMES)('%s is a rectangular pixel map using only known slots', (name) => {
    const rows = SPRITES[name]
    expect(new Set(rows.map((r) => r.length)).size).toBe(1)
    expect(rows.join('')).toMatch(/^[.abcd]+$/)
  })

  it('has a varied library', () => {
    expect(SPRITE_NAMES.length).toBeGreaterThanOrEqual(12)
    expect(new Set(SPARKLE.map((r) => r.length)).size).toBe(1)
  })
})

describe('createScene', () => {
  it('is deterministic for a seed', () => {
    expect(createScene(123)).toEqual(createScene(123))
  })

  it('varies between seeds', () => {
    expect(createScene(1)).not.toEqual(createScene(2))
  })

  it('creates the expected number of items', () => {
    const scene = createScene(9)
    expect(scene.drifters).toHaveLength(DRIFTER_COUNT)
    expect(scene.sparkles).toHaveLength(SPARKLE_COUNT)
  })

  it('uses a different icon for every drifter', () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const icons = createScene(seed).drifters.map((d) => d.sprite)
      expect(new Set(icons).size).toBe(icons.length)
    }
  })

  it('spreads drifters across the whole width, one per column', () => {
    for (const seed of [10, 20, 30]) {
      const xs = createScene(seed)
        .drifters.map((d) => d.x)
        .sort((a, b) => a - b)
      const column = 100 / DRIFTER_COUNT
      xs.forEach((x, i) => {
        expect(x).toBeGreaterThanOrEqual(Math.floor(i * column))
        expect(x).toBeLessThan(Math.ceil((i + 1) * column))
      })
    }
  })

  it('keeps values within sensible ranges', () => {
    for (const seed of [1, 99, 2024, 4294967295]) {
      const { drifters, sparkles } = createScene(seed)
      for (const d of drifters) {
        expect(d.y).toBeGreaterThanOrEqual(5)
        expect(d.y).toBeLessThanOrEqual(90)
        expect(d.scale).toBeGreaterThanOrEqual(4)
        expect(d.scale).toBeLessThanOrEqual(7)
        expect(d.duration).toBeGreaterThanOrEqual(45)
        expect(d.duration).toBeLessThanOrEqual(85)
        expect(new Set(Object.values(d.colours))).toEqual(new Set(SPRITE_COLOURS))
      }
      for (const s of sparkles) {
        expect(s.x).toBeGreaterThanOrEqual(2)
        expect(s.x).toBeLessThanOrEqual(97)
        expect(s.delay).toBeGreaterThanOrEqual(0)
        expect(s.delay).toBeLessThanOrEqual(3)
      }
    }
  })
})
