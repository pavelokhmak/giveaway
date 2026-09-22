import { z } from "zod";

const INSTAGRAM_URL_PATTERN =
  /^https?:\/\/(www\.)?instagram\.com\/(p|reel)\/([A-Za-z0-9_-]+)\/?(\?.*)?$/i;

export const instagramUrlSchema = z
  .string()
  .trim()
  .min(1, "Введіть посилання на пост в Instagram.")
  .regex(
    INSTAGRAM_URL_PATTERN,
    "Це не схоже на дійсне посилання на пост або reels в Instagram.",
  );

export interface ParsedInstagramUrl {
  shortcode: string;
  type: "p" | "reel";
  url: string;
}

export interface ParseInstagramUrlSuccess {
  success: true;
  data: ParsedInstagramUrl;
}

export interface ParseInstagramUrlFailure {
  success: false;
  error: string;
}

export type ParseInstagramUrlResult =
  | ParseInstagramUrlSuccess
  | ParseInstagramUrlFailure;

export function parseInstagramUrl(url: string): ParseInstagramUrlResult {
  const result = instagramUrlSchema.safeParse(url);

  if (!result.success) {
    return {
      success: false,
      error: result.error.issues[0]?.message ?? "Недійсне посилання на Instagram.",
    };
  }

  const match = result.data.match(INSTAGRAM_URL_PATTERN);

  if (!match) {
    return { success: false, error: "Недійсне посилання на Instagram." };
  }

  const [, , type, shortcode] = match;

  return {
    success: true,
    data: {
      shortcode,
      type: type.toLowerCase() as "p" | "reel",
      url: result.data,
    },
  };
}
