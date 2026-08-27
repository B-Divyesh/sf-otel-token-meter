# OTel Token Meter — visual thesis

## Direction: the private trace press

OTel Token Meter looks like an engineer's one-colour diagnostic printout pulled through a two-ink risograph: precise enough to audit, physical enough to signal that data stays on the user's machine. The dithered token stream is explanatory, not decorative—individual dots enter the meter and leave as aggregate bars, while raw text visibly falls away. The result avoids both observability-dashboard neon and generic SaaS gradients.

## Palette

The primary treatment is intentionally light, like warm uncoated stock. A dark treatment is available through `prefers-color-scheme` and keeps the same ink logic.

| Token | Light | Dark | Role |
| --- | --- | --- | --- |
| Paper | `#F3EBD8` | `#151814` | page background |
| Sheet | `#FFF9EB` | `#20251F` | raised reading surface |
| Carbon | `#18201B` | `#F5EEDC` | body and primary rules |
| Carbon muted | `#536057` | `#B4C0B5` | secondary text (≥4.5:1) |
| Meter green | `#176B45` | `#77D89E` | action, healthy collection |
| Signal orange | `#C44A23` | `#FF9A6C` | errors and emphasis |
| Brass | `#A76B00` | `#E9BC62` | cache/warning |
| Rule | `#9C9A89` | `#687067` | structure and focus boundaries |

No gradient is used. Color is always paired with a label, icon, pattern, or number.

## Type and spacing

- Display: local/system slab-serif stack (`Rockwell`, `Roboto Slab`, `DejaVu Serif`, serif). It gives headlines the authority of a printed instrument plate without downloading a font.
- Utility/body: local/system mono stack (`ui-monospace`, `SFMono-Regular`, `Cascadia Code`, `Liberation Mono`, monospace). Tables align naturally and the interface reads like evidence, not marketing copy.
- Scale: 14 / 16 / 20 / 32 / 48–72 px. Body never drops below 16 px. Tabular numerals are mandatory in metrics.
- Space follows an 8 px baseline: 4, 8, 16, 24, 32, 48, 64, 96. Content width is capped at 1180 px; prose at 68 characters.

## Composition and interaction grammar

- Heavy 2 px carbon rules and offset registration marks define independent artifacts; corners are mostly square with occasional clipped edges.
- Primary buttons invert to carbon with a 3 px offset shadow. Pressing them removes the offset, like a physical switch.
- The local dashboard prioritizes connection status, totals, group selector, then the ledger. Empty, error, and offline states all name a next action.
- On phones, the hero illustration moves below the command, summary rows become a two-column ledger, and wide tables become labelled stacked records instead of compressed grids.
- Focus uses a 3 px orange outline plus 3 px offset. All targets are at least 44 px.

## Motion

Only state change moves. New readings rise 8 px and fade in over 180 ms; button presses translate by 3 px; status dots pulse at a slow 2.4 s cadence only while collecting. With `prefers-reduced-motion: reduce`, all transforms and pulses stop and changes use immediate opacity/state labels. Nothing decorative loops.

## Original asset plan and provenance

- `site/public/trace-press.webp`: original generated editorial halftone illustration of a compact field meter converting dotted traces into aggregate paper bands. It has no text, logos, people, or interface screenshots, so the adjacent live HTML remains authoritative and accessible. Generated for this repository with `/opt/fleet/lib/gen-image.sh` using the factory image deployment, then converted with `cwebp`; licensed under the repository MIT license.
- CSS dot screens, registration marks, status glyphs, and chart patterns are hand-authored for this product and contain no external assets.

Generation prompt: “Wide editorial hero illustration for a privacy-first developer tool. A compact analog token-counting instrument on warm uncoated paper, receiving several dotted telemetry trace lines on the left and outputting four clean aggregate ledger bands on the right; raw message fragments visibly dissolve before entering the instrument. Two-ink risograph / newspaper halftone print, dark carbon black, deep meter green and one signal-orange accent, visible misregistration and stipple texture, bold geometric forms, generous negative space, no gradients, no photorealism, no people, no brand marks, no legible text, no UI screenshot, no watermark. 3:2 landscape composition.”

Model/deployment: `factory-image`; generated 2026-08-27. Source prompt metadata is retained beside the generated PNG during production; the deployed derivative is WebP ≤300 KB.
