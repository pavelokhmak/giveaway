"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { Camera, Loader2, Sparkles, ArrowRight, AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { fetchComments, FetchCommentsError } from "@/lib/instagram/client";
import { useGiveawayStore } from "@/lib/giveaway/store";

type LoadState = "idle" | "loading" | "error";

export function GiveawayForm() {
  const router = useRouter();
  const loadComments = useGiveawayStore((s) => s.loadComments);
  const setPostUrl = useGiveawayStore((s) => s.setPostUrl);

  const [url, setUrl] = React.useState("");
  const [state, setState] = React.useState<LoadState>("idle");
  const [error, setError] = React.useState<string | null>(null);
  const [progress, setProgress] = React.useState(0);
  const [total, setTotal] = React.useState(0);
  const [activeSource, setActiveSource] = React.useState<"url" | "demo" | null>(null);

  const runImport = React.useCallback(
    async (targetUrl: string, demo: boolean) => {
      setState("loading");
      setError(null);
      setProgress(0);
      setTotal(demo ? 500 : 0);
      setActiveSource(demo ? "demo" : "url");

      const interval = setInterval(() => {
        setProgress((p) => (p < 92 ? p + Math.random() * 14 : p));
      }, 140);

      try {
        const result = await fetchComments(targetUrl, { demo });
        clearInterval(interval);
        setProgress(100);
        setTotal(result.comments.length);
        setPostUrl(targetUrl);
        await new Promise((resolve) => setTimeout(resolve, 350));
        loadComments(result.comments, result.provider);
        router.push("/giveaway");
      } catch (err) {
        clearInterval(interval);
        setState("error");
        setError(
          err instanceof FetchCommentsError
            ? err.message
            : "Помилка мережі. Перевірте з'єднання і спробуйте ще раз.",
        );
      }
    },
    [loadComments, router, setPostUrl],
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void runImport(url, false);
  };

  const handleDemo = () => {
    void runImport("https://instagram.com/p/demo-giveaway/", true);
  };

  const isLoading = state === "loading";

  return (
    <div className="w-full max-w-lg">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="rounded-2xl border bg-card p-6 shadow-sm sm:p-8"
      >
        {isLoading ? (
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <Loader2 className="size-8 animate-spin text-primary" />
            <div className="w-full space-y-2">
              <p className="text-sm font-medium">Завантаження коментарів…</p>
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {activeSource === "demo"
                  ? `${Math.round((progress / 100) * total)} / ${total}`
                  : `${Math.round(progress)}%`}
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="ig-url" className="text-sm font-medium">
                Посилання на пост в Instagram
              </label>
              <div className="relative">
                <Camera className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="ig-url"
                  type="text"
                  inputMode="url"
                  placeholder="Встав посилання на пост в Instagram"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="pl-9"
                  autoComplete="off"
                />
              </div>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="size-4" />
                <AlertTitle>Не вдалося завантажити коментарі</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" className="w-full" size="lg">
              Завантажити коментарі
              <ArrowRight className="size-4" />
            </Button>

            <div className="relative py-1 text-center">
              <span className="relative z-10 bg-card px-2 text-xs text-muted-foreground">
                або
              </span>
              <div className="absolute inset-x-0 top-1/2 h-px bg-border" />
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              size="lg"
              onClick={handleDemo}
            >
              <Sparkles className="size-4" />
              Спробувати демо
            </Button>
          </form>
        )}
      </motion.div>
    </div>
  );
}
