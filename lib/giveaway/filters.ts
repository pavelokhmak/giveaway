import type {
  EligibilityResult,
  EntryMode,
  ExclusionReason,
  FilterStats,
  GiveawaySettings,
  InstagramComment,
  Participant,
} from "@/types/giveaway";

const MENTION_PATTERN = /@([a-zA-Z0-9_.]+)/g;

export function normalizeUsername(username: string): string {
  return username.trim().replace(/^@/, "").toLowerCase();
}

export function extractMentions(text: string): string[] {
  const matches = text.matchAll(MENTION_PATTERN);
  return Array.from(matches, (m) => normalizeUsername(m[1]));
}

/**
 * Builds the draw's entry pool from comments.
 *
 * - "unique": groups every comment by normalized username into a single
 *   participant, so each person gets exactly one entry.
 * - "per-comment": keeps every comment as its own entry, so a person who
 *   commented multiple times holds multiple raffle tickets and is more
 *   likely to be picked — but drawWinners() still caps each person at
 *   one prize, skipping their extra tickets once they've won.
 * - "per-mention": keeps one entry per @mention found inside a comment,
 *   so tagging more friends gives more chances. Comments with no
 *   mentions contribute no entries. Same one-prize-per-person cap.
 */
export function buildParticipants(
  comments: InstagramComment[],
  mode: EntryMode = "unique",
): Participant[] {
  if (mode === "per-comment") {
    return comments.map((comment) => ({
      username: comment.username.trim(),
      normalizedUsername: normalizeUsername(comment.username),
      comments: [comment],
    }));
  }

  if (mode === "per-mention") {
    const entries: Participant[] = [];
    for (const comment of comments) {
      const mentionCount = extractMentions(comment.text).length;
      for (let i = 0; i < mentionCount; i++) {
        entries.push({
          username: comment.username.trim(),
          normalizedUsername: normalizeUsername(comment.username),
          comments: [comment],
        });
      }
    }
    return entries;
  }

  const map = new Map<string, Participant>();

  for (const comment of comments) {
    const normalizedUsername = normalizeUsername(comment.username);
    const existing = map.get(normalizedUsername);
    if (existing) {
      existing.comments.push(comment);
    } else {
      map.set(normalizedUsername, {
        username: comment.username.trim(),
        normalizedUsername,
        comments: [comment],
      });
    }
  }

  return Array.from(map.values());
}

function commentMatchesKeyword(
  comment: InstagramComment,
  keyword: string,
  mode: "contains" | "exact",
): boolean {
  const text = comment.text.toLowerCase().trim();
  const target = keyword.toLowerCase().trim();
  if (mode === "exact") {
    return text
      .split(/\s+/)
      .some((word) => word.replace(/[^\p{L}\p{N}_]/gu, "") === target);
  }
  return text.includes(target);
}

/**
 * Evaluates every participant against the giveaway settings and returns
 * an eligibility verdict with the specific reasons for exclusion.
 */
export function filterParticipants(
  participants: Participant[],
  settings: GiveawaySettings,
  previousWinners: string[] = [],
): EligibilityResult[] {
  const excludedSet = new Set(
    settings.excludedUsernames.map((u) => normalizeUsername(u)),
  );
  const previousWinnerSet = new Set(
    previousWinners.map((u) => normalizeUsername(u)),
  );

  return participants.map((participant) => {
    const reasons: ExclusionReason[] = [];

    if (excludedSet.has(participant.normalizedUsername)) {
      reasons.push("Excluded username");
    }

    if (
      settings.excludePreviousWinners &&
      previousWinnerSet.has(participant.normalizedUsername)
    ) {
      reasons.push("Previous winner");
    }

    const matchingComments = participant.comments.filter((comment) => {
      if (
        settings.minimumCommentLength &&
        comment.text.trim().length < settings.minimumCommentLength
      ) {
        return false;
      }

      if (
        settings.keywordEnabled &&
        settings.keyword.trim().length > 0 &&
        !commentMatchesKeyword(comment, settings.keyword, settings.keywordMode)
      ) {
        return false;
      }

      if (settings.requireMention) {
        const mentions = extractMentions(comment.text);
        if (mentions.length < Math.max(1, settings.minimumMentions)) {
          return false;
        }
      }

      return true;
    });

    if (matchingComments.length === 0) {
      const anyTooShort =
        settings.minimumCommentLength !== undefined &&
        participant.comments.every(
          (c) => c.text.trim().length < settings.minimumCommentLength!,
        );
      const anyMissingKeyword =
        settings.keywordEnabled &&
        settings.keyword.trim().length > 0 &&
        !participant.comments.some((c) =>
          commentMatchesKeyword(c, settings.keyword, settings.keywordMode),
        );
      const anyMissingMention =
        settings.requireMention &&
        !participant.comments.some(
          (c) => extractMentions(c.text).length >= 1,
        );
      const anyNotEnoughMentions =
        settings.requireMention &&
        !anyMissingMention &&
        !participant.comments.some(
          (c) =>
            extractMentions(c.text).length >=
            Math.max(1, settings.minimumMentions),
        );

      if (anyTooShort) reasons.push("Comment too short");
      if (anyMissingKeyword) reasons.push("Keyword missing");
      if (anyMissingMention) reasons.push("Mention required");
      else if (anyNotEnoughMentions) reasons.push("Not enough mentions");
    }

    const eligible = reasons.length === 0;

    return {
      username: participant.username,
      normalizedUsername: participant.normalizedUsername,
      eligible,
      reasons,
      participant,
    };
  });
}

export function computeFilterStats(
  totalComments: number,
  results: EligibilityResult[],
): FilterStats {
  const eligibleParticipants = results.filter((r) => r.eligible).length;
  return {
    totalComments,
    uniqueParticipants: results.length,
    eligibleParticipants,
    excludedParticipants: results.length - eligibleParticipants,
  };
}

const REASON_LABELS_UK: Record<ExclusionReason, string> = {
  "Keyword missing": "Немає ключового слова",
  "Mention required": "Потрібна відмітка",
  "Not enough mentions": "Замало відміток",
  "Excluded username": "У списку виключених",
  "Previous winner": "Вже переможець",
  "Comment too short": "Закороткий коментар",
};

export function reasonLabelUk(reason: ExclusionReason): string {
  return REASON_LABELS_UK[reason];
}
