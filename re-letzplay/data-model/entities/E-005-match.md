# E-005 Match
Product term: jogo · Parent: E-001 · Status: draft

## Fields

| Field | Type | Required | Default | Constraints or enum | Source |
|---|---|---|---|---|---|
| number | number | yes | | #1 on the schedule, #25 onward on the bracket | [obs EV-001] |
| round | enum | yes | | Group G1, R16, QF, SF | [obs EV-001] |
| sets | list | when played | | Games, optional tie-break digit | [obs EV-001] |
| scheduledAt | datetime | no | | Date and time on the card and on Horários | [obs EV-001] |
| court | string | no | | Present on the schedule | [obs EV-001] |
| finished | boolean | yes | | Trophy icon on finished bracket cards | [obs EV-001] |

## Relations

| Relation | Target | Cardinality | On delete | Source |
|---|---|---|---|---|
| sides | E-004 | 2 | unknown | [obs EV-001] |
| group | E-002 | many to 1 for group matches | unknown | [obs EV-001] |

## Lifecycle

Absent until Gerar jogos. Public bracket appears after Publicar as chaves. Cancelar jogos gerados removes them. Order was not executed. [obs EV-001]

## System fields

| Field | Set when | Source |
|---|---|---|
| id | Present on the match menu path. Not stored here. | [obs EV-001] |

## Rules

- R-004
- R-005
- R-006
- R-008

## Not tested

- Walkover, bye, and an unpublished generated match.
