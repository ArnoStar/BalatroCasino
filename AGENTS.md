# AGENTS.md

Rules for anyone, human or agent, changing this repository. `README.md`
describes the casino; this file says how to work on it.

## What this project is

The casino of Balatro in the browser: players stake the collectible items
they found by playing (BalatroItemService) against each other's, in
coinflips, dice games and the jackpot, live and provably fair. It is its own
front end, served at `/casino/` on the site's one origin, next to the portal
(`/`) and the game (`/play/`).

## Non-negotiable rules

1. **The item service decides everything.** Who may stake, what a stake must
   be worth, who wins: the casino shows what BalatroItemService says and asks
   it to act. Never decide a game here, never compute a winner but to *check*
   one (`shared/lib/fair.ts`). What the page shows before asking (a match's
   range, a chance) mirrors the service and is only a preview.
2. **Player against player.** No house, no cut, nothing made or kept by the
   casino (the item service's rule 7). Don't add a game the service can't
   play by that rule (no cases, no crash, no roulette against the house).
3. **Provably fair, shown.** Every game's page checks its own draw in the
   browser; `/fair` checks any draw from its numbers alone. The player's seed
   is theirs to choose. Never show a server seed the service hasn't shown.
4. **One origin, one session.** `src/shared/api/session.ts` is the same file
   as BalatroPortal's and BalatroFrontEnd's: change the three together (and
   the identity service's `docs/integration.md`). Refresh only through
   `refresh_session`. Signing in and out is the portal's (`/login?next=`).
5. **One language for the site.** `src/shared/i18n/language.ts` is the same
   file as the portal's: the choice lives in the game's settings
   (`balatro-fe.settings`), so the portal, the casino and the game agree.
   Every text the player reads is in `shared/i18n/messages` (English first;
   each language has every key: TypeScript checks it). Player names never
   take a gendered verb (Russian has them): "Ann wins", not "Ann won".
6. **Errors are the services' problem details.** Show `describe(error)`
   (`useI18n`): it switches on `error.code`, never on the message.

## Architecture (Feature-Sliced Design)

```
app  →  pages  →  widgets  →  features  →  entities  →  shared
```

A layer imports only the layers to its right; slices of one layer don't
import each other; every slice exposes its public API in `index.ts`.
`npm run lint` (Steiger) enforces it. A slice exists once two places use it.

- `shared/api`: the only place that calls `fetch` (items, social, the live stream, the session).
- `entities/casino`: the player, their items and the live state (`CasinoProvider`,
  `useCasino`, `useCasinoNews`); game helpers and pictures (the coin, the dice's
  line, the pot's bar).
- `app/result-host.tsx`: a game of the player's that is drawn opens its stage,
  wherever they are.

## Conventions

- TypeScript strict. Functions and variables in snake_case, like the game and
  the portal, except React components and hooks.
- Styles in `src/app/styles/`, one file per concern, imported in order by
  `index.css`: `tokens.css` first (colours, type, shape: use the variables),
  `motion.css` last. Keep labels on every control, make focus visible, and
  respect `prefers-reduced-motion`: CSS animations are stilled by
  `motion.css`; a timed reveal in JS waits 0 ms (`reveal_delay`,
  `use_revealed`), and the wheel stands on its roll at once.
- Sounds are made by the browser (`shared/lib/sound.ts`, Web Audio), never
  downloaded; the player can switch them off.
- Fonts are self-hosted (Fontsource): no request to a third-party service.

## Commands

```
npm install
npm run dev         # (make run) :5175/casino/, the services on their dev ports
npm run check       # (make check) typecheck + lint
npm run build
```

All checks must pass before committing. Don't commit or push unless asked.
