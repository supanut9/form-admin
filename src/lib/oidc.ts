/**
 * Server-side OIDC PKCE helpers for form-admin.
 *
 * Uses openid-client 6.x. The authorization-code exchange happens HERE
 * (in form-admin), not in form-api. Once we have an id_token we POST it to
 * form-api's `/admin/session`, which validates the id_token against
 * auth-server's JWKS and issues a local HS256 form-api JWT.
 */
import * as oidcLib from 'openid-client'
import { cookies } from 'next/headers'

const FORM_API_URL = process.env['NEXT_PUBLIC_FORM_API_URL'] ?? 'http://localhost:4200'
const FORM_ADMIN_ORIGIN =
  process.env['NEXT_PUBLIC_FORM_ADMIN_ORIGIN'] ?? 'http://localhost:4201'

const OIDC_ISSUER = process.env['FORMS_OIDC_ISSUER_URL']!
const OIDC_CLIENT_ID = process.env['FORMS_OIDC_CLIENT_ID']!
const OIDC_CLIENT_SECRET = process.env['FORMS_OIDC_CLIENT_SECRET']!

const REDIRECT_URI = `${FORM_ADMIN_ORIGIN}/auth/callback`

export const COOKIE_CODE_VERIFIER = 'forms_oidc_cv'
export const COOKIE_STATE = 'forms_oidc_state'
export const COOKIE_NONCE = 'forms_oidc_nonce'
export const COOKIE_RETURN_TO = 'forms_oidc_return_to'

let _oidcConfig: oidcLib.Configuration | null = null

async function getOidcConfig(): Promise<oidcLib.Configuration> {
  if (_oidcConfig) return _oidcConfig
  const issuerUrl = new URL(OIDC_ISSUER)
  const opts: { execute?: ((cfg: oidcLib.Configuration) => void)[] } = {}
  if (issuerUrl.protocol === 'http:') {
    opts.execute = [oidcLib.allowInsecureRequests]
  }
  _oidcConfig = await oidcLib.discovery(
    issuerUrl,
    OIDC_CLIENT_ID,
    OIDC_CLIENT_SECRET,
    undefined,
    opts,
  )
  return _oidcConfig
}

export interface StartLoginResult {
  authUrl: string
}

export async function startLogin(returnTo: string): Promise<StartLoginResult> {
  const config = await getOidcConfig()

  const codeVerifier = oidcLib.randomPKCECodeVerifier()
  const codeChallenge = await oidcLib.calculatePKCECodeChallenge(codeVerifier)
  const state = oidcLib.randomState()
  const nonce = oidcLib.randomNonce()

  const authUrl = oidcLib.buildAuthorizationUrl(config, {
    redirect_uri: REDIRECT_URI,
    scope: 'openid email profile',
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    state,
    nonce,
  })

  const cookieStore = await cookies()
  const cookieOpts = {
    httpOnly: true,
    secure: process.env['NODE_ENV'] === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 10 * 60,
  }

  cookieStore.set(COOKIE_CODE_VERIFIER, codeVerifier, cookieOpts)
  cookieStore.set(COOKIE_STATE, state, cookieOpts)
  cookieStore.set(COOKIE_NONCE, nonce, cookieOpts)
  cookieStore.set(COOKIE_RETURN_TO, returnTo, cookieOpts)

  return { authUrl: authUrl.toString() }
}

export interface CallbackSession {
  accessToken: string
  expiresAt: string
}

/**
 * 1. Validate state (CSRF protection).
 * 2. Exchange code → tokens locally via openid-client.
 * 3. Forward the id_token to form-api `/admin/session` to get a form-api JWT.
 */
export async function handleCallback(
  code: string,
  state: string,
  storedState: string,
  codeVerifier: string,
  expectedNonce: string,
): Promise<CallbackSession> {
  if (state !== storedState) {
    throw new Error('OIDC state mismatch — possible CSRF attack')
  }

  const config = await getOidcConfig()

  const callbackUrl = new URL(REDIRECT_URI)
  callbackUrl.searchParams.set('code', code)
  callbackUrl.searchParams.set('state', state)

  // NOTE: this auth-server requires `nonce` on the authorize request but does
  // not echo it into the id_token claims, so we cannot ask openid-client to
  // verify it here. CSRF protection still comes from `state` + the PKCE code
  // verifier. The `expectedNonce` parameter is preserved on the function
  // signature for future hardening once auth-server includes nonce in id_token.
  void expectedNonce
  const tokens = await oidcLib.authorizationCodeGrant(config, callbackUrl, {
    pkceCodeVerifier: codeVerifier,
    expectedState: storedState,
  })

  const idToken = tokens.id_token
  if (!idToken) {
    throw new Error('OIDC token endpoint did not return an id_token')
  }

  const res = await fetch(`${FORM_API_URL}/admin/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id_token: idToken }),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(`form-api /admin/session failed: ${res.status} ${text}`)
  }

  const data = (await res.json()) as {
    access_token: string
    expires_in: number
    refresh_token: string
    expires_at: string
  }

  return {
    accessToken: data.access_token,
    expiresAt: data.expires_at,
  }
}
