/**
 * safeReturnTo — guard against open-redirect attacks.
 *
 * Ported from language-web/src/app/auth/login/route.ts with modifications
 * for form-admin's origin.
 *
 * A returnTo value is safe if it is either:
 *   1. A path-relative URL (starts with "/" but not "//"), OR
 *   2. An absolute URL whose origin matches one of the allowed origins.
 *
 * Any value that fails these checks falls back to the defaultPath.
 */

const ALLOWED_ORIGINS: string[] = [
  process.env['NEXT_PUBLIC_FORM_ADMIN_ORIGIN'] ?? 'http://localhost:4201',
]

/**
 * Validate and return a safe returnTo value.
 * Returns defaultPath if the value is missing, suspicious, or cross-origin.
 */
export function safeReturnTo(value: string | null | undefined, defaultPath = '/'): string {
  if (!value) return defaultPath

  // Relative path: must start with "/" but not "//" (protocol-relative)
  if (value.startsWith('/') && !value.startsWith('//')) {
    return value
  }

  // Absolute URL: parse and check origin
  try {
    const url = new URL(value)
    if (ALLOWED_ORIGINS.includes(url.origin)) {
      return value
    }
  } catch {
    // Not a valid URL — reject it
  }

  return defaultPath
}
