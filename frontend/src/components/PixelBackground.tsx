import type { CSSProperties } from 'react'
import styles from './PixelBackground.module.css'

// Decorative backdrop: small pastel pixel sprites drifting slowly upwards,
// plus a few twinkling sparkles. Purely visual, so it is hidden from
// assistive technology and never receives pointer events.

type SpriteName = 'heart' | 'star' | 'cloud' | 'flower' | 'sparkle'
type Colour = 'pink' | 'mint' | 'butter' | 'cream'

// Each string row is one line of pixels: "#" is the sprite colour,
// "o" is a second shade (a flower's centre), "." is transparent.
const SPRITES: Record<SpriteName, string[]> = {
  heart: ['.##.##.', '#######', '#######', '.#####.', '..###..', '...#...'],
  star: ['...#...', '..###..', '#######', '.#####.', '.##.##.', '#.....#'],
  cloud: ['...###....', '.######.#.', '##########', '.########.'],
  flower: ['.#.#.', '##o##', '.###.', '..#..', '.##..'],
  sparkle: ['..#..', '.###.', '#####', '.###.', '..#..'],
}

const SECOND_SHADE: Record<Colour, Colour> = {
  pink: 'butter',
  mint: 'cream',
  butter: 'pink',
  cream: 'mint',
}

function PixelSprite({ name, colour, scale }: { name: SpriteName; colour: Colour; scale: number }) {
  const rows = SPRITES[name]
  const width = rows[0].length
  const height = rows.length
  return (
    <svg
      width={width * scale}
      height={height * scale}
      viewBox={`0 0 ${width} ${height}`}
      shapeRendering="crispEdges"
      className={styles.svg}
    >
      {rows.flatMap((row, y) =>
        [...row].map((cell, x) =>
          cell === '.' ? null : (
            <rect
              key={`${x}-${y}`}
              x={x}
              y={y}
              width={1}
              height={1}
              fill={`var(--sprite-${cell === 'o' ? SECOND_SHADE[colour] : colour})`}
            />
          ),
        ),
      )}
    </svg>
  )
}

type Drifter = {
  name: SpriteName
  colour: Colour
  /** Horizontal position, % of the viewport width. */
  x: number
  /** Resting position when motion is reduced, % of the viewport height. */
  y: number
  /** Size of one sprite pixel in CSS pixels. */
  scale: number
  /** Seconds for one trip from bottom to top. */
  duration: number
}

// Fixed (not random) so the layout is identical on every load and in tests.
// Sprites are spread across the width and given different speeds so they
// never move in lockstep.
const DRIFTERS: Drifter[] = [
  { name: 'heart', colour: 'pink', x: 6, y: 18, scale: 6, duration: 46 },
  { name: 'cloud', colour: 'cream', x: 16, y: 62, scale: 7, duration: 70 },
  { name: 'star', colour: 'butter', x: 27, y: 34, scale: 5, duration: 54 },
  { name: 'flower', colour: 'mint', x: 36, y: 82, scale: 6, duration: 60 },
  { name: 'heart', colour: 'butter', x: 63, y: 12, scale: 5, duration: 50 },
  { name: 'cloud', colour: 'mint', x: 72, y: 48, scale: 6, duration: 76 },
  { name: 'flower', colour: 'pink', x: 81, y: 74, scale: 7, duration: 58 },
  { name: 'star', colour: 'cream', x: 90, y: 26, scale: 6, duration: 64 },
  { name: 'heart', colour: 'mint', x: 47, y: 92, scale: 5, duration: 52 },
  { name: 'star', colour: 'pink', x: 96, y: 88, scale: 4, duration: 44 },
]

const SPARKLES: { x: number; y: number; delay: number }[] = [
  { x: 11, y: 40 },
  { x: 22, y: 12 },
  { x: 31, y: 70 },
  { x: 57, y: 6 },
  { x: 68, y: 86 },
  { x: 77, y: 30 },
  { x: 86, y: 58 },
  { x: 4, y: 90 },
].map((s, i) => ({ ...s, delay: (i * 0.7) % 3 }))

export function PixelBackground() {
  return (
    <div className={styles.background} aria-hidden="true" data-testid="pixel-background">
      {DRIFTERS.map((d, i) => (
        <div
          key={`drifter-${i}`}
          className={styles.drifter}
          style={
            {
              '--x': `${d.x}vw`,
              '--y': `${d.y}vh`,
              '--duration': `${d.duration}s`,
              // Negative delay: each sprite starts part-way up the screen.
              '--delay': `${-(d.duration * d.y) / 100}s`,
            } as CSSProperties
          }
        >
          <PixelSprite name={d.name} colour={d.colour} scale={d.scale} />
        </div>
      ))}
      {SPARKLES.map((s, i) => (
        <div
          key={`sparkle-${i}`}
          className={styles.sparkle}
          style={{ '--x': `${s.x}vw`, '--y': `${s.y}vh`, '--delay': `${s.delay}s` } as CSSProperties}
        >
          <PixelSprite name="sparkle" colour="cream" scale={2} />
        </div>
      ))}
    </div>
  )
}
