"use client";

import * as React from "react";
import { motion } from "motion/react";
import { Copy, Download, Loader2, PartyPopper, RotateCcw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WinnerCard } from "@/components/giveaway/winner-card";
import { GiveawayStats } from "@/components/giveaway/giveaway-stats";
import { participantsToCsv, winnersToCsv, downloadCsv } from "@/lib/giveaway/csv";
import type {
  EligibilityResult,
  FilterStats,
  GiveawaySettings,
  Winner,
} from "@/types/giveaway";

interface ResultsProps {
  winners: Winner[];
  backups: Winner[];
  settings: GiveawaySettings;
  stats: FilterStats;
  eligibilityResults: EligibilityResult[];
  onReject: (username: string) => void;
  onReset: () => void;
}

export function Results({
  winners,
  backups,
  settings,
  stats,
  eligibilityResults,
  onReject,
  onReset,
}: ResultsProps) {
  const [pendingReject, setPendingReject] = React.useState<string | null>(null);

  const handleReject = (username: string) => {
    setPendingReject(username);
    setTimeout(() => {
      onReject(username);
      setPendingReject(null);
      toast.success("Обрано заміну із запасних переможців.");
    }, 700);
  };

  const handleExportParticipants = () => {
    downloadCsv(
      "giveaway-participants.csv",
      participantsToCsv(eligibilityResults, [...winners, ...backups]),
    );
  };

  const handleExportWinners = () => {
    downloadCsv("giveaway-winners.csv", winnersToCsv([...winners, ...backups]));
  };

  const handleCopyResults = async () => {
    const lines = [
      "Результати розіграшу в Instagram",
      "",
      ...winners.map((w) => `Переможець №${w.position}: @${w.username}`),
      "",
      `Учасників, які пройшли відбір: ${stats.eligibleParticipants}`,
      `Усього коментарів: ${stats.totalComments}`,
    ];
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      toast.success("Результати скопійовано в буфер обміну.");
    } catch {
      toast.error("Не вдалося скопіювати результати.");
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-8 py-10">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-2 text-center"
      >
        <div className="flex items-center justify-center gap-2 text-primary">
          <PartyPopper className="size-6" />
        </div>
        <h1 className="text-3xl font-semibold">Розіграш завершено</h1>
        <p className="text-muted-foreground">
          Переможців: {winners.length} · Учасників, які пройшли відбір:{" "}
          {stats.eligibleParticipants}
        </p>
      </motion.div>

      <GiveawayStats
        items={[
          { label: "Усього коментарів", value: stats.totalComments },
          { label: "Допущено до розіграшу", value: stats.eligibleParticipants },
          { label: "Переможців", value: winners.length },
          { label: "Запасних", value: backups.length },
        ]}
      />

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground">Переможці</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {winners.map((w) => (
            <div key={w.username} className="relative">
              {pendingReject === w.username && (
                <div className="absolute inset-0 z-10 flex items-center justify-center gap-2 rounded-xl bg-background/80 text-sm font-medium backdrop-blur-sm">
                  <Loader2 className="size-4 animate-spin" />
                  Обираємо заміну…
                </div>
              )}
              <WinnerCard
                winner={w}
                settings={settings}
                onReject={() => handleReject(w.username)}
                rejectDisabled={pendingReject !== null}
              />
            </div>
          ))}
        </div>
      </div>

      {backups.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground">Запасні переможці</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {backups.map((b) => (
              <WinnerCard key={b.username} winner={b} settings={settings} compact />
            ))}
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Експорт і поширення</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={handleExportParticipants}>
            <Download className="size-4" />
            Експорт учасників (CSV)
          </Button>
          <Button variant="outline" onClick={handleExportWinners}>
            <Download className="size-4" />
            Експорт переможців (CSV)
          </Button>
          <Button variant="outline" onClick={handleCopyResults}>
            <Copy className="size-4" />
            Копіювати результати
          </Button>
        </CardContent>
      </Card>

      <div className="flex justify-center">
        <Button variant="ghost" onClick={onReset}>
          <RotateCcw className="size-4" />
          Почати новий розіграш
        </Button>
      </div>
    </div>
  );
}
