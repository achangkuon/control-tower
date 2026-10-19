---
name: gentle-deck
description: "Trigger: crear diapositivas, presentación, deck, slides HTML, replicar el estilo de las presentaciones de Alan. Build a single-file HTML slide deck with a user-confirmed palette recommended from conversation context."
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "1.0"
---

## Activation Contract

Load when the user asks to create a presentation, slide deck, or HTML slides, or to replicate the "Alan deck" style (kicker + headline slides, dark background, accent color, petal covers).

## Hard Rules

- Ship ONE self-contained HTML file. No frameworks, no CDNs, no external assets or webfonts.
- Copy the engine from `assets/deck-template.html`; never rewrite navigation, print, or responsive CSS from scratch.
- NEVER pick colors silently. Derive a palette recommendation from the conversation's context (domain, mood, brand colors the user already mentioned), propose 2-3 named palettes as `--var` hex blocks, and wait for the user's confirmation before writing slides. The user may override with custom hex values.
- Slide copy lives in the user's conversation language; CSS class names and code comments stay in English.
- One slide = one `<section class="slide">`. Dense slides scroll inside themselves; never shrink fonts below the template's `clamp()` sizes.

## Decision Gates

| Need | Action |
|------|--------|
| Cover / closing slide | Add class `cover` + `<div class="petals" aria-hidden="true"></div>`; the JS fills the petals |
| Terminal or command demo | Use the `.term` component with its fake window bar |
| Big numbers, comparisons, sequences | Use `.stat`, `.bars`, `table`, or `.steps` |
| Wide table on phones | Wrap in `.table-wrap` (horizontal scroll is built in) |
| Deck longer than ~20 slides | Split the deck or move detail to a follow-up; keep one idea per slide |

## Execution Steps

1. Collect the content outline (title + key points per slide). Ask when the outline is missing or vague.
2. Propose 2-3 palettes matched to the conversation context; wait for confirmation (options or free hex).
3. Copy `assets/deck-template.html`; replace only the marked PALETTE block; fill `<title>`, kickers, slides, `.brand`, and closing slide.
4. Verify: slide count matches the outline; hash navigation (`#1`) is emitted by the engine; the file makes zero external requests (`grep -cE 'https?://'` should return 0 outside comments).
5. Offer PDF export only on request (print CSS is built in; press P).

## Output Contract

- The HTML file path, the confirmed palette as `--var` lines, and the slide count.
- Any slide whose content had to be compressed beyond the template's type scale, flagged explicitly.

## References

- `assets/deck-template.html` — complete engine: palette block to replace, layout and component CSS, navigation JS, petal animation, print and mobile CSS.
