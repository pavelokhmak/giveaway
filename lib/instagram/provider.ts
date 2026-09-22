import type { InstagramComment } from "@/types/giveaway";

export interface InstagramMedia {
  id: string;
  caption: string;
  permalink: string;
  createdAt: string;
  thumbnailUrl?: string;
}

export interface InstagramProvider {
  readonly name: "meta";
  getComments(url: string): Promise<InstagramComment[]>;
  getCommentsByMediaId(mediaId: string): Promise<InstagramComment[]>;
  getRecentMedia(limit?: number): Promise<InstagramMedia[]>;
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
