import * as React from "react";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

import type {
  GiveawaySettings,
  InstagramComment,
  Winner,
} from "@/types/giveaway";

export const DEFAULT_SETTINGS: GiveawaySettings = {
  winnerCount: 3,
  backupCount: 0,
  entryMode: "unique",
  keywordEnabled: false,
  keyword: "Мені пощастить",
  keywordMode: "contains",
  requireMention: false,
  minimumMentions: 1,
  excludedUsernames: [],
  includedUsernames: [],
  minimumCommentLength: undefined,
};

export type DrawPhase =
  | "idle"
  | "settings"
  | "drawing"
  | "results";

interface GiveawayStoreState {
  postUrl: string;
  provider: "meta" | null;
  comments: InstagramComment[];
  settings: GiveawaySettings;
  phase: DrawPhase;
  winners: Winner[];
  backups: Winner[];
  rejectedWinners: Winner[];

  setPostUrl: (url: string) => void;
  loadComments: (
    comments: InstagramComment[],
    provider: "meta",
  ) => void;
  updateSettings: (partial: Partial<GiveawaySettings>) => void;
  goToSettings: () => void;
  startDraw: () => void;
  setDrawResult: (winners: Winner[], backups: Winner[]) => void;
  finishDraw: () => void;
  rejectWinner: (username: string) => void;
  reset: () => void;
}

/**
 * Persisted to sessionStorage (not localStorage) so it survives normal
 * client-side navigation between pages — and even an accidental full page
 * reload mid-flow — but still clears when the tab/browser session ends,
 * matching the "no database, session-only" design.
 */
export const useGiveawayStore = create<GiveawayStoreState>()(
  persist(
    (set, get) => ({
      postUrl: "",
      provider: null,
      comments: [],
      settings: DEFAULT_SETTINGS,
      phase: "idle",
      winners: [],
      backups: [],
      rejectedWinners: [],

      setPostUrl: (url) => set({ postUrl: url }),

      loadComments: (comments, provider) =>
        set({ comments, provider, phase: "settings" }),

      updateSettings: (partial) =>
        set((state) => ({ settings: { ...state.settings, ...partial } })),

      goToSettings: () => set({ phase: "settings" }),

      startDraw: () => set({ phase: "drawing", winners: [], backups: [] }),

      setDrawResult: (winners, backups) => set({ winners, backups }),

      finishDraw: () => set({ phase: "results" }),

      rejectWinner: (username) => {
        const state = get();
        const rejected = state.winners.find((w) => w.username === username);
        if (!rejected) return;

        const remainingWinners = state.winners.filter(
          (w) => w.username !== username,
        );

        const [replacement, ...restBackups] = state.backups;

        if (replacement) {
          const promoted: Winner = {
            ...replacement,
            position: rejected.position,
            isBackup: false,
          };
          set({
            winners: [...remainingWinners, promoted].sort(
              (a, b) => a.position - b.position,
            ),
            backups: restBackups.map((b, i) => ({ ...b, position: i + 1 })),
            rejectedWinners: [...state.rejectedWinners, rejected],
          });
        } else {
          set({
            winners: remainingWinners,
            rejectedWinners: [...state.rejectedWinners, rejected],
          });
        }
      },

      reset: () =>
        set({
          postUrl: "",
          provider: null,
          comments: [],
          settings: DEFAULT_SETTINGS,
          phase: "idle",
          winners: [],
          backups: [],
          rejectedWinners: [],
        }),
    }),
    {
      name: "giveaway-session",
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
);

/**
 * True once the store has finished restoring from sessionStorage.
 * Restoring is asynchronous even though sessionStorage itself is
 * synchronous, so a guard like "no comments -> redirect home" must wait
 * for this before checking — otherwise it sees the pre-hydration empty
 * state and bounces away even though the real data is about to load.
 */
export function useGiveawayStoreHydrated(): boolean {
  return React.useSyncExternalStore(
    (onChange) => useGiveawayStore.persist.onFinishHydration(onChange),
    () => useGiveawayStore.persist.hasHydrated(),
    () => false,
  );
}
