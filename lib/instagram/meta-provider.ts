import type { InstagramComment } from "@/types/giveaway";
import type { InstagramProvider } from "@/lib/instagram/provider";
import { InstagramProviderError } from "@/lib/instagram/provider";
import { parseInstagramUrl } from "@/lib/validations/instagram";

interface MetaCommentNode {
  id: string;
  text: string;
  username: string;
  timestamp: string;
  from?: { id?: string; username?: string };
}

interface MetaCommentsResponse {
  data: MetaCommentNode[];
  paging?: { next?: string };
}

/**
 * Talks to the Meta Graph API's IG Comments endpoint. Requires a
 * long-lived access token for a connected Instagram Business/Creator
 * account (Meta's API only returns comments for media you manage, not
 * arbitrary public posts). Credentials are read server-side only, never
 * exposed to the client.
 */
export class MetaInstagramProvider implements InstagramProvider {
  readonly name = "meta" as const;

  constructor(
    private readonly accessToken: string,
    private readonly graphBaseUrl = "https://graph.facebook.com/v21.0",
  ) {}

  async getComments(url: string): Promise<InstagramComment[]> {
    const parsed = parseInstagramUrl(url);
    if (!parsed.success) {
      throw new InstagramProviderError(parsed.error, "invalid_url");
    }

    const mediaId = await this.resolveMediaId(parsed.data.shortcode);
    return this.fetchAllComments(mediaId);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async resolveMediaId(shortcode: string): Promise<string> {
    // The Graph API has no public "lookup by shortcode" endpoint; in
    // production this would map a shortcode to a media id from the
    // connected account's own media list. Left as a clear extension
    // point since it depends on which IG account is connected.
    throw new InstagramProviderError(
      "Щоб визначити пост за посиланням, потрібно зіставити його з ID медіа зі списку публікацій підключеного акаунта.",
      "not_found",
    );
  }

  private async fetchAllComments(mediaId: string): Promise<InstagramComment[]> {
    const comments: InstagramComment[] = [];
    let after: string | undefined;

    do {
      const params = new URLSearchParams({
        fields: "id,text,username,timestamp,from",
        access_token: this.accessToken,
      });
      if (after) params.set("after", after);

      const res = await fetch(
        `${this.graphBaseUrl}/${mediaId}/comments?${params.toString()}`,
      );

      if (res.status === 401 || res.status === 403) {
        throw new InstagramProviderError(
          "Дані доступу Instagram API відхилено.",
          "unauthorized",
        );
      }
      if (res.status === 429) {
        throw new InstagramProviderError(
          "Перевищено ліміт запитів Instagram API. Спробуйте трохи пізніше.",
          "rate_limited",
        );
      }
      if (!res.ok) {
        throw new InstagramProviderError(
          "Instagram API повернув неочікувану помилку.",
          "unknown",
        );
      }

      const body = (await res.json()) as MetaCommentsResponse;

      for (const node of body.data) {
        comments.push({
          id: node.id,
          username: node.username ?? node.from?.username ?? "unknown",
          text: node.text,
          createdAt: node.timestamp,
          userId: node.from?.id,
        });
      }

      const nextUrl = body.paging?.next;
      after = nextUrl
        ? new URL(nextUrl).searchParams.get("after") ?? undefined
        : undefined;
    } while (after);

    return comments;
  }
}
