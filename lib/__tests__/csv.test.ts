import { describe, it, expect } from "vitest";
import { participantsToCsv, winnersToCsv } from "@/lib/giveaway/csv";
import { buildParticipants, filterParticipants } from "@/lib/giveaway/filters";
import { DEFAULT_SETTINGS } from "@/lib/giveaway/store";
import type { InstagramComment, Winner } from "@/types/giveaway";

describe("csv export", () => {
  it("produces a header row plus one row per participant", () => {
    const comments: InstagramComment[] = [
      { id: "1", username: "alex", text: "hi", createdAt: "" },
      { id: "2", username: "maria", text: "hello, world", createdAt: "" },
    ];
    const participants = buildParticipants(comments, "unique");
    const results = filterParticipants(participants, DEFAULT_SETTINGS);
    const csv = participantsToCsv(results, []);
    const lines = csv.split("\n");
    expect(lines).toHaveLength(3);
    expect(lines[0]).toBe("нікнейм,коментар,допущено,причина,переможець,місце");
  });

  it("quotes fields containing commas", () => {
    const comments: InstagramComment[] = [
      { id: "1", username: "alex", text: "hello, world", createdAt: "" },
    ];
    const participants = buildParticipants(comments, "unique");
    const results = filterParticipants(participants, DEFAULT_SETTINGS);
    const csv = participantsToCsv(results, []);
    expect(csv).toContain('"hello, world"');
  });

  it("marks winners and backups correctly", () => {
    const winners: Winner[] = [
      { username: "alex", position: 1, isBackup: false },
      { username: "maria", position: 1, isBackup: true },
    ];
    const csv = winnersToCsv(winners);
    const lines = csv.split("\n");
    expect(lines[1]).toContain("так");
    expect(lines[2]).toContain("запасний");
  });
});
