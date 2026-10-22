# RNG Chords

Dice pick the chords, the browser plays them back, and MIDI export gets the idea out. Keep what works, reroll the rest.

RNG Chords is for sketching progressions without opening a DAW. Roll with Easy or Advanced dice, or enter chords yourself.

## Using it

Pick a mode: **Easy** rolls from a preset dice setup, **Advanced** lets you choose each die, and **Manual** takes chord names you type or build. Set the chord style (`Simple`, `Color`, or `Tension`), then press `Roll the dice`. `Surprise me` also randomizes the setup and sound.

Use `Keep` to pin a chord, `Reroll` to replace one, or `Reroll unkept` to change the rest. Save versions to `A`, `B`, and `C`. The app restores your last idea after a refresh.

Pick a sound, tempo, and rhythm feel, then use `Play`, `Loop`, and `Export MIDI`. Manual mode accepts symbols such as `Cmaj7, Am7, D7, Cm(maj7)`.

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
- `lib/music/` and `lib/audio/` hold chord generation, parsing, playback, and MIDI. `lib/dice/flips.ts` holds the roll animations (Web Animations, transform and opacity only).
- `styles/` holds `tokens.css` (color schemes and table themes), `base.css`, `app.css`, and `info.css`.
- `layouts/` and `pages/` are the Astro shell and the static pages.

Tests are in `tests/`; static assets are in `public/`. Set `SITE_URL` in production so social metadata uses absolute URLs.
