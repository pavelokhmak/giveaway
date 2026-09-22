"use client";

import * as React from "react";
import { Settings2 } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  RadioGroup,
  RadioGroupItem,
} from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import type { EntryMode, GiveawaySettings } from "@/types/giveaway";

const WINNER_COUNT_PRESETS = [1, 2, 3, 5, 10];
const BACKUP_COUNT_PRESETS = [0, 1, 2, 3, 5];

const ENTRY_MODE_OPTIONS: Array<{
  value: EntryMode;
  title: string;
  description: string;
}> = [
  {
    value: "unique",
    title: "Один голос на людину",
    description: "Кожен учасник має рівний шанс, незалежно від кількості коментарів.",
  },
  {
    value: "per-comment",
    title: "Кожен коментар — це голос",
    description: "Що більше коментарів залишила людина, то більше в неї шансів.",
  },
  {
    value: "per-mention",
    title: "Кожна відмітка (@) — це голос",
    description: "Рахуються лише коментарі з відмітками: більше відміток — більше шансів.",
  },
];

interface GiveawaySettingsPanelProps {
  settings: GiveawaySettings;
  onChange: (partial: Partial<GiveawaySettings>) => void;
}

export function GiveawaySettingsPanel({
  settings,
  onChange,
}: GiveawaySettingsPanelProps) {
  const winnerIsCustom = !WINNER_COUNT_PRESETS.includes(settings.winnerCount);
  const backupIsCustom = !BACKUP_COUNT_PRESETS.includes(settings.backupCount);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Settings2 className="size-4 text-primary" />
          Налаштування розіграшу
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Кількість переможців</Label>
            <Select
              value={winnerIsCustom ? "custom" : String(settings.winnerCount)}
              onValueChange={(value) => {
                if (value === "custom") return;
                onChange({ winnerCount: Number(value) });
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {WINNER_COUNT_PRESETS.map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n}
                  </SelectItem>
                ))}
                <SelectItem value="custom">Інше</SelectItem>
              </SelectContent>
            </Select>
            {winnerIsCustom && (
              <Input
                type="number"
                min={1}
                value={settings.winnerCount}
                onChange={(e) =>
                  onChange({
                    winnerCount: Math.max(1, Number(e.target.value) || 1),
                  })
                }
              />
            )}
          </div>

          <div className="space-y-2">
            <Label>Запасні переможці</Label>
            <Select
              value={backupIsCustom ? "custom" : String(settings.backupCount)}
              onValueChange={(value) => {
                if (value === "custom") return;
                onChange({ backupCount: Number(value) });
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BACKUP_COUNT_PRESETS.map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n}
                  </SelectItem>
                ))}
                <SelectItem value="custom">Інше</SelectItem>
              </SelectContent>
            </Select>
            {backupIsCustom && (
              <Input
                type="number"
                min={0}
                value={settings.backupCount}
                onChange={(e) =>
                  onChange({
                    backupCount: Math.max(0, Number(e.target.value) || 0),
                  })
                }
              />
            )}
          </div>
        </div>

        <Separator />

        <div className="space-y-3">
          <Label>Голоси</Label>
          <RadioGroup
            value={settings.entryMode}
            onValueChange={(value) => onChange({ entryMode: value as EntryMode })}
          >
            {ENTRY_MODE_OPTIONS.map((option) => (
              <label
                key={option.value}
                className="flex cursor-pointer items-start gap-2 text-sm"
              >
                <RadioGroupItem value={option.value} className="mt-0.5" />
                <span>
                  <span className="block">{option.title}</span>
                  <span className="block text-xs text-muted-foreground">
                    {option.description}
                  </span>
                </span>
              </label>
            ))}
          </RadioGroup>
        </div>

        <Separator />

        <div className="space-y-3">
          <label className="flex cursor-pointer items-center justify-between gap-2">
            <span className="text-sm font-medium">Обов&apos;язкове ключове слово</span>
            <Switch
              checked={settings.keywordEnabled}
              onCheckedChange={(checked) =>
                onChange({ keywordEnabled: checked === true })
              }
            />
          </label>
          {settings.keywordEnabled && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="keyword">Ключове слово</Label>
                <Input
                  id="keyword"
                  value={settings.keyword}
                  onChange={(e) => onChange({ keyword: e.target.value })}
                  placeholder="РОЗІГРАШ"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Режим</Label>
                <Select
                  value={settings.keywordMode}
                  onValueChange={(value) =>
                    onChange({
                      keywordMode: value as GiveawaySettings["keywordMode"],
                    })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="contains">Містить</SelectItem>
                    <SelectItem value="exact">Точний збіг</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>

        <Separator />

        <div className="space-y-3">
          <label className="flex cursor-pointer items-center justify-between gap-2">
            <span className="text-sm font-medium">Обов&apos;язкова відмітка (@)</span>
            <Switch
              checked={settings.requireMention}
              onCheckedChange={(checked) =>
                onChange({ requireMention: checked === true })
              }
            />
          </label>
          {settings.requireMention && (
            <div className="space-y-1.5">
              <Label>Мінімум відміток</Label>
              <Select
                value={String(settings.minimumMentions)}
                onValueChange={(value) =>
                  onChange({ minimumMentions: Number(value) })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3].map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <Separator />

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="excluded">Виключити користувачів</Label>
            <Textarea
              id="excluded"
              placeholder={"john\nmaria\nalex"}
              value={settings.excludedUsernames.join("\n")}
              onChange={(e) =>
                onChange({
                  excludedUsernames: e.target.value
                    .split(/\r?\n/)
                    .map((u) => u.trim())
                    .filter(Boolean),
                })
              }
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              По одному нікнейму на рядок. @, регістр і пробіли не важливі.
            </p>
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <Checkbox
              checked={settings.excludePreviousWinners}
              onCheckedChange={(checked) =>
                onChange({ excludePreviousWinners: checked === true })
              }
            />
            Виключити переможців цієї сесії
          </label>
        </div>
      </CardContent>
    </Card>
  );
}
