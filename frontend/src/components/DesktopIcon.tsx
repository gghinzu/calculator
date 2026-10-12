import { useEffect, useRef } from 'react'
import { SPRITES } from '../background/sprites'
import styles from './DesktopIcon.module.css'
import { PixelSprite } from './PixelSprite'

/** Shown on the desktop while the calculator window is closed. */
export function DesktopIcon({ onOpen }: { onOpen: () => void }) {
  const ref = useRef<HTMLButtonElement>(null)

  // Keyboard users land on the icon right after closing the window.
  useEffect(() => {
    ref.current?.focus()
  }, [])

  return (
    <button ref={ref} type="button" className={styles.icon} onClick={onOpen} aria-label="Open Calculator">
      <PixelSprite
        rows={SPRITES.calculator}
        colours={{ a: '--window', b: '--screen', c: '--key-operator', d: '--title' }}
        scale={8}
        className={styles.sprite}
      />
      <span className={styles.label}>Calculator</span>
    </button>
  )
}
