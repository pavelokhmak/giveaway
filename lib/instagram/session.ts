import "server-only";

export const SESSION_COOKIE_NAME = "ig_session";
export const OAUTH_STATE_COOKIE_NAME = "ig_oauth_state";

export interface InstagramSession {
  accessToken: string;
  userId: string;
  expiresAt: number;
}

interface CookieStore {
  get(name: string): { value: string } | undefined;
}

/**
 * Reads and validates the Instagram session cookie. Returns null if it's
 * missing, malformed, or expired — callers should treat that as "not
 * logged in" and prompt a fresh login rather than erroring. Accepts
 * either a Route Handler's `request.cookies` or a Server Component's
 * `cookies()` from `next/headers` — both share this shape.
 */
export function readSession(cookieStore: CookieStore): InstagramSession | null {
  const raw = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<InstagramSession>;
    if (!parsed.accessToken || !parsed.userId || !parsed.expiresAt) return null;
    if (parsed.expiresAt < Date.now()) return null;
    return parsed as InstagramSession;
  } catch {
    return null;
  }
}

export function sessionCookieOptions(session: InstagramSession) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: Math.max(0, Math.floor((session.expiresAt - Date.now()) / 1000)),
  };
}
