// Typed client for the Go calculator API.
//
// Every public function either resolves with a finite number or rejects with
// an ApiError, so UI code only ever has to handle one error type.

export type BinaryOperation =
  | 'add'
  | 'subtract'
  | 'multiply'
  | 'divide'
  | 'power'
  | 'percentage'

export type UnaryOperation = 'sqrt'

export type Operation = BinaryOperation | UnaryOperation

/** Error codes the backend can return, plus client-side failures. */
export type ApiErrorCode =
  // Backend: malformed request
  | 'empty_request_body'
  | 'invalid_json'
  | 'missing_operand'
  | 'invalid_operand'
  | 'unknown_field'
  | 'request_too_large'
  | 'route_not_found'
  | 'method_not_allowed'
  // Backend: mathematically undefined
  | 'division_by_zero'
  | 'undefined_result'
  | 'result_out_of_range'
  // Backend: unexpected
  | 'internal_server_error'
  // Client side
  | 'network_error'
  | 'timeout'
  | 'invalid_response'

export class ApiError extends Error {
  readonly code: ApiErrorCode
  /** HTTP status, or 0 when the request never got a response. */
  readonly status: number

  constructor(code: ApiErrorCode, message: string, status = 0) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
  }
}

/** Base URL of the API. Empty means same origin (Vite proxy / Docker). */
const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? ''

const DEFAULT_TIMEOUT_MS = 10_000

type SuccessBody = { success: true; data: { operation: string; result: number } }
type ErrorBody = { success: false; error: { code: string; message: string } }

export type RequestOptions = {
  /** Lets callers cancel a request (e.g. when a newer one supersedes it). */
  signal?: AbortSignal
  timeoutMs?: number
}

export function calculate(
  operation: BinaryOperation,
  a: number,
  b: number,
  options?: RequestOptions,
): Promise<number>
export function calculate(
  operation: UnaryOperation,
  a: number,
  b?: undefined,
  options?: RequestOptions,
): Promise<number>
export async function calculate(
  operation: Operation,
  a: number,
  b?: number,
  options: RequestOptions = {},
): Promise<number> {
  const body = operation === 'sqrt' ? { a } : { a, b }
  return post(`/api/v1/${operation}`, body, options)
}

async function post(path: string, body: unknown, options: RequestOptions): Promise<number> {
  const timeout = AbortSignal.timeout(options.timeoutMs ?? DEFAULT_TIMEOUT_MS)
  const signal = options.signal ? AbortSignal.any([options.signal, timeout]) : timeout

  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal,
    })
  } catch (err) {
    // Caller-initiated aborts are re-thrown untouched so callers can ignore them.
    if (options.signal?.aborted) throw err
    if (timeout.aborted) {
      throw new ApiError('timeout', 'The server took too long to respond.')
    }
    throw new ApiError('network_error', 'Could not reach the server.')
  }

  const payload = await readJson(response)

  if (isSuccessBody(payload)) {
    if (!response.ok || !Number.isFinite(payload.data.result)) {
      throw invalidResponse(response.status)
    }
    return payload.data.result
  }
  if (isErrorBody(payload)) {
    throw new ApiError(payload.error.code as ApiErrorCode, payload.error.message, response.status)
  }
  // The backend always answers in JSON. A 5xx without our envelope comes from
  // something in front of it (the Vite dev proxy, a gateway) that could not
  // reach it, so for the user the server is simply unreachable.
  if (response.status >= 500) {
    throw new ApiError('network_error', 'Could not reach the server.', response.status)
  }
  throw invalidResponse(response.status)
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json()
  } catch {
    return undefined
  }
}

function invalidResponse(status: number): ApiError {
  return new ApiError('invalid_response', 'The server sent an unexpected response.', status)
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isSuccessBody(value: unknown): value is SuccessBody {
  return (
    isObject(value) &&
    value.success === true &&
    isObject(value.data) &&
    typeof value.data.result === 'number'
  )
}

function isErrorBody(value: unknown): value is ErrorBody {
  return (
    isObject(value) &&
    value.success === false &&
    isObject(value.error) &&
    typeof value.error.code === 'string' &&
    typeof value.error.message === 'string'
  )
}
