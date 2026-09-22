"use client";

import * as React from "react";
import confetti from "canvas-confetti";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowRight, Volume2, VolumeX } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { WinnerCard } from "@/components/giveaway/winner-card";
import {
  drawWinners,
  InsufficientParticipantsError,
} from "@/lib/giveaway/random";
import { playChime, playTick } from "@/lib/giveaway/sound";
import type { EligibilityResult, GiveawaySettings, Winner } from "@/types/giveaway";

type Stage = "shuffling" | "reveal-winners" | "reveal-backups" | "done";

interface WinnerDrawProps {
  eligible: EligibilityResult[];
  settings: GiveawaySettings;
  onComplete: (winners: Winner[], backups: Winner[]) => void;
  onBack: () => void;
}

const SHUFFLE_DURATION_MS = 2200;

function fireConfetti() {
  confetti({
    particleCount: 90,
    spread: 75,
    startVelocity: 45,
    origin: { y: 0.4 },
    zIndex: 100,
  });
}

export function WinnerDraw({
  eligible,
  settings,
  onComplete,
  onBack,
}: WinnerDrawProps) {
  const prefersReducedMotion = useReducedMotion();

  const [error, setError] = React.useState<string | null>(null);
  const [stage, setStage] = React.useState<Stage>("shuffling");
  const [cyclingName, setCyclingName] = React.useState("");
  const [result, setResult] = React.useState<{
    winners: Winner[];
    backups: Winner[];
  } | null>(null);
  const [revealCount, setRevealCount] = React.useState(0);
  const [soundOn, setSoundOn] = React.useState(true);

  const soundOnRef = React.useRef(soundOn);
  React.useEffect(() => {
    soundOnRef.current = soundOn;
  }, [soundOn]);

  React.useEffect(() => {
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    function begin() {
      let drawn: { winners: Winner[]; backups: Winner[] };

      try {
        drawn = drawWinners(eligible, settings.winnerCount, settings.backupCount);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof InsufficientParticipantsError) {
          setError(
            `Потрібно ${err.needed} переможців і запасних, але відповідають умовам лише ${err.available} учасників. Зменшіть кількість або послабте фільтри.`,
          );
        } else {
          setError("Під час розіграшу сталася помилка.");
        }
        return;
      }

      const names = eligible.map((e) => e.username);
      const duration = prefersReducedMotion ? 300 : SHUFFLE_DURATION_MS;
      const start = Date.now();

      function tick() {
        if (cancelled) return;
        const elapsed = Date.now() - start;
        const progress = Math.min(1, elapsed / duration);

        if (progress >= 1) {
          setResult(drawn);
          setStage("reveal-winners");
          return;
        }

        setCyclingName(names[Math.floor(Math.random() * names.length)] ?? "");
        if (soundOnRef.current) playTick();

        const delay = 55 + progress * progress * 180;
        timeoutId = setTimeout(tick, delay);
      }

      tick();
    }

    timeoutId = setTimeout(begin, 0);

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    if (stage === "reveal-winners" && result && result.winners.length > 0) {
      fireConfetti();
      if (soundOn) playChime();
    }
  }, [stage, result, revealCount, soundOn]);

  if (error) {
    return (
      <div className="mx-auto max-w-md space-y-4 py-16 text-center">
        <Alert variant="destructive">
          <AlertTitle>Замало учасників, які пройшли відбір</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={onBack}>Назад до налаштувань</Button>
      </div>
    );
  }

  if (stage === "shuffling" || !result) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 py-16 text-center">
        <p className="text-sm font-semibold tracking-[0.3em] text-muted-foreground">
          ЖЕРЕБКУВАННЯ…
        </p>
        <motion.p
          key={cyclingName}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="giveaway-gradient-text text-4xl font-bold sm:text-5xl"
        >
          @{cyclingName || "…"}
        </motion.p>
      </div>
    );
  }

  const currentWinner = result.winners[revealCount];
  const allWinnersRevealed = revealCount >= result.winners.length;

  const handleNext = () => {
    setRevealCount((c) => c + 1);
  };

  const handleShowBackups = () => {
    setStage("reveal-backups");
  };

  const handleFinish = () => {
    onComplete(result.winners, result.backups);
  };

  return (
    <div className="mx-auto max-w-md space-y-6 py-10">
      <div className="flex justify-end">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={soundOn ? "Вимкнути звук" : "Увімкнути звук"}
          onClick={() => setSoundOn((s) => !s)}
        >
          {soundOn ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
        </Button>
      </div>

      <AnimatePresence mode="wait">
        {stage === "reveal-winners" && !allWinnersRevealed && currentWinner && (
          <motion.div
            key={currentWinner.username}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, filter: "blur(6px)" }}
            className="space-y-6 text-center"
          >
            <p className="text-2xl font-bold">🎉 ПЕРЕМОЖЕЦЬ</p>
            <WinnerCard winner={currentWinner} settings={settings} />
            <Button size="lg" onClick={handleNext}>
              {revealCount + 1 < result.winners.length
                ? "Наступний переможець"
                : result.backups.length > 0
                  ? "Далі"
                  : "Переглянути результати"}
              <ArrowRight className="size-4" />
            </Button>
          </motion.div>
        )}

        {stage === "reveal-winners" && allWinnersRevealed && (
          <motion.div
            key="all-winners"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            <h2 className="text-center text-xl font-semibold">Усіх переможців оголошено 🎉</h2>
            <div className="space-y-3">
              {result.winners.map((w) => (
                <WinnerCard key={w.username} winner={w} settings={settings} compact />
              ))}
            </div>
            <div className="flex justify-center">
              {result.backups.length > 0 ? (
                <Button size="lg" onClick={handleShowBackups}>
                  Показати запасних переможців
                  <ArrowRight className="size-4" />
                </Button>
              ) : (
                <Button size="lg" onClick={handleFinish}>
                  Переглянути результати
                  <ArrowRight className="size-4" />
                </Button>
              )}
            </div>
          </motion.div>
        )}

        {stage === "reveal-backups" && (
          <motion.div
            key="backups"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            <h2 className="text-center text-xl font-semibold">Запасні переможці</h2>
            <div className="space-y-3">
              {result.backups.map((b, i) => (
                <motion.div
                  key={b.username}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: prefersReducedMotion ? 0 : i * 0.1 }}
                >
                  <WinnerCard winner={b} settings={settings} compact />
                </motion.div>
              ))}
            </div>
            <div className="flex justify-center">
              <Button size="lg" onClick={handleFinish}>
                Переглянути результати
                <ArrowRight className="size-4" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
