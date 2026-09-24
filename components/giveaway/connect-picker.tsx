"use client";

import * as React from "react";
import { AlertCircle, Camera, ImageOff, Loader2, LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  fetchCommentsByMediaId,
  fetchCommentsByUrl,
  fetchRecentMedia,
  FetchCommentsError,
} from "@/lib/instagram/client";
import { useGiveawayStore } from "@/lib/giveaway/store";
import type { InstagramMedia } from "@/lib/instagram/provider";
import type { InstagramComment } from "@/types/giveaway";

type LoadState = "loading" | "ready" | "error";

export function ConnectPicker() {
  const loadComments = useGiveawayStore((s) => s.loadComments);
  const setPostUrl = useGiveawayStore((s) => s.setPostUrl);

  const [state, setState] = React.useState<LoadState>("loading");
  const [media, setMedia] = React.useState<InstagramMedia[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [selectingId, setSelectingId] = React.useState<string | null>(null);
  const [progress, setProgress] = React.useState(0);
  const [manualUrl, setManualUrl] = React.useState("");
  const [showManual, setShowManual] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    fetchRecentMedia()
      .then((items) => {
        if (cancelled) return;
        setMedia(items);
        setState("ready");
      })
      .catch((err) => {
        if (cancelled) return;
        setError(
          err instanceof FetchCommentsError
            ? err.message
            : "Не вдалося завантажити ваші публікації.",
        );
        setState("error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const goToGiveaway = (comments: InstagramComment[]) => {
    if (comments.length === 0) {
      setSelectingId(null);
      setError(
        "У цього поста ще немає коментарів (або їх не вдалося отримати). Оберіть інший пост.",
      );
      return;
    }
    setProgress(100);
    // A full navigation instead of router.push: more reliable across
    // hosting setups than a client-side transition. A tiny delay before
    // navigating gives the just-written sessionStorage a moment to
    // settle before the page unloads.
    setTimeout(() => window.location.assign("/giveaway/settings"), 250);
  };

  const runLoad = async (load: () => Promise<{ comments: InstagramComment[]; provider: "meta" }>, postUrl: string) => {
    setError(null);
    setProgress(0);

    const interval = setInterval(() => {
      setProgress((p) => (p < 90 ? p + Math.random() * 12 : p));
    }, 180);

    try {
      const result = await load();
      clearInterval(interval);
      setPostUrl(postUrl);
      loadComments(result.comments, result.provider);
      goToGiveaway(result.comments);
    } catch (err) {
      clearInterval(interval);
      setSelectingId(null);
      setProgress(0);
      throw err;
    }
  };

  const handlePick = async (item: InstagramMedia) => {
    setSelectingId(item.id);
    try {
      await runLoad(() => fetchCommentsByMediaId(item.id), item.permalink);
    } catch (err) {
      setError(
        err instanceof FetchCommentsError
          ? err.message
          : "Не вдалося завантажити коментарі цього поста.",
      );
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSelectingId("manual");
    try {
      await runLoad(() => fetchCommentsByUrl(manualUrl), manualUrl);
    } catch (err) {
      setError(
        err instanceof FetchCommentsError
          ? err.message
          : "Не вдалося завантажити коментарі за цим посиланням.",
      );
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/instagram/logout", { method: "POST" });
    window.location.assign("/");
  };

  if (selectingId !== null) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
        <Loader2 className="size-8 animate-spin text-primary" />
        <div className="w-full max-w-xs space-y-2">
          <p className="text-sm font-medium">Завантаження коментарів…</p>
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-muted-foreground">{Math.round(progress)}%</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-background px-4 py-3">
        <h1 className="text-base font-semibold">Оберіть пост</h1>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" aria-label="Вийти" onClick={handleLogout}>
            <LogOut className="size-5" />
          </Button>
          <ThemeToggle />
        </div>
      </header>

      <main className="py-3">
        {error && (
          <div className="px-4 pb-4">
            <Alert variant="destructive">
              <AlertCircle className="size-4" />
              <AlertTitle>Помилка</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </div>
        )}

        {state === "loading" && (
          <div className="flex flex-col items-center gap-3 py-16 text-center text-muted-foreground">
            <Loader2 className="size-6 animate-spin" />
            <p className="text-sm">Завантаження ваших публікацій…</p>
          </div>
        )}

        {state === "error" && (
          <div className="px-4">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setState("loading");
                setError(null);
                fetchRecentMedia()
                  .then((items) => {
                    setMedia(items);
                    setState("ready");
                  })
                  .catch((err) => {
                    setError(
                      err instanceof FetchCommentsError
                        ? err.message
                        : "Не вдалося завантажити ваші публікації.",
                    );
                    setState("error");
                  });
              }}
            >
              Спробувати ще раз
            </Button>
          </div>
        )}

        {state === "ready" && (
          <>
            {media.length === 0 && (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                У вас ще немає публікацій.
              </p>
            )}
            <div className="grid grid-cols-3 gap-px bg-border">
              {media.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handlePick(item)}
                  className="group relative aspect-square overflow-hidden bg-muted"
                >
                  {item.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.thumbnailUrl}
                      alt=""
                      className="size-full object-cover transition-transform group-active:scale-95"
                    />
                  ) : (
                    <div className="flex size-full items-center justify-center">
                      <ImageOff className="size-5 text-muted-foreground" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </>
        )}

        {state !== "loading" && (
          <div className="px-4 pt-4">
            {!showManual ? (
              <button
                type="button"
                onClick={() => setShowManual(true)}
                className="text-sm text-muted-foreground underline underline-offset-4"
              >
                Не бачите потрібний пост? Вставте посилання вручну
              </button>
            ) : (
              <form onSubmit={handleManualSubmit} className="space-y-2">
                <label htmlFor="manual-url" className="text-sm font-medium">
                  Посилання на ваш пост в Instagram
                </label>
                <div className="relative">
                  <Camera className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="manual-url"
                    value={manualUrl}
                    onChange={(e) => setManualUrl(e.target.value)}
                    placeholder="https://www.instagram.com/p/..."
                    className="pl-9"
                    autoComplete="off"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={manualUrl.trim().length === 0}
                >
                  Завантажити коментарі
                </Button>
              </form>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
