# S-006 Dispute model picker
Features: F-006 · URL: `/places/:league/tourneys/:tourneyId/tournaments/:categoryId/kind/edit` · Status: draft

## Purpose

Choose a different dispute model for a category that does not have matches yet. This session did not submit the form.

## Entry points

S-005 shortcut Alterar modelo de disputa. Cancelar returns without saving.

## Anatomy

| # | Region | Contents | Component | Evidence |
|---|---|---|---|---|
| 1 | Radio list | Eight models, each with a short description and Veja um exemplo | | [obs EV-001] |
| 2 | Submit | Alterar Tipo. Not clicked. No radio was checked. | | [obs EV-001] |

## Data shown

| Element | Entity.field | Evidence |
|---|---|---|
| Model option | E-001.format | [obs EV-001] |

## States

| State | How to reach it | What it shows | Evidence |
|---|---|---|---|
| Empty | Not reached | | |
| Loading | Not reached | | |
| Typical | Category whose current model is Grupo + Chaves | The current model is not one of the radios on this page. The radios are the other models. | [obs EV-001] |
| Many items | 8 options | | [obs EV-001] |
| Long text | Each option has a paragraph. | [obs EV-001] |
| Error | Not reached | | |
| No permission | Not reached | | |
| Plan-gated | Not reached | | |

## Interactions

| Trigger | Result | Request | Persistence scope | Evidence |
|---|---|---|---|---|
| Alterar Tipo | Not clicked. | | category | [obs EV-001] |
| Cancelar | Not needed. Navigation away did not submit. | | | [obs EV-001] |

## Keyboard and accessibility

| Check | Result | Evidence |
|---|---|---|
| Tab order | Not tested | |
| Arrow keys | Not tested | |
| Shortcuts | Not tested | |
| Focus visible | Not tested | |
| Escape | Not tested | |
| Unlabeled controls | Radio accessible names were the numeric values, not the model titles. | [obs EV-001] |

## Microcopy

| Element | Text | Evidence |
|---|---|---|
| Models | Chave eliminatória; consolação simples; consolação dupla; dupla eliminatória; Grupo Único; Rei/Rainha da Quadra; Super 8; Super 12 | [obs EV-001] |

## Rules

- R-011

## Realtime and performance

| Check | Result | Evidence |
|---|---|---|
| A change in a second tab appears without reload | Not tested | |
| Loading pattern (skeleton, spinner, optimistic update) | Not tested | |
| Delays the user sees | Not measured | |

## Responsive

| Width | Change | Evidence |
|---|---|---|
| Desktop | Single column of radios. | [obs EV-001] |

## Not tested

- Which models stay available after matches exist.
- The example pages behind Veja um exemplo.
- Where Grupo + Chaves itself is chosen. It is the current value on S-005 and is absent from this radio list.
