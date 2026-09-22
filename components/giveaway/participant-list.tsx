"use client";

import * as React from "react";
import { Check, Search, Users } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { looksEligible, reasonLabelUk, visibleReasons } from "@/lib/giveaway/filters";
import type { EligibilityResult } from "@/types/giveaway";

const PAGE_SIZE = 20;

interface ParticipantListProps {
  results: EligibilityResult[];
}

type FilterMode = "all" | "eligible" | "excluded";

export function ParticipantList({ results }: ParticipantListProps) {
  const [search, setSearch] = React.useState("");
  const [filter, setFilter] = React.useState<FilterMode>("all");
  const [page, setPage] = React.useState(0);

  const filtered = React.useMemo(() => {
    const term = search.trim().toLowerCase();
    return results.filter((r) => {
      const eligibleLooking = looksEligible(r);
      if (filter === "eligible" && !eligibleLooking) return false;
      if (filter === "excluded" && eligibleLooking) return false;
      if (term && !r.username.toLowerCase().includes(term)) return false;
      return true;
    });
  }, [results, search, filter]);

  const [appliedFilters, setAppliedFilters] = React.useState({ search, filter });
  if (appliedFilters.search !== search || appliedFilters.filter !== filter) {
    setAppliedFilters({ search, filter });
    setPage(0);
  }

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  return (
    <Card className="gap-4 py-4">
      <CardHeader className="flex flex-col gap-2 px-4">
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="size-4 text-primary" />
          Учасники
        </CardTitle>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Пошук за нікнеймом…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-full pl-8"
          />
        </div>
        <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterMode)}>
          <TabsList className="w-full">
            <TabsTrigger value="all" className="flex-1">Усі</TabsTrigger>
            <TabsTrigger value="eligible" className="flex-1">Проходять</TabsTrigger>
            <TabsTrigger value="excluded" className="flex-1">Не проходять</TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent className="px-4">
        <div className="divide-y rounded-lg border">
          {pageItems.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Немає учасників за цими фільтрами.
            </p>
          )}
          {pageItems.map((r, index) => {
            const reasons = visibleReasons(r.reasons);
            const eligibleLooking = reasons.length === 0;
            return (
              <div
                key={`${page}-${index}-${r.normalizedUsername}-${r.participant.comments[0]?.id}`}
                className="flex items-start justify-between gap-3 px-3 py-2.5"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">@{r.normalizedUsername}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {r.participant.comments[0]?.text}
                  </p>
                </div>
                {eligibleLooking ? (
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <Check className="size-3.5" />
                  </span>
                ) : (
                  <Badge
                    variant="secondary"
                    className="shrink-0 bg-destructive/10 text-[11px] text-destructive"
                    title={reasons.map(reasonLabelUk).join(", ")}
                  >
                    {reasonLabelUk(reasons[0])}
                  </Badge>
                )}
              </div>
            );
          })}
        </div>

        {pageCount > 1 && (
          <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
            <span className="text-xs">
              {page + 1} / {pageCount} · {filtered.length}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                Назад
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= pageCount - 1}
                onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
              >
                Далі
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
