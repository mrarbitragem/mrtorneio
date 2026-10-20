# E-003 Standing
Product term: posição · Parent: E-002 · Status: draft

## Fields

| Field | Type | Required | Default | Constraints or enum | Source |
|---|---|---|---|---|---|
| rank | number | yes | | Shown as 1º, 2º, 3º | [obs EV-001] |
| setBalance | number | yes | | In the tie-break explanation | [obs EV-001] |
| gameBalance | number | yes | | Next criterion after a set tie | [obs EV-001] |
| setRate | number | yes | | Aproveitamento of sets | [obs EV-001] |
| gameRate | number | yes | | Aproveitamento of games | [obs EV-001] |

## Relations

| Relation | Target | Cardinality | On delete | Source |
|---|---|---|---|---|
| entry | E-004 | many to 1 | unknown | [obs EV-001] |

## Lifecycle

Computed after group matches. The public row shows rank. A tie is the same win-loss balance. Exactly two participants use head-to-head. Three or more use the balance fields, then a draw. [obs EV-002]

## System fields

| Field | Set when | Source |
|---|---|---|
| rankSource | Not shown as a code. The explanation names the criterion. | [obs EV-001] |

## Rules

- R-003

## Not tested

- A played group whose places were produced by head-to-head.
- A tie that reaches the draw step after matches have been played.
