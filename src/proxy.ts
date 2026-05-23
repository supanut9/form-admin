/**
 * Next.js 16 middleware (exported as `proxy`).
 *
 * Auth gate for admin routes:
 *  - /auth/login, /auth/login/start, /auth/callback are public — pass through.
 *  - All other routes under the app: check for forms_session cookie.
 *  - If the cookie is absent, redirect to /auth/login with return_to param.
 *
 * Note: We intentionally do NOT verify the JWT in middleware (edge runtime
 * cannot import Node.js crypto). We trust the presence of the httpOnly cookie
 * here; the server-side layout.tsx calls getSession() → /v1/auth/me for full
 * validation (including expiry and account status).
 *
 * Wave 2 / Lane L5 will harden this with full OIDC session verification.
 */
import { NextRequest, NextResponse } from 'next/server';

// Public paths that bypass the session check
const PUBLIC_PATHS = ['/auth/login', '/auth/callback'];

// Must match SESSION_COOKIE in src/lib/session.ts
const SESSION_COOKIE = 'forms_session';

export function proxy(req: NextRequest): NextResponse {
  const { pathname } = req.nextUrl;

  // Allow auth routes through unconditionally
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const hasSession = req.cookies.has(SESSION_COOKIE);

  if (!hasSession) {
    const loginUrl = new URL('/auth/login', req.url);
    loginUrl.searchParams.set(
      'return_to',
      pathname + req.nextUrl.search,
    );
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Only gate the admin UI surface. /auth/*, /api/*, static assets pass through.
  matcher: ['/admin/:path*'],
};
