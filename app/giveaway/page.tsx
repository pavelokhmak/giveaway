"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Gift, Settings2 } from "lucide-react";

import { useGiveawayStore } from "@/lib/giveaway/store";
import {
  buildParticipants,
  computeFilterStats,
  filterParticipants,
} from "@/lib/giveaway/filters";
import { GiveawayStats } from "@/components/giveaway/giveaway-stats";
import { ParticipantList } from "@/components/giveaway/participant-list";
import { WinnerDraw } from "@/components/giveaway/winner-draw";
import { Results } from "@/components/giveaway/results";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ThemeToggle } from "@/components/theme-toggle";
import type { Winner } from "@/types/giveaway";

export default function GiveawayPage() {
  const router = useRouter();

  const comments = useGiveawayStore((s) => s.comments);
  const settings = useGiveawayStore((s) => s.settings);
  const phase = useGiveawayStore((s) => s.phase);
  const winners = useGiveawayStore((s) => s.winners);
  const backups = useGiveawayStore((s) => s.backups);
  const allTimeWinnerUsernames = useGiveawayStore((s) => s.allTimeWinnerUsernames);

  const startDraw = useGiveawayStore((s) => s.startDraw);
  const setDrawResult = useGiveawayStore((s) => s.setDrawResult);
  const finishDraw = useGiveawayStore((s) => s.finishDraw);
  const rejectWinner = useGiveawayStore((s) => s.rejectWinner);
  const goToSettings = useGiveawayStore((s) => s.goToSettings);
  const reset = useGiveawayStore((s) => s.reset);

  React.useEffect(() => {
    if (comments.length === 0) {
      router.replace("/");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [comments.length]);

  const participants = React.useMemo(
    () => buildParticipants(comments, settings.entryMode),
    [comments, settings.entryMode],
  );

  const eligibilityResults = React.useMemo(
    () => filterParticipants(participants, settings, allTimeWinnerUsernames),
    [participants, settings, allTimeWinnerUsernames],
  );

  const eligible = React.useMemo(
    () => eligibilityResults.filter((r) => r.eligible),
    [eligibilityResults],
  );

  const stats = React.useMemo(
    () => computeFilterStats(comments.length, eligibilityResults),
    [comments.length, eligibilityResults],
  );

  const needed = settings.winnerCount + settings.backupCount;
  const notEnoughEligible = needed > eligible.length;

  const handleStart = () => {
    if (notEnoughEligible) return;
    startDraw();
  };

  const handleDrawComplete = (drawnWinners: Winner[], drawnBackups: Winner[]) => {
    setDrawResult(drawnWinners, drawnBackups);
    finishDraw();
  };

  const handleReset = () => {
    reset();
    router.push("/");
  };

  const handleBackToSettings = () => {
    goToSettings();
    router.push("/giveaway/settings");
  };

  if (comments.length === 0) {
    return null;
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-background px-4 py-3">
        <button
          onClick={() => router.push("/")}
          className="flex items-center gap-2 text-sm font-semibold"
        >
          <Gift className="size-5 text-primary" />
          Розіграш Instagram
        </button>
        <div className="flex items-center gap-1">
          {phase === "settings" && (
            <Button
              variant="ghost"
              size="icon"
              aria-label="Налаштування"
              onClick={() => router.push("/giveaway/settings")}
            >
              <Settings2 className="size-5" />
            </Button>
          )}
          <ThemeToggle />
        </div>
      </header>

      <main className={phase === "settings" ? "px-4 py-5 pb-28" : "px-4 py-5"}>
        {phase === "drawing" ? (
          <WinnerDraw
            eligible={eligible}
            settings={settings}
            onComplete={handleDrawComplete}
            onBack={handleBackToSettings}
          />
        ) : phase === "results" ? (
          <Results
            winners={winners}
            backups={backups}
            settings={settings}
            stats={stats}
            eligibilityResults={eligibilityResults}
            onReject={rejectWinner}
            onReset={handleReset}
          />
        ) : (
          <div className="space-y-4">
            <GiveawayStats
              items={[
                { label: "Коментарів", value: stats.totalComments },
                { label: "Проходять за умовами", value: stats.eligibleParticipants },
              ]}
            />

            <ParticipantList results={eligibilityResults} />

            {notEnoughEligible && (
              <Alert variant="destructive">
                <AlertTitle>Замало учасників, які пройшли відбір</AlertTitle>
                <AlertDescription>
                  Потрібно {needed} учасників ({settings.winnerCount}{" "}
                  переможців + {settings.backupCount} запасних), але
                  відповідають умовам лише {eligible.length}. Зменшіть
                  кількість у налаштуваннях або послабте фільтри.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </main>

      {phase === "settings" && (
        <div className="fixed inset-x-0 bottom-0 z-10 border-t bg-background p-4">
          <Button
            size="lg"
            className="w-full"
            onClick={handleStart}
            disabled={notEnoughEligible}
          >
            Почати розіграш
          </Button>
        </div>
      )}
    </div>
  );
}
