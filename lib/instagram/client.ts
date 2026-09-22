import type { InstagramComment } from "@/types/giveaway";
import type { InstagramMedia } from "@/lib/instagram/provider";

export interface FetchCommentsResponse {
  provider: "meta";
  comments: InstagramComment[];
}

export class FetchCommentsError extends Error {}

// Cloudflare Workers (and Instagram's own API) can occasionally hang
// instead of erroring; give up after this long so the UI never shows an
// infinite spinner.
const REQUEST_TIMEOUT_MS = 30_000;

async function fetchWithTimeout(input: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new FetchCommentsError(
        "Запит зайняв надто багато часу. Перевірте з'єднання і спробуйте ще раз.",
      );
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function postComments(payload: { mediaId: string } | { url: string }) {
  const res = await fetchWithTimeout("/api/instagram/comments", {
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
  const res = await fetchWithTimeout("/api/instagram/media");

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
