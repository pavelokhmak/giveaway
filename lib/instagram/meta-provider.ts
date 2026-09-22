import type { InstagramComment } from "@/types/giveaway";
import type { InstagramMedia, InstagramProvider } from "@/lib/instagram/provider";
import { InstagramProviderError } from "@/lib/instagram/provider";
import { parseInstagramUrl } from "@/lib/validations/instagram";

const GRAPH_BASE_URL = "https://graph.instagram.com/v23.0";
const MEDIA_SEARCH_PAGE_LIMIT = 8;
// Comments come in pages of 50; cap at 40 pages (~2000 comments, plenty
// for any giveaway) so a pagination quirk (or a genuinely huge comment
// count) can never hang the request indefinitely.
const COMMENTS_PAGE_LIMIT = 40;

interface MetaCommentNode {
  id: string;
  text: string;
  username: string;
  timestamp: string;
}

interface MetaCommentsResponse {
  data: MetaCommentNode[];
  paging?: { cursors?: { after?: string }; next?: string };
}

interface MetaMediaNode {
  id: string;
  caption?: string;
  permalink: string;
  timestamp: string;
  media_type: string;
  media_url?: string;
  thumbnail_url?: string;
}

interface MetaMediaResponse {
  data: MetaMediaNode[];
  paging?: { cursors?: { after?: string }; next?: string };
}

interface MetaErrorBody {
  error?: { message?: string; type?: string; code?: number; error_subcode?: number };
}

/**
 * Reads the Graph API's JSON error body (when present) and folds its
 * `message`/`code` into the thrown error, instead of a bare status code —
 * Meta's error messages are usually specific enough to act on directly
 * (bad scope, invalid media id, expired token, etc).
 */
async function mapError(res: Response): Promise<InstagramProviderError> {
  let detail = "";
  try {
    const body = (await res.json()) as MetaErrorBody;
    if (body.error?.message) {
      detail = ` (${body.error.message}${body.error.code ? `, code ${body.error.code}` : ""}${body.error.error_subcode ? `/${body.error.error_subcode}` : ""})`;
    }
  } catch {
    // response wasn't JSON — fall through with no extra detail
  }

  if (res.status === 401 || res.status === 403) {
    return new InstagramProviderError(
      `Доступ до Instagram відхилено. Увійдіть ще раз.${detail}`,
      "unauthorized",
    );
  }
  if (res.status === 429) {
    return new InstagramProviderError(
      `Перевищено ліміт запитів Instagram API. Спробуйте трохи пізніше.${detail}`,
      "rate_limited",
    );
  }
  return new InstagramProviderError(
    `Instagram API повернув неочікувану помилку.${detail}`,
    "unknown",
  );
}

/**
 * Talks to the Instagram Graph API ("Business Login for Instagram") on
 * behalf of the person who just authorized the app via OAuth. Meta's API
 * only returns comments for media the authorized account itself owns —
 * there is no way to fetch comments for someone else's post.
 */
export class MetaInstagramProvider implements InstagramProvider {
  readonly name = "meta" as const;

  constructor(
    private readonly accessToken: string,
    private readonly igUserId: string,
  ) {}

  async getComments(url: string): Promise<InstagramComment[]> {
    const parsed = parseInstagramUrl(url);
    if (!parsed.success) {
      throw new InstagramProviderError(parsed.error, "invalid_url");
    }

    const mediaId = await this.resolveMediaId(parsed.data.shortcode);
    return this.getCommentsByMediaId(mediaId);
  }

  async getCommentsByMediaId(mediaId: string): Promise<InstagramComment[]> {
    const comments: InstagramComment[] = [];
    let after: string | undefined;
    let page = 0;
    let firstPageRawText: string | null = null;

    do {
      const params = new URLSearchParams({
        fields: "id,text,username,timestamp",
        access_token: this.accessToken,
        limit: "50",
      });
      if (after) params.set("after", after);

      const res = await fetch(
        `${GRAPH_BASE_URL}/${mediaId}/comments?${params.toString()}`,
      );

      if (!res.ok) throw await mapError(res);

      const rawText = await res.text();
      if (page === 0) firstPageRawText = rawText;
      const body = JSON.parse(rawText) as MetaCommentsResponse;

      for (const node of body.data ?? []) {
        comments.push({
          id: node.id,
          username: node.username ?? "unknown",
          text: node.text,
          createdAt: node.timestamp,
        });
      }

      const nextAfter = body.paging?.cursors?.after;
      // Guard against a pagination quirk (the same/an unchanging cursor
      // coming back) looping forever.
      after = nextAfter && nextAfter !== after ? nextAfter : undefined;
      page++;
    } while (after && page < COMMENTS_PAGE_LIMIT);

    // Temporary diagnostic: Cloudflare's Observability logs aren't
    // surfacing console.log output, so when a post that should have
    // comments comes back empty, show Instagram's raw API response
    // directly in the on-screen error instead (mediaId + first page
    // body, no access token).
    if (comments.length === 0 && firstPageRawText) {
      throw new InstagramProviderError(
        `Instagram API не повернув коментарів. mediaId=${mediaId} raw=${firstPageRawText.slice(0, 600)}`,
        "not_found",
      );
    }

    return comments;
  }

  /**
   * The account's own recent posts, newest first — used to power the
   * "pick one of your posts" screen after login.
   */
  async getRecentMedia(limit = 25): Promise<InstagramMedia[]> {
    const params = new URLSearchParams({
      fields: "id,caption,permalink,timestamp,media_type,media_url,thumbnail_url",
      access_token: this.accessToken,
      limit: String(limit),
    });

    const res = await fetch(`${GRAPH_BASE_URL}/${this.igUserId}/media?${params.toString()}`);
    if (!res.ok) throw await mapError(res);

    const body = (await res.json()) as MetaMediaResponse;

    return body.data.map((node) => ({
      id: node.id,
      caption: node.caption ?? "",
      permalink: node.permalink,
      createdAt: node.timestamp,
      thumbnailUrl:
        node.media_type === "VIDEO" ? node.thumbnail_url : node.media_url,
    }));
  }

  /**
   * Matches a pasted post URL to a media id by searching the account's
   * own recent media for a matching permalink (the Graph API has no
   * direct "look up by shortcode" endpoint). Only searches a bounded
   * number of pages — very old posts may not be found this way, in
   * which case picking the post from the list is the reliable path.
   */
  private async resolveMediaId(shortcode: string): Promise<string> {
    let after: string | undefined;

    for (let page = 0; page < MEDIA_SEARCH_PAGE_LIMIT; page++) {
      const params = new URLSearchParams({
        fields: "id,permalink",
        access_token: this.accessToken,
        limit: "50",
      });
      if (after) params.set("after", after);

      const res = await fetch(`${GRAPH_BASE_URL}/${this.igUserId}/media?${params.toString()}`);
      if (!res.ok) throw await mapError(res);

      const body = (await res.json()) as MetaMediaResponse;
      const match = body.data.find((node) => node.permalink.includes(shortcode));
      if (match) return match.id;

      after = body.paging?.cursors?.after;
      if (!after) break;
    }

    throw new InstagramProviderError(
      "Цей пост не знайдено серед ваших публікацій. Оберіть його зі списку замість вставки посилання.",
      "not_found",
    );
  }
}
