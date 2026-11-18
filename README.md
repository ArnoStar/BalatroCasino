# BalatroCasino

The casino of Balatro in the browser: players stake their collectible cards
(jokers, tarot, planet and spectral cards, playing cards:
[BalatroItemService](../BalatroItemService)) against each other's, each worth
its value in coins (the same coins their runs earn, shown in the top bar). **Player against player**: the casino has no items of its own, takes
nothing, and every draw can be checked in the browser.

- **Coinflip**: Chips or Mult. Stake items on a side; another player matches
  them with items worth about as much, and the coin is flipped at once.
- **Dice**: the same duel at the chance you choose, from 5% to 95%. A long
  shot stakes little against much; a safe bet much against little. The first
  part of the pot is yours: a roll under it wins.
- **Jackpot**: one pot for everyone, drawn a minute after its second player
  comes in, on a wheel that spins for everyone at once. Your chance is your
  share.
- **Challenges**: a coinflip or a dice game can name the only player who may
  join it (a friend, or anyone found by name); *Challenge them again* after a
  game.
- **Live**: everything moves as it happens (the item service's event
  stream): games appear, are joined and drawn on every screen; a game of
  yours that is drawn opens its stage wherever you are (the coin tossed, the
  dice rolled, the wheel spun), with sounds made by the browser; a challenge
  to you comes as a toast; the last wins slide by under the top bar.
- **Fill it for me**: when matching a duel, picks some of your items worth
  what it takes.
- **Provably fair**: each game's page checks its own draw in your browser,
  step by step; `/fair` explains it, keeps *your* seed (yours to choose), and
  checks any draw from its numbers alone.
- **Numbers**: a leaderboard (today, this week, all time: most won, high
  rollers, biggest pots, luckiest wins), each player's casino page, the
  history of every game.
- **English and Russian**, in the site's language (the game's setting; the
  portal shares it). Item names come from the game's own translations.

It is its own front end, served at **`/casino/`** on the site's one origin:
the portal (BalatroPortal) is at `/`, the game (BalatroFrontEnd) at `/play/`,
and the casino shares their session (sign in on the portal). React 19, React
Router 7, TypeScript and Vite, organised with
[Feature-Sliced Design](https://feature-sliced.design), like the portal.

## Run it

You need Node 20+ and the services it talks to: the item service (`/items/`,
:8004), and for the full picture the social service (`/social/`, :8005:
friends to challenge, profile pictures), the identity service (`/identity/`,
:8001: the session) and the game (`/play/`, :5173: the items' sprites).

```
npm install && npm run dev        # http://localhost:5175/casino/
```

Everything at once: `make dev` in BalatroFrontEnd, then open
**http://localhost:5174/casino/** (through the portal: one origin, one
session). `BALATRO_ITEMS`, `BALATRO_SOCIAL`, `BALATRO_IDENTITY`,
`BALATRO_GAME` and `BALATRO_API` change where this dev server sends `/items`,
`/social`, `/identity`, `/play` and `/api`.

In Docker: `docker compose up --build` in BalatroFrontEnd, then
http://localhost:8087/casino/.

## Pages

| Path (under `/casino`) | |
|---|---|
| `/` | the lobby: the jackpot's wheel, the three games and how many wait, challenges to you, the games waiting, today's best |
| `/coinflip`, `/dice` | the duels waiting (all, those you can join, challenges, yours; newest or biggest), a new one (`?challenge=<id>&name=`: a challenge to that player), the last ones drawn |
| `/jackpot` | the pot as a wheel, its countdown, its entries; put items in, take them back while alone; the last pots |
| `/leaderboard` | today, this week, all time: a podium, most won, high rollers, biggest pots, luckiest wins |
| `/history` | every game that is over, yours or everyone's, by game, a page at a time |
| `/players/:id`, `/me` | a player's casino numbers and games |
| `/fair` | how a draw is made, your seed, a check of any draw |
| `/<game id>` | a game: its stage (played again on demand), entries, and the check of its draw. The portal's links to games are these; its old `/casino?tab=` links still land |

## Code

```
src/
  app/        entry point, the router (basename /casino), the result host, the styles
  pages/      lobby, coinflip, dice, jackpot, game, history, leaderboard, player, fair, not-found
  widgets/    shell (the top bar, the ticker, the toasts, the sign-in gate, the WebGL light),
              game-stage (the wheel, a duel's stage, the result's stage, entries, the countdown),
              duel-card (a duel's card, the board of them, a duel's room), game-list
  features/   stake (the dialog: sides, chance, items, "fill it for me", challenges)
  entities/   casino (the player, their items, the live state; the coin, the dice's line, the pot's bar),
              item (an item drawn with the game's sprites, its name in the player's language)
  shared/     api (items, social, the live stream, the session, problem details), config (URLs),
              i18n (languages, messages, formats), lib (the fair draw, seeds, sounds, motion), ui
```

## Look and feel

The back room of the portal's card room: the same ink and glass, with gold for
money on the table, green felt where games are played, and the game's two
forces, Chips (blue) and Mult (red), as the coin's faces. A neon sign; a slow
swirl of velvet and felt behind the page (a small WebGL shader: low
resolution, 30 frames a second, paused in a hidden tab, still with reduced
motion). Type is self-hosted: Unbounded for titles, Inter for text, JetBrains
Mono for hashes and seeds. With `prefers-reduced-motion` nothing moves and
results show at once.

## Checks

```
npm run typecheck
npm run lint        # Steiger (FSD rules)
npm run build
```

## Configuration

Build-time variables (`VITE_*`), empty by default (the same origin):
`VITE_ITEMS_URL` (`/items`), `VITE_SOCIAL_URL` (`/social`),
`VITE_IDENTITY_URL` (`/identity`), `VITE_GAME_URL` (`/play`),
`VITE_PORTAL_URL` (the portal: `/`).

## Deployment

`.github/workflows/ci-cd.yml` checks every push and pull request on `main` and
`dev` (typecheck, Steiger, build, the Docker image). A push to `main` deploys
like the other repositories: `.github/deploy.sh` copies the code to
`DEPLOY_PATH/BalatroCasino`, and BalatroFrontEnd's `docker-compose.yml`
rebuilds the `casino` service (nginx serving `/casino/`); the portal's nginx
passes `/casino/` to it. Deploy order: BalatroItemService, BalatroFrontEnd
(its compose file has `casino`), BalatroPortal, then this repository. The
secrets are the same `DEPLOY_*` as the other repositories.
