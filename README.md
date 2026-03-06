# RNG Chords

RNG Chords is a playful browser-based chord idea tool for musicians.

It mixes dice-driven harmony generation, quick playback, MIDI export, and a lightweight sketchpad workflow so you can find a happy accident, keep the good bits, and keep moving.

## What it does

- Roll guided or advanced chord ideas
- Preview and play progressions in the browser
- Switch between multiple playback instruments
- Keep or reroll individual chords
- Save idea snapshots into `A`, `B`, and `C` slots
- Change rhythm feel without rebuilding the whole progression
- Toggle lightweight theory labels
- Export ideas as MIDI

## Tech stack

- Astro
- React
- Motion
- Tone.js
- Bun

## Getting started

Install dependencies:

```sh
bun install
```

Start the dev server:

```sh
bun run dev
```

Build for production:

```sh
bun run build
```

Run the full check suite:

```sh
bun run lint && bun run typecheck && bun test
```

## How to use it

### Roll ideas

- Use `Roll ideas` for the current setup
- Use `Surprise me` to randomize the musical setup and playback instrument

### Shape the progression

- Use `Keep` to pin a chord you like
- Use `Reroll` on a single slot for a fresh replacement
- Use `Reroll unlocked` to refresh only the chords you did not keep

### Compare versions

- Save the current idea into slot `A`, `B`, or `C`
- Click a filled slot to load that saved version back in

### Play and preview

- Pick an instrument and tempo in the Sound panel
- Change the rhythm `Feel` to reshape playback phrasing
- Use `Play`, `Stop`, and `Loop` to audition ideas

### Keyboard shortcuts

- `Space` — play or stop
- `←` / `→` — preview neighboring chords
- `Enter` — replay the selected chord preview

## Project structure

```text
/
├── public/
├── src/
│   ├── components/
│   ├── lib/
│   ├── pages/
│   └── styles/
├── tests/
└── package.json
```

## Notes

- The app is designed for fast ideation, not strict theory-first composition
- Playback uses browser audio, so the first interaction may need to unlock audio on some browsers
