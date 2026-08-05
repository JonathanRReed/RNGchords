# RNG Chords

RNG Chords is a browser-based random chord generator for guitarists, pianists, songwriters, and producers.

Dice pick the chords, the browser plays them back, and MIDI export gets the idea out. Keep what works, reroll the rest.

## Why it exists

Sometimes you want a fresh progression without opening a full DAW session or overthinking theory first.

RNG Chords helps you:

- Roll a first idea in seconds
- Keep the chords that feel good
- Reroll the weak spots
- Hear the result right away
- Export MIDI when the idea is worth keeping

## Who it is for

- Guitarists looking for voicings outside the usual shapes
- Pianists who want color without menu-diving through plugins
- Songwriters stuck on a verse, a chorus, or a bridge
- Producers sketching harmony before they arrange anything

## What it does

- Roll guided or advanced chord progressions
- Preview single chords and play full ideas in the browser
- Switch between multiple playback instruments
- Keep or reroll individual chords
- Save idea snapshots into `A`, `B`, and `C` slots
- Restore your last creative session after refresh
- Change rhythm feel without rebuilding the whole progression
- Toggle lightweight theory labels
- Build chords manually or paste typed chord symbols
- Export ideas as MIDI

## Example outcomes

Depending on complexity and tempo, a roll can land anywhere from a bright indie-pop lift to a slower neo-soul drift to something darker with more tension in it.

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

### Start fast

- Pick an instrument focus that matches how you play
- Choose `Easy`, `Color`, or `Tension` chord complexity
- Click `Roll New Idea` or `Surprise Me`

### Roll ideas

- Use `Roll New Idea` or `Roll This Setup` depending on where you are in the app
- Use `Surprise Me` to randomize the musical setup and playback instrument

### Shape the progression

- Use `Keep` to pin a chord you like
- Use `Reroll` on a single slot for a fresh replacement
- Use `Reroll Unlocked` to refresh only the chords you did not keep

### Compare versions

- Save the current idea into slot `A`, `B`, or `C`
- Click a filled slot to load that saved version back in

### Play and preview

- Pick an instrument and tempo in the playback panel
- Change the rhythm `Feel` to reshape playback phrasing
- Use `Play`, `Stop`, and `Loop` to audition ideas
- Use `Export MIDI` when you want to continue elsewhere

### Manual input

- Use the manual builder if you already hear a chord shape in your head
- Paste typed chord symbols like `Cmaj7, Am7, D7, Gmaj7`
- Mix manual input with rolled ideas when you want a more directed progression

### Keyboard shortcuts

- `Space`: play or stop
- `←` / `→`: preview neighboring chords
- `Enter`: replay the selected chord preview

## Project structure

```text
/
├── docs/
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

- The app is built for sketching, so most of the theory decisions stay with you
- Playback uses browser audio, so the first interaction may need to unlock audio on some browsers
- Social sharing metadata becomes fully absolute when `SITE_URL` is set for production
