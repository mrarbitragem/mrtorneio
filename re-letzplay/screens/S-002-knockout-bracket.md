# S-002 Knockout bracket
Features: F-002 · URL: `/:league/tournaments/:categoryId/draw/:phase` · Status: draft

## Purpose

Horizontal bracket for the elimination rounds. Opening round R16 still shows the later rounds on the same page.

## Entry points

Phase tab on S-001. Observed `/draw/2` labeled R16 and a tab QF pointing at `/draw/3`. Groups tab points at `/draw/1`.

## Anatomy

| # | Region | Contents | Component | Evidence |
|---|---|---|---|---|
| 1 | Column | One `.bracket` column per round. First column has 8 matches. | C-001 | [obs EV-001] |
| 2 | Match card | Class `row match`. Title with number, round code and a trophy icon when the match is finished. | C-001 | [obs EV-001] |
| 3 | Sides | Two `.match-player` rows. Each has `.match-points`. | C-001 | [obs EV-001] |
| 4 | Footer | Date and time. | C-001 | [obs EV-001] |
| 5 | Menu | Comment count. Items include comments, interactions, a path per pair, and friend requests. | C-001 | [obs EV-001] |

## Data shown

| Element | Entity.field | Evidence |
|---|---|---|
| Match number | E-005.number | [obs EV-001] |
| Round | E-005.round | [obs EV-001] |
| Set score | E-005.sets | [obs EV-001] |
| Schedule | E-005.scheduledAt | [obs EV-001] |

## States

| State | How to reach it | What it shows | Evidence |
|---|---|---|---|
| Empty | Not reached | | |
| Loading | Not reached | | |
| Typical | Finished category, `/draw/2` | 8 R16 matches numbered 25–32, 4 QF matches 33–36, 2 SF matches 37–38. Trophy on all of them. | [obs EV-001] |
| Many items | Same page | Later rounds sit in further columns, not only behind the QF tab. | [obs EV-001] |
| Long text | Not reached | | |
| Error | Not reached | | |
| No permission | Menu contains friend requests. Those were not used. | [obs EV-001] |
| Plan-gated | Not reached | | |

## Interactions

| Trigger | Result | Request | Persistence scope | Evidence |
|---|---|---|---|---|
| QF tab | Href `/draw/3`. Not opened this session. | | URL | [obs EV-001] |
| Match menu | Not opened. Contains friend-request actions, which are forbidden in this study. | | | [obs EV-001] |

## Keyboard and accessibility

| Check | Result | Evidence |
|---|---|---|
| Tab order | Not tested | |
| Arrow keys | Not tested | |
| Shortcuts | Not tested | |
| Focus visible | Not tested | |
| Escape | Not tested | |
| Unlabeled controls | Menu button accessible name is the comment count only. | [obs EV-001] |

## Microcopy

| Element | Text | Evidence |
|---|---|---|
| Round codes | R16, QF, SF | [obs EV-001] |
| Match title pattern | #25 • R16 | [obs EV-001] |

## Rules

- R-004
- R-005

## Realtime and performance

| Check | Result | Evidence |
|---|---|---|
| A change in a second tab appears without reload | Not tested | |
| Loading pattern (skeleton, spinner, optimistic update) | Not tested | |
| Delays the user sees | Not measured | |

## Responsive

| Width | Change | Evidence |
|---|---|---|
| Desktop | Columns sit side by side inside `.bracket` containers. | [obs EV-001] |

## Not tested

- A final column. SF was the last numbered round on this page.
- An unplayed match and a bye.
- QF-only page `/draw/3`.
- How a winner is styled beyond the trophy on a finished match.
