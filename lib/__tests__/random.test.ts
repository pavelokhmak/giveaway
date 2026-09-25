import { describe, it, expect } from "vitest";
import {
  secureRandomInt,
  secureShuffle,
  drawWinners,
  computeDrawAvailability,
  InsufficientParticipantsError,
} from "@/lib/giveaway/random";
import { buildParticipants, filterParticipants } from "@/lib/giveaway/filters";
import { DEFAULT_SETTINGS } from "@/lib/giveaway/store";
import type { InstagramComment } from "@/types/giveaway";

function makeEligible(usernames: string[]) {
  const comments: InstagramComment[] = usernames.map((username, i) => ({
    id: String(i),
    username,
    text: "entering!",
    createdAt: new Date().toISOString(),
  }));
  const participants = buildParticipants(comments, "unique");
  return filterParticipants(participants, DEFAULT_SETTINGS);
}

describe("secureRandomInt", () => {
  it("stays within [0, max)", () => {
    for (let i = 0; i < 500; i++) {
      const value = secureRandomInt(7);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(7);
    }
  });

  it("throws for max <= 0", () => {
    expect(() => secureRandomInt(0)).toThrow();
  });
});

describe("secureShuffle", () => {
  it("preserves all elements without mutating the input", () => {
    const input = [1, 2, 3, 4, 5];
    const shuffled = secureShuffle(input);
    expect(input).toEqual([1, 2, 3, 4, 5]);
    expect(shuffled.slice().sort()).toEqual(input.slice().sort());
  });
});

describe("drawWinners", () => {
  it("draws the requested number of winners and backups", () => {
    const eligible = makeEligible(["a", "b", "c", "d", "e"]);
    const { winners, backups } = drawWinners(eligible, 2, 1);
    expect(winners).toHaveLength(2);
    expect(backups).toHaveLength(1);
  });

  it("never draws a duplicate username across winners and backups", () => {
    const eligible = makeEligible(
      Array.from({ length: 20 }, (_, i) => `user${i}`),
    );
    const { winners, backups } = drawWinners(eligible, 5, 5);
    const usernames = [...winners, ...backups].map((w) => w.username);
    expect(new Set(usernames).size).toBe(usernames.length);
  });

  it("never selects an excluded participant as a winner", () => {
    const comments: InstagramComment[] = Array.from({ length: 10 }, (_, i) => ({
      id: String(i),
      username: `user${i}`,
      text: "hi",
      createdAt: new Date().toISOString(),
    }));
    const participants = buildParticipants(comments, "unique");
    const eligibility = filterParticipants(participants, {
      ...DEFAULT_SETTINGS,
      excludedUsernames: ["user0", "user1", "user2"],
    });
    const eligible = eligibility.filter((r) => r.eligible);
    const { winners, backups } = drawWinners(eligible, 3, 2);
    const winnerUsernames = [...winners, ...backups].map((w) =>
      w.username.toLowerCase(),
    );
    expect(winnerUsernames).not.toContain("user0");
    expect(winnerUsernames).not.toContain("user1");
    expect(winnerUsernames).not.toContain("user2");
  });

  it("throws InsufficientParticipantsError when the pool is too small", () => {
    const eligible = makeEligible(["a", "b"]);
    expect(() => drawWinners(eligible, 3, 2)).toThrow(
      InsufficientParticipantsError,
    );
  });

  it("assigns sequential positions starting at 1", () => {
    const eligible = makeEligible(["a", "b", "c", "d"]);
    const { winners, backups } = drawWinners(eligible, 2, 2);
    expect(winners.map((w) => w.position)).toEqual([1, 2]);
    expect(backups.map((w) => w.position)).toEqual([1, 2]);
  });

  it("never lets one person hold more than one prize, even with duplicate tickets", () => {
    const comments: InstagramComment[] = [];
    // "whale" has 20 tickets (per-comment style ballot stuffing); everyone
    // else has exactly one.
    for (let i = 0; i < 20; i++) {
      comments.push({
        id: `whale-${i}`,
        username: "whale",
        text: "entering!",
        createdAt: new Date().toISOString(),
      });
    }
    for (let i = 0; i < 5; i++) {
      comments.push({
        id: `other-${i}`,
        username: `other${i}`,
        text: "entering!",
        createdAt: new Date().toISOString(),
      });
    }
    const participants = buildParticipants(comments, "per-comment");
    const eligible = filterParticipants(participants, DEFAULT_SETTINGS);

    for (let i = 0; i < 20; i++) {
      const { winners, backups } = drawWinners(eligible, 3, 3);
      const usernames = [...winners, ...backups].map((w) => w.username.toLowerCase());
      expect(new Set(usernames).size).toBe(usernames.length);
    }
  });

  it("guarantees a manually-added winner even with no matching comment", () => {
    const eligible = makeEligible(["a", "b", "c"]);
    const { winners } = drawWinners(eligible, 2, 0, ["nobody-commented"]);
    expect(winners.map((w) => w.username)).toContain("nobody-commented");
    expect(winners).toHaveLength(2);
  });

  it("keeps the guaranteed winner's username exactly as typed, not normalized", () => {
    const eligible = makeEligible(["a", "b"]);
    const { winners } = drawWinners(eligible, 1, 0, ["  @Some.Person  "]);
    expect(winners[0].username).toBe("Some.Person");
    expect(winners[0].comment).toBeUndefined();
  });

  it("fills remaining winner slots randomly from the real pool after guaranteed winners", () => {
    const eligible = makeEligible(["a", "b", "c"]);
    const { winners } = drawWinners(eligible, 2, 0, ["ghost"]);
    const real = winners.find((w) => w.username !== "ghost");
    expect(real).toBeDefined();
    expect(["a", "b", "c"]).toContain(real!.username);
  });

  it("never draws a real participant who is also a guaranteed winner a second time", () => {
    const eligible = makeEligible(["a", "b", "c"]);
    for (let i = 0; i < 20; i++) {
      const { winners } = drawWinners(eligible, 3, 0, ["a"]);
      const usernames = winners.map((w) => w.username.toLowerCase());
      expect(new Set(usernames).size).toBe(3);
    }
  });

  it("bases the insufficient-participants check on unique people, not raw tickets", () => {
    const comments: InstagramComment[] = Array.from({ length: 10 }, (_, i) => ({
      id: String(i),
      username: "same-person",
      text: "entering!",
      createdAt: new Date().toISOString(),
    }));
    const participants = buildParticipants(comments, "per-comment");
    const eligible = filterParticipants(participants, DEFAULT_SETTINGS);
    expect(() => drawWinners(eligible, 1, 1)).toThrow(InsufficientParticipantsError);
  });
});

describe("computeDrawAvailability", () => {
  it("agrees with drawWinners about whether a draw would succeed", () => {
    const eligible = makeEligible(["a", "b"]);
    expect(computeDrawAvailability(eligible, 3, 2)).toBe(false);
    expect(() => drawWinners(eligible, 3, 2)).toThrow(InsufficientParticipantsError);

    expect(computeDrawAvailability(eligible, 2, 0)).toBe(true);
    expect(() => drawWinners(eligible, 2, 0)).not.toThrow();
  });

  it("counts a guaranteed winner toward availability even with a too-small real pool", () => {
    const eligible = makeEligible(["a"]);
    expect(computeDrawAvailability(eligible, 2, 0, ["ghost"])).toBe(true);
    expect(() => drawWinners(eligible, 2, 0, ["ghost"])).not.toThrow();
  });
});
