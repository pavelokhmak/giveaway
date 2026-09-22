import { NextRequest, NextResponse } from "next/server";

import { getAuthorizeUrl, InstagramOAuthError } from "@/lib/instagram/oauth";
import { OAUTH_STATE_COOKIE_NAME } from "@/lib/instagram/session";

export async function GET(request: NextRequest) {
  const redirectUri = new URL(
    "/api/auth/instagram/callback",
    request.nextUrl.origin,
  ).toString();
  const state = crypto.randomUUID();

  let authorizeUrl: string;
  try {
    authorizeUrl = getAuthorizeUrl(redirectUri, state);
  } catch (error) {
    const message =
      error instanceof InstagramOAuthError
        ? error.message
        : "Не вдалося почати вхід через Instagram.";
    return NextResponse.redirect(
      new URL(`/?auth_error=${encodeURIComponent(message)}`, request.nextUrl.origin),
    );
  }

  const response = NextResponse.redirect(authorizeUrl);
  response.cookies.set(OAUTH_STATE_COOKIE_NAME, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return response;
}
