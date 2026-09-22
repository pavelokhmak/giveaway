import { Gift } from "lucide-react";

import { GiveawayForm } from "@/components/giveaway/giveaway-form";
import { ThemeToggle } from "@/components/theme-toggle";

export default function Home() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden">
      <div
        aria-hidden
        className="giveaway-gradient-ring pointer-events-none absolute -top-40 left-1/2 h-96 w-[36rem] -translate-x-1/2 rounded-full opacity-20 blur-3xl"
      />

      <header className="relative z-10 flex items-center justify-between px-4 py-5">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Gift className="size-5 text-primary" />
          Розіграш Instagram
        </div>
        <ThemeToggle />
      </header>

      <main className="relative z-10 flex flex-1 flex-col items-center justify-center gap-8 px-4 pb-16 text-center">
        <div className="max-w-2xl space-y-3">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            <span className="giveaway-gradient-text">Розіграш призів</span>{" "}
            в Instagram
          </h1>
          <p className="text-balance text-lg text-muted-foreground">
            Встав посилання на пост в Instagram і випадково обери переможців.
          </p>
        </div>

        <GiveawayForm />

        <p className="max-w-md text-xs text-muted-foreground">
          Без акаунтів і бази даних. Усе працює прямо в браузері під час
          цієї сесії — оновлення сторінки почне новий розіграш.
        </p>
      </main>
    </div>
  );
}
