"use client";

import { motion } from "motion/react";
import { Check, Trophy, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { GiveawaySettings, Winner } from "@/types/giveaway";

const ENTRY_MODE_BADGE: Record<GiveawaySettings["entryMode"], string> = {
  unique: "Унікальний учасник",
  "per-comment": "Голос за коментарями",
  "per-mention": "Голос за відмітками",
};

function conditionLabels(settings: GiveawaySettings): string[] {
  const labels = ["Пройшов відбір"];
  if (settings.keywordEnabled) labels.push("Ключове слово");
  if (settings.requireMention) labels.push("Відмітка");
  labels.push(ENTRY_MODE_BADGE[settings.entryMode]);
  return labels;
}

interface WinnerCardProps {
  winner: Winner;
  settings: GiveawaySettings;
  onReject?: () => void;
  rejectDisabled?: boolean;
  compact?: boolean;
}

export function WinnerCard({
  winner,
  settings,
  onReject,
  rejectDisabled,
  compact,
}: WinnerCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
    >
      <Card className="relative overflow-hidden border-primary/20">
        <div
          aria-hidden
          className="giveaway-gradient-ring pointer-events-none absolute -right-16 -top-16 size-40 rounded-full opacity-15 blur-2xl"
        />
        <CardContent className={compact ? "p-4" : "p-6"}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              {winner.isBackup ? (
                <>Запасний #{winner.position}</>
              ) : (
                <>
                  <Trophy className="size-3.5 text-primary" />
                  Переможець #{winner.position}
                </>
              )}
            </div>
          </div>

          <p className={compact ? "mt-1 text-lg font-semibold" : "mt-2 text-2xl font-semibold"}>
            @{winner.username}
          </p>

          {winner.comment && (
            <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
              &ldquo;{winner.comment.text}&rdquo;
            </p>
          )}

          <div className="mt-3 flex flex-wrap gap-1.5">
            {conditionLabels(settings).map((label) => (
              <Badge key={label} variant="secondary" className="gap-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <Check className="size-3" />
                {label}
              </Badge>
            ))}
          </div>

          {onReject && !winner.isBackup && (
            <Button
              variant="outline"
              size="sm"
              className="mt-4 text-destructive hover:text-destructive"
              onClick={onReject}
              disabled={rejectDisabled}
            >
              <X className="size-3.5" />
              Відхилити переможця
            </Button>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
