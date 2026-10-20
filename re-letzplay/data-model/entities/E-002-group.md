# E-002 Group
Product term: grupo · Parent: E-001 · Status: draft

## Fields

| Field | Type | Required | Default | Constraints or enum | Source |
|---|---|---|---|---|---|
| label | string | yes | | GRUPO 01 … GRUPO 08 on the public page. G1 on the schedule. | [obs EV-001] |
| finished | boolean | yes | | Footer says the group's matches are finished | [obs EV-001] |
| needsTieBreak | boolean | yes | | True when Entenda o desempate is shown | [obs EV-001] |

## Relations

| Relation | Target | Cardinality | On delete | Source |
|---|---|---|---|---|
| standings | E-003 | 1 to many | unknown | [obs EV-001] |

## Lifecycle

Created when matches are generated. Public block appears on the group phase. [obs EV-001]

## System fields

| Field | Set when | Source |
|---|---|---|
| index | Group number in the label | [obs EV-001] |

## Rules

- R-001
- R-002

## Not tested

- How players are assigned to groups.
