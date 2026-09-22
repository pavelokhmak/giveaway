import type { InstagramComment } from "@/types/giveaway";

export interface FetchCommentsResponse {
  provider: "meta" | "demo";
  comments: InstagramComment[];
}

export class FetchCommentsError extends Error {}

export async function fetchComments(url: string): Promise<FetchCommentsResponse> {
  const res = await fetch("/api/instagram/comments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });

  let body: { comments?: InstagramComment[]; provider?: "meta" | "demo"; error?: string };
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

  return { provider: body.provider ?? "demo", comments: body.comments };
}
