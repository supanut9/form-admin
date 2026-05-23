/**
 * Server-side session management for form-admin.
 *
 * The session is stored as a single httpOnly cookie `forms_session` whose
 * value is the form-api session JWT (HS256, 15-min TTL).
 *
 * getSession()
 *   Reads the cookie and calls /admin/session/me on form-api to validate the
 *   token and return the session principal. Returns null if the cookie is
 *   missing or form-api rejects it. Memoized per React render via `cache()`.
 */
import { cookies } from 'next/headers'
import { cache } from 'react'

export const SESSION_COOKIE = 'forms_session'

const FORM_API_URL = process.env['NEXT_PUBLIC_FORM_API_URL'] ?? 'http://localhost:4200'

export interface SessionAccount {
  sub: string
  roles: string[]
  sid: string
}

export const getSession = cache(async (): Promise<SessionAccount | null> => {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (!token) return null

  let res: Response
  try {
    res = await fetch(`${FORM_API_URL}/admin/session/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    })
  } catch {
    return null
  }

  if (!res.ok) return null

  const data = (await res.json()) as {
    sub: string
    roles: string[]
    sid: string
  }

  return { sub: data.sub, roles: data.roles, sid: data.sid }
})

export async function setSessionCookie(token: string, expiresAt: string): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env['NODE_ENV'] === 'production',
    sameSite: 'lax',
    path: '/',
    expires: new Date(expiresAt),
  })
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE)
}
