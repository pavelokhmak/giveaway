"use client";

import * as React from "react";
import { AlertTriangle, Plus, X } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { normalizeUsername } from "@/lib/giveaway/filters";

interface UsernamePickerProps {
  label: string;
  placeholder: string;
  value: string[];
  onChange: (next: string[]) => void;
  suggestions: string[];
}

const MAX_SUGGESTIONS = 6;

export function UsernamePicker({
  label,
  placeholder,
  value,
  onChange,
  suggestions,
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
            return (
              <Badge
                key={username}
                variant="secondary"
                className={
                  notFound
                    ? "gap-1 border-amber-500/50 bg-amber-500/10 py-1 pl-2.5 pr-1.5 text-amber-600 dark:text-amber-400"
                    : "gap-1 py-1 pl-2.5 pr-1.5"
                }
                title={
                  notFound
                    ? "Цей нікнейм не знайдено серед коментарів під постом"
                    : undefined
                }
              >
                {notFound && <AlertTriangle className="size-3" />}
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
