import { reasonLabelUk } from "@/lib/giveaway/filters";
import type { EligibilityResult, Winner } from "@/types/giveaway";

function escapeCsvField(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function toCsv(headers: string[], rows: string[][]): string {
  const lines = [headers, ...rows].map((row) =>
    row.map(escapeCsvField).join(","),
  );
  return lines.join("\n");
}

export function participantsToCsv(
  results: EligibilityResult[],
  winners: Winner[],
): string {
  const winnerByUsername = new Map(
    winners.map((w) => [w.username.toLowerCase(), w]),
  );

  const headers = ["нікнейм", "коментар", "допущено", "причина", "переможець", "місце"];
  const rows = results.map((r) => {
    const winner = winnerByUsername.get(r.username.toLowerCase());
    return [
      r.username,
      r.participant.comments[0]?.text ?? "",
      r.eligible ? "так" : "ні",
      r.reasons.map(reasonLabelUk).join("; "),
      winner ? (winner.isBackup ? "запасний" : "так") : "ні",
      winner ? String(winner.position) : "",
    ];
  });

  return toCsv(headers, rows);
}

export function winnersToCsv(winners: Winner[]): string {
  const headers = ["нікнейм", "коментар", "допущено", "причина", "переможець", "місце"];
  const rows = winners.map((w) => [
    w.username,
    w.comment?.text ?? "",
    "так",
    "",
    w.isBackup ? "запасний" : "так",
    String(w.position),
  ]);

  return toCsv(headers, rows);
}

export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
