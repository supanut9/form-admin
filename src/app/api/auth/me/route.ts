/**
 * GET /api/auth/me
 *
 * Client-side helper: returns the current session principal as JSON or 401
 * if the user is not logged in. Thin wrapper over getSession() (which itself
 * proxies to form-api `/admin/session/me`).
 */
import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'

export async function GET(): Promise<NextResponse> {
  const session = await getSession()
  if (!session) {
    return NextResponse.json(
      { error: { code: 'unauthorized', message: 'No active session' } },
      { status: 401 },
    )
  }
  return NextResponse.json(session)
}
