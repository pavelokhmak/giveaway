"use client";

import * as React from "react";
import confetti from "canvas-confetti";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { WinnerCard } from "@/components/giveaway/winner-card";
import {
  drawWinners,
  InsufficientParticipantsError,
} from "@/lib/giveaway/random";
import type { EligibilityResult, GiveawaySettings, Winner } from "@/types/giveaway";

type Phase = "shuffling" | "revealed" | "backups";

interface WinnerDrawProps {
  eligible: EligibilityResult[];
  /**
   * Usernames to cycle through during the shuffle animation. Deliberately
   * separate from `eligible` (the real draw pool): it includes everyone
   * who *looks* eligible, ignoring the private can/cannot-win lists, so
   * the animation never visibly reveals that those lists narrowed things
   * down. The actual winner still only ever comes from `eligible`.
   */
  displayNames: string[];
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
  displayNames,
  settings,
  onComplete,
  onBack,
}: WinnerDrawProps) {
  const prefersReducedMotion = useReducedMotion();

  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<{
    winners: Winner[];
    backups: Winner[];
  } | null>(null);
  const [revealIndex, setRevealIndex] = React.useState(0);
  const [phase, setPhase] = React.useState<Phase>("shuffling");
  const [cyclingName, setCyclingName] = React.useState("");

  // Compute the draw once, deferred so no setState happens synchronously
  // within the effect body itself.
  React.useEffect(() => {
    let cancelled = false;
    const timeoutId = setTimeout(() => {
      if (cancelled) return;
      try {
        const drawn = drawWinners(eligible, settings.winnerCount, settings.backupCount);
        setResult(drawn);
      } catch (err) {
        if (err instanceof InsufficientParticipantsError) {
          setError(
            `Потрібно ${err.needed} переможців і запасних, але відповідають умовам лише ${err.available} учасників. Зменшіть кількість або послабте фільтри.`,
          );
        } else {
          setError("Під час розіграшу сталася помилка.");
        }
      }
    }, 0);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Runs the shuffling animation every time `phase` becomes "shuffling" —
  // i.e. for every winner, not just the first.
  React.useEffect(() => {
    if (!result || phase !== "shuffling") return;

    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const names = displayNames.length > 0 ? displayNames : eligible.map((e) => e.username);
    const duration = prefersReducedMotion ? 300 : SHUFFLE_DURATION_MS;
    const start = Date.now();

    function tick() {
      if (cancelled) return;
      const elapsed = Date.now() - start;
      const progress = Math.min(1, elapsed / duration);

      if (progress >= 1) {
        setPhase("revealed");
        return;
      }

      setCyclingName(names[Math.floor(Math.random() * names.length)] ?? "");

      const delay = 55 + progress * progress * 180;
      timeoutId = setTimeout(tick, delay);
    }

    timeoutId = setTimeout(tick, 0);

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [result, phase, displayNames, eligible, prefersReducedMotion]);

  React.useEffect(() => {
    if (phase === "revealed") {
      fireConfetti();
    }
  }, [phase, revealIndex]);

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

  if (phase === "shuffling") {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 py-16 text-center">
        <p className="text-sm font-semibold tracking-[0.3em] text-muted-foreground">
          ОБИРАЄМО ПЕРЕМОЖЦЯ…
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

  if (!result) return null;

  const currentWinner = result.winners[revealIndex];
  const isLastWinner = revealIndex + 1 >= result.winners.length;

  const handleNext = () => {
    if (!isLastWinner) {
      setRevealIndex((i) => i + 1);
      setPhase("shuffling");
    } else if (result.backups.length > 0) {
      setPhase("backups");
    } else {
      onComplete(result.winners, result.backups);
    }
  };

  const handleFinish = () => {
    onComplete(result.winners, result.backups);
  };

  return (
    <div className="mx-auto max-w-md space-y-6 py-10">
      <AnimatePresence mode="wait">
        {phase === "revealed" && currentWinner && (
          <motion.div
            key={`${revealIndex}-${currentWinner.username}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, filter: "blur(6px)" }}
            className="space-y-6 text-center"
          >
            <p className="text-2xl font-bold">🎉 ПЕРЕМОЖЕЦЬ</p>
            <WinnerCard winner={currentWinner} settings={settings} />
            <Button size="lg" onClick={handleNext}>
              {!isLastWinner
                ? "Наступний переможець"
                : result.backups.length > 0
                  ? "Далі"
                  : "Переглянути результати"}
              <ArrowRight className="size-4" />
            </Button>
          </motion.div>
        )}

        {phase === "backups" && (
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
