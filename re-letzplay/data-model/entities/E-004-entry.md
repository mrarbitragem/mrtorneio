# E-004 Entry
Product term: dupla or inscrito · Parent: E-001 · Status: draft

## Fields

| Field | Type | Required | Default | Constraints or enum | Source |
|---|---|---|---|---|---|
| members | list | yes | | Two names and two avatars on a doubles row | [obs EV-001] |
| group | reference | after the draw | | Shown by group label | [obs EV-001] |

## Relations

| Relation | Target | Cardinality | On delete | Source |
|---|---|---|---|---|
| category | E-001 | many to 1 | unknown | [obs EV-001] |
| group | E-002 | many to 1 | unknown | [obs EV-001] |

## Lifecycle

Created while registrations are open. Organizer can add entries after players are blocked. [obs EV-001]

## System fields

| Field | Set when | Source |
|---|---|---|
| id | Not copied. Profile links exist on avatars. | [obs EV-001] |

## Rules

- R-009

## Not tested

- Singles entry and a waiting list. The league list mentioned a waiting queue on another tournament.
