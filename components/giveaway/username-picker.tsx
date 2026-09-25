"use client";

import * as React from "react";
import { Plus, Sparkles, X } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { normalizeUsername } from "@/lib/giveaway/filters";

interface UsernamePickerProps {
  label: string;
  placeholder: string;
  value: string[];
  onChange: (next: string[]) => void;
  suggestions: string[];
  /**
   * "include" (the "will definitely win" list): a name with no matching
   * comment is a valid, expected case — it's a guaranteed manual winner
   * — so it's flagged with a neutral, positive marker rather than a
   * warning. "exclude" ("will definitely not win"): flagged as a no-op
   * hint instead, since excluding someone who never commented does
   * nothing.
   */
  mode: "include" | "exclude";
}

const MAX_SUGGESTIONS = 6;

export function UsernamePicker({
  label,
  placeholder,
  value,
  onChange,
  suggestions,
  mode,
}: UsernamePickerProps) {
  const [query, setQuery] = React.useState("");
  const [open, setOpen] = React.useState(false);

  const selectedSet = React.useMemo(
    () => new Set(value.map((v) => normalizeUsername(v))),
    [value],
  );

  const knownSet = React.useMemo(
    () => new Set(suggestions.map((s) => normalizeUsername(s))),
    [suggestions],
  );

  const filteredSuggestions = React.useMemo(() => {
    const term = normalizeUsername(query);
    if (!term) return [];
    return suggestions
      .filter(
        (s) => normalizeUsername(s).includes(term) && !selectedSet.has(normalizeUsername(s)),
      )
      .slice(0, MAX_SUGGESTIONS);
  }, [query, suggestions, selectedSet]);

  const addUsername = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return;
    const normalized = normalizeUsername(trimmed);
    if (selectedSet.has(normalized)) {
      setQuery("");
      setOpen(false);
      return;
    }
    onChange([...value, trimmed.replace(/^@/, "")]);
    setQuery("");
    setOpen(false);
  };

  const removeUsername = (username: string) => {
    onChange(value.filter((v) => v !== username));
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>

      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((username) => {
            const notFound = !knownSet.has(normalizeUsername(username));
            const notFoundTitle =
              mode === "include"
                ? "Цього нікнейму немає серед коментарів — переможе гарантовано, вручну"
                : "Цього нікнейму немає серед коментарів — додавання нічого не змінить";
            return (
              <Badge
                key={username}
                variant="secondary"
                className={
                  notFound && mode === "include"
                    ? "gap-1 border-primary/40 bg-primary/10 py-1 pl-2.5 pr-1.5 text-primary"
                    : notFound
                      ? "gap-1 py-1 pl-2.5 pr-1.5 text-muted-foreground"
                      : "gap-1 py-1 pl-2.5 pr-1.5"
                }
                title={notFound ? notFoundTitle : undefined}
              >
                {notFound && mode === "include" && <Sparkles className="size-3" />}
                @{username}
                <button
                  type="button"
                  aria-label={`Прибрати @${username}`}
                  onClick={() => removeUsername(username)}
                  className="rounded-full p-0.5 hover:bg-foreground/10"
                >
                  <X className="size-3" />
                </button>
              </Badge>
            );
          })}
        </div>
      )}

      <div className="relative">
        <Input
          value={query}
          placeholder={placeholder}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addUsername(query);
            }
          }}
        />

        {open && (filteredSuggestions.length > 0 || query.trim().length > 0) && (
          <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border bg-popover shadow-md">
            {filteredSuggestions.map((s) => (
              <button
                key={s}
                type="button"
                // onMouseDown fires before the input's onBlur, so the click
                // registers before the dropdown closes.
                onMouseDown={(e) => {
                  e.preventDefault();
                  addUsername(s);
                }}
                className="flex w-full items-center px-3 py-2 text-left text-sm hover:bg-accent"
              >
                @{s}
              </button>
            ))}
            {query.trim().length > 0 &&
              !filteredSuggestions.some(
                (s) => normalizeUsername(s) === normalizeUsername(query),
              ) && (
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    addUsername(query);
                  }}
                  className="flex w-full items-center gap-1.5 border-t px-3 py-2 text-left text-sm text-muted-foreground hover:bg-accent"
                >
                  <Plus className="size-3.5" />
                  Додати «{query.trim().replace(/^@/, "")}»
                </button>
              )}
          </div>
        )}
      </div>
    </div>
  );
}
