/**
 * form-client — typed HTTP client for form-api.
 *
 * Server-side: reads the forms_session cookie via next/headers and
 * forwards it as Authorization: Bearer <token>.
 * Client-side: relies on the session cookie being included automatically
 * by the browser (same-site, httpOnly). We do not expose the token to JS.
 */

// Server-side: hit form-api directly with a forwarded Bearer header.
// Browser-side: go through the same-origin Next API proxy (/api/proxy/*) so
// the httpOnly forms_session cookie travels with the request.
const BASE_URL =
  typeof window !== 'undefined'
    ? '/api/proxy'
    : (process.env['NEXT_PUBLIC_FORM_API_URL'] ?? 'http://localhost:4200')

const SESSION_COOKIE = 'forms_session'

export interface ApiError extends Error {
  status: number
  /** Parsed JSON body when the server replied JSON, otherwise null. */
  body: unknown
}

type RequestOptions = Omit<RequestInit, 'method' | 'body'> & {
  body?: unknown
}

async function buildAuthHeader(): Promise<Record<string, string>> {
  // Server-side only: read cookie from next/headers
  if (typeof window === 'undefined') {
    try {
      const { cookies } = await import('next/headers')
      const store = await cookies()
      const token = store.get(SESSION_COOKIE)?.value
      if (token) return { Authorization: `Bearer ${token}` }
    } catch {
      // Not in a Next.js server context — proceed without header
    }
  }
  return {}
}

async function request<T>(method: string, path: string, options: RequestOptions = {}): Promise<T> {
  const { body, headers: extraHeaders, ...rest } = options
  const authHeader = await buildAuthHeader()

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...authHeader,
      ...(extraHeaders as Record<string, string> | undefined),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    ...rest,
  })

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    let parsed: unknown = null
    try {
      parsed = JSON.parse(text)
    } catch {
      // not JSON
    }
    const err = new Error(`form-api ${method} ${path} → ${res.status}: ${text}`) as ApiError
    err.status = res.status
    err.body = parsed
    throw err
  }

  // 204 No Content
  if (res.status === 204) return undefined as unknown as T

  return res.json() as Promise<T>
}

export const formClient = {
  get: <T>(path: string, options?: RequestOptions) => request<T>('GET', path, options),
  post: <T>(path: string, options?: RequestOptions) => request<T>('POST', path, options),
  patch: <T>(path: string, options?: RequestOptions) => request<T>('PATCH', path, options),
  put: <T>(path: string, options?: RequestOptions) => request<T>('PUT', path, options),
  del: <T>(path: string, options?: RequestOptions) => request<T>('DELETE', path, options),
}
