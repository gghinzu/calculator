/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createRandom } from './random'
import { applyRandomTheme, pickTheme, THEMES } from './theme'

describe('pickTheme', () => {
  it('never repeats the previous theme', () => {
    const random = createRandom(5)
    let previous: string | null = null
    for (let i = 0; i < 200; i++) {
      const theme = pickTheme(random, previous)
      expect(theme).not.toBe(previous)
      previous = theme
    }
  })

  it('eventually picks every theme', () => {
    const random = createRandom(11)
    const seen = new Set<string>()
    for (let i = 0; i < 200; i++) seen.add(pickTheme(random, null))
    expect(seen).toEqual(new Set(THEMES))
  })

  it('works when there is no previous theme', () => {
    expect(THEMES).toContain(pickTheme(() => 0.999, null))
  })
})

describe('applyRandomTheme', () => {
  afterEach(() => {
    localStorage.clear()
    delete document.documentElement.dataset.theme
    vi.restoreAllMocks()
  })

  it('sets data-theme on <html> and remembers it', () => {
    const theme = applyRandomTheme(() => 0)
    expect(document.documentElement.dataset.theme).toBe(theme)
    expect(localStorage.getItem('retro-calculator:last-theme')).toBe(theme)
  })

  it('does not pick the remembered theme again', () => {
    localStorage.setItem('retro-calculator:last-theme', THEMES[0])
    expect(applyRandomTheme(() => 0)).not.toBe(THEMES[0])
  })

  it('still works when storage is unavailable', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    expect(THEMES).toContain(applyRandomTheme(() => 0.5))
  })

  it('updates the theme-color meta tag', () => {
    const meta = document.createElement('meta')
    meta.name = 'theme-color'
    document.head.append(meta)
    applyRandomTheme(() => 0)
    expect(meta.getAttribute('content')).toBeTruthy()
    meta.remove()
  })
})

describe('themes.css', () => {
  // Read as plain text: Vitest does not process CSS imports.
  const css = readFileSync(join(process.cwd(), 'src/theme/themes.css'), 'utf8')

  // Each theme block, keyed by name, with the set of variables it defines.
  const blocks = new Map(
    [...css.matchAll(/\[data-theme='([\w-]+)'\]\s*\{([^}]*)\}/g)].map(([, name, body]) => [
      name,
      new Set([...body.matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1])),
    ]),
  )

  it('defines a block for every theme in theme.ts, and no others', () => {
    expect(new Set(blocks.keys())).toEqual(new Set(THEMES))
  })

  it('defines the same variables in every theme', () => {
    const reference = blocks.get(THEMES[0])!
    expect(reference.size).toBeGreaterThan(20)
    for (const [name, vars] of blocks) {
      expect(vars, name).toEqual(reference)
    }
  })

  it('never uses purple-ish hues for the desktop', () => {
    // Requested: no purple. Check each --desk colour's hue is outside 250–320°.
    for (const [, hex] of css.matchAll(/--desk:\s*(#[0-9a-f]{6})/gi)) {
      const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
      const max = Math.max(r, g, b)
      const min = Math.min(r, g, b)
      if (max === min) continue
      const d = max - min
      let h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4
      h = (h * 60 + 360) % 360
      expect(h < 250 || h > 320, `${hex} has hue ${h.toFixed(0)}°`).toBe(true)
    }
  })
})
