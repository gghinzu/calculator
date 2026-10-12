import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, calculate } from '../api/calculatorApi'
import App from '../App'

// The component is tested against a mocked API client; the client itself
// has its own tests.
vi.mock('../api/calculatorApi', async (importOriginal) => {
  const original = await importOriginal<typeof import('../api/calculatorApi')>()
  return { ...original, calculate: vi.fn() }
})

const calculateMock = vi.mocked(calculate)

function simpleBackend(op: string, a: number, b?: number): Promise<number> {
  const results: Record<string, number> = {
    add: a + (b ?? 0),
    subtract: a - (b ?? 0),
    multiply: a * (b ?? 0),
    divide: a / (b ?? 1),
    percentage: (a / 100) * (b ?? 0),
    sqrt: Math.sqrt(a),
    power: a ** (b ?? 0),
  }
  return Promise.resolve(Number(results[op].toPrecision(15)))
}

beforeEach(() => {
  // Failures are logged on purpose; keep the test output clean.
  vi.spyOn(console, 'error').mockImplementation(() => {})
  calculateMock.mockReset()
  calculateMock.mockImplementation(simpleBackend as typeof calculate)
})

const display = () => screen.getByTestId('display')
const expression = () => screen.getByTestId('expression')

async function clickKeys(user: ReturnType<typeof userEvent.setup>, ...names: string[]) {
  for (const name of names) {
    await user.click(screen.getByRole('button', { name }))
  }
}

describe('Calculator', () => {
  it('renders the window with a display and every key', () => {
    render(<App />)
    expect(screen.getByRole('region', { name: 'Calculator' })).toBeInTheDocument()
    expect(display()).toHaveTextContent('0')
    for (const name of ['square root', 'power', 'toggle sign', 'delete last digit', 'clear', 'percent', 'divide', 'multiply', 'subtract', 'add', 'equals', 'decimal point']) {
      expect(screen.getByRole('button', { name })).toBeInTheDocument()
    }
    for (let d = 0; d <= 9; d++) {
      expect(screen.getByRole('button', { name: String(d) })).toBeInTheDocument()
    }
  })

  it('calculates through the API and formats the result to fit', async () => {
    const user = userEvent.setup()
    render(<App />)

    await clickKeys(user, '1', '0', '0', 'divide', '3', 'equals')

    expect(calculateMock).toHaveBeenCalledWith('divide', 100, 3, expect.objectContaining({ signal: expect.any(AbortSignal) }))
    expect(await screen.findByText('33.3333333333')).toBeInTheDocument()
    expect(expression()).toHaveTextContent('100 ÷ 3 =')
  })

  it('shows thousands separators while typing', async () => {
    const user = userEvent.setup()
    render(<App />)
    await clickKeys(user, '1', '2', '3', '4', '5', '6', '7')
    expect(display()).toHaveTextContent('1,234,567')
  })

  it('applies the iPhone percent rule', async () => {
    const user = userEvent.setup()
    render(<App />)

    await clickKeys(user, '2', '0', '0', 'add', '1', '0', 'percent')
    expect(await screen.findByText('20')).toBeInTheDocument()
    expect(expression()).toHaveTextContent('200 + 10%')

    await clickKeys(user, 'equals')
    expect(await screen.findByText('220')).toBeInTheDocument()
  })

  it('shows a readable message for backend errors', async () => {
    calculateMock.mockRejectedValueOnce(new ApiError('division_by_zero', 'division by zero is undefined', 422))
    const user = userEvent.setup()
    render(<App />)

    await clickKeys(user, '5', 'divide', '0', 'equals')

    expect(await screen.findByText("Can't divide by 0")).toBeInTheDocument()
    expect(expression()).toHaveTextContent('5 ÷ 0 =')

    // A new number starts over.
    await clickKeys(user, '4')
    expect(display()).toHaveTextContent('4')
  })

  it('shows a readable message when the server is unreachable', async () => {
    calculateMock.mockRejectedValueOnce(new ApiError('network_error', 'Could not reach the server.'))
    const user = userEvent.setup()
    render(<App />)

    await clickKeys(user, '2', 'add', '2', 'equals')

    expect(await screen.findByText('Server offline')).toBeInTheDocument()
  })

  it('falls back to a generic message for non-API failures', async () => {
    calculateMock.mockRejectedValueOnce(new Error('boom'))
    const user = userEvent.setup()
    render(<App />)

    await clickKeys(user, '2', 'add', '2', 'equals')

    expect(await screen.findByText('Something went wrong')).toBeInTheDocument()
    expect(console.error).toHaveBeenCalledWith('Calculation failed: add(2, 2)', expect.any(Error))
  })

  it('shows a loading state, disables keys except C, and C cancels', async () => {
    let resolve!: (n: number) => void
    calculateMock.mockImplementationOnce(() => new Promise((r) => (resolve = r)))
    const user = userEvent.setup()
    render(<App />)

    await clickKeys(user, '2', 'add', '2', 'equals')

    expect(display()).toHaveAttribute('aria-busy', 'true')
    expect(screen.getByLabelText('Calculating')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '7' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'clear' })).toBeEnabled()

    await clickKeys(user, 'clear')
    expect(display()).toHaveTextContent('0')
    expect(display()).toHaveAttribute('aria-busy', 'false')

    // A late answer for the cancelled request is ignored.
    await act(async () => resolve(4))
    expect(display()).toHaveTextContent('0')
  })

  it('works with the keyboard', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.keyboard('12*3{Enter}')
    expect(await screen.findByText('36')).toBeInTheDocument()

    await user.keyboard('{Escape}9{Backspace}8')
    expect(display()).toHaveTextContent('8')
  })

  it('flashes the matching key on keyboard input', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.keyboard('7')
    expect(screen.getByRole('button', { name: '7' }).className).toMatch(/pressed/)
  })

  it('ignores keyboard shortcuts with modifier keys and unknown keys', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.keyboard('{Control>}5{/Control}{Meta>}c{/Meta}q')
    expect(display()).toHaveTextContent('0')
  })
})

