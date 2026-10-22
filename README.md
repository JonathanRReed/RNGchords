# RNG Chords

A chord progression generator that uses dice. It runs in the browser, plays the result back, and exports MIDI. Chords are chords, so it is not tied to any one instrument.

## Using it

Pick a mode: **Easy** rolls from a preset dice setup, **Advanced** lets you choose each die, and **Manual** takes chord names you type or build. Set the chord style (`Simple`, `Color`, or `Tension`), then press `Roll the dice`. `Surprise me` also randomizes the setup and sound.

Use `Keep` to pin a chord, `Reroll` to replace one, or `Reroll unkept` to change the rest. Save versions to `A`, `B`, and `C`. The app restores your last idea after a refresh.

Pick a sound, tempo, and rhythm feel, then use `Play`, `Loop`, and `Export MIDI`. Manual mode accepts symbols such as `Cmaj7, Am7, D7, Cm(maj7)`.

Every chord shows its place in the key and its notes on a piano strip. Click a die to hear its chord. The `-` and `+` beside the key move the whole idea by a half step, and the `Key` setting keeps every roll in one key. `Copy chart` copies the chord names, `Copy link` copies a link that opens the same progression, tempo, and sound, and `Tap tempo` sets the tempo from your taps.

| Key | Action |
| --- | --- |
| `Space` | Play or stop |
| `←` / `→` | Preview the neighboring chord |
| `Enter` | Replay the selected chord |

The `Appearance` menu holds color mode (system, light, dark), four table themes (felt, velvet, glass, pads), three text options (default, high legibility, OpenDyslexic), and the roll motion (several styles, or instant).

Browser audio may need an initial click before it can play. A generated progression is a starting point.

## Develop

Astro, React, Tone.js, and Bun.

```sh
bun install
bun run dev
```

```sh
bun run typecheck && bun run test
bun run build
```

Layout of `src/`:

- `app/` holds the React app: `useWorkstation` (all state and actions), `usePlayer`, `useAppearance`, saved-session and appearance parsing, and `components/`.
- `lib/music/` and `lib/audio/` hold chord generation, parsing, transposing, playback, and MIDI. `lib/dice/shapes.ts` draws the six dice, and `lib/dice/flips.ts` holds the roll animations (Web Animations, transform and opacity only).
- `styles/` holds `tokens.css` (color schemes, table themes, and die materials), `base.css`, `app.css`, `table.css` (the tray, dice, and what makes each theme its own object), and `info.css`.
- `layouts/` and `pages/` are the Astro shell and the static pages.

Tests are in `tests/`; static assets are in `public/`. Set `SITE_URL` in production so social metadata uses absolute URLs.
