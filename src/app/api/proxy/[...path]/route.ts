/**
 * Generic form-api proxy for client-side calls.
 *
 * Browser → /api/proxy/admin/forms (same origin, cookie included)
 *          → reads forms_session cookie server-side
 *          → forwards to form-api with Authorization: Bearer <token>
 *
 * Avoids cross-origin cookie issues while keeping the session httpOnly.
 */
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

const FORM_API_URL =
  process.env["NEXT_PUBLIC_FORM_API_URL"] ?? "http://localhost:4200";

const SESSION_COOKIE = "forms_session";

type Ctx = { params: Promise<{ path: string[] }> };

async function handler(request: NextRequest, ctx: Ctx) {
  const { path } = await ctx.params;
  const url = `${FORM_API_URL}/${path.join("/")}${request.nextUrl.search}`;

  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  const headers: Record<string, string> = {};
  const ct = request.headers.get("content-type");
  if (ct) headers["content-type"] = ct;
  if (token) headers["authorization"] = `Bearer ${token}`;

  const init: RequestInit = {
    method: request.method,
    headers,
    cache: "no-store",
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = await request.text();
  }

  const upstream = await fetch(url, init);
  const body = await upstream.arrayBuffer();
  const res = new NextResponse(body, { status: upstream.status });
  upstream.headers.forEach((v, k) => {
    if (k === "content-encoding" || k === "transfer-encoding") return;
    res.headers.set(k, v);
  });
  return res;
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
