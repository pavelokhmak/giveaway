# Instagram Giveaway Picker

Log in with Instagram, pick one of your own posts, set fair entry rules, and
randomly pick winners from its comments — with a cryptographically secure
randomizer and a polished reveal animation. The UI is in **Ukrainian**,
built mobile-first (this README stays in English for contributors).

This is a deliberately simple, **database-free MVP**. Everything lives in
React/Zustand state and an httpOnly session cookie for the current browser.
Refresh the page and the giveaway (not the login) resets — that's expected,
not a bug.

## Pages

- `/` — "Увійти через Instagram" (log in with Instagram). Redirects
  straight to `/connect` if already logged in.
- `/connect` — lists the logged-in account's own recent posts (tap one to
  load its comments), with a "paste a link to your own post" fallback for
  older posts not in the list. Requires a session; redirects to `/` if
  there isn't one.
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

- **Real Instagram data only** — logging in via OAuth ("Business Login for
  Instagram") is required; there's no demo/fake-data fallback anymore.
  Meta's API only ever returns comments for posts the logged-in account
  itself owns (see **Limitations**).
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
cp .env.example .env.local   # then fill in INSTAGRAM_APP_ID / INSTAGRAM_APP_SECRET
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) (ideally in a phone-
width viewport or on an actual phone) and log in — see **Instagram API
setup** below for the one-time Meta app configuration this requires.

## Environment variables

```
INSTAGRAM_APP_ID=
INSTAGRAM_APP_SECRET=
```

Both are **server-only** — never exposed to the client (not prefixed with
`NEXT_PUBLIC_`). See `.env.example` for where to get them. Without these,
"Увійти через Instagram" fails immediately with a clear error instead of
silently doing nothing.

## Instagram API setup (required)

The app never scrapes Instagram HTML, stores your password, or automates a
browser — it's real OAuth ("Business Login for Instagram", Meta's current,
Facebook-Page-free login flow for Instagram Business/Creator accounts):

1. Create an app at [developers.facebook.com/apps](https://developers.facebook.com/apps),
   add the **Instagram** product, use case **Business Login for Instagram**.
2. Under that product's settings, add a **Valid OAuth Redirect URI** for
   every environment you'll use, exactly:
   `<your-app-origin>/api/auth/instagram/callback`
   (e.g. `http://localhost:3000/api/auth/instagram/callback` for local dev).
3. Copy the **Instagram App ID** / **Instagram App Secret** into
   `INSTAGRAM_APP_ID` / `INSTAGRAM_APP_SECRET`.
4. While the app is in **Development** mode (the default — no App Review
   needed), add each Instagram account that should be able to log in as an
   **Instagram tester** under App Roles, and accept the invite from that
   account's Instagram settings. This is enough for personal or small-group
   use; going public to arbitrary users requires Meta's App Review.

Once logged in, `MetaInstagramProvider` (`lib/instagram/meta-provider.ts`)
lists the account's own recent media (`getRecentMedia`) for the `/connect`
picker, and fetches paginated comments for a chosen media id
(`getCommentsByMediaId`). Pasting a link instead is also supported —
`resolveMediaId` matches it against the account's own recent media by
permalink, since the Graph API has no direct "look up by shortcode"
endpoint; very old posts outside the searched page range won't match, in
which case picking from the list is the reliable path.

The session (access token + Instagram user id) lives in a single httpOnly
cookie set after the OAuth callback (`lib/instagram/session.ts`) — no
database, and it works independently for as many different people as log
in, each seeing only their own posts.

## Production deployment

This is a stateless Next.js app — no database, no background workers, no
Docker required. Deploy it anywhere that runs Next.js (Vercel, a Node
server, etc.), set the environment variables above, and register that
deployment's own origin as an additional OAuth redirect URI in the Meta
app. Because giveaway state lives only in the browser tab (the session
cookie aside), there is no persistence, multi-device sync, or server-side
audit trail — plan your workflow (e.g. exporting the results CSV)
accordingly.

## Limitations (by design)

- No database — state resets on page reload (except the login session,
  which persists via cookie for ~60 days).
- No permanent shareable results URL (see **Copy Results** instead).
- Comments can only be pulled from posts the **logged-in account itself
  owns** — Meta's API has no way to fetch another account's comments, and
  this app doesn't scrape around that restriction.
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
  page.tsx                      Login screen (redirects to /connect if logged in)
  connect/page.tsx               Pick one of your own posts
  giveaway/page.tsx              Participant list → draw → results
  giveaway/settings/page.tsx     Organizer-only settings screen
  api/auth/instagram/            OAuth login/callback/logout routes
  api/instagram/comments/        Comments for a media id or pasted URL
  api/instagram/media/           The logged-in account's recent posts
components/
  giveaway/                      Giveaway-specific UI (incl. connect-picker.tsx,
                                  username-picker.tsx)
  ui/                            shadcn/ui primitives
lib/
  instagram/                     Provider (meta-provider.ts), oauth.ts, session.ts
  giveaway/                      Filters, randomizer, CSV, Zustand store
  validations/                   Zod schemas
types/giveaway.ts                Shared types
```
