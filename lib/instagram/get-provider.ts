import "server-only";

import type { InstagramProvider } from "@/lib/instagram/provider";
import { InstagramProviderError } from "@/lib/instagram/provider";
import { MetaInstagramProvider } from "@/lib/instagram/meta-provider";

/**
 * Server-only factory. Previously fell back to fake demo comments
 * whenever Meta credentials weren't configured — that was silent and
 * misleading (real users pasting a real URL would get fabricated
 * comments with no indication they weren't real). Now it fails loudly
 * with a clear, actionable error instead.
 */
export function getInstagramProvider(): InstagramProvider {
  const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;

  if (!accessToken || accessToken.trim().length === 0) {
    throw new InstagramProviderError(
      "Доступ до Instagram API ще не налаштовано. Потрібно додати INSTAGRAM_ACCESS_TOKEN у налаштуваннях сервера.",
      "unauthorized",
    );
  }

  return new MetaInstagramProvider(accessToken);
}
