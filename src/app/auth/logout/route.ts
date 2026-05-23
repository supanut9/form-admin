/**
 * GET /auth/logout
 *
 *  1. Reads the session token from the forms_session cookie.
 *  2. Calls form-api POST /v1/auth/logout to acknowledge server-side logout.
 *  3. Clears the session cookie.
 *  4. 302-redirects to /auth/login.
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE, clearSessionCookie } from "@/lib/session";

const FORM_API_URL =
  process.env["NEXT_PUBLIC_FORM_API_URL"] ?? "http://localhost:4200";
const FORM_ADMIN_ORIGIN =
  process.env["NEXT_PUBLIC_FORM_ADMIN_ORIGIN"] ?? "http://localhost:4201";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  // Best-effort: call form-api logout (don't fail hard if it doesn't respond)
  if (token) {
    try {
      await fetch(`${FORM_API_URL}/admin/session/logout`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
    } catch {
      // Ignore network failures — we still clear the local cookie
    }
  }

  await clearSessionCookie();

  return NextResponse.redirect(new URL("/auth/login", FORM_ADMIN_ORIGIN));
}
