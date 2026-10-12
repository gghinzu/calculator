import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('App', () => {
  it('tells the visitor which theme they got and that refreshing changes it', () => {
    render(<App theme="peach-soda" />)
    expect(screen.getByText('Peach Soda theme · refresh the page for a new look')).toBeInTheDocument()
  })

  it('shows no theme note when no theme was applied', () => {
    render(<App />)
    expect(screen.queryByText(/refresh the page/)).not.toBeInTheDocument()
  })
})
