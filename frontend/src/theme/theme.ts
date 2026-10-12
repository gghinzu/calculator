// Picks one of the colour themes in themes.css on every page load.

export const THEMES = ['strawberry', 'matcha', 'peach-soda', 'lemon-sky', 'cherry-cola'] as const
export type ThemeName = (typeof THEMES)[number]

const STORAGE_KEY = 'retro-calculator:last-theme'

/** Picks a random theme, never the same one twice in a row. */
export function pickTheme(random: () => number, previous: string | null): ThemeName {
  const choices = THEMES.filter((t) => t !== previous)
  return choices[Math.floor(random() * choices.length)]
}

function readPrevious(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null // storage can be unavailable (private mode, blocked cookies)
  }
}

function remember(theme: ThemeName): void {
  try {
    localStorage.setItem(STORAGE_KEY, theme)
  } catch {
    // Not remembering only means a repeat is possible; nothing to do.
  }
}

/**
 * Applies a random theme to <html>. Called before React renders so the page
 * never flashes the fallback colours.
 */
export function applyRandomTheme(random: () => number = Math.random): ThemeName {
  const theme = pickTheme(random, readPrevious())
  const root = document.documentElement
  root.dataset.theme = theme
  remember(theme)

  // Match the browser UI (mobile address bar) to the desktop colour.
  const desk = getComputedStyle(root).getPropertyValue('--desk').trim()
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', desk || '#1f3440')

  return theme
}
