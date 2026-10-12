import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, calculate } from './calculatorApi'

const fetchMock = vi.fn<typeof fetch>()

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
  fetchMock.mockReset()
})

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

async function expectApiError(promise: Promise<unknown>, code: string, status?: number) {
  const err = await promise.then(
    () => {
      throw new Error('expected the promise to reject')
    },
    (e: unknown) => e,
  )
  expect(err).toBeInstanceOf(ApiError)
  expect((err as ApiError).code).toBe(code)
  if (status !== undefined) expect((err as ApiError).status).toBe(status)
  expect((err as ApiError).message).not.toBe('')
}

describe('calculate', () => {
  it('POSTs both operands for binary operations and returns the result', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, { success: true, data: { operation: 'divide', result: 33.3333333333333 } }),
    )

    await expect(calculate('divide', 100, 3)).resolves.toBe(33.3333333333333)

    expect(fetchMock).toHaveBeenCalledOnce()
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/v1/divide')
    expect(init?.method).toBe('POST')
    expect(init?.headers).toEqual({ 'Content-Type': 'application/json' })
    expect(JSON.parse(init?.body as string)).toEqual({ a: 100, b: 3 })
  })

  it('sends only `a` for sqrt', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { success: true, data: { operation: 'sqrt', result: 3 } }))

    await expect(calculate('sqrt', 9)).resolves.toBe(3)

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/v1/sqrt')
    expect(JSON.parse(init?.body as string)).toEqual({ a: 9 })
  })

  it('maps backend errors to ApiError with code and status', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(422, {
        success: false,
        error: { code: 'division_by_zero', message: 'division by zero is undefined' },
      }),
    )

    await expectApiError(calculate('divide', 5, 0), 'division_by_zero', 422)
  })

  it('reports a network failure', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))

    await expectApiError(calculate('add', 1, 2), 'network_error', 0)
  })

  it('reports a timeout', async () => {
    fetchMock.mockImplementation(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')))
        }),
    )

    await expectApiError(calculate('add', 1, 2, { timeoutMs: 10 }), 'timeout')
  })

  it('re-throws caller-initiated aborts untouched', async () => {
    const controller = new AbortController()
    const abortError = new DOMException('aborted', 'AbortError')
    fetchMock.mockImplementation(() => {
      controller.abort()
      return Promise.reject(abortError)
    })

    await expect(calculate('add', 1, 2, { signal: controller.signal })).rejects.toBe(abortError)
  })

  it.each([
    ['an empty 500 from the dev proxy', new Response('', { status: 500, headers: { 'Content-Type': 'text/plain' } })],
    ['an HTML 502 from a gateway', new Response('<html>Bad Gateway</html>', { status: 502 })],
  ])('treats %s as the server being unreachable', async (_name, response) => {
    fetchMock.mockResolvedValue(response)

    await expectApiError(calculate('add', 1, 2), 'network_error', response.status)
  })

  it.each([
    ['a non-JSON body', new Response('<html>hello</html>', { status: 200 })],
    ['a non-JSON 404', new Response('Not Found', { status: 404 })],
    ['a JSON body with an unknown shape', jsonResponse(200, { hello: 'world' })],
    ['a success body with a non-finite result', jsonResponse(200, { success: true, data: { result: null } })],
    ['a success body on an error status', jsonResponse(500, { success: true, data: { operation: 'add', result: 1 } })],
  ])('rejects %s as invalid_response', async (_name, response) => {
    fetchMock.mockResolvedValue(response)

    await expectApiError(calculate('add', 1, 2), 'invalid_response')
  })
})
