export interface InstagramComment {
  id: string;
  username: string;
  text: string;
  createdAt: string;
  userId?: string;
}

export interface Participant {
  username: string;
  normalizedUsername: string;
  comments: InstagramComment[];
}

export type KeywordMode = "contains" | "exact";

/**
 * How comments are turned into draw entries:
 * - "unique": one entry per person, regardless of how many times they
 *   commented (a person can win at most once).
 * - "per-comment": every comment is its own entry, so someone who
 *   commented more often has more chances (like raffle tickets).
 * - "per-mention": every @mention inside a comment is its own entry, so
 *   tagging more friends gives more chances.
 */
export type EntryMode = "unique" | "per-comment" | "per-mention";

export interface GiveawaySettings {
  winnerCount: number;
  backupCount: number;
  entryMode: EntryMode;
  keywordEnabled: boolean;
  keyword: string;
  keywordMode: KeywordMode;
  requireMention: boolean;
  minimumMentions: number;
  /** Usernames that can never win ("cannot win" list). */
  excludedUsernames: string[];
  /**
   * Guaranteed winners ("will definitely win" list) — these usernames
   * are forced into the winner list verbatim, in the order added, even
   * if no matching comment exists among the real participants. They
   * take the first winner slots; any remaining slots (and all backup
   * slots) are still drawn randomly from the real eligible pool.
   */
  includedUsernames: string[];
  minimumCommentLength?: number;
}

export type ExclusionReason =
  | "Keyword missing"
  | "Mention required"
  | "Not enough mentions"
  | "Excluded username"
  | "Comment too short";

export interface EligibilityResult {
  username: string;
  normalizedUsername: string;
  eligible: boolean;
  reasons: ExclusionReason[];
  participant: Participant;
}

export interface Winner {
  username: string;
  comment?: InstagramComment;
  position: number;
  isBackup: boolean;
}

export interface FilterStats {
  totalComments: number;
  uniqueParticipants: number;
  eligibleParticipants: number;
  excludedParticipants: number;
}
