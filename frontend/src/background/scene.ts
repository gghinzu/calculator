import { createRandom } from '../theme/random'
import { SPRITE_NAMES, type ColourSlot, type SpriteName } from './sprites'

/** CSS colour variables a sprite slot can be painted with. */
export const SPRITE_COLOURS = ['--sprite-1', '--sprite-2', '--sprite-3', '--sprite-4'] as const
export type SpriteColour = (typeof SPRITE_COLOURS)[number]

export type Drifter = {
  sprite: SpriteName
  colours: Record<ColourSlot, SpriteColour>
  /** Horizontal position, % of viewport width. */
  x: number
  /** Resting position when motion is reduced, % of viewport height. */
  y: number
  /** Size of one sprite pixel in CSS pixels. */
  scale: number
  /** Seconds for one trip from bottom to top. */
  duration: number
}

export type Sparkle = { x: number; y: number; delay: number }

export type Scene = { drifters: Drifter[]; sparkles: Sparkle[] }

export const DRIFTER_COUNT = 12
export const SPARKLE_COUNT = 10

function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

const between = (random: () => number, min: number, max: number) => min + random() * (max - min)

/**
 * Builds a random background scene from a seed. Same seed, same scene.
 *
 * Sprites are placed in evenly spaced columns with a little jitter so they
 * never bunch up, and each gets a different icon, colour order, size and
 * speed.
 */
export function createScene(seed: number): Scene {
  const random = createRandom(seed)
  const icons = shuffle(SPRITE_NAMES, random)
  const column = 100 / DRIFTER_COUNT

  const drifters = shuffle(
    Array.from({ length: DRIFTER_COUNT }, (_, i) => i),
    random,
  ).map((col, i): Drifter => {
    const [a, b, c, d] = shuffle(SPRITE_COLOURS, random)
    return {
      sprite: icons[i % icons.length],
      colours: { a, b, c, d },
      x: Math.round(col * column + between(random, 0.5, column - 4)),
      y: Math.round(between(random, 5, 90)),
      scale: Math.round(between(random, 4, 7)),
      duration: Math.round(between(random, 45, 85)),
    }
  })

  const sparkles = Array.from({ length: SPARKLE_COUNT }, (): Sparkle => ({
    x: Math.round(between(random, 2, 97)),
    y: Math.round(between(random, 3, 95)),
    delay: Math.round(between(random, 0, 3) * 10) / 10,
  }))

  return { drifters, sparkles }
}
