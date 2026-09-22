import type { InstagramComment } from "@/types/giveaway";

export interface InstagramProvider {
  readonly name: "meta" | "demo";
  getComments(url: string): Promise<InstagramComment[]>;
}

export class InstagramProviderError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "invalid_url"
      | "not_found"
      | "unauthorized"
      | "rate_limited"
      | "network_error"
      | "unknown",
  ) {
    super(message);
    this.name = "InstagramProviderError";
  }
}
