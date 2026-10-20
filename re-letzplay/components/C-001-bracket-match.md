# C-001 Bracket match
Product name: `row.match` · Used in: S-002 · Status: draft

## Anatomy

| # | Part | Content | Evidence |
|---|---|---|---|
| 1 | Title | Match number, round code, trophy when finished | [obs EV-001] |
| 2 | Side | Two player rows, class `match-player` | [obs EV-001] |
| 3 | Points | Class `match-points`. Games, plus a tie-break digit when present | [obs EV-001] |
| 4 | Footer | Date and time | [obs EV-001] |
| 5 | Menu | Comment count. Also offers a path per pair and friend requests | [obs EV-001] |

## Variants

| Variant | Difference | Evidence |
|---|---|---|
| R16, QF, SF | Round code in the title. Same card. | [obs EV-001] |

## States

| State | Visual change | Evidence |
|---|---|---|
| Default | Finished matches show a trophy icon | [obs EV-001] |
| Hover | Not tested | |
| Focus | Not tested | |
| Pressed | Not tested | |
| Selected | Not tested | |
| Disabled | Not tested | |
| Loading | Not tested | |
| Error | Not tested | |

## Measurements and tokens

Not sampled. Bootstrap-like classes (`row`, `col-xs-*`, `btn`) were on the card. [obs EV-001]

## Not tested

- Unplayed match, walkover, bye, and the winner's visual weight besides the trophy.
