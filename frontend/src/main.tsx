import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/jersey-10/400.css'
import './theme/themes.css'
import './index.css'
import App from './App.tsx'
import { applyRandomTheme } from './theme/theme'

// Before the first render, so the page never flashes another theme.
const theme = applyRandomTheme()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App theme={theme} />
  </StrictMode>,
)
