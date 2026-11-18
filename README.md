# RNG Chords

A chord progression generator that uses dice. It runs in the browser, plays the result back, and exports MIDI. Chords are chords, so it is not tied to any one instrument.

## Using it

Pick a mode: **Easy** rolls one die for each chord, **Advanced** rolls five dice that shape the whole progression, and **Manual** takes chord names you type or build. Set the chord style (`Simple`, `Color`, or `Tension`), then press `Roll the dice`. `Surprise me` also randomizes the setup and sound.

The dice are real solids. They are thrown onto the table, bounce off it and each other, and the face each one lands on is its chord. Click a die, or its name on the table, to hear it.

The chart under the table lists the chords in order, each as wide as it is long, with its place in the key, its notes, and its keys on a piano strip. Use `Keep` to hold a chord (its die stays put on the next roll), `Reroll` to replace one, or `Reroll unkept` to change the rest. `Undo` puts back the chords from before the last change. Save versions to `A`, `B`, and `C`. The app restores your last idea after a refresh.

Pick a sound, tempo, and rhythm feel, then use `Play`, `Loop`, and `Export MIDI`. Manual mode accepts symbols such as `Cmaj7, Am7, D7, Cm(maj7)`. The `-` and `+` beside the key move the whole idea by a half step, and the `Key` setting keeps every roll in one key. `Copy chart` copies the chord names, `Copy link` copies a link that opens the same progression, tempo, and sound, and `Tap tempo` sets the tempo from your taps.

| Key | Action |
| --- | --- |
| `Space` | Play or stop |
| `R` | Roll |
| `←` / `→` | Preview the neighboring chord |
| `Enter` | Replay the selected chord |
| `Ctrl` + `Z` | Undo |

The `Appearance` menu holds color mode (system, light, dark), four table themes (felt, velvet, glass, pads), three text options (default, high legibility, OpenDyslexic), the roll motion (throw, drop, or instant), and the dice sound. Each theme is a different material: glossy gems on baize, ivory on velvet, lit glass on a blueprint, flat plastic on hardware.

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

- `app/` holds the React app: `useWorkstation` (all state and actions, including undo), `usePlayer`, `useAppearance`, saved-session and appearance parsing, and `components/`.
- `lib/dice3d/` is the table. `polyhedra.ts` defines the six dice as solids, `layout.ts` places the lanes, camera, and walls, `physics.ts` simulates a throw ahead of time with cannon-es and records it, `labels.ts` paints the faces, `looks.ts` holds each theme's materials, and `scene.ts` draws it all with three.js. The whole folder loads on demand, after the page is interactive.
- `lib/music/` and `lib/audio/` hold chord generation, parsing, transposing, playback, MIDI, and the dice sounds. `lib/dice/` holds the flat dice shown when a browser has no WebGL.
- `styles/` holds `tokens.css` (color schemes, table themes, and die colors), `base.css`, `app.css`, `table.css` (the tray and what makes each theme its own object), and `info.css`.
- `layouts/` and `pages/` are the Astro shell and the static pages.

A throw is simulated before it is shown. That is how the chord gets painted on the face that will finish on top, and how each knock is heard at the moment the die hits. The simulation is seeded, so the tests can check that dice land flat, inside the walls, and near their lanes.

TypeScript stays on 6.x because `astro check` does not support TypeScript 7 yet.

Tests are in `tests/`; static assets are in `public/`. Set `SITE_URL` in production so social metadata uses absolute URLs.
