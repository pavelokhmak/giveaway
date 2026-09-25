"use client";

import * as React from "react";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { UsernamePicker } from "@/components/giveaway/username-picker";
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
  usernameSuggestions: string[];
}

function CountField({
  label,
  presets,
  value,
  min,
  onChange,
}: {
  label: string;
  presets: number[];
  value: number;
  min: number;
  onChange: (n: number) => void;
}) {
  const [customMode, setCustomMode] = React.useState(!presets.includes(value));

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select
        value={customMode ? "custom" : String(value)}
        onValueChange={(next) => {
          if (next === "custom") {
            setCustomMode(true);
            return;
          }
          setCustomMode(false);
          onChange(Number(next));
        }}
      >
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {presets.map((n) => (
            <SelectItem key={n} value={String(n)}>
              {n}
            </SelectItem>
          ))}
          <SelectItem value="custom">Інше</SelectItem>
        </SelectContent>
      </Select>
      {customMode && (
        <Input
          type="number"
          inputMode="numeric"
          min={min}
          value={value}
          onChange={(e) => onChange(Math.max(min, Number(e.target.value) || min))}
          autoFocus
        />
      )}
    </div>
  );
}

export function GiveawaySettingsPanel({
  settings,
  onChange,
  usernameSuggestions,
}: GiveawaySettingsPanelProps) {
  return (
    <div className="space-y-6">
      <CountField
        label="Кількість переможців"
        presets={WINNER_COUNT_PRESETS}
        value={settings.winnerCount}
        min={1}
        onChange={(winnerCount) => onChange({ winnerCount })}
      />

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
          <div className="space-y-1.5">
            <Label htmlFor="keyword">Ключове слово</Label>
            <Input
              id="keyword"
              value={settings.keyword}
              onChange={(e) => onChange({ keyword: e.target.value })}
              placeholder="Мені пощастить"
            />
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

      <div className="space-y-4">
        <UsernamePicker
          label="Виграють точно"
          placeholder="Почніть вводити нікнейм…"
          value={settings.includedUsernames}
          onChange={(includedUsernames) => onChange({ includedUsernames })}
          suggestions={usernameSuggestions}
          mode="include"
        />
        <p className="-mt-2 text-xs text-muted-foreground">
          Ці нікнейми гарантовано виграють — навіть якщо такого коментаря
          немає серед завантажених. Це бачите тільки ви.
        </p>

        <UsernamePicker
          label="Не виграють точно"
          placeholder="Почніть вводити нікнейм…"
          value={settings.excludedUsernames}
          onChange={(excludedUsernames) => onChange({ excludedUsernames })}
          suggestions={usernameSuggestions}
          mode="exclude"
        />
      </div>
    </div>
  );
}
