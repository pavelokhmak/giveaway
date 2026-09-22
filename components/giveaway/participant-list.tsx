"use client";

import * as React from "react";
import { Search, Users } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { reasonLabelUk } from "@/lib/giveaway/filters";
import type { EligibilityResult } from "@/types/giveaway";

const PAGE_SIZE = 10;

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
      if (filter === "eligible" && !r.eligible) return false;
      if (filter === "excluded" && r.eligible) return false;
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
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="size-4 text-primary" />
          Учасники
        </CardTitle>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Пошук за нікнеймом…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 w-full pl-8 sm:w-48"
            />
          </div>
          <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterMode)}>
            <TabsList>
              <TabsTrigger value="all">Усі</TabsTrigger>
              <TabsTrigger value="eligible">Допущені</TabsTrigger>
              <TabsTrigger value="excluded">Виключені</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Нікнейм</TableHead>
                <TableHead>Коментар</TableHead>
                <TableHead className="text-right">Статус</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageItems.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="py-8 text-center text-sm text-muted-foreground">
                    Немає учасників за цими фільтрами.
                  </TableCell>
                </TableRow>
              )}
              {pageItems.map((r, index) => (
                <TableRow
                  key={`${page}-${index}-${r.normalizedUsername}-${r.participant.comments[0]?.id}`}
                >
                  <TableCell className="font-medium">@{r.normalizedUsername}</TableCell>
                  <TableCell className="max-w-[280px] truncate text-muted-foreground">
                    {r.participant.comments[0]?.text}
                  </TableCell>
                  <TableCell className="text-right">
                    {r.eligible ? (
                      <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                        Допущено
                      </Badge>
                    ) : (
                      <Badge
                        variant="secondary"
                        className="bg-destructive/10 text-destructive"
                        title={r.reasons.map(reasonLabelUk).join(", ")}
                      >
                        {r.reasons[0] ? reasonLabelUk(r.reasons[0]) : "Виключено"}
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {pageCount > 1 && (
          <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Сторінка {page + 1} з {pageCount} · {filtered.length} результатів
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
