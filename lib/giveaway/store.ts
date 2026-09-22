import { create } from "zustand";

import type {
  GiveawaySettings,
  InstagramComment,
  Winner,
} from "@/types/giveaway";

export const DEFAULT_SETTINGS: GiveawaySettings = {
  winnerCount: 3,
  backupCount: 2,
  entryMode: "unique",
  keywordEnabled: false,
  keyword: "GIVEAWAY",
  keywordMode: "contains",
  requireMention: false,
  minimumMentions: 1,
  excludePreviousWinners: true,
  excludedUsernames: [],
  minimumCommentLength: undefined,
};

export type DrawPhase =
  | "idle"
  | "settings"
  | "drawing"
  | "results";

interface GiveawayStoreState {
  postUrl: string;
  provider: "demo" | "meta" | null;
  comments: InstagramComment[];
  settings: GiveawaySettings;
  phase: DrawPhase;
  winners: Winner[];
  backups: Winner[];
  rejectedWinners: Winner[];
  allTimeWinnerUsernames: string[];

  setPostUrl: (url: string) => void;
  loadComments: (
    comments: InstagramComment[],
    provider: "demo" | "meta",
  ) => void;
  updateSettings: (partial: Partial<GiveawaySettings>) => void;
  goToSettings: () => void;
  startDraw: () => void;
  setDrawResult: (winners: Winner[], backups: Winner[]) => void;
  finishDraw: () => void;
  rejectWinner: (username: string) => void;
  reset: () => void;
}

export const useGiveawayStore = create<GiveawayStoreState>((set, get) => ({
  postUrl: "",
  provider: null,
  comments: [],
  settings: DEFAULT_SETTINGS,
  phase: "idle",
  winners: [],
  backups: [],
  rejectedWinners: [],
  allTimeWinnerUsernames: [],

  setPostUrl: (url) => set({ postUrl: url }),

  loadComments: (comments, provider) =>
    set({ comments, provider, phase: "settings" }),

  updateSettings: (partial) =>
    set((state) => ({ settings: { ...state.settings, ...partial } })),

  goToSettings: () => set({ phase: "settings" }),

  startDraw: () => set({ phase: "drawing", winners: [], backups: [] }),

  setDrawResult: (winners, backups) => set({ winners, backups }),

  finishDraw: () =>
    set((state) => ({
      phase: "results",
      allTimeWinnerUsernames: [
        ...state.allTimeWinnerUsernames,
        ...state.winners.map((w) => w.username),
      ],
    })),

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
}));
