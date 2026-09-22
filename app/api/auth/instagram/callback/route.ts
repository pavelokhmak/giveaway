import { NextRequest, NextResponse } from "next/server";

import { exchangeCodeForSession, InstagramOAuthError } from "@/lib/instagram/oauth";
import {
  OAUTH_STATE_COOKIE_NAME,
  SESSION_COOKIE_NAME,
  sessionCookieOptions,
} from "@/lib/instagram/session";

function redirectWithError(origin: string, message: string) {
  return NextResponse.redirect(
    new URL(`/?auth_error=${encodeURIComponent(message)}`, origin),
  );
}

export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;

  const oauthError = request.nextUrl.searchParams.get("error_description");
  if (oauthError) {
    return redirectWithError(origin, oauthError);
  }

  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const expectedState = request.cookies.get(OAUTH_STATE_COOKIE_NAME)?.value;

  if (!code || !state || !expectedState || state !== expectedState) {
    return redirectWithError(origin, "Сесія входу застаріла. Спробуйте ще раз.");
  }

  const redirectUri = new URL(
    "/api/auth/instagram/callback",
    origin,
  ).toString();

  try {
    const session = await exchangeCodeForSession(code, redirectUri);
    const response = NextResponse.redirect(new URL("/connect", origin));
    response.cookies.set(
      SESSION_COOKIE_NAME,
      JSON.stringify(session),
      sessionCookieOptions(session),
    );
    response.cookies.delete(OAUTH_STATE_COOKIE_NAME);
    return response;
  } catch (error) {
    const message =
      error instanceof InstagramOAuthError
        ? error.message
        : "Не вдалося увійти через Instagram.";
    return redirectWithError(origin, message);
  }
}
