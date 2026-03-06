---
description: RNG Chords pre-launch checklist
---

# RNG Chords Launch Checklist

## Product clarity

- [x] Clarify the hero so a new visitor understands the product in under 5 seconds
- [x] Add a clear first action above the fold
- [x] Add a short “how it works” path for first-time users
- [x] Add one-line examples of outcomes like indie-pop, neo-soul, and cinematic progressions
- [x] Add a tiny empty-state hint for the first roll if user testing shows hesitation

## First-run experience

- [x] Add a quick-start section for new users
- [x] Make presets, mode labels, and complexity labels easier to understand
- [x] Preserve a user’s in-progress idea after refresh
- [ ] Run 3-5 first-time-user tests and note where people hesitate
- [ ] Decide whether the default first view should be Guided or a more curated preset onboarding state

## Accessibility

- [x] Add a skip link to main content
- [x] Improve tab and toggle semantics
- [x] Add live announcement support for status changes
- [ ] Keyboard-test the full app flow end to end
- [ ] Contrast-check the smallest copy and muted labels
- [ ] Verify touch targets on mobile for dice controls and chord actions

## Metadata and sharing

- [x] Improve title and description metadata
- [x] Add Open Graph and Twitter metadata
- [x] Add app schema
- [x] Add a social share card asset
- [x] Prepare `astro.config.mjs` to read the production site URL from `SITE_URL`
- [ ] Set the final production site URL in `astro.config.mjs` before launch so canonical and social URLs are absolute

## Content and positioning

- [x] Write a short launch blurb for Product Hunt, socials, and README
- [x] Prepare 3 audience-specific descriptions for songwriters, guitarists, and producers
- [ ] Add one screenshot or GIF to the README
- [x] Decide on the primary phrase to own consistently across the site: random chord generator, chord idea sketchpad, or chord progression dice toy

## QA and reliability

- [ ] Test in Safari, Chrome, and mobile Safari/Chrome
- [ ] Verify audio unlock behavior on first interaction
- [ ] Verify MIDI export downloads correctly in major browsers
- [ ] Test save/load behavior for A, B, and C slots after refresh
- [ ] Test long manual chord input and malformed symbols
- [ ] Add regression tests for the most important user flows if scope allows

## Performance and polish

- [ ] Check first-load feel on a slower connection
- [ ] Consider lazy-loading heavy audio/export paths if launch feedback mentions load time
- [ ] Review bundle size after launch if performance becomes a concern
- [ ] Capture one polished screenshot for sharing and store listing use

## Launch operations

- [ ] Set the final domain and Astro `site` config
- [ ] Re-run full checks before every release candidate
- [ ] Confirm favicon, social card, and metadata render correctly in a real deployed preview
- [ ] Prepare one short feedback form or contact channel for launch users
- [ ] Make a short list of post-launch metrics to watch: first play, first export, return visits, and shared links

## Release gate

Only launch when all of the following are true:

- [ ] `bun run lint` passes
- [ ] `bun run typecheck` passes
- [ ] `bun test` passes
- [ ] `bun run build` passes
- [ ] The live deployed preview has correct metadata and social sharing
- [ ] A first-time musician can get a satisfying result without explanation
