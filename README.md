# RNG Chords

Dice pick the chords, the browser plays them back, and MIDI export gets the idea out. Keep what works, reroll the rest.

RNG Chords is for sketching progressions without opening a DAW. Choose guided or advanced generation, enter chords yourself, or mix both.

## Try a progression

Choose an instrument focus and `Easy`, `Color`, or `Tension` complexity. Click `Roll New Idea` or `Roll This Setup`. `Surprise Me` also randomizes the musical setup and playback instrument.

Use `Keep` to pin a chord, `Reroll` to replace one slot, or `Reroll Unlocked` to change everything unpinned. Save versions in `A`, `B`, and `C`; select a filled slot to restore it. The app also restores the last session after a refresh.

Pick an instrument, tempo, and rhythm `Feel`, then use `Play`, `Stop`, and `Loop`. Preview individual chords or turn on theory labels. The manual builder also accepts symbols such as `Cmaj7, Am7, D7, Gmaj7`. Use `Export MIDI` to continue in another app.

| Key | Action |
| --- | --- |
| `Space` | Play or stop |
| `←` / `→` | Preview the neighboring chord |
| `Enter` | Replay the selected chord |

Browser audio may need an initial click before it can play. Musical judgment stays with you; a generated progression is a starting point.

## Develop

The app uses Astro, React, Motion, Tone.js, and Bun.

```sh
bun install
bun run dev
```

```sh
bun run lint && bun run typecheck && bun test
bun run build
```

Components, music logic, routes, and styles live under `src/`. Tests are in `tests/`; static assets are in `public/`.

Set `SITE_URL` in production so social metadata uses absolute URLs.
