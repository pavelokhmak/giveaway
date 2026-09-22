import type { InstagramComment } from "@/types/giveaway";
import type { InstagramMedia } from "@/lib/instagram/provider";

export interface FetchCommentsResponse {
  provider: "meta";
  comments: InstagramComment[];
}

export class FetchCommentsError extends Error {}

async function postComments(payload: { mediaId: string } | { url: string }) {
  const res = await fetch("/api/instagram/comments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  let body: { comments?: InstagramComment[]; provider?: "meta"; error?: string };
  try {
    body = await res.json();
  } catch {
    throw new FetchCommentsError("Unexpected response from the server.");
  }

  if (!res.ok || !body.comments) {
    throw new FetchCommentsError(
      body.error ?? "Something went wrong while fetching comments.",
    );
  }

  return { provider: "meta" as const, comments: body.comments };
}

export function fetchCommentsByMediaId(mediaId: string): Promise<FetchCommentsResponse> {
  return postComments({ mediaId });
}

export function fetchCommentsByUrl(url: string): Promise<FetchCommentsResponse> {
  return postComments({ url });
}

export interface FetchMediaResponse {
  media: InstagramMedia[];
}

export async function fetchRecentMedia(): Promise<InstagramMedia[]> {
  const res = await fetch("/api/instagram/media");

  let body: { media?: InstagramMedia[]; error?: string };
  try {
    body = await res.json();
  } catch {
    throw new FetchCommentsError("Unexpected response from the server.");
  }

  if (!res.ok || !body.media) {
    throw new FetchCommentsError(
      body.error ?? "Не вдалося завантажити ваші публікації.",
    );
  }

  return body.media;
}
