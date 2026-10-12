import type { ColourSlot } from '../background/sprites'

type PixelSpriteProps = {
  /** Pixel map rows; "." is transparent, a–d are colour slots. */
  rows: string[]
  /** CSS custom property (e.g. "--sprite-1") for each slot used. */
  colours: Partial<Record<ColourSlot, string>>
  /** Size of one sprite pixel in CSS pixels. */
  scale: number
  className?: string
}

/** Draws a pixel map as crisp SVG squares. */
export function PixelSprite({ rows, colours, scale, className }: PixelSpriteProps) {
  const width = rows[0].length
  const height = rows.length
  return (
    <svg
      width={width * scale}
      height={height * scale}
      viewBox={`0 0 ${width} ${height}`}
      shapeRendering="crispEdges"
      className={className}
      aria-hidden="true"
    >
      {rows.flatMap((row, y) =>
        [...row].map((cell, x) =>
          cell === '.' ? null : (
            <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={`var(${colours[cell as ColourSlot]})`} />
          ),
        ),
      )}
    </svg>
  )
}
