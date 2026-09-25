import { normalizeUsername } from "@/lib/giveaway/filters";
import type { EligibilityResult, Winner } from "@/types/giveaway";

/**
 * Cryptographically secure random integer in [0, max), using the Web
 * Crypto API (available in both the browser and Node 20+).
 */
export function secureRandomInt(max: number): number {
  if (max <= 0) {
    throw new Error("max must be greater than 0");
  }

  if (
    typeof globalThis.crypto === "undefined" ||
    typeof globalThis.crypto.getRandomValues !== "function"
  ) {
    throw new Error("Secure randomness is not available in this environment.");
  }

  const range = max;
  const bitsNeeded = Math.ceil(Math.log2(range));
  const bytesNeeded = Math.max(1, Math.ceil(bitsNeeded / 8));
  const mask = Math.pow(2, bitsNeeded) - 1;

  // Rejection sampling: discard out-of-range draws to keep the
  // distribution uniform instead of introducing modulo bias.
  while (true) {
    const bytes = new Uint8Array(bytesNeeded);
    globalThis.crypto.getRandomValues(bytes);
    let value = 0;
    for (let i = 0; i < bytesNeeded; i++) {
      value = (value << 8) | bytes[i];
    }
    value = value & mask;
    if (value < range) {
      return value;
    }
  }
}

/**
 * Unbiased Fisher-Yates shuffle using cryptographically secure randomness.
 * Returns a new array; does not mutate the input.
 */
export function secureShuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = secureRandomInt(i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export interface DrawWinnersResult {
  winners: Winner[];
  backups: Winner[];
}

export class InsufficientParticipantsError extends Error {
  constructor(
    public readonly needed: number,
    public readonly available: number,
  ) {
    super(
      `Not enough eligible participants: need ${needed}, but only ${available} are eligible.`,
    );
    this.name = "InsufficientParticipantsError";
  }
}

interface GuaranteedWinner {
  username: string;
  normalized: string;
}

/**
 * Normalizes, deduplicates, and caps the "will definitely win" list at
 * `winnerCount` entries, in the order they were added — shared by
 * `drawWinners` and `computeDrawAvailability` so the two never disagree
 * about who counts as guaranteed.
 */
function resolveGuaranteedWinners(
  guaranteedUsernames: string[],
  winnerCount: number,
): GuaranteedWinner[] {
  const seen = new Set<string>();
  const result: GuaranteedWinner[] = [];
  for (const raw of guaranteedUsernames) {
    if (result.length >= winnerCount) break;
    const username = raw.trim().replace(/^@/, "");
    if (!username) continue;
    const normalized = normalizeUsername(username);
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    result.push({ username, normalized });
  }
  return result;
}

/**
 * Draws winners and backups from the eligible entry pool.
 *
 * The pool may contain several entries for the same person (e.g. in
 * "per-comment" or "per-mention" mode, where more comments/mentions mean
 * more raffle tickets and therefore a higher chance of being picked).
 * Regardless of how many tickets someone holds, they can win at most one
 * prize: the shuffle is weighted by ticket count, but once a person's
 * first ticket is drawn, their remaining tickets are skipped.
 *
 * `guaranteedUsernames` (the "will definitely win" list) are forced into
 * the first winner slots verbatim, in the order added — even if no
 * matching comment exists among the real participants. Any remaining
 * winner slots, plus all backup slots, are still drawn randomly from the
 * real eligible pool (guaranteed usernames are removed from that pool
 * first, so the same person can't also be drawn at random).
 */
export function drawWinners(
  eligible: EligibilityResult[],
  winnerCount: number,
  backupCount: number,
  guaranteedUsernames: string[] = [],
): DrawWinnersResult {
  const guaranteed = resolveGuaranteedWinners(guaranteedUsernames, winnerCount);
  const guaranteedNormalized = new Set(guaranteed.map((g) => g.normalized));

  const pool = eligible.filter((e) => !guaranteedNormalized.has(e.normalizedUsername));
  const remainingWinnerSlots = winnerCount - guaranteed.length;
  const neededFromPool = remainingWinnerSlots + backupCount;

  const uniquePoolCount = new Set(pool.map((e) => e.normalizedUsername)).size;

  if (neededFromPool > uniquePoolCount) {
    throw new InsufficientParticipantsError(
      winnerCount + backupCount,
      uniquePoolCount + guaranteed.length,
    );
  }

  const shuffled = secureShuffle(pool);

  const picked: EligibilityResult[] = [];
  const seenUsernames = new Set<string>();
  for (const entry of shuffled) {
    if (picked.length >= neededFromPool) break;
    if (seenUsernames.has(entry.normalizedUsername)) continue;
    seenUsernames.add(entry.normalizedUsername);
    picked.push(entry);
  }

  const guaranteedWinners: Winner[] = guaranteed.map((g, i) => ({
    username: g.username,
    position: i + 1,
    isBackup: false,
  }));

  const randomWinners: Winner[] = picked.slice(0, remainingWinnerSlots).map((p, i) => ({
    username: p.username,
    comment: p.participant.comments[0],
    position: guaranteed.length + i + 1,
    isBackup: false,
  }));

  const backups: Winner[] = picked
    .slice(remainingWinnerSlots, remainingWinnerSlots + backupCount)
    .map((p, i) => ({
      username: p.username,
      comment: p.participant.comments[0],
      position: i + 1,
      isBackup: true,
    }));

  return { winners: [...guaranteedWinners, ...randomWinners], backups };
}

/**
 * Whether a draw with these settings would currently succeed — mirrors
 * `drawWinners`'s guaranteed-winner + pool-size logic without actually
 * drawing, so the UI can disable the start button and explain why ahead
 * of time instead of letting the draw throw.
 */
export function computeDrawAvailability(
  eligible: EligibilityResult[],
  winnerCount: number,
  backupCount: number,
  guaranteedUsernames: string[] = [],
): boolean {
  const guaranteed = resolveGuaranteedWinners(guaranteedUsernames, winnerCount);
  const guaranteedNormalized = new Set(guaranteed.map((g) => g.normalized));
  const pool = eligible.filter((e) => !guaranteedNormalized.has(e.normalizedUsername));
  const remainingWinnerSlots = winnerCount - guaranteed.length;
  const neededFromPool = remainingWinnerSlots + backupCount;
  const uniquePoolCount = new Set(pool.map((e) => e.normalizedUsername)).size;
  return neededFromPool <= uniquePoolCount;
}

/**
 * Picks a single replacement from the remaining backups, keeping the
 * original backup ordering for whichever backups are left.
 */
export function pickReplacement(
  remainingBackups: Winner[],
): { replacement: Winner; rest: Winner[] } | null {
  if (remainingBackups.length === 0) return null;
  const [replacement, ...rest] = remainingBackups;
  return { replacement, rest };
}
