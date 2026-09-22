import { describe, it, expect } from "vitest";
import {
  normalizeUsername,
  extractMentions,
  buildParticipants,
  filterParticipants,
  computeFilterStats,
  getUsernameSuggestions,
} from "@/lib/giveaway/filters";
import { DEFAULT_SETTINGS } from "@/lib/giveaway/store";
import type { InstagramComment } from "@/types/giveaway";

function comment(overrides: Partial<InstagramComment>): InstagramComment {
  return {
    id: overrides.id ?? Math.random().toString(36),
    username: "user",
    text: "hello",
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("normalizeUsername", () => {
  it("strips @ and lowercases", () => {
    expect(normalizeUsername("@John")).toBe("john");
    expect(normalizeUsername("JOHN")).toBe("john");
    expect(normalizeUsername("john")).toBe("john");
    expect(normalizeUsername(" john ")).toBe("john");
  });
});

describe("extractMentions", () => {
  it("extracts multiple mentions, normalized", () => {
    expect(extractMentions("@John @Maria hey")).toEqual(["john", "maria"]);
  });

  it("returns an empty array when there are no mentions", () => {
    expect(extractMentions("no mentions here")).toEqual([]);
  });

  it("handles dots and underscores in usernames", () => {
    expect(extractMentions("thanks @john.doe_99")).toEqual(["john.doe_99"]);
  });
});

describe("buildParticipants", () => {
  it("groups duplicate usernames (case-insensitive) in unique mode", () => {
    const comments = [
      comment({ id: "1", username: "Alex" }),
      comment({ id: "2", username: "alex" }),
      comment({ id: "3", username: "ALEX" }),
      comment({ id: "4", username: "maria" }),
    ];
    const participants = buildParticipants(comments, "unique");
    expect(participants).toHaveLength(2);
    const alex = participants.find((p) => p.normalizedUsername === "alex");
    expect(alex?.comments).toHaveLength(3);
  });

  it("keeps every comment as its own entry in per-comment mode", () => {
    const comments = [
      comment({ id: "1", username: "Alex" }),
      comment({ id: "2", username: "alex" }),
    ];
    const participants = buildParticipants(comments, "per-comment");
    expect(participants).toHaveLength(2);
  });

  it("creates one entry per @mention in per-mention mode", () => {
    const comments = [
      comment({ id: "1", username: "alex", text: "no tags here" }),
      comment({ id: "2", username: "maria", text: "@one tag" }),
      comment({ id: "3", username: "john", text: "@one @two @three tags" }),
    ];
    const participants = buildParticipants(comments, "per-mention");
    expect(participants).toHaveLength(4);
    expect(
      participants.filter((p) => p.normalizedUsername === "maria"),
    ).toHaveLength(1);
    expect(
      participants.filter((p) => p.normalizedUsername === "john"),
    ).toHaveLength(3);
    expect(
      participants.filter((p) => p.normalizedUsername === "alex"),
    ).toHaveLength(0);
  });
});

describe("filterParticipants", () => {
  it("excludes usernames in the exclusion list", () => {
    const participants = buildParticipants([comment({ username: "john" })]);
    const results = filterParticipants(participants, {
      ...DEFAULT_SETTINGS,
      excludedUsernames: ["John"],
    });
    expect(results[0].eligible).toBe(false);
    expect(results[0].reasons).toContain("Excluded username");
  });

  it("only allows usernames on the allow list when it's non-empty", () => {
    const participants = buildParticipants([
      comment({ username: "john" }),
      comment({ username: "maria" }),
    ]);
    const results = filterParticipants(participants, {
      ...DEFAULT_SETTINGS,
      includedUsernames: ["Maria"],
    });
    const john = results.find((r) => r.normalizedUsername === "john");
    const maria = results.find((r) => r.normalizedUsername === "maria");
    expect(john?.eligible).toBe(false);
    expect(john?.reasons).toContain("Not in allowed list");
    expect(maria?.eligible).toBe(true);
  });

  it("ignores the allow list when it's empty", () => {
    const participants = buildParticipants([comment({ username: "john" })]);
    const results = filterParticipants(participants, DEFAULT_SETTINGS);
    expect(results[0].eligible).toBe(true);
  });

  it("requires keyword when enabled", () => {
    const participants = buildParticipants([
      comment({ username: "a", text: "no keyword here" }),
      comment({ username: "b", text: "I love this GIVEAWAY" }),
    ]);
    const results = filterParticipants(participants, {
      ...DEFAULT_SETTINGS,
      keywordEnabled: true,
      keyword: "giveaway",
      keywordMode: "contains",
    });
    const a = results.find((r) => r.normalizedUsername === "a");
    const b = results.find((r) => r.normalizedUsername === "b");
    expect(a?.eligible).toBe(false);
    expect(a?.reasons).toContain("Keyword missing");
    expect(b?.eligible).toBe(true);
  });

  it("respects exact keyword match mode", () => {
    const participants = buildParticipants([
      comment({ username: "a", text: "giveawayx please" }),
      comment({ username: "b", text: "giveaway please" }),
    ]);
    const results = filterParticipants(participants, {
      ...DEFAULT_SETTINGS,
      keywordEnabled: true,
      keyword: "giveaway",
      keywordMode: "exact",
    });
    expect(results.find((r) => r.normalizedUsername === "a")?.eligible).toBe(false);
    expect(results.find((r) => r.normalizedUsername === "b")?.eligible).toBe(true);
  });

  it("requires a minimum number of mentions", () => {
    const participants = buildParticipants([
      comment({ username: "a", text: "no mention" }),
      comment({ username: "b", text: "@one mention" }),
      comment({ username: "c", text: "@one @two mentions" }),
    ]);
    const results = filterParticipants(participants, {
      ...DEFAULT_SETTINGS,
      requireMention: true,
      minimumMentions: 2,
    });
    expect(results.find((r) => r.normalizedUsername === "a")?.eligible).toBe(false);
    expect(results.find((r) => r.normalizedUsername === "b")?.eligible).toBe(false);
    expect(results.find((r) => r.normalizedUsername === "b")?.reasons).toContain(
      "Not enough mentions",
    );
    expect(results.find((r) => r.normalizedUsername === "c")?.eligible).toBe(true);
  });

  it("excludes previous winners when enabled", () => {
    const participants = buildParticipants([comment({ username: "john" })]);
    const results = filterParticipants(
      participants,
      { ...DEFAULT_SETTINGS, excludePreviousWinners: true },
      ["john"],
    );
    expect(results[0].eligible).toBe(false);
    expect(results[0].reasons).toContain("Previous winner");
  });

  it("filters out comments shorter than the minimum length", () => {
    const participants = buildParticipants([
      comment({ username: "a", text: "hi" }),
      comment({ username: "b", text: "this is a long enough comment" }),
    ]);
    const results = filterParticipants(participants, {
      ...DEFAULT_SETTINGS,
      minimumCommentLength: 10,
    });
    expect(results.find((r) => r.normalizedUsername === "a")?.eligible).toBe(false);
    expect(results.find((r) => r.normalizedUsername === "b")?.eligible).toBe(true);
  });
});

describe("computeFilterStats", () => {
  it("computes totals correctly", () => {
    const participants = buildParticipants([
      comment({ username: "a" }),
      comment({ username: "b" }),
    ]);
    const results = filterParticipants(participants, {
      ...DEFAULT_SETTINGS,
      excludedUsernames: ["a"],
    });
    const stats = computeFilterStats(2, results);
    expect(stats.totalComments).toBe(2);
    expect(stats.uniqueParticipants).toBe(2);
    expect(stats.eligibleParticipants).toBe(1);
    expect(stats.excludedParticipants).toBe(1);
  });
});

describe("getUsernameSuggestions", () => {
  it("deduplicates by normalized username, keeping the first-seen casing", () => {
    const suggestions = getUsernameSuggestions([
      comment({ username: "Maria" }),
      comment({ username: "Alex" }),
      comment({ username: "MARIA" }),
      comment({ username: "  alex  " }),
    ]);
    expect(suggestions).toHaveLength(2);
    expect(suggestions).toContain("Maria");
    expect(suggestions).toContain("Alex");
  });

  it("sorts the result alphabetically", () => {
    const suggestions = getUsernameSuggestions([
      comment({ username: "zara" }),
      comment({ username: "adam" }),
      comment({ username: "mike" }),
    ]);
    expect(suggestions).toEqual(["adam", "mike", "zara"]);
  });
});
