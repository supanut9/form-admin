/**
 * GET /auth/callback
 *
 * OIDC authorization code callback handler.
 *  1. Reads ?code= and ?state= from the query string.
 *  2. Reads code_verifier, expected state, and return_to from httpOnly cookies.
 *  3. Calls handleCallback() which delegates the code exchange to form-api.
 *  4. Stores the form-api session JWT in the forms_session cookie.
 *  5. Clears the PKCE / state cookies.
 *  6. 302-redirects to the original return_to URL.
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { cookies } from "next/headers";
import {
  handleCallback,
  COOKIE_CODE_VERIFIER,
  COOKIE_STATE,
  COOKIE_NONCE,
  COOKIE_RETURN_TO,
} from "@/lib/oidc";
import { setSessionCookie } from "@/lib/session";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  if (!code || !state) {
    return NextResponse.redirect(
      new URL("/auth/login?error=missing_params", request.url),
    );
  }

  const cookieStore = await cookies();
  const storedState = cookieStore.get(COOKIE_STATE)?.value;
  const codeVerifier = cookieStore.get(COOKIE_CODE_VERIFIER)?.value;
  const nonce = cookieStore.get(COOKIE_NONCE)?.value;
  const returnTo = cookieStore.get(COOKIE_RETURN_TO)?.value ?? "/forms";

  if (!storedState || !codeVerifier || !nonce) {
    return NextResponse.redirect(
      new URL("/auth/login?error=missing_pkce", request.url),
    );
  }

  let session: Awaited<ReturnType<typeof handleCallback>>;
  try {
    session = await handleCallback(code, state, storedState, codeVerifier, nonce);
  } catch (err) {
    console.error("[auth/callback] handleCallback failed:", err);
    return NextResponse.redirect(
      new URL("/auth/login?error=callback_failed", request.url),
    );
  }

  // Store the form-api session JWT in a secure httpOnly cookie
  await setSessionCookie(session.accessToken, session.expiresAt);

  // Clear the PKCE / state cookies — they are single-use
  cookieStore.delete(COOKIE_CODE_VERIFIER);
  cookieStore.delete(COOKIE_STATE);
  cookieStore.delete(COOKIE_NONCE);
  cookieStore.delete(COOKIE_RETURN_TO);

  // Redirect to original destination (already validated as safe during startLogin)
  const destination = returnTo.startsWith("/")
    ? new URL(returnTo, request.url)
    : new URL(returnTo);

  return NextResponse.redirect(destination);
}
