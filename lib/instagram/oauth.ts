import "server-only";
import type { InstagramSession } from "@/lib/instagram/session";

const AUTHORIZE_URL = "https://www.instagram.com/oauth/authorize";
const TOKEN_URL = "https://api.instagram.com/oauth/access_token";
const LONG_LIVED_TOKEN_URL = "https://graph.instagram.com/access_token";

const SCOPES = [
  "instagram_business_basic",
  "instagram_business_manage_comments",
].join(",");

export class InstagramOAuthError extends Error {}

function requireEnv(name: "INSTAGRAM_APP_ID" | "INSTAGRAM_APP_SECRET"): string {
  const value = process.env[name];
  if (!value || value.trim().length === 0) {
    throw new InstagramOAuthError(
      `${name} не налаштовано на сервері. Створіть застосунок у Meta for Developers і додайте його дані в .env.`,
    );
  }
  return value;
}

export function getAuthorizeUrl(redirectUri: string, state: string): string {
  const appId = requireEnv("INSTAGRAM_APP_ID");
  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: SCOPES,
    state,
  });
  return `${AUTHORIZE_URL}?${params.toString()}`;
}

interface ShortLivedTokenResponse {
  access_token: string;
  user_id: string;
}

interface LongLivedTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

/**
 * Exchanges the OAuth `code` for a short-lived token, then immediately
 * upgrades it to a 60-day long-lived token so the person doesn't have to
 * re-authorize every hour.
 */
export async function exchangeCodeForSession(
  code: string,
  redirectUri: string,
): Promise<InstagramSession> {
  const appId = requireEnv("INSTAGRAM_APP_ID");
  const appSecret = requireEnv("INSTAGRAM_APP_SECRET");

  const shortLivedRes = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: appId,
      client_secret: appSecret,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
      code,
    }),
  });

  if (!shortLivedRes.ok) {
    throw new InstagramOAuthError("Instagram відхилив код авторизації.");
  }

  const shortLived = (await shortLivedRes.json()) as ShortLivedTokenResponse;

  const longLivedParams = new URLSearchParams({
    grant_type: "ig_exchange_token",
    client_secret: appSecret,
    access_token: shortLived.access_token,
  });

  const longLivedRes = await fetch(`${LONG_LIVED_TOKEN_URL}?${longLivedParams.toString()}`);

  if (!longLivedRes.ok) {
    throw new InstagramOAuthError("Не вдалося отримати довгостроковий токен Instagram.");
  }

  const longLived = (await longLivedRes.json()) as LongLivedTokenResponse;

  return {
    accessToken: longLived.access_token,
    userId: shortLived.user_id,
    expiresAt: Date.now() + longLived.expires_in * 1000,
  };
}
