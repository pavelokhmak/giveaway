"use client";

import { motion } from "motion/react";
import { Check, PartyPopper } from "lucide-react";

import { Button } from "@/components/ui/button";
import { WinnerCard } from "@/components/giveaway/winner-card";
import type { GiveawaySettings, Winner } from "@/types/giveaway";

interface ResultsProps {
  winners: Winner[];
  backups: Winner[];
  settings: GiveawaySettings;
  onReset: () => void;
}

export function Results({ winners, backups, settings, onReset }: ResultsProps) {
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
      </motion.div>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground">Переможці</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {winners.map((w) => (
            <WinnerCard key={w.username} winner={w} settings={settings} />
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

      <div className="flex justify-center">
        <Button size="lg" onClick={onReset}>
          <Check className="size-4" />
          Готово
        </Button>
      </div>
    </div>
  );
}
