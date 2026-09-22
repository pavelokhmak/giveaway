# Instagram Giveaway Picker

Paste an Instagram post link, import its comments, set fair entry rules, and
randomly pick winners — with a cryptographically secure randomizer and a
polished reveal animation. The UI is in **Ukrainian**, built mobile-first
(this README stays in English for contributors).

This is a deliberately simple, **database-free MVP**. Everything lives in
React/Zustand state for the current browser session. Refresh the page and
the giveaway resets — that's expected, not a bug.

## Pages

- `/` — paste an Instagram post/reel URL and import its comments (no
  Instagram API access required; see **Demo fallback** below).
- `/giveaway` — the organizer's main screen: two numbers (comment count,
  how many pass the current rules) and a searchable/filterable participant
  list. A settings icon in the header opens `/giveaway/settings`; a sticky
  bottom button starts the draw.
- `/giveaway/settings` — a separate screen for winner/backup counts, entry
  mode, keyword/mention rules, and the "can win" / "cannot win" username
  lists. Nothing here is shown anywhere public — it's only visible to
  whoever has the phone.
- Draw, reveal, and results happen on `/giveaway` too, replacing the
  participant list for those phases.

## Features

- Paste an Instagram post/reel URL and import its comments. If
  `INSTAGRAM_ACCESS_TOKEN` isn't configured, this silently falls back to
  realistic demo data (see **Demo fallback**) — there's no visible "demo
  mode" toggle in the UI.
- Configurable entry rules: winner/backup counts (including a **custom**
  value via the "Інше" option — typing your own number always works, not
  just the presets), required keyword (contains/exact), required mentions
  with a minimum count, excluding previous session winners, minimum
  comment length.
- **"Можуть виграти" / "Не можуть виграти"** (can win / cannot win)
  username lists with autocomplete: type a few letters and pick from
  usernames seen in the imported comments, or add any name freeform. The
  "can win" list is a strict allow-list — if it's non-empty, only those
  people are eligible. Both lists live only in `/giveaway/settings`.
- Three entry modes (`EntryMode` in `types/giveaway.ts`), picked in
  Налаштування розіграшу → Голоси:
  - **Один голос на людину** ("unique") — one entry per person.
  - **Кожен коментар — це голос** ("per-comment") — more comments means
    more raffle tickets, i.e. a higher chance of winning.
  - **Кожна відмітка (@) — це голос** ("per-mention") — one entry per
    @mention inside a comment, so tagging more friends means more chances.
    Comments with no mentions don't participate.

  In the ticket-weighted modes, someone can hold many tickets but the
  randomizer still caps them at **one prize**: the shuffle is weighted by
  ticket count, but a person's remaining tickets are skipped once they've
  already won (`drawWinners` in `lib/giveaway/random.ts`).
- A searchable, filterable, paginated participant list showing exactly why
  each entry does or doesn't pass the current rules.
- Cryptographically secure winner selection (`crypto.getRandomValues` with
  rejection sampling + an unbiased Fisher–Yates shuffle) — never
  `Math.random()`.
- Animated draw: a shuffling "drawing…" screen, winners revealed one at a
  time with confetti, then backup winners. Respects
  `prefers-reduced-motion` and has a sound on/off toggle.
- Reject a winner post-draw and the next backup is automatically promoted.
- Export participants or winners as CSV, copy a results summary to the
  clipboard.
- Light/dark theme, built mobile-first (this is meant to be used on a
  phone, not a desktop admin panel).

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) (ideally in a phone-
width viewport or on an actual phone) and paste any Instagram post/reel
URL — no configuration needed, see **Demo fallback**.

## Demo fallback

The app works completely without any Instagram API access. If
`INSTAGRAM_ACCESS_TOKEN` isn't set (the default), every request
automatically and silently falls back to a **Demo Provider** that
generates 500 deterministic fake comments — there's no "Try Demo" button
or "demo mode" badge in the UI; it just works when you paste a
validly-shaped Instagram URL.

## Environment variables

Copy `.env.example` to `.env.local` if you want to try real Instagram data:

```bash
cp .env.example .env.local
```

```
INSTAGRAM_ACCESS_TOKEN=
INSTAGRAM_APP_ID=
INSTAGRAM_APP_SECRET=
```

These are **server-only** — never exposed to the client (they're not
prefixed with `NEXT_PUBLIC_`) — and read only inside the
`/api/instagram/comments` route handler.

## Instagram API setup (optional)

The app never scrapes Instagram HTML, uses cookies, or automates a
browser. The only supported path is the official Meta Graph API:

1. Create a Meta developer app and connect an Instagram **Business or
   Creator** account.
2. Generate a long-lived access token with the `instagram_basic` /
   `instagram_manage_comments` permissions.
3. Set `INSTAGRAM_ACCESS_TOKEN` (and the app id/secret, if you extend the
   OAuth flow) in `.env.local`.

Note: the Graph API only returns comments for media **you manage** — it
has no endpoint to look up an arbitrary public post by URL. `MetaInstagramProvider`
(`lib/instagram/meta-provider.ts`) is wired up to fetch and paginate
comments once a media ID is resolved; mapping a pasted URL to that media ID
depends on which account you connect, so that lookup is left as a clearly
marked extension point (`resolveMediaId`). Without credentials, or if this
throws, the app simply falls back to demo data — nothing breaks.

## Production deployment

This is a stateless Next.js app — no database, no background workers, no
Docker required. Deploy it anywhere that runs Next.js (Vercel, a Node
server, etc.) and set the environment variables above if you want live
Instagram data. Because giveaway state lives only in the browser tab, there
is no persistence, multi-device sync, or server-side audit trail — plan
your workflow (e.g. exporting the results CSV) accordingly.

## Limitations (by design)

- No database, accounts, or auth — state resets on page reload.
- No permanent shareable results URL (see **Copy Results** instead).
- The Meta provider fetches comments for media on a *connected* account;
  it doesn't support arbitrary public post URLs (Instagram's API doesn't
  either).
- Everyone wins at most one prize per draw, in every entry mode — extra
  tickets from "per-comment"/"per-mention" mode only affect the odds of
  being picked, never how many prizes someone can hold.

## Testing

```bash
npm run test       # run once
npm run test:watch # watch mode
```

Covers URL parsing, username normalization, mention extraction, keyword
filtering (contains/exact), the full eligibility filter engine, the
secure randomizer (uniform distribution, no duplicate winners, never
selects an excluded participant, throws when the pool is too small), and
CSV export.

## Project structure

```
app/
  page.tsx                     Landing page
  giveaway/page.tsx            Participant list → draw → results
  giveaway/settings/page.tsx   Organizer-only settings screen
  api/instagram/comments/      Server route: Meta or Demo provider
components/
  giveaway/                    Giveaway-specific UI (incl. username-picker.tsx)
  ui/                          shadcn/ui primitives
lib/
  instagram/                   Provider abstraction (Meta + Demo)
  giveaway/                    Filters, randomizer, CSV, Zustand store
  validations/                 Zod schemas
types/giveaway.ts              Shared types
```
