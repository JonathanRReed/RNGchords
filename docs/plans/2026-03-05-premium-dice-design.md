---
description: Premium customizable dice system for RNG Chords
---

# Premium Dice Design

## Goal

Upgrade the RNG Chords dice tray into a premium, user-customizable system that feels satisfying to roll, avoids layout-shifting bugs, and stays readable for musicians.

## UX

### Dice Lab

Add a compact `Dice Lab` control section in the tray area with live settings for:

- Theme
- Motion profile
- Palette
- Content density

The controls should live near the roll buttons and update the tray immediately.

## Customization Model

### Theme

Curated premium themes:

- Studio Resin
- Walnut Brass
- Gem Noir
- Glass Luxe

### Motion

Curated motion profiles:

- Subtle
- Balanced
- Dramatic

### Palette

Each theme exposes a compatible set of curated palettes rather than raw freeform colors.

### Content Density

Modes:

- Chord only
- Chord + notes
- Detailed

## Motion Architecture

### Stable Slot Model

The outer tray cell remains stable. Only the inner die body animates. The shadow animates independently.

This fixes the current bug where dice appear to shift laterally or randomly flip in an inconsistent way.

### Roll Phases

Each roll should read as:

1. Lift
2. Throw
3. Tumble
4. Bounce
5. Settle

### Reduced Motion

If reduced motion is requested, the dice should use a short lift/settle animation instead of a full tumble.

## Rendering Model

### Appearance

Use CSS variables for tray and die surfaces so themes and palettes can be swapped without duplicating large CSS blocks.

### Face Content

Keep the die face focused and clamped. Extra detail should be reduced or omitted depending on the selected density.

## Persistence

Persist dice settings in `localStorage` on the client.

Hydrate safely by using deterministic defaults on first render and loading saved preferences in an effect.

## Files

### Main edits

- `src/components/RngChordsApp.tsx`
- `src/styles/global.css`

### New helpers

- `src/lib/dice/style.ts`
- `src/lib/dice/motion.ts`

## Validation

Run full checks after implementation:

- `bun run lint`
- `bun run typecheck`
- `bun test`
- `bun run build`
