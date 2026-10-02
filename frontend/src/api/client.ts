// A thin wrapper around fetch() for talking to the backend.
// All paths are relative to /api, which Vite forwards to FastAPI in dev.

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

// `<T>` is a generic type parameter, like Python's TypeVar: the caller says
// what type the response JSON should be, e.g. apiGet<MuscleGroup[]>(...).
// `Promise<T>` is TypeScript's version of an awaitable that resolves to T.
async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const response = await fetch(`/api${path}`, {
    method,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  if (!response.ok) {
    throw new ApiError(response.status, await errorMessage(response))
  }
  if (response.status === 204) {
    return undefined as T // e.g. DELETE: no body
  }
  return (await response.json()) as T
}

// FastAPI errors look like {"detail": "..."} (or a list of validation errors).
async function errorMessage(response: Response): Promise<string> {
  try {
    const data = await response.json()
    if (typeof data.detail === 'string') {
      return data.detail
    }
  } catch {
    // body wasn't JSON; fall through
  }
  return `Request failed (HTTP ${response.status})`
}

export function apiGet<T>(path: string): Promise<T> {
  return request<T>('GET', path)
}

export function apiPost<T>(path: string, body: unknown): Promise<T> {
  return request<T>('POST', path, body)
}

export function apiPatch<T>(path: string, body: unknown): Promise<T> {
  return request<T>('PATCH', path, body)
}

export function apiPut<T>(path: string, body: unknown): Promise<T> {
  return request<T>('PUT', path, body)
}

export function apiDelete(path: string): Promise<void> {
  return request<void>('DELETE', path)
}
