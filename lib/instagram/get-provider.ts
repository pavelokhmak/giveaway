import "server-only";

import type { InstagramProvider } from "@/lib/instagram/provider";
import { DemoInstagramProvider } from "@/lib/instagram/demo-provider";
import { MetaInstagramProvider } from "@/lib/instagram/meta-provider";

/**
 * Server-only factory. Falls back to the demo provider whenever Meta
 * credentials aren't configured, so the app always works out of the box.
 */
export function getInstagramProvider(): InstagramProvider {
  const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;

  if (accessToken && accessToken.trim().length > 0) {
    return new MetaInstagramProvider(accessToken);
  }

  return new DemoInstagramProvider();
}
