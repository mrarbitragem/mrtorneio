# E-001 Category
Product term: categoria · Parent: none · Status: draft

## Fields

| Field | Type | Required | Default | Constraints or enum | Source |
|---|---|---|---|---|---|
| format | enum | yes | | Grupo + Chaves, chave eliminatória, consolação simples, consolação dupla, dupla eliminatória, grupo único, rei/rainha da quadra, super 8, super 12 | [obs EV-001] |
| groupCount | number | when format is groups | | Observed 4 | [obs EV-001] |
| qualifiersPerGroup | number | when format is group plus knockout | | Observed 2 | [obs EV-001] |
| scoreFormat | string | yes | | Observed doubles, 2 sets plus super tie-break, 6 games, tie-break at 6-6 | [obs EV-001] |
| registrationCap | number | no | | Observed 12 | [obs EV-001] |
| registrationState | enum | yes | | Observed Inscrições abertas | [obs EV-001] |
| gender | enum | no | | Observed feminino | [obs EV-001] |

## Relations

| Relation | Target | Cardinality | On delete | Source |
|---|---|---|---|---|
| groups | E-002 | 1 to many | unknown | [obs EV-001] |
| matches | E-005 | 1 to many | Cancelar jogos gerados removes generated matches | [obs EV-001] |
| entries | E-004 | 1 to many | unknown | [obs EV-001] |

## Lifecycle

Inscrições abertas, then encerrar inscrições, then gerar jogos, then publicar as chaves, then encerrar a categoria. Cancelar jogos gerados returns from a generated draw. Transitions were labeled, not executed. [obs EV-001]

## System fields

| Field | Set when | Source |
|---|---|---|
| id | Present in the category URL | [obs EV-001] |

## Rules

- R-007
- R-010

## Not tested

- The exact status after generate and before publish.
