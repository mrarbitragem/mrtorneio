# S-004 Organizer tourney
Features: F-005 · URL: `/places/:league/tourneys/:tourneyId` · Status: draft

## Purpose

Organizer home for one event. Categories are rows. Batch actions change registration state and the draw.

## Entry points

Test league home > Torneios. This session opened only the tournament named as a category test. A second, larger tournament on the same league was not opened.

## Anatomy

| # | Region | Contents | Component | Evidence |
|---|---|---|---|---|
| 1 | Header actions | Compartilhar, Editar, Informações, Todas as Inscrições, Cobranças, Todos os Jogos, Impressões, Resumo Valores, Relatórios, Histórico | | [obs EV-001] |
| 2 | Category actions | Nova Categoria (simples, duplas, equipes). Ações: abrir, encerrar e reabrir inscrições, gerar jogos, publicar as chaves, cancelar jogos gerados, encerrar a categoria | | [obs EV-001] |
| 3 | Category row | Name, status Inscrições abertas, model Grupo + Chaves, subscriber count, Editar, Copiar | | [obs EV-001] |

## Data shown

| Element | Entity.field | Evidence |
|---|---|---|
| Model label | E-001.format | [obs EV-001] |
| Status | E-001.registrationState | [obs EV-001] |

## States

| State | How to reach it | What it shows | Evidence |
|---|---|---|---|
| Empty | Not reached | | |
| Loading | Not reached | | |
| Typical | Sandbox tourney, 2 categories, 0 matches | Both categories say Inscrições abertas and Grupo + Chaves. | [obs EV-001] |
| Many items | League list also has a 17-category event. Not opened. | [obs EV-001] |
| Long text | Not reached | | |
| Error | Not reached | | |
| No permission | Not reached | | |
| Plan-gated | Not reached | | |

## Interactions

| Trigger | Result | Request | Persistence scope | Evidence |
|---|---|---|---|---|
| Gerar jogos | Not clicked. Would create matches. | | category | [obs EV-001] |
| Publicar as chaves | Not clicked. Separate from generate. | | category | [obs EV-001] |
| Cancelar jogos gerados | Not clicked. Implies generate is reversible. | | category | [obs EV-001] |

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
| Publish | Publicar as chaves | [obs EV-001] |
| Generate | Gerar jogos | [obs EV-001] |

## Rules

- R-007
- R-008

## Realtime and performance

| Check | Result | Evidence |
|---|---|---|
| A change in a second tab appears without reload | Not tested | |
| Loading pattern (skeleton, spinner, optimistic update) | Not tested | |
| Delays the user sees | Not measured | |

## Responsive

| Width | Change | Evidence |
|---|---|---|
| Desktop | Category rows with counts. | [obs EV-001] |

## Not tested

- Generate, publish, close, and cancel on the sandbox category.
- Whether publish is blocked while registrations are open.
