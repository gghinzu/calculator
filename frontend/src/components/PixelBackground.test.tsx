import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DRIFTER_COUNT, SPARKLE_COUNT } from '../background/scene'
import { PixelBackground } from './PixelBackground'

const background = () => screen.getByTestId('pixel-background')

describe('PixelBackground', () => {
  it('is decorative: hidden from assistive technology', () => {
    render(<PixelBackground seed={1} />)
    expect(background()).toHaveAttribute('aria-hidden', 'true')
  })

  it('draws every drifter and sparkle as a crisp pixel SVG', () => {
    render(<PixelBackground seed={1} />)
    const svgs = background().querySelectorAll('svg')

    expect(svgs).toHaveLength(DRIFTER_COUNT + SPARKLE_COUNT)
    for (const svg of svgs) {
      expect(svg).toHaveAttribute('shape-rendering', 'crispEdges')
      expect(svg.querySelectorAll('rect').length).toBeGreaterThan(0)
    }
  })

  it('paints only with the theme sprite colours', () => {
    render(<PixelBackground seed={7} />)
    const fills = new Set([...background().querySelectorAll('rect')].map((r) => r.getAttribute('fill')))
    for (const fill of fills) {
      expect(fill).toMatch(/^var\(--sprite-[1-4]\)$/)
    }
  })

  it('draws the same scene for the same seed and a different one for another', () => {
    const sprites = (seed: number) => {
      const { unmount } = render(<PixelBackground seed={seed} />)
      const names = [...background().querySelectorAll('[data-sprite]')].map((el) => el.getAttribute('data-sprite'))
      unmount()
      return names.join(',')
    }
    expect(sprites(42)).toBe(sprites(42))
    expect(sprites(42)).not.toBe(sprites(43))
  })

  it('positions every item with CSS variables so motion can be turned off', () => {
    render(<PixelBackground seed={3} />)
    for (const item of background().children) {
      const style = (item as HTMLElement).style
      expect(style.getPropertyValue('--x')).toMatch(/vw$/)
      expect(style.getPropertyValue('--y')).toMatch(/vh$/)
    }
  })
})
