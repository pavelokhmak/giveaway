"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check } from "lucide-react";

import { useGiveawayStore, useGiveawayStoreHydrated } from "@/lib/giveaway/store";
import { getUsernameSuggestions } from "@/lib/giveaway/filters";
import { GiveawaySettingsPanel } from "@/components/giveaway/giveaway-settings";
import { Button } from "@/components/ui/button";

export default function GiveawaySettingsPage() {
  const router = useRouter();

  const comments = useGiveawayStore((s) => s.comments);
  const phase = useGiveawayStore((s) => s.phase);
  const settings = useGiveawayStore((s) => s.settings);
  const updateSettings = useGiveawayStore((s) => s.updateSettings);
  const hydrated = useGiveawayStoreHydrated();

  React.useEffect(() => {
    if (!hydrated) return;
    if (comments.length === 0) {
      router.replace("/");
    } else if (phase === "drawing" || phase === "results") {
      router.replace("/giveaway");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, comments.length, phase]);

  const usernameSuggestions = React.useMemo(
    () => getUsernameSuggestions(comments),
    [comments],
  );

  if (!hydrated || comments.length === 0 || phase === "drawing" || phase === "results") {
    return null;
  }

  return (
    <div className="min-h-screen pb-24">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b bg-background px-4 py-3">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Назад"
          onClick={() => router.push("/giveaway")}
        >
          <ArrowLeft className="size-5" />
        </Button>
        <h1 className="text-base font-semibold">Налаштування розіграшу</h1>
      </header>

      <main className="px-4 py-5">
        <GiveawaySettingsPanel
          settings={settings}
          onChange={updateSettings}
          usernameSuggestions={usernameSuggestions}
        />
      </main>

      <div className="fixed inset-x-0 bottom-0 z-10 border-t bg-background p-4">
        <Button
          size="lg"
          className="w-full"
          onClick={() => router.push("/giveaway")}
        >
          <Check className="size-4" />
          Готово
        </Button>
      </div>
    </div>
  );
}
