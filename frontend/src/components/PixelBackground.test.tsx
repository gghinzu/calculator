import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PixelBackground } from './PixelBackground'

describe('PixelBackground', () => {
  it('is decorative: hidden from assistive technology', () => {
    render(<PixelBackground />)
    expect(screen.getByTestId('pixel-background')).toHaveAttribute('aria-hidden', 'true')
  })

  it('draws pixel sprites as crisp SVG rectangles', () => {
    render(<PixelBackground />)
    const svgs = screen.getByTestId('pixel-background').querySelectorAll('svg')

    expect(svgs.length).toBeGreaterThan(10)
    for (const svg of svgs) {
      expect(svg).toHaveAttribute('shape-rendering', 'crispEdges')
      expect(svg.querySelectorAll('rect').length).toBeGreaterThan(0)
    }
  })

  it('uses only the palette colours', () => {
    render(<PixelBackground />)
    const fills = new Set(
      [...screen.getByTestId('pixel-background').querySelectorAll('rect')].map((r) => r.getAttribute('fill')),
    )
    for (const fill of fills) {
      expect(fill).toMatch(/^var\(--sprite-(pink|mint|butter|cream)\)$/)
    }
  })

  it('positions every sprite with CSS variables so motion can be turned off', () => {
    render(<PixelBackground />)
    const items = screen.getByTestId('pixel-background').children
    for (const item of items) {
      const style = (item as HTMLElement).style
      expect(style.getPropertyValue('--x')).toMatch(/vw$/)
      expect(style.getPropertyValue('--y')).toMatch(/vh$/)
    }
  })
})