describe('Window controls', () => {
  it('minimize leaves only the title, which restores the window with its state', async () => {
    const user = userEvent.setup()
    render(<App />)
    await clickKeys(user, '4', '2')

    await user.click(screen.getByRole('button', { name: 'Minimize' }))
    expect(screen.queryByRole('button', { name: '7' })).not.toBeInTheDocument()
    // No size or close controls on a minimized window.
    for (const name of ['Minimize', 'Maximize', 'Close']) {
      expect(screen.queryByRole('button', { name })).not.toBeInTheDocument()
    }
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Calculator')

    await user.click(screen.getByRole('button', { name: 'Restore Calculator' }))
    expect(display()).toHaveTextContent('42')
    expect(screen.getByRole('button', { name: 'Minimize' })).toBeInTheDocument()
  })

  it('ignores the keyboard while minimized', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Minimize' }))

    await user.keyboard('99')
    await user.click(screen.getByRole('button', { name: 'Restore Calculator' }))

    expect(display()).toHaveTextContent('0')
  })

  it('does not leave a key looking pressed when minimized mid-flash', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.keyboard('2')
    await user.click(screen.getByRole('button', { name: 'Minimize' }))
    await user.click(screen.getByRole('button', { name: 'Restore Calculator' }))

    expect(screen.getByRole('button', { name: '2' }).className).not.toMatch(/pressed/)
  })

  it('maximize toggles a larger window', async () => {
    const user = userEvent.setup()
    render(<App />)
    const maximize = screen.getByRole('button', { name: 'Maximize' })

    await user.click(maximize)
    expect(screen.getByRole('button', { name: 'Restore size' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('region', { name: 'Calculator' }).parentElement!.className).toMatch(/maximized/)

    await user.click(screen.getByRole('button', { name: 'Restore size' }))
    expect(screen.getByRole('button', { name: 'Maximize' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('close leaves a desktop icon that reopens a fresh calculator', async () => {
    const user = userEvent.setup()
    render(<App />)
    await clickKeys(user, '8')

    await user.click(screen.getByRole('button', { name: 'Close' }))
    expect(screen.queryByRole('region', { name: 'Calculator' })).not.toBeInTheDocument()
    const icon = screen.getByRole('button', { name: 'Open Calculator' })
    expect(icon).toHaveFocus()

    // A closed calculator does not react to the keyboard.
    await user.keyboard('5')

    await user.click(icon)
    expect(screen.getByRole('region', { name: 'Calculator' })).toHaveFocus()
    expect(display()).toHaveTextContent('0')
  })
})
