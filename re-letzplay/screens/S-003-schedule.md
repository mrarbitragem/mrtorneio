# S-003 Schedule
Features: F-004 · URL: `/:league/tournaments/:categoryId/schedules` · Status: draft

## Purpose

List of the category's matches by time and court, including group matches. After a group is complete, Horários still shows those matches; the group page is what hides them behind Visualizar.

## Entry points

Category tab Horários.

## Anatomy

| # | Region | Contents | Component | Evidence |
|---|---|---|---|---|
| 1 | Slot | Date and time, then a court label | C-004 | [obs EV-001] |
| 2 | Match line | Number, phase such as group G1, two pairs, score like 6/3, winner line | C-004 | [obs EV-001] |

## Data shown

| Element | Entity.field | Evidence |
|---|---|---|
| When | E-005.scheduledAt | [obs EV-001] |
| Phase | E-005.round | [obs EV-001] |
| Score | E-005.sets | [obs EV-001] |

## States

| State | How to reach it | What it shows | Evidence |
|---|---|---|---|
| Empty | Not reached | | |
| Loading | Not reached | | |
| Typical | Finished category | Several matches on the same clock time, with a court, grouped by group label. | [obs EV-001] |
| No slot | Published test category | Lines under "Sem horário definido", still with match number, group phase and score once a result exists. | [obs EV-002] |
| Many items | Page text length was 412 lines. | [obs EV-001] |
| Long text | Not reached | | |
| Error | Not reached | | |
| No permission | Readable while logged in. | [obs EV-001] |
| Plan-gated | Not reached | | |

## Interactions

| Trigger | Result | Request | Persistence scope | Evidence |
|---|---|---|---|---|
| None exercised | Read only | | | [obs EV-001] |

## Keyboard and accessibility

| Check | Result | Evidence |
|---|---|---|
| Tab order | Not tested | |
| Arrow keys | Not tested | |
| Shortcuts | Not tested | |
| Focus visible | Not tested | |
| Escape | Not tested | |
| Unlabeled controls | Not tested | |

## Microcopy

| Element | Text | Evidence |
|---|---|---|
| Phase | Fase de grupos - G1 | [obs EV-001] |
| Match | Jogo #1 | [obs EV-001] |

## Rules

- R-006

## Realtime and performance

| Check | Result | Evidence |
|---|---|---|
| A change in a second tab appears without reload | Not tested | |
| Loading pattern (skeleton, spinner, optimistic update) | Not tested | |
| Delays the user sees | Not measured | |

## Responsive

| Width | Change | Evidence |
|---|---|---|
| Desktop | List, not a grid of courts. | [obs EV-001] |

## Not tested

- Court filter, day filter, and an unpublished schedule.
