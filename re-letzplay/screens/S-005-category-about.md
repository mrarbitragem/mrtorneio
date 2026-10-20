# S-005 Category about
Features: F-005 · URL: `/places/:league/tourneys/:tourneyId/tournaments/:categoryId/about` · Status: draft

## Purpose

Readout of one category before any match exists: model, group shape, score format, dates, audience.

## Entry points

Category name on S-004. Tabs: Sobre, Inscrições, Configuração, Histórico.

## Anatomy

| # | Region | Contents | Component | Evidence |
|---|---|---|---|---|
| 1 | Summary | Modelo de disputa, inscrições, jogos, formato, ranking | | [obs EV-001] |
| 2 | Shortcuts | Adicionar inscrição, encerrar inscrições, alterar modelo, associar ranking, excluir | | [obs EV-001] |
| 3 | Configuration tab | Groups, qualifiers, score format, schedule, prize, gender, age, cap | | [obs EV-001] |

## Data shown

| Element | Entity.field | Evidence |
|---|---|---|
| Groups | E-001.groupCount | [obs EV-001] |
| Qualifiers | E-001.qualifiersPerGroup | [obs EV-001] |
| Score format | E-001.scoreFormat | [obs EV-001] |
| Cap | E-001.registrationCap | [obs EV-001] |

## States

| State | How to reach it | What it shows | Evidence |
|---|---|---|---|
| Empty | 0 matches, 2 registrations, cap 12 | Model already chosen: 4 groups, 2 qualifiers. | [obs EV-001] |
| Loading | Not reached | | |
| Typical | Same category | Registrations 11–12 Feb 2026. Matches 13–14 Feb 2026. Gender feminino. Age 1 to 99. | [obs EV-001] |
| Many items | Not reached | | |
| Long text | Not reached | | |
| Error | Not reached | | |
| No permission | Organizer view on the test league. | [obs EV-001] |
| Plan-gated | Not reached | | |

## Interactions

| Trigger | Result | Request | Persistence scope | Evidence |
|---|---|---|---|---|
| Configuração | Opens `/configuration`. Read only. | document | | [obs EV-001] |
| Encerrar inscrições | Not clicked. Copy says players can no longer subscribe, while the organizer can still add people. | | category | [obs EV-001] |

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
| Model | Grupo + Chaves - 4 grupos - 2 classificados | [obs EV-001] |
| Score | Duplas, 2 Sets + Super Tiebreak, 6 Games com tiebreak no 6 a 6 | [obs EV-001] |
| Close registrations | After close, players cannot subscribe; the organizer can still add people. | [obs EV-001] |

## Rules

- R-009
- R-010

## Realtime and performance

| Check | Result | Evidence |
|---|---|---|
| A change in a second tab appears without reload | Not tested | |
| Loading pattern (skeleton, spinner, optimistic update) | Not tested | |
| Delays the user sees | Not measured | |

## Responsive

| Width | Change | Evidence |
|---|---|---|
| Desktop | Definition list of settings. | [obs EV-001] |

## Not tested

- Inscrições list and Histórico.
- Adding a registration.
