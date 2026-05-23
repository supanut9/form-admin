/**
 * GET /auth/login/start
 *
 * Initiates the OIDC authorization code + PKCE flow by:
 *  1. Reading and validating the ?return_to query param via safeReturnTo().
 *  2. Calling startLogin(returnTo) to build the auth URL and set PKCE cookies.
 *  3. 302-redirecting the browser to auth-server's authorization endpoint.
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { startLogin } from "@/lib/oidc";
import { safeReturnTo } from "@/lib/safe-return-to";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const returnTo = safeReturnTo(
    request.nextUrl.searchParams.get("return_to"),
    "/forms",
  );

  const { authUrl } = await startLogin(returnTo);

  return NextResponse.redirect(authUrl);
}
