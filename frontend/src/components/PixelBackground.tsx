import { useMemo, type CSSProperties } from 'react'
import { createScene, type SpriteColour } from '../background/scene'
import { SPARKLE, SPRITES, type ColourSlot } from '../background/sprites'
import styles from './PixelBackground.module.css'

// Decorative backdrop: pastel pixel icons drifting slowly upwards, plus a
// few twinkling sparkles. A new random scene is built for every page load.
// Purely visual: hidden from assistive technology, never receives pointer
// events.

type PixelSpriteProps = {
  rows: string[]
  colours: Partial<Record<ColourSlot, SpriteColour>>
  scale: number
}

function PixelSprite({ rows, colours, scale }: PixelSpriteProps) {
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
            <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={`var(${colours[cell as ColourSlot]})`} />
          ),
        ),
      )}
    </svg>
  )
}

export function PixelBackground({ seed }: { seed: number }) {
  const scene = useMemo(() => createScene(seed), [seed])

  return (
    <div className={styles.background} aria-hidden="true" data-testid="pixel-background">
      {scene.drifters.map((d, i) => (
        <div
          key={`drifter-${i}`}
          className={styles.drifter}
          data-sprite={d.sprite}
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
          <PixelSprite rows={SPRITES[d.sprite]} colours={d.colours} scale={d.scale} />
        </div>
      ))}
      {scene.sparkles.map((s, i) => (
        <div
          key={`sparkle-${i}`}
          className={styles.sparkle}
          style={{ '--x': `${s.x}vw`, '--y': `${s.y}vh`, '--delay': `${s.delay}s` } as CSSProperties}
        >
          <PixelSprite rows={SPARKLE} colours={{ a: '--sprite-4' }} scale={2} />
        </div>
      ))}
    </div>
  )
}
