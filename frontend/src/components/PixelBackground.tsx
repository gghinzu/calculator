import { useMemo, type CSSProperties } from 'react'
import { createScene } from '../background/scene'
import { SPARKLE, SPRITES } from '../background/sprites'
import { PixelSprite } from './PixelSprite'
import styles from './PixelBackground.module.css'

// Decorative backdrop: pastel pixel icons drifting slowly upwards, plus a
// few twinkling sparkles. A new random scene is built for every page load.
// Purely visual: hidden from assistive technology, never receives pointer
// events.

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
          <PixelSprite rows={SPRITES[d.sprite]} colours={d.colours} scale={d.scale} className={styles.svg} />
        </div>
      ))}
      {scene.sparkles.map((s, i) => (
        <div
          key={`sparkle-${i}`}
          className={styles.sparkle}
          style={{ '--x': `${s.x}vw`, '--y': `${s.y}vh`, '--delay': `${s.delay}s` } as CSSProperties}
        >
          <PixelSprite rows={SPARKLE} colours={{ a: '--sprite-4' }} scale={2} className={styles.svg} />
        </div>
      ))}
    </div>
  )
}
