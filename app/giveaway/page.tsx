"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Gift, Sparkles } from "lucide-react";

import { useGiveawayStore } from "@/lib/giveaway/store";
import {
  buildParticipants,
  computeFilterStats,
  filterParticipants,
} from "@/lib/giveaway/filters";
import { GiveawaySettingsPanel } from "@/components/giveaway/giveaway-settings";
import { GiveawayStats } from "@/components/giveaway/giveaway-stats";
import { ParticipantList } from "@/components/giveaway/participant-list";
import { WinnerDraw } from "@/components/giveaway/winner-draw";
import { Results } from "@/components/giveaway/results";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import type { Winner } from "@/types/giveaway";

export default function GiveawayPage() {
  const router = useRouter();

  const comments = useGiveawayStore((s) => s.comments);
  const provider = useGiveawayStore((s) => s.provider);
  const settings = useGiveawayStore((s) => s.settings);
  const phase = useGiveawayStore((s) => s.phase);
  const winners = useGiveawayStore((s) => s.winners);
  const backups = useGiveawayStore((s) => s.backups);
  const allTimeWinnerUsernames = useGiveawayStore((s) => s.allTimeWinnerUsernames);

  const updateSettings = useGiveawayStore((s) => s.updateSettings);
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

  const uniqueParticipantCount = React.useMemo(
    () => buildParticipants(comments, "unique").length,
    [comments],
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
    () => ({
      ...computeFilterStats(comments.length, eligibilityResults),
      uniqueParticipants: uniqueParticipantCount,
    }),
    [comments.length, eligibilityResults, uniqueParticipantCount],
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

  if (comments.length === 0) {
    return null;
  }

  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between border-b px-6 py-4 sm:px-10">
        <button
          onClick={() => router.push("/")}
          className="flex items-center gap-2 text-sm font-semibold"
        >
          <Gift className="size-5 text-primary" />
          Розіграш Instagram
        </button>
        <div className="flex items-center gap-3">
          {provider === "demo" && (
            <Badge className="gap-1 bg-primary/10 text-primary hover:bg-primary/10">
              <Sparkles className="size-3" />
              ДЕМО-РЕЖИМ
            </Badge>
          )}
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8 sm:px-10">
        {phase === "drawing" ? (
          <WinnerDraw
            eligible={eligible}
            settings={settings}
            onComplete={handleDrawComplete}
            onBack={goToSettings}
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
          <div className="space-y-6">
            <GiveawayStats
              items={[
                { label: "Усього коментарів", value: stats.totalComments },
                { label: "Унікальних учасників", value: stats.uniqueParticipants },
                { label: "Допущено до розіграшу", value: stats.eligibleParticipants },
                { label: "Виключено", value: stats.excludedParticipants },
              ]}
            />

            <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
              <GiveawaySettingsPanel settings={settings} onChange={updateSettings} />

              <div className="space-y-4">
                <ParticipantList results={eligibilityResults} />

                {notEnoughEligible && (
                  <Alert variant="destructive">
                    <AlertTitle>Замало учасників, які пройшли відбір</AlertTitle>
                    <AlertDescription>
                      Потрібно {needed} учасників ({settings.winnerCount}{" "}
                      переможців + {settings.backupCount} запасних), але
                      відповідають умовам лише {eligible.length}. Зменшіть
                      кількість або послабте фільтри.
                    </AlertDescription>
                  </Alert>
                )}

                <div className="flex justify-end">
                  <Button size="lg" onClick={handleStart} disabled={notEnoughEligible}>
                    Почати розіграш
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
