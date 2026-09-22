import type { InstagramComment } from "@/types/giveaway";
import type { InstagramProvider } from "@/lib/instagram/provider";

const FIRST_NAMES = [
  "alex", "maria", "john", "kate", "daniel", "anna", "mike", "olga",
  "chris", "lena", "sam", "nina", "ivan", "julia", "max", "sofia",
  "leo", "vera", "tom", "dasha", "ben", "irina", "jake", "polina",
  "noah", "katya", "liam", "masha", "ethan", "yana", "ryan", "lera",
  "adam", "vika", "eric", "milla", "paul", "zara", "carl", "rita",
];

// A handful of names appear with varied casing/whitespace so
// normalizeUsername has real duplicates to collapse.
const CASE_VARIANTS = (base: string, i: number): string => {
  const suffix = i % 5;
  if (suffix === 0) return base.toUpperCase();
  if (suffix === 1) return base[0].toUpperCase() + base.slice(1);
  if (suffix === 2) return ` ${base} `;
  return base;
};

function usernameAt(index: number): string {
  const base = FIRST_NAMES[index % FIRST_NAMES.length];
  const cycle = Math.floor(index / FIRST_NAMES.length);
  const decorated = cycle === 0 ? base : `${base}${cycle + 1}`;
  return CASE_VARIANTS(decorated, index);
}

const EMOJI = ["🔥", "🎉", "✨", "❤️", "😍", "🙌", "🎁", "💯"];

type TemplateCtx = { mention: string; mention2: string; emoji: string };

const TEMPLATES: Array<(ctx: TemplateCtx) => string> = [
  () => `Participating!`,
  (c) => `Participating! ${c.mention}`,
  (c) => `Let's go ${c.emoji} ${c.mention}`,
  (c) => `GIVEAWAY ${c.mention} ${c.mention2}`,
  (c) => `giveaway please ${c.emoji}`,
  () => `I want to win this so bad`,
  (c) => `Tagging ${c.mention} for the giveaway ${c.emoji}`,
  (c) => `${c.mention} look at this!`,
  () => `Беру участь! Дуже хочу виграти цей розіграш`,
  (c) => `РОЗІГРАШ ${c.emoji} відмічаю ${c.mention}`,
  (c) => `Would love to win, tagging ${c.mention} and ${c.mention2}`,
  () => `nice`,
  () => `🔥🔥🔥`,
  (c) => `Count me in ${c.emoji}`,
  (c) => `GIVEAWAY! ${c.mention}`,
  (c) => `Відмічаю друга ${c.mention} ${c.emoji}`,
  () => `Hope I win this time!`,
  (c) => `${c.mention} ${c.mention2} давайте разом спробуємо`,
  () => `Класно, беру участь у розіграші РОЗІГРАШ`,
  (c) => `just here for the giveaway ${c.emoji}`,
];

function hashStringToInt(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function pick<T>(arr: T[], seed: number): T {
  return arr[seed % arr.length];
}

/**
 * Deterministically generates a diverse set of fake comments so the demo
 * looks the same across reloads: duplicate usernames (varied casing),
 * comments with/without mentions, keyword/no-keyword, emoji, and both
 * English and Ukrainian text.
 */
export function generateDemoComments(count = 500): InstagramComment[] {
  const comments: InstagramComment[] = [];
  const baseTime = Date.now();

  for (let i = 0; i < count; i++) {
    const seed = hashStringToInt(`comment-${i}`);
    const username = usernameAt(seed % (FIRST_NAMES.length * 4));

    const mentionIndex = hashStringToInt(`mention-${i}`) % FIRST_NAMES.length;
    const mention2Index = hashStringToInt(`mention2-${i}`) % FIRST_NAMES.length;
    const emoji = pick(EMOJI, hashStringToInt(`emoji-${i}`));

    const ctx: TemplateCtx = {
      mention: `@${FIRST_NAMES[mentionIndex]}`,
      mention2: `@${FIRST_NAMES[mention2Index]}`,
      emoji,
    };

    const template = pick(TEMPLATES, seed);
    const text = template(ctx);

    comments.push({
      id: `demo-${i}`,
      username,
      text,
      createdAt: new Date(baseTime - i * 60_000).toISOString(),
      userId: `demo-user-${seed % (FIRST_NAMES.length * 4)}`,
    });
  }

  return comments;
}

export class DemoInstagramProvider implements InstagramProvider {
  readonly name = "demo" as const;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getComments(url: string): Promise<InstagramComment[]> {
    // Simulate a brief network delay so the loading UI has something to show.
    await new Promise((resolve) => setTimeout(resolve, 400));
    return generateDemoComments(500);
  }
}
