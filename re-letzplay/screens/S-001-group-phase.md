# S-001 Group phase
Features: F-001, F-003 · URL: `/:league/tournaments/:categoryId/draw` · Status: draft

## Purpose

Public ranking of each group after the round robin. The page leads with position and the pair, not with a statistics table.

## Entry points

Category navigation: Sobre, Grupos/Chaves, Horários, Jogos, Inscritos. A category switcher lists sibling categories of the same event with registration count, match count and a finished date.

## Anatomy

| # | Region | Contents | Component | Evidence |
|---|---|---|---|---|
| 1 | Phase tabs | Fase de Grupos, then one tab per knockout round that exists (observed R16) | C-001 | [obs EV-001] |
| 2 | Group block | Label GRUPO 0N, optional tie-break link, column Posição | C-002 | [obs EV-001] |
| 3 | Pair row | Two avatars, two names stacked, place 1º–3º, link "ver infos" | C-002 | [obs EV-001] |
| 4 | Group footer | Sentence that the group's matches are finished, plus Visualizar | C-002 | [obs EV-001] |
| 5 | Page footer | Links to the tie-break criteria and to the group-to-bracket seeding rule, plus Imprimir | C-003 | [obs EV-001] |

## Data shown

| Element | Entity.field | Evidence |
|---|---|---|
| Group label | E-002.label | [obs EV-001] |
| Place | E-003.rank | [obs EV-001] |
| Pair | E-004.members | [obs EV-001] |

## States

| State | How to reach it | What it shows | Evidence |
|---|---|---|---|
| Empty | Not reached | | |
| Loading | Not reached | | |
| Typical | Finished 8-group category, 3 pairs each | Ranked pairs. Tie-break link only on groups 02 and 06. Footer Visualizar. | [obs EV-001] |
| In progress | Published test category before any score | Places, then each match under the group. No Visualizar. | [obs EV-002] |
| Group just finished | All three matches of one group scored; sibling groups not scored | That group shows the finished footer. Sibling groups still list matches. | [obs EV-002] |
| Many items | 8 groups on one page | All groups stacked. | [obs EV-001] |
| Long text | Not reached | | |
| Error | Not reached | | |
| No permission | Public while logged in | Page rendered without an edit control on the production league view used. | [obs EV-001] |
| Plan-gated | Not reached | | |

## Interactions

| Trigger | Result | Request | Persistence scope | Evidence |
|---|---|---|---|---|
| Phase tab R16 | Navigates to `/draw/2` | document | URL | [obs EV-001] |
| Visualizar | Present only after the group is complete. The match nodes stay in the document. | | | [obs EV-002] |
| Entenda o desempate | Not clicked. The explanation nodes are already in the document. | | | [obs EV-001] |

## Keyboard and accessibility

| Check | Result | Evidence |
|---|---|---|
| Tab order | Not tested | |
| Arrow keys | Not tested | |
| Shortcuts | Not tested | |
| Focus visible | Not tested | |
| Escape | Not tested | |
| Unlabeled controls | Avatar links have no accessible name in the snapshot. | [obs EV-001] |

## Microcopy

| Element | Text | Evidence |
|---|---|---|
| Tie-break link | Entenda o desempate | [obs EV-001] |
| Group footer | Os jogos do grupo estão concluídos. Visualizar | [obs EV-001] |
| Criteria heading | Critério de desempate da fase de grupos | [obs EV-001] |

## Rules

- R-001
- R-002
- R-003
- R-012

## Realtime and performance

| Check | Result | Evidence |
|---|---|---|
| A change in a second tab appears without reload | Not tested | |
| Loading pattern (skeleton, spinner, optimistic update) | Not tested | |
| Delays the user sees | Page content was present after navigation. | [obs EV-001] |

## Responsive

| Width | Change | Evidence |
|---|---|---|
| Desktop | Groups stack vertically. Position sits on the right of the pair. | [obs EV-001] |

## Not tested

- A group of 4 pairs.
- Opening Visualizar and the ver infos panel.
- Print layout.
