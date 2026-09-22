"use client";

import * as React from "react";
import { AlertCircle, Camera, ImageOff, Loader2, LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

type LoadState = "loading" | "ready" | "error";

export function ConnectPicker() {
  const loadComments = useGiveawayStore((s) => s.loadComments);
  const setPostUrl = useGiveawayStore((s) => s.setPostUrl);

  const [state, setState] = React.useState<LoadState>("loading");
  const [media, setMedia] = React.useState<InstagramMedia[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [selectingId, setSelectingId] = React.useState<string | null>(null);
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

  const handlePick = async (item: InstagramMedia) => {
    setSelectingId(item.id);
    setError(null);
    try {
      const result = await fetchCommentsByMediaId(item.id);
      setPostUrl(item.permalink);
      loadComments(result.comments, result.provider);
      // A full navigation instead of router.push: more reliable across
      // hosting setups than a client-side transition, and the store is
      // already persisted to sessionStorage so nothing is lost.
      window.location.assign("/giveaway");
    } catch (err) {
      setSelectingId(null);
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
    setError(null);
    try {
      const result = await fetchCommentsByUrl(manualUrl);
      setPostUrl(manualUrl);
      loadComments(result.comments, result.provider);
      window.location.assign("/giveaway");
    } catch (err) {
      setSelectingId(null);
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
                  disabled={selectingId !== null}
                  onClick={() => handlePick(item)}
                  className="group relative aspect-square overflow-hidden bg-muted disabled:opacity-60"
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

                  {selectingId === item.id && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/70">
                      <Loader2 className="size-5 animate-spin" />
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
                  disabled={selectingId !== null || manualUrl.trim().length === 0}
                >
                  {selectingId === "manual" ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    "Завантажити коментарі"
                  )}
                </Button>
              </form>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
